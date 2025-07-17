import express from 'express';
import { getPlayerStats, getPlayerMatches, getPlayerWeapons, getPlayerMaps } from '../controllers/cs2Controller.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});


router.get('/player/:steamId', getPlayerStats);
router.get('/player/:steamId/matches', getPlayerMatches);
router.get('/player/:steamId/weapons', getPlayerWeapons);
router.get('/player/:steamId/maps', getPlayerMaps);

export default router;