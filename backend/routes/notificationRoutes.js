import express from 'express';
import firebaseService from '../services/firebaseService.js';

const router = express.Router();

// Auth middleware (session-based)
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// GET /api/notifications?limit=20&includeRead=false
router.get('/', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const limit = Math.min(parseInt(req.query.limit) || 20, 200);
    const includeRead = req.query.includeRead === 'true';
    const { notifications, unreadTotal } = await firebaseService.getUserNotifications(steamId, limit, includeRead);
    res.json({ notifications, unreadTotal });
  } catch (e) {
    console.error('[NOTIFICATIONS] list failed', e?.message || e);
    res.status(500).json({ error: 'Failed to load notifications' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', requireAuth, async (req, res) => {
  try {
    await firebaseService.markNotificationAsRead(req.user.steamId, req.params.id);
    res.json({ success: true });
  } catch (e) {
    if (e.message === 'Notification not found or access denied') {
      return res.status(404).json({ error: 'Not found' });
    }
    console.error('[NOTIFICATIONS] mark read failed', e?.message || e);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all/batch', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const unread = await firebaseService.notifications
      .where('steamId', '==', steamId)
      .where('isRead', '==', false)
      .limit(300)
      .get();
    if (unread.empty) return res.json({ updated: 0 });
    let batch = firebaseService.db.batch();
    let ops = 0; let updated = 0;
    for (const doc of unread.docs) {
      batch.update(doc.ref, { isRead: true, readAt: new Date() });
      ops++; updated++;
      if (ops >= 450) { await batch.commit(); batch = firebaseService.db.batch(); ops = 0; }
    }
    if (ops) await batch.commit();
    res.json({ updated });
  } catch (e) {
    console.error('[NOTIFICATIONS] read-all failed', e?.message || e);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// DELETE /api/notifications/:id - Delete single notification
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const notificationId = req.params.id;
    const notifDoc = await firebaseService.notifications.doc(notificationId).get();
    
    if (!notifDoc.exists || notifDoc.data().steamId !== steamId) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }
    
    await firebaseService.notifications.doc(notificationId).delete();
    res.json({ success: true });
  } catch (e) {
    console.error('[NOTIFICATIONS] delete failed', e?.message || e);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// DELETE /api/notifications - Clear all notifications for user
router.delete('/', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const allNotifs = await firebaseService.notifications
      .where('steamId', '==', steamId)
      .limit(500)
      .get();
    
    if (allNotifs.empty) return res.json({ deleted: 0 });
    
    let batch = firebaseService.db.batch();
    let ops = 0; let deleted = 0;
    for (const doc of allNotifs.docs) {
      batch.delete(doc.ref);
      ops++; deleted++;
      if (ops >= 450) { await batch.commit(); batch = firebaseService.db.batch(); ops = 0; }
    }
    if (ops) await batch.commit();
    res.json({ deleted });
  } catch (e) {
    console.error('[NOTIFICATIONS] clear all failed', e?.message || e);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

export default router;
