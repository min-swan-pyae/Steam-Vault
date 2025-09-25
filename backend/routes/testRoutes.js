import express from 'express';
import firebaseService from '../services/firebaseService.js';

const router = express.Router();

// Simple auth check
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Test price drop notification
router.post('/notifications/price-drop', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    await firebaseService.createNotification(steamId, {
      type: 'price_drop',
      title: 'Price Drop Alert!',
      message: 'AK-47 | Redline (Field-Tested) price dropped to $42.50 (Target: $45.00)',
      data: {
        itemId: 'test-item-123',
        oldPrice: 45.00,
        newPrice: 42.50,
        url: '/marketplace?search=AK-47+Redline&appid=730'
      }
    });

    res.json({ success: true, message: 'Price drop notification created and sent!' });
  } catch (error) {
    console.error('[TEST] Error creating price drop notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Test market trend notification
router.post('/notifications/market-trend', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    await firebaseService.createNotification(steamId, {
      type: 'market_trend',
      title: 'Weekly Market Trends',
      message: 'CS2 knife prices are trending up 15% this week. Popular items: Karambit, M9 Bayonet.',
      data: {
        trendType: 'weekly',
        category: 'knives',
        percentageChange: 15,
        url: '/marketplace?search=Karambit&appid=730'
      }
    });

    res.json({ success: true, message: 'Market trend notification created and sent!' });
  } catch (error) {
    console.error('[TEST] Error creating market trend notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Test forum activity notification
router.post('/notifications/forum-activity', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    await firebaseService.createNotification(steamId, {
      type: 'forum_activity',
      title: 'New Reply to Your Post',
      message: 'Someone replied to your post "Best CS2 Settings for Competitive Play"',
      data: {
        postId: 'test-post-456',
        postTitle: 'Best CS2 Settings for Competitive Play',
        replyAuthor: 'ProGamer123',
        url: '/forum/posts/test-post-456'
      }
    });

    res.json({ success: true, message: 'Forum activity notification created and sent!' });
  } catch (error) {
    console.error('[TEST] Error creating forum activity notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Test weekly digest notification
router.post('/notifications/weekly-digest', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    await firebaseService.createNotification(steamId, {
      type: 'weekly_digest',
      title: 'Your Weekly Steam Vault Digest',
      message: 'This week: 12 matches played, 3 new forum posts, 2 watchlist alerts. Your K/D improved by 0.15!',
      data: {
        weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        weekEnd: new Date().toISOString(),
        stats: {
          matchesPlayed: 12,
          forumPosts: 3,
          watchlistAlerts: 2,
          kdImprovement: 0.15
        },
        url: '/dashboard/weekly-summary'
      }
    });

    res.json({ success: true, message: 'Weekly digest notification created and sent!' });
  } catch (error) {
    console.error('[TEST] Error creating weekly digest notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

// Get user's notifications for testing
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const limit = parseInt(req.query.limit) || 10;
    const includeRead = req.query.includeRead === 'true';
    
    const notifications = await firebaseService.getUserNotifications(steamId, limit, includeRead);
    
    res.json({ 
      success: true, 
      notifications: notifications.map(n => ({
        ...n,
        createdAt: n.createdAt?.toDate?.() || n.createdAt
      }))
    });
  } catch (error) {
    console.error('[TEST] Error getting notifications:', error);
    res.status(500).json({ error: 'Failed to get notifications' });
  }
});

// Mark notification as read
router.post('/notifications/:notificationId/read', requireAuth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const steamId = req.user.steamId;
    
    // Verify notification belongs to user
    const notificationDoc = await firebaseService.notifications.doc(notificationId).get();
    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    const notification = notificationDoc.data();
    if (notification.steamId !== steamId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Mark as read
    await firebaseService.notifications.doc(notificationId).update({
      isRead: true,
      readAt: new Date()
    });
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('[TEST] Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Clear all notifications for testing
router.delete('/notifications', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    
    const notificationsQuery = await firebaseService.notifications
      .where('steamId', '==', steamId)
      .get();
    
    const batch = firebaseService.db.batch();
    notificationsQuery.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    res.json({ success: true, message: `Deleted ${notificationsQuery.docs.length} notifications` });
  } catch (error) {
    console.error('[TEST] Error clearing notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;