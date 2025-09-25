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
