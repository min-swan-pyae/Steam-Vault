import express from 'express';
import { 
  getTrendingItems,
  searchMarket,
  searchMarketBulk,
  getPrice,
  getWatchlist,
  upsertWatchItem,
  deleteWatchItem
} from '../controllers/marketController.js';

const router = express.Router();

import { getCategories, getPriceHistory, getItemDetails } from '../controllers/marketController.js';
import firebaseService from '../services/firebaseService.js';
// Admin test endpoint: trigger price alert scan (non-production convenience)
router.post('/admin/scan-price-alerts', async (req, res) => {
  try {
    if (!req.user || req.user.steamId !== firebaseService.ADMIN_STEAM_ID) {
      return res.status(403).json({ error: 'Admin only' });
    }
  await firebaseService.checkPriceAlerts();
    res.json({ success: true });
  } catch (e) {
    console.error('[MARKET] Manual price alert scan failed:', e?.message || e);
    res.status(500).json({ error: 'Scan failed' });
  }
});

router.get('/categories', getCategories);
router.get('/trending', getTrendingItems);
router.get('/search', searchMarket);
router.get('/search/bulk', searchMarketBulk);
router.get('/price', getPrice);
router.get('/price/history', getPriceHistory);
router.get('/details', getItemDetails);

router.get('/watchlist/:steamId', getWatchlist);
router.post('/watchlist/:steamId', upsertWatchItem);
router.delete('/watchlist/:steamId/:id', deleteWatchItem);

export default router;
