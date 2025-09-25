import express from 'express';
import firebaseService, { admin } from '../services/firebaseService.js';

const router = express.Router();

// Simple auth check using session (Passport attaches req.user)
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Export user data bundle as downloadable JSON
router.get('/export', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;

    // Collect data from multiple collections
    const [userDoc, profile, emailConn, notifications, watchlists, priceAlerts, matches, playerStats, weaponStats, mapStats] = await Promise.all([
      firebaseService.users.doc(steamId).get(),
      firebaseService.getUserProfile(steamId),
      firebaseService.getUserEmail(steamId),
      firebaseService.notifications.where('steamId', '==', steamId).orderBy('createdAt', 'desc').limit(500).get(),
      firebaseService.marketWatchlists.where('steamId', '==', steamId).limit(500).get(),
      firebaseService.priceAlerts.where('steamId', '==', steamId).limit(500).get(),
      firebaseService.matches.where('steamId', '==', steamId).orderBy('date', 'desc').limit(1000).get(),
      firebaseService.playerStats.doc(steamId).get(),
      firebaseService.weaponStats.where('steamId', '==', steamId).limit(1000).get(),
      firebaseService.mapStats.where('steamId', '==', steamId).limit(1000).get()
    ]);

    const bundle = {
      exportVersion: 1,
      exportedAt: new Date().toISOString(),
      steamId,
      user: userDoc.exists ? userDoc.data() : null,
      profile: profile || null,
      emailConnection: emailConn || null,
      notifications: notifications.docs.map(d => ({ id: d.id, ...d.data() })),
      watchlist: watchlists.docs.map(d => ({ id: d.id, ...d.data() })),
      priceAlerts: priceAlerts.docs.map(d => ({ id: d.id, ...d.data() })),
      matches: matches.docs.map(d => ({ id: d.id, ...d.data() })),
      playerStats: playerStats.exists ? playerStats.data() : null,
      weaponStats: weaponStats.docs.map(d => ({ id: d.id, ...d.data() })),
      mapStats: mapStats.docs.map(d => ({ id: d.id, ...d.data() }))
    };

    const json = JSON.stringify(bundle, null, 2);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=steamvault-export-${steamId}.json`);
    res.status(200).send(json);
  } catch (error) {
    console.error('[EXPORT] Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Save notification preferences
router.post('/preferences', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'Invalid preferences' });
    }

    // Upsert into userProfiles
  const existingProfile = await firebaseService.getUserProfile(steamId);
  const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const updated = {
      steamId,
      preferences: {
        enableNotifications: !!preferences.enableNotifications,
        emailNotifications: !!preferences.emailNotifications,
        priceAlerts: !!preferences.priceAlerts,
        forumNotifications: !!preferences.forumNotifications,
        weeklyDigest: !!preferences.weeklyDigest,
        notificationFrequency: preferences.notificationFrequency || 'instant'
      },
      updatedAt: timestamp
    };

    if (!existingProfile) {
  await firebaseService.userProfiles.doc().set({ ...updated, createdAt: timestamp });
    } else {
      const profileQuery = await firebaseService.userProfiles.where('steamId', '==', steamId).limit(1).get();
      if (!profileQuery.empty) {
        await profileQuery.docs[0].ref.set(updated, { merge: true });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[PREFERENCES] Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

export default router;
