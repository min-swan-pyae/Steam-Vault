/**
 * Comprehensive Cache Management System
 * Central hub for all caching operations across the application
 */

import { apiCache } from './apiCache.js';
import { imageCache } from './imageCache.js';
import { backgroundRefreshService } from './backgroundRefresh.js';
import { store } from '../app/store.js';
import { steamVaultApi } from '../features/api/steamVaultApi.js';

class CacheManager {
  constructor() {
    this.isInitialized = false;
    this.performanceMetrics = {
      startTime: Date.now(),
      requestCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      backgroundRefreshCount: 0
    };

    this.initialize();
  }

  /**
   * Initialize the cache management system
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize all cache systems

      // Start performance monitoring
      this.startPerformanceMonitoring();

      // Setup cache event listeners
      this.setupEventListeners();

      // Preload critical data
      await this.preloadCriticalData();

      this.isInitialized = true;

      // Emit initialization event
      this.emit('initialized');
    } catch (error) {
      console.error('[CACHE MANAGER] Initialization failed:', error);
    }
  }

  /**
   * Preload critical application data
   */
  async preloadCriticalData() {
    const preloadTasks = [];

    // Preload hero data if user has accessed it recently
    const recentHeroAccess = localStorage.getItem('recent_hero_access');
    if (recentHeroAccess) {
      // preloadTasks.push(this.preloadHeroData()); // Commented out - endpoint doesn't exist
    }

    // Preload meta data
    // preloadTasks.push(this.preloadMetaData()); // Commented out - endpoint doesn't exist

    // Preload critical images
    // preloadTasks.push(imageCache.preloadCriticalImages()); // Commented out - method doesn't exist

    await Promise.allSettled(preloadTasks);
  }

  /**
   * Preload hero data
   */
  async preloadHeroData() {
    try {
      // Endpoint doesn't exist in API - commented out
      // const { data } = await store.dispatch(steamVaultApi.endpoints.getHeroes.initiate());
      // if (data) {
      // }
    } catch (error) {
      console.error('[CACHE MANAGER] Hero data preload failed:', error);
    }
  }

  /**
   * Preload meta data
   */
  async preloadMetaData() {
    try {
      // Endpoint doesn't exist in API - commented out
      // const { data } = await store.dispatch(steamVaultApi.endpoints.getMetaData.initiate());
      // if (data) {
      // }
    } catch (error) {
      console.error('[CACHE MANAGER] Meta data preload failed:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor API cache performance
    const originalApiCacheGet = apiCache.get;
    apiCache.get = (...args) => {
      this.performanceMetrics.requestCount++;
      const result = originalApiCacheGet.apply(apiCache, args);
      
      if (result) {
        this.performanceMetrics.cacheHits++;
      } else {
        this.performanceMetrics.cacheMisses++;
      }
      
      return result;
    };

    // Monitor image cache performance
    const originalImageCacheGet = imageCache.get;
    imageCache.get = (...args) => {
      this.performanceMetrics.requestCount++;
      const result = originalImageCacheGet.apply(imageCache, args);
      
      if (result) {
        this.performanceMetrics.cacheHits++;
      } else {
        this.performanceMetrics.cacheMisses++;
      }
      
      return result;
    };
  }

  /**
   * Setup event listeners for cache coordination
   */
  setupEventListeners() {
    // Listen for storage events to sync across tabs
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('api_cache:')) {
        this.emit('cross-tab-update', { key: e.key, newValue: e.newValue });
      }
    });

    // Listen for low memory warnings
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        const usedMemoryMB = memInfo.usedJSHeapSize / 1024 / 1024;
        
        if (usedMemoryMB > 100) { // If using more than 100MB
          this.performMaintenanceCleanup();
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Perform maintenance cleanup when memory is high
   */
  performMaintenanceCleanup() {
    try {
      // Clean old API cache entries
      if (apiCache && typeof apiCache.cleanup === 'function') {
        apiCache.cleanup();
      }
      
      // Clean image cache
      if (imageCache && typeof imageCache.cleanup === 'function') {
        imageCache.cleanup();
      }
      
      // Don't reset RTK Query state as it may affect active requests
      // store.dispatch(steamVaultApi.util.resetApiState());
      
    } catch (error) {
      console.error('[CACHE MANAGER] Cleanup error:', error);
    }
  }

  /**
   * Smart cache warming for user patterns
   */
  async warmCache(userContext = {}) {
    const { playerId, recentHeroes, favoriteGameMode } = userContext;
    
    
    const warmupTasks = [];

    // Warm player data if we have a player ID
    if (playerId) {
      warmupTasks.push(
        store.dispatch(steamVaultApi.endpoints.getPlayerProfile.initiate(playerId))
      );
      warmupTasks.push(
        store.dispatch(steamVaultApi.endpoints.getPlayerMatches.initiate({ 
          playerId, 
          limit: 20 
        }))
      );
    }

    // Warm hero data for recent heroes
    if (recentHeroes && recentHeroes.length > 0) {
      recentHeroes.slice(0, 5).forEach(heroId => {
        warmupTasks.push(
          store.dispatch(steamVaultApi.endpoints.getHeroStats.initiate(heroId))
        );
      });
    }

    // Warm meta data based on game mode preference
    if (favoriteGameMode) {
      // Endpoint doesn't exist - commented out
      // warmupTasks.push(
      //   store.dispatch(steamVaultApi.endpoints.getMetaData.initiate({
      //     gameMode: favoriteGameMode
      //   }))
      // );
    }

    await Promise.allSettled(warmupTasks);
  }

  /**
   * Get comprehensive system statistics
   */
  getSystemStats() {
    const now = Date.now();
    const uptimeHours = (now - this.performanceMetrics.startTime) / (1000 * 60 * 60);
    
    return {
      uptime: {
        hours: uptimeHours.toFixed(2),
        startTime: new Date(this.performanceMetrics.startTime).toISOString()
      },
      performance: {
        ...this.performanceMetrics,
        cacheHitRate: this.performanceMetrics.requestCount > 0 
          ? ((this.performanceMetrics.cacheHits / this.performanceMetrics.requestCount) * 100).toFixed(2) + '%'
          : '0%'
      },
      apiCache: apiCache.getStats(),
      imageCache: imageCache.getDetailedStats(),
      backgroundRefresh: backgroundRefreshService.getStats(),
      rtqQuery: {
        queries: Object.keys(store.getState().steamVaultApi.queries).length,
        subscriptions: Object.keys(store.getState().steamVaultApi.subscriptions).length
      },
      memory: typeof performance !== 'undefined' && 'memory' in performance 
        ? {
            used: `${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
          }
        : 'Not available'
    };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    
    // Clear API cache
    apiCache.clear();
    
    // Clear image cache
    imageCache.clear();
    
    // Clear RTK Query cache
    store.dispatch(steamVaultApi.util.resetApiState());
    
    // Clear browser storage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing browser storage:', error);
    }
    
    // Reset performance metrics
    this.performanceMetrics = {
      startTime: Date.now(),
      requestCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      backgroundRefreshCount: 0
    };
    
    this.emit('caches-cleared');
  }

  /**
   * Export cache data for backup
   */
  exportCacheData() {
    return {
      timestamp: Date.now(),
      version: '1.0.0',
      apiCache: apiCache.export(),
      imageCache: imageCache.export(),
      rtqQuery: store.getState().steamVaultApi
    };
  }

  /**
   * Import cache data from backup
   */
  async importCacheData(data) {
    try {
      if (data.apiCache) {
        apiCache.import(data.apiCache);
      }
      
      if (data.imageCache) {
        imageCache.import(data.imageCache);
      }
      
      this.emit('cache-imported');
    } catch (error) {
      console.error('[CACHE MANAGER] Failed to import cache data:', error);
    }
  }

  /**
   * Simple event emitter
   */
  emit(event, data = null) {
    const customEvent = new CustomEvent(`cache-manager:${event}`, { 
      detail: data 
    });
    window.dispatchEvent(customEvent);
  }

  /**
   * Listen to cache manager events
   */
  on(event, callback) {
    window.addEventListener(`cache-manager:${event}`, callback);
  }

  /**
   * Remove event listener
   */
  off(event, callback) {
    window.removeEventListener(`cache-manager:${event}`, callback);
  }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Export for debugging
window.cacheManager = cacheManager;

export default cacheManager;
