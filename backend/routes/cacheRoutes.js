import express from 'express';
import { 
  getCacheStats, 
  clearCache, 
  clearAllCaches, 
  invalidateCacheByPattern 
} from '../controllers/cacheController.js';

const router = express.Router();

// Cache statistics
router.get('/stats', getCacheStats);

// Clear specific cache
router.delete('/:cacheType', clearCache);

// Clear all caches
router.delete('/all', clearAllCaches);

// Invalidate cache by pattern
router.post('/:cacheType/invalidate', invalidateCacheByPattern);

export default router;
