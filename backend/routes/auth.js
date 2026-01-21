import express from 'express';
import passport from 'passport';
import firebaseService, { admin } from '../services/firebaseService.js';
const router = express.Router();

// Initialize Steam authentication
router.get('/steam',
  function(req, res, next) {
    req.session.returnTo = req.query.returnTo || '/';
    next();
  },
  passport.authenticate('steam', { failureRedirect: '/' }),
  function(req, res) {
    // This function will never be called
  }
);

// Steam auth callback
router.get('/steam/return',
  function(req, res, next) {
    
    passport.authenticate('steam', function(err, user, info) {
      if (err) {
        console.error('Steam Authentication Error:', err);
        return res.redirect('http://localhost:5173/error?message=' + encodeURIComponent(err.message || 'Authentication error'));
      }
      
      if (!user) {
        console.error('No user found from Steam authentication', info);
        return res.redirect('http://localhost:5173/error?message=' + encodeURIComponent('Authentication failed: No user data received'));
      }
      
      console.log('Attempting to log in user:', user.displayName || user.id);
      
      req.logIn(user, function(loginErr) {
        if (loginErr) {
          console.error('Login Error:', loginErr);
          return res.redirect('http://localhost:5173/error?message=' + encodeURIComponent(loginErr.message || 'Login failed'));
        }
        
        // Explicitly save session after login to ensure persistence
        req.session.save(function(saveErr) {
          if (saveErr) {
            console.error('Session save error:', saveErr);
            return res.redirect('http://localhost:5173/error?message=' + encodeURIComponent('Session error: ' + saveErr.message));
          }
          
          return res.redirect('http://localhost:5173');
        });
      });
    })(req, res, next);
  }
);

// Get current user
router.get('/user', async (req, res) => {
  
  if (req.isAuthenticated() && req.user) {
    try {
      const steamId = req.user.steamId || req.user.id;
      // Fetch Firestore user doc to attach roles & moderation state
      const dbUser = await firebaseService.getUser(steamId);
      
      // Auto-clear expired suspensions on auth check
      const suspension = dbUser?.moderation?.suspension;
      if (suspension?.active && suspension?.expiresAt) {
        const now = Date.now();
        const ex = suspension.expiresAt;
        const expiresMillis = ex?.toMillis ? ex.toMillis() : (ex._seconds ? ex._seconds * 1000 : Date.parse(ex));
        
        if (expiresMillis && expiresMillis < now) {
          console.log(`[AUTH] Auto-clearing expired suspension for ${steamId}`);
          await firebaseService.users.doc(steamId).update({
            'moderation.suspension.active': false,
            'moderation.suspension.clearedAt': admin.firestore.FieldValue.serverTimestamp(),
            'moderation.suspension.autoCleared': true
          });
          
          // Create notification (fire and forget)
          firebaseService.createNotification(steamId, {
            type: 'moderation_suspension_expired',
            title: 'Suspension Expired',
            body: 'Your temporary suspension has expired. You may post and comment again.',
            severity: 'success'
          }).catch(() => {});
          
          // Update dbUser object for response
          if (dbUser.moderation?.suspension) {
            dbUser.moderation.suspension.active = false;
          }
        }
      }
      
      const mergedUser = {
        ...req.user,
        steamId,
  role: dbUser?.role || (Array.isArray(dbUser?.roles) && dbUser.roles.includes('admin') ? 'admin' : 'user'),
        moderation: dbUser?.moderation || undefined,
        displayName: req.user.displayName || dbUser?.displayName || 'Unknown Player',
        avatar: req.user.photos?.[0]?.value || dbUser?.avatar || null,
        profileUrl: dbUser?.profileUrl || req.user._json?.profileurl || null
      };
  console.log('Active user (merged):', mergedUser.displayName, 'role=', mergedUser.role);
      res.json({
        user: mergedUser,
        authenticated: true
      });
    } catch (e) {
      console.error('Failed to enrich user from Firestore:', e?.message || e);
      res.json({ user: req.user, authenticated: true });
    }
  } else {
    console.log('No active user session');
    // Regenerate the session to ensure there's no stale data
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      res.json({
        user: null,
        authenticated: false
      });
    });
  }
});

// Logout
router.get('/logout', (req, res) => {
  console.log('Logging out user:', req.user?.displayName || req.user?.id || 'Unknown user');
  const username = req.user?.displayName || req.user?.id || 'Unknown user';
  
  // First, log the user out
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('http://localhost:5173/error?message=' + encodeURIComponent('Logout failed: ' + err.message));
    }
    
    // Then destroy the session
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        console.error('Session destruction error:', destroyErr);
      } else {
        console.log(`User ${username} successfully logged out and session destroyed`);
      }
      
      // Clear the cookie
      res.clearCookie('steamvault.sid');
      res.redirect('http://localhost:5173');
    });
  });
});

export default router; 