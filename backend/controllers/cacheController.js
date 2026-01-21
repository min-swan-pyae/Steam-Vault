import asyncHandler from '../middleware/asyncHandler.js';
import { cacheService } from '../services/cacheService.js';

// @desc    Get cache statistics
// @route   GET /api/cache/stats
// @access  Public (can be protected later)
export const getCacheStats = asyncHandler(async (req, res) => {
  try {
    const stats = cacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching cache stats:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch cache statistics' 
    });
  }
});

// @desc    Clear specific cache
// @route   DELETE /api/cache/:cacheType
// @access  Public (should be protected in production)
export const clearCache = asyncHandler(async (req, res) => {
  const { cacheType } = req.params;
  
  try {
    const result = cacheService.clearCache(cacheType);
    if (result) {
      res.json({
        success: true,
        message: `Cache ${cacheType} cleared successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Cache type ${cacheType} not found`
      });
    }
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clear cache' 
    });
  }
});

// @desc    Clear all caches
// @route   DELETE /api/cache/all
// @access  Public (should be protected in production)
export const clearAllCaches = asyncHandler(async (req, res) => {
  try {
    cacheService.clearAllCaches();
    res.json({
      success: true,
      message: 'All caches cleared successfully'
    });
  } catch (error) {
    console.error('Error clearing all caches:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clear all caches' 
    });
  }
});

// @desc    Invalidate cache by pattern
// @route   POST /api/cache/:cacheType/invalidate
// @access  Public (should be protected in production)
export const invalidateCacheByPattern = asyncHandler(async (req, res) => {
  const { cacheType } = req.params;
  const { pattern } = req.body;
  
  if (!pattern) {
    return res.status(400).json({
      success: false,
      message: 'Pattern is required'
    });
  }
  
  try {
    const deletedKeys = cacheService.invalidateByPattern(cacheType, pattern);
    res.json({
      success: true,
      message: `Invalidated ${deletedKeys.length} cache entries`,
      deletedKeys
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to invalidate cache' 
    });
  }
});
