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

// Export user data bundle as downloadable JSON (frontend transforms to Excel)
router.get('/export', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;

    // Collect data from multiple collections
    const [userDoc, profile, emailConn, notifications, watchlists, matches, playerStats, weaponStats, mapStats] = await Promise.all([
      firebaseService.users.doc(steamId).get(),
      firebaseService.getUserProfile(steamId),
      firebaseService.getUserEmail(steamId),
      firebaseService.notifications.where('steamId', '==', steamId).orderBy('createdAt', 'desc').limit(500).get(),
      firebaseService.marketWatchlists.where('steamId', '==', steamId).limit(500).get(),
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
        notificationFrequency: preferences.notificationFrequency || 'instant'
      },
      updatedAt: timestamp
    };

    // Always store userProfiles with doc id == steamId for deterministic access
    if (!existingProfile) {
      await firebaseService.userProfiles.doc(steamId).set({ ...updated, createdAt: timestamp });
    } else {
      await firebaseService.userProfiles.doc(steamId).set(updated, { merge: true });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[PREFERENCES] Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// Load notification preferences
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const profile = await firebaseService.getUserProfile(steamId);
    res.json({ preferences: profile?.preferences || null });
  } catch (error) {
    console.error('[PREFERENCES] Error loading preferences:', error);
    res.status(500).json({ error: 'Failed to load preferences' });
  }
});

// Delete account and all associated data (GDPR Article 17 - Right to be Forgotten)
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { confirmSteamId } = req.body;

    // Require user to confirm by providing their Steam ID
    if (confirmSteamId !== steamId) {
      return res.status(400).json({ 
        error: 'Confirmation failed', 
        message: 'Please confirm your Steam ID to delete your account' 
      });
    }

    console.log(`[ACCOUNT DELETE] Starting account deletion for Steam ID: ${steamId}`);

    const batch = admin.firestore().batch();
    let deletedCounts = {
      users: 0,
      userProfiles: 0,
      emailConnections: 0,
      notifications: 0,
      marketWatchlists: 0,
      forumPosts: 0,
      forumComments: 0,
      matches: 0,
      playerStats: 0,
      weaponStats: 0,
      mapStats: 0,
      gsiSessions: 0
    };

    // Helper function to delete documents in batches (Firestore limit is 500 per batch)
    const deleteCollection = async (collectionRef, fieldName, fieldValue) => {
      const snapshot = await collectionRef.where(fieldName, '==', fieldValue).get();
      let count = 0;
      for (const doc of snapshot.docs) {
        batch.delete(doc.ref);
        count++;
      }
      return count;
    };

    // Delete user document (by doc ID = steamId)
    const userDoc = await firebaseService.users.doc(steamId).get();
    if (userDoc.exists) {
      batch.delete(userDoc.ref);
      deletedCounts.users = 1;
    }

    // Delete user profile
    const profileDoc = await firebaseService.userProfiles.doc(steamId).get();
    if (profileDoc.exists) {
      batch.delete(profileDoc.ref);
      deletedCounts.userProfiles = 1;
    }

    // Delete email connection
    const emailSnapshot = await firebaseService.emailConnections.where('steamId', '==', steamId).get();
    emailSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deletedCounts.emailConnections = emailSnapshot.docs.length;

    // Delete notifications
    const notifSnapshot = await firebaseService.notifications.where('steamId', '==', steamId).get();
    notifSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deletedCounts.notifications = notifSnapshot.docs.length;

    // Delete market watchlist items
    const watchlistSnapshot = await firebaseService.marketWatchlists.where('steamId', '==', steamId).get();
    watchlistSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deletedCounts.marketWatchlists = watchlistSnapshot.docs.length;

    // Delete forum posts (mark as deleted, preserve thread integrity)
    // Note: We anonymize rather than hard delete to preserve discussion context
    const postsSnapshot = await firebaseService.forumPosts.where('authorSteamId', '==', steamId).get();
    postsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        authorSteamId: '[deleted]',
        authorName: '[deleted]',
        authorAvatar: null,
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedReason: 'account_deletion'
      });
    });
    deletedCounts.forumPosts = postsSnapshot.docs.length;

    // Delete forum comments (anonymize)
    const commentsSnapshot = await firebaseService.forumComments.where('authorSteamId', '==', steamId).get();
    commentsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        authorSteamId: '[deleted]',
        authorName: '[deleted]',
        authorAvatar: null,
        isDeleted: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedReason: 'account_deletion'
      });
    });
    deletedCounts.forumComments = commentsSnapshot.docs.length;

    // Delete CS2 match history
    const matchesSnapshot = await firebaseService.matches.where('steamId', '==', steamId).get();
    matchesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deletedCounts.matches = matchesSnapshot.docs.length;

    // Delete player stats
    const playerStatsDoc = await firebaseService.playerStats.doc(steamId).get();
    if (playerStatsDoc.exists) {
      batch.delete(playerStatsDoc.ref);
      deletedCounts.playerStats = 1;
    }

    // Delete weapon stats
    const weaponStatsSnapshot = await firebaseService.weaponStats.where('steamId', '==', steamId).get();
    weaponStatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deletedCounts.weaponStats = weaponStatsSnapshot.docs.length;

    // Delete map stats
    const mapStatsSnapshot = await firebaseService.mapStats.where('steamId', '==', steamId).get();
    mapStatsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    deletedCounts.mapStats = mapStatsSnapshot.docs.length;

    // Delete GSI sessions
    const gsiSessionDoc = await firebaseService.gsiSessions.doc(steamId).get();
    if (gsiSessionDoc.exists) {
      batch.delete(gsiSessionDoc.ref);
      deletedCounts.gsiSessions = 1;
    }

    // Commit the batch delete
    await batch.commit();

    console.log(`[ACCOUNT DELETE] Successfully deleted account for Steam ID: ${steamId}`, deletedCounts);

    // Destroy the session after deletion
    req.logout((err) => {
      if (err) console.error('[ACCOUNT DELETE] Session logout error:', err);
      req.session.destroy((err) => {
        if (err) console.error('[ACCOUNT DELETE] Session destroy error:', err);
      });
    });

    res.json({ 
      success: true, 
      message: 'Your account and all associated data have been permanently deleted.',
      deletedCounts
    });
  } catch (error) {
    console.error('[ACCOUNT DELETE] Error deleting account:', error);
    res.status(500).json({ error: 'Failed to delete account', message: error.message });
  }
});

export default router;
