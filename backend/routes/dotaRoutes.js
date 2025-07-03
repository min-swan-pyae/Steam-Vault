import express from 'express';
import { getMatchHistory, getMatchDetail } from '../controllers/dotaController.js';
import { 
  getProPlayersLive, 
  getMetaStats, 
  getHeroStats,
  getEnhancedMetaAnalysis
} from '../controllers/dotaMetaController.js';
import { 
  getPlayerStats, 
  lookupPlayer, 
  getPlayerHeroStats, 
  getPlayerPlaytimeTrends, 
  getPlayerBehaviorMetrics,
  getPlayerPerformanceSummary,
  getDetailedHeroStats,

} from '../controllers/playerController.js';
import { getHeroImage } from '../controllers/imageController.js';

const router = express.Router();

// Logging middleware
router.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Match routes
router.get('/match-history/:accountId', getMatchHistory);
router.get('/match/:match_id', getMatchDetail);

// Player routes
router.get('/player/:steamId/stats', getPlayerStats);
router.get('/player/lookup/:id', lookupPlayer);
router.get('/player/:steamId/heroes', getPlayerHeroStats);
router.get('/player/:steamId/playtime', getPlayerPlaytimeTrends);
router.get('/player/:steamId/behavior', getPlayerBehaviorMetrics);
router.get('/player/:steamId/performance-summary', getPlayerPerformanceSummary);
router.get('/player/:steamId/hero/:heroId/detailed-stats', getDetailedHeroStats);

// Pro players and meta routes
router.get('/pro-players/live', getProPlayersLive);
router.get('/meta', getMetaStats);
router.get('/meta/enhanced', getEnhancedMetaAnalysis);
router.get('/heroes/stats', getHeroStats);

// Hero image proxy to avoid CORS
router.get('/heroes/image/:heroId', getHeroImage);


export default router;
