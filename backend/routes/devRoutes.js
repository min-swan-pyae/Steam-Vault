import express from 'express';
import firebaseService, { admin } from '../services/firebaseService.js';

const router = express.Router();

// Development-only middleware
const requireDev = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Development routes not available in production' });
  }
  next();
};

// Simple auth check
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Get all watchlist items for price simulation
router.get('/watchlist-items', requireDev, requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    const watchlistQuery = await firebaseService.marketWatchlists
      .where('steamId', '==', steamId)
      .where('isActive', '==', true)
      .get();
    
    const items = watchlistQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ success: true, items });
  } catch (error) {
    console.error('[DEV] Error getting watchlist items:', error);
    res.status(500).json({ error: 'Failed to get watchlist items' });
  }
});

// Simulate price drop for a specific item
router.post('/simulate-price-drop', requireDev, requireAuth, async (req, res) => {
  try {
    const { itemId, newPrice } = req.body;
    const steamId = req.user.steamId;
    
    if (!itemId || typeof newPrice !== 'number') {
      return res.status(400).json({ error: 'itemId and newPrice are required' });
    }
    
    // Get the watchlist item
    const itemDoc = await firebaseService.marketWatchlists.doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ error: 'Watchlist item not found' });
    }
    
    const itemData = itemDoc.data();
    if (itemData.steamId !== steamId) {
      return res.status(403).json({ error: 'Not authorized to modify this item' });
    }
    
    const oldPrice = itemData.currentPrice || itemData.targetPrice + 5; // Mock old price
    
    // Update the item's current price
    await firebaseService.marketWatchlists.doc(itemId).update({
      currentPrice: newPrice,
      lastChecked: new Date(),
      priceHistory: admin.firestore.FieldValue.arrayUnion({
        price: newPrice,
        timestamp: new Date()
      })
    });
    
    // Check if this triggers a price alert (if newPrice <= targetPrice)
    if (newPrice <= itemData.targetPrice) {
      await firebaseService.createNotification(steamId, {
        type: 'price_drop',
        title: 'Price Drop Alert!',
        message: `${itemData.hashName} price dropped to $${newPrice.toFixed(2)} (Target: $${itemData.targetPrice.toFixed(2)})`,
        data: {
          itemId: itemId,
          oldPrice: oldPrice,
          newPrice: newPrice,
          url: `/marketplace?search=${encodeURIComponent(itemData.hashName)}&appid=${itemData.appid || 730}`
        }
      });
      
      res.json({ 
        success: true, 
        message: `Price updated to $${newPrice.toFixed(2)} and notification sent!`,
        priceDropTriggered: true
      });
    } else {
      res.json({ 
        success: true, 
        message: `Price updated to $${newPrice.toFixed(2)} (no alert triggered)`,
        priceDropTriggered: false
      });
    }
    
  } catch (error) {
    console.error('[DEV] Error simulating price drop:', error);
    res.status(500).json({ error: 'Failed to simulate price drop' });
  }
});

// Create a mock watchlist item for testing
router.post('/create-mock-item', requireDev, requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { hashName, targetPrice, appid = 730 } = req.body;
    
    if (!hashName || !targetPrice) {
      return res.status(400).json({ error: 'hashName and targetPrice are required' });
    }
    
    const mockItem = {
      steamId: steamId,
      hashName: hashName,
      targetPrice: parseFloat(targetPrice),
      currentPrice: parseFloat(targetPrice) + 5, // Start above target
      appid: parseInt(appid),
      isActive: true,
      createdAt: new Date(),
      lastChecked: new Date(),
      priceHistory: [{
        price: parseFloat(targetPrice) + 5,
        timestamp: new Date()
      }]
    };
    
    const docRef = await firebaseService.marketWatchlists.add(mockItem);
    
    res.json({ 
      success: true, 
      message: 'Mock watchlist item created',
      itemId: docRef.id,
      item: mockItem
    });
    
  } catch (error) {
    console.error('[DEV] Error creating mock item:', error);
    res.status(500).json({ error: 'Failed to create mock item' });
  }
});

// Delete a watchlist item
router.delete('/watchlist-item/:itemId', requireDev, requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;
    const steamId = req.user.steamId;
    
    // Verify ownership
    const itemDoc = await firebaseService.marketWatchlists.doc(itemId).get();
    if (!itemDoc.exists) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const itemData = itemDoc.data();
    if (itemData.steamId !== steamId) {
      return res.status(403).json({ error: 'Not authorized to delete this item' });
    }
    
    await firebaseService.marketWatchlists.doc(itemId).delete();
    
    res.json({ success: true, message: 'Watchlist item deleted' });
    
  } catch (error) {
    console.error('[DEV] Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

export default router;