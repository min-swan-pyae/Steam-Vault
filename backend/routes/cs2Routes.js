import express from 'express';
import { 
  getPlayerStats, 
  getPlayerMatches, 
  getPlayerWeapons, 
  getPlayerMaps, 
  uploadDemo,
  getLeaderboard,
  searchPlayers,
  getRecentActivity
} from '../controllers/cs2Controller.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Demo upload
router.post('/upload-demo', uploadDemo);

// Player stats
router.get('/player/:steamId', getPlayerStats);
router.get('/player/:steamId/matches', getPlayerMatches);
router.get('/player/:steamId/weapons', getPlayerWeapons);
router.get('/player/:steamId/maps', getPlayerMaps);

// Community features
router.get('/leaderboard', getLeaderboard);
router.get('/search', searchPlayers);
router.get('/activity', getRecentActivity);

export default router;