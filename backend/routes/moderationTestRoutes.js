import express from 'express';
import firebaseService from '../services/firebaseService.js';

const router = express.Router();

// Development-only safeguard
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Disabled in production' });
  }
  next();
});

// Basic auth check (must be logged in and be the designated admin to simulate)
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.steamId !== firebaseService.ADMIN_STEAM_ID) {
    return res.status(403).json({ error: 'Admin only (simulation)' });
  }
  next();
};

// Apply a temporary suspension to a target (default 1 hour) for testing notification flow
router.post('/simulate-suspension', requireAdmin, async (req, res) => {
  try {
    const { targetSteamId, hours = 1, level = 'temp', reason = 'Test suspension' } = req.body || {};
    if (!targetSteamId) return res.status(400).json({ error: 'targetSteamId required' });

    const result = await firebaseService._applySuspension(targetSteamId, { durationHours: hours, level, reason });
    res.json({ success: true, applied: true, result });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to simulate suspension' });
  }
});

// Fast-forward: mark any active suspension for a target as expired & trigger expiration notification
router.post('/simulate-expire', requireAdmin, async (req, res) => {
  try {
    const { targetSteamId } = req.body || {};
    if (!targetSteamId) return res.status(400).json({ error: 'targetSteamId required' });
    const userRef = firebaseService.users.doc(targetSteamId);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });
    const user = doc.data();

    if (!user?.moderation?.suspension?.active) {
      return res.json({ success: true, message: 'No active suspension' });
    }

    await userRef.set({
      moderation: {
        ...(user.moderation || {}),
        suspension: {
          ...(user.moderation?.suspension || {}),
          expiresAt: new Date(Date.now() - 1000), // set to past
        }
      }
    }, { merge: true });

    // Next protected action assertion will auto-clear & notify; invoke assert directly
    await firebaseService._assertNotSuspended(targetSteamId);

    res.json({ success: true, expired: true });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to simulate expiration' });
  }
});

// Clear suspension manually to trigger cleared notification
router.post('/simulate-clear', requireAdmin, async (req, res) => {
  try {
    const { targetSteamId } = req.body || {};
    if (!targetSteamId) return res.status(400).json({ error: 'targetSteamId required' });
    const cleared = await firebaseService.clearUserSuspension(firebaseService.ADMIN_STEAM_ID, targetSteamId);
    res.json({ success: true, cleared });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to clear suspension' });
  }
});

export default router;
