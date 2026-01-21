import express from 'express';
import { 
  getPlayerStats, 
  getPlayerMatches, 
  getPlayerWeapons, 
  getPlayerMaps,
  receiveGSIData,
  getLeaderboard,
  searchPlayers,
  getRecentActivity,
  getCS2ProfileData
} from '../controllers/cs2Controller.js';

const router = express.Router();

/**
 * CS2 Routes - Game State Integration (GSI) Based
 * 
 * All player-specific routes now require authentication
 * GSI setup and data collection routes for real-time statistics
 */

// Logging middleware
router.use((req, res, next) => {
  next();
});

// Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: 'CS2 routes working', 
    timestamp: new Date().toISOString(),
    approach: 'Game State Integration (GSI)',
    note: 'Authentication required for player data'
  });
});

// GSI Configuration and Data Collection  
// router.post('/setup-gsi', setupGSI);
router.post('/gsi/:steamId', receiveGSIData);

// Helpful: if someone browses to the GSI endpoint with GET, return instructions (avoid 404 confusion)
router.get('/gsi/:steamId', (req, res) => {
  const { steamId } = req.params;
  res.json({
    message: 'This endpoint accepts POST requests from CS2 Game State Integration',
    method: 'POST',
    expectedPath: `/api/cs2/gsi/${steamId}`,
    tip: 'If you see this in logs as a GET, it likely came from a browser. CS2 will POST automatically when the cfg is installed and CS2 is running a match.',
  });
});

// GSI Test endpoint to validate configuration
router.get('/gsi-test/:steamId', (req, res) => {
  const { steamId } = req.params;
  res.json({
    message: 'CS2 GSI endpoint is reachable',
    steamId: steamId,
    endpoint: `http://localhost:3000/api/cs2/gsi/${steamId}`,
    timestamp: new Date().toISOString(),
    instructions: [
      '1. Make sure CS2 is closed',
      '2. Place the gamestate_integration_steamvault.cfg file in your CS2 cfg folder',
      '3. Start CS2 and play a match',
      '4. GSI data should be sent to the endpoint during gameplay'
    ]
  });
});

// Player Statistics (Authentication Required)
router.get('/player/:steamId/profile', getCS2ProfileData);
router.get('/player/:steamId/stats', getPlayerStats);
router.get('/player/:steamId/matches', getPlayerMatches);
router.get('/player/:steamId/weapons', getPlayerWeapons);
router.get('/player/:steamId/maps', getPlayerMaps);

// Community Features (Authentication Required)
router.get('/leaderboard', getLeaderboard);
router.get('/search', searchPlayers);
router.get('/activity', getRecentActivity);

export default router;