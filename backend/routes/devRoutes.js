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

// Update watchlist item price (without triggering notification)
router.post('/update-watchlist-price', requireDev, requireAuth, async (req, res) => {
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
    
    // Update the item's current price in database
    await firebaseService.marketWatchlists.doc(itemId).update({
      currentPrice: newPrice,
      lastChecked: new Date(),
      updatedAt: new Date(),
      priceHistory: admin.firestore.FieldValue.arrayUnion({
        price: newPrice,
        timestamp: new Date()
      })
    });
    
    // Check if price drop triggers alert (simulating production scheduler behavior)
    const shouldAlert = newPrice <= itemData.targetPrice;
    
    if (shouldAlert) {
      // Automatically send notification (like production scheduler would)
      await firebaseService.createNotification(steamId, {
        type: 'price_drop',
        title: '💰 Price Drop Alert!',
        message: `${itemData.hashName} dropped to $${newPrice.toFixed(2)} (Target: $${itemData.targetPrice.toFixed(2)})`,
        data: {
          hashName: itemData.hashName,
          itemId: itemId,
          targetPrice: itemData.targetPrice,
          currentPrice: newPrice,
          appid: itemData.appid || 730,
          url: `/marketplace?appid=${itemData.appid || 730}&hash=${encodeURIComponent(itemData.hashName)}`
        }
      });
      
      res.json({ 
        success: true, 
        message: `Price updated to $${newPrice.toFixed(2)} - Alert triggered!`,
        itemId,
        newPrice,
        alertTriggered: true
      });
    } else {
      res.json({ 
        success: true, 
        message: `Price updated to $${newPrice.toFixed(2)} (no alert - above target)`,
        itemId,
        newPrice,
        alertTriggered: false
      });
    }
    
  } catch (error) {
    console.error('[DEV] Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Simulate price drop and trigger notification
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
      updatedAt: new Date(),
      priceHistory: admin.firestore.FieldValue.arrayUnion({
        price: newPrice,
        timestamp: new Date()
      })
    });
    
    // Always trigger notification for testing (simulates production price check finding a drop)
    await firebaseService.createNotification(steamId, {
      type: 'price_drop',
      title: '💰 Price Drop Alert!',
      message: `${itemData.hashName} dropped to $${newPrice.toFixed(2)} (Target: $${itemData.targetPrice.toFixed(2)})`,
      data: {
        hashName: itemData.hashName,
        itemId: itemId,
        targetPrice: itemData.targetPrice,
        currentPrice: newPrice,
        appid: itemData.appid || 730,
        // Use hash parameter for exact item match
        url: `/marketplace?appid=${itemData.appid || 730}&hash=${encodeURIComponent(itemData.hashName)}`
      }
    });
    
    res.json({ 
      success: true, 
      message: `Alert triggered! Price: $${newPrice.toFixed(2)} → Notification sent`,
      priceDropTriggered: true,
      itemId,
      newPrice
    });
    
  } catch (error) {
    console.error('[DEV] Error simulating price drop:', error);
    res.status(500).json({ error: 'Failed to simulate price drop' });
  }
});

// Create a mock notification for testing (does NOT add to watchlist)
router.post('/create-mock-item', requireDev, requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { hashName, targetPrice, appid = 730 } = req.body;
    
    if (!hashName || !targetPrice) {
      return res.status(400).json({ error: 'hashName and targetPrice are required' });
    }
    
    // Create notification only - do NOT add to actual watchlist
    await firebaseService.createNotification(steamId, {
      type: 'price_drop',
      title: '🎯 Mock Price Drop Alert',
      message: `${hashName} dropped to $${targetPrice} (Test Notification)`,
      data: {
        hashName: hashName,
        targetPrice: parseFloat(targetPrice),
        currentPrice: parseFloat(targetPrice),
        appid: parseInt(appid),
        isMock: true,
        // Use hash parameter for exact item match
        url: `/marketplace?appid=${appid}&hash=${encodeURIComponent(hashName)}`
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Mock notification created (not added to watchlist)',
      hashName: hashName,
      targetPrice: parseFloat(targetPrice)
    });
    
  } catch (error) {
    console.error('[DEV] Error creating mock notification:', error);
    res.status(500).json({ error: 'Failed to create mock notification' });
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

// ===============================
// CS2 DEV CLEANUP UTILITIES
// ===============================

// Purge CS2 data for the authenticated user (or a provided steamId if you are the admin)
router.post('/cs2/cleanup', requireDev, requireAuth, async (req, res) => {
  try {
    const requester = req.user.steamId;
    const targetSteamId = req.body?.steamId && requester === firebaseService.ADMIN_STEAM_ID
      ? String(req.body.steamId)
      : String(requester);

    const db = firebaseService.db;
    const collections = [
      { ref: firebaseService.matches, key: 'matches' },
      { ref: firebaseService.mapStats, key: 'mapStats' },
      { ref: firebaseService.weaponStats, key: 'weaponStats' }
    ];

    const deleteByQuery = async (ref, whereField, value) => {
      let deleted = 0;
      const snapshot = await ref.where(whereField, '==', value).get();
      const batchSize = snapshot.size;
      if (batchSize === 0) return deleted;
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deleted += batchSize;
      return deleted;
    };

    const results = {};
    for (const { ref, key } of collections) {
      results[key] = await deleteByQuery(ref, 'steamId', targetSteamId);
    }

    // Delete gsiSession doc
    try {
      await firebaseService.gsiSessions.doc(targetSteamId).delete();
      results.gsiSessions = 1;
    } catch (_) {
      results.gsiSessions = 0;
    }

    // Reset playerStats
    try {
      await firebaseService.playerStats.doc(targetSteamId).set({
        steamId: targetSteamId,
        totalKills: 0,
        totalDeaths: 0,
        totalAssists: 0,
        totalMVPs: 0,
        kdRatio: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        lastSeen: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      results.playerStatsReset = true;
    } catch (_) {
      results.playerStatsReset = false;
    }

    return res.json({ success: true, steamId: targetSteamId, ...results });
  } catch (error) {
    console.error('[DEV] Error cleaning up CS2 data:', error);
    return res.status(500).json({ success: false, error: error.message || 'Cleanup failed' });
  }
});

// Patch a specific match's basic stats (dev-only helper to correct legacy saves)
// (Removed dev-only patch and purge routes per request)