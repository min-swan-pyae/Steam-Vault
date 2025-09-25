/**
 * Frontend API Response Caching Service
 * Provides intelligent caching with localStorage/sessionStorage
 */

// Cache configuration
const CACHE_CONFIG = {
  // Cache types and their TTL (in milliseconds)
  PLAYER_DATA: { ttl: 30 * 60 * 1000, storage: 'localStorage' }, // 30 minutes
  MATCH_HISTORY: { ttl: 15 * 60 * 1000, storage: 'localStorage' }, // 15 minutes
  MATCH_DETAILS: { ttl: 60 * 60 * 1000, storage: 'localStorage' }, // 1 hour
  HERO_DATA: { ttl: 24 * 60 * 60 * 1000, storage: 'localStorage' }, // 24 hours
  CS2_DATA: { ttl: 30 * 60 * 1000, storage: 'localStorage' }, // 30 minutes
  META_DATA: { ttl: 60 * 60 * 1000, storage: 'localStorage' }, // 1 hour
  SESSION_DATA: { ttl: 30 * 60 * 1000, storage: 'sessionStorage' }, // 30 minutes, session only
  
  // Cache size limits (number of entries)
  MAX_CACHE_SIZE: 1000,
  
  // Storage quota management
  MAX_STORAGE_SIZE: 50 * 1024 * 1024, // 50MB limit
};

class APIResponseCache {
  constructor() {
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      writes: 0,
      evictions: 0
    };
    
    // Initialize cache cleanup
    this.setupCleanupInterval();
    this.initializeCacheFromStorage();
  }

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(endpoint, params = {}, cacheType) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    const paramString = JSON.stringify(sortedParams);
    // Use encodeURIComponent for Unicode-safe encoding instead of btoa
    return `${cacheType}:${endpoint}:${encodeURIComponent(paramString)}`;
  }

  /**
   * Get storage instance based on cache type
   */
  getStorage(cacheType) {
    const config = CACHE_CONFIG[cacheType];
    if (!config) return localStorage;
    
    return config.storage === 'sessionStorage' ? sessionStorage : localStorage;
  }

  /**
   * Get cached data
   */
  get(endpoint, params = {}, cacheType = 'PLAYER_DATA') {
    try {
      const cacheKey = this.generateCacheKey(endpoint, params, cacheType);
    
    // Check memory cache first (fastest)
    if (this.memoryCache.has(cacheKey)) {
      const memoryData = this.memoryCache.get(cacheKey);
      if (this.isValidCacheEntry(memoryData, cacheType)) {
        this.cacheStats.hits++;
        console.log(`[CACHE HIT - Memory] ${cacheKey}`);
        return memoryData.data;
      } else {
        this.memoryCache.delete(cacheKey);
      }
    }

    // Check persistent storage
    try {
      const storage = this.getStorage(cacheType);
      const cachedData = storage.getItem(cacheKey);
      
      if (cachedData) {
        const parsedData = JSON.parse(cachedData);
        
        if (this.isValidCacheEntry(parsedData, cacheType)) {
          // Update memory cache
          this.memoryCache.set(cacheKey, parsedData);
          this.cacheStats.hits++;
          console.log(`[CACHE HIT - Storage] ${cacheKey}`);
          return parsedData.data;
        } else {
          // Remove expired entry
          storage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error('[CACHE ERROR] Failed to get from storage:', error);
    }

    this.cacheStats.misses++;
    console.log(`[CACHE MISS] ${cacheKey}`);
    return null;
    } catch (error) {
      console.warn('[CACHE ERROR] Failed to get from cache:', error.message);
      this.cacheStats.misses++;
      return null;
    }
  }

  /**
   * Set cached data
   */
  set(endpoint, params = {}, data, cacheType = 'PLAYER_DATA') {
    try {
      const cacheKey = this.generateCacheKey(endpoint, params, cacheType);
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      cacheType,
      endpoint,
      params
    };

    // Update memory cache
    this.memoryCache.set(cacheKey, cacheEntry);

    // Update persistent storage
    try {
      const storage = this.getStorage(cacheType);
      
      // Check storage quota before writing
      if (this.checkStorageQuota(storage, cacheKey, cacheEntry)) {
        storage.setItem(cacheKey, JSON.stringify(cacheEntry));
        this.cacheStats.writes++;
        console.log(`[CACHE SET] ${cacheKey}`);
      } else {
        console.warn(`[CACHE WARNING] Storage quota exceeded for ${cacheKey}`);
        this.performCacheEviction(storage, cacheType);
      }
    } catch (error) {
      console.error('[CACHE ERROR] Failed to set in storage:', error);
      
      // If storage is full, try to clear some space
      if (error.name === 'QuotaExceededError') {
        this.performCacheEviction(this.getStorage(cacheType), cacheType);
      }
    }
    } catch (keyError) {
      console.warn('[CACHE ERROR] Failed to generate cache key for set operation:', keyError.message);
      // Continue without caching to not break the API request
    }
  }

  /**
   * Check if cache entry is still valid
   */
  isValidCacheEntry(cacheEntry, cacheType) {
    if (!cacheEntry || !cacheEntry.timestamp) return false;
    
    const config = CACHE_CONFIG[cacheType];
    if (!config) return false;
    
    const age = Date.now() - cacheEntry.timestamp;
    return age < config.ttl;
  }

  /**
   * Check storage quota
   */
  checkStorageQuota(storage, key, data) {
    try {
      const testData = JSON.stringify(data);
      const currentSize = this.getStorageSize(storage);
      const newItemSize = key.length + testData.length;
      
      return (currentSize + newItemSize) < CACHE_CONFIG.MAX_STORAGE_SIZE;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get storage size
   */
  getStorageSize(storage) {
    let size = 0;
    for (let key in storage) {
      if (storage.hasOwnProperty(key)) {
        size += key.length + storage.getItem(key).length;
      }
    }
    return size;
  }

  /**
   * Perform cache eviction (LRU strategy)
   */
  performCacheEviction(storage, cacheType) {
    try {
      const keys = Object.keys(storage);
      const cacheEntries = [];

      // Collect entries of the same cache type
      keys.forEach(key => {
        if (key.startsWith(`${cacheType}:`)) {
          try {
            const data = JSON.parse(storage.getItem(key));
            cacheEntries.push({ key, data, timestamp: data.timestamp || 0 });
          } catch (e) {
            // Remove corrupted entries
            storage.removeItem(key);
          }
        }
      });

      // Sort by timestamp (oldest first)
      cacheEntries.sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25% of entries
      const removeCount = Math.max(1, Math.floor(cacheEntries.length * 0.25));
      for (let i = 0; i < removeCount; i++) {
        storage.removeItem(cacheEntries[i].key);
        this.memoryCache.delete(cacheEntries[i].key);
        this.cacheStats.evictions++;
      }

      console.log(`[CACHE EVICTION] Removed ${removeCount} entries from ${cacheType} cache`);
    } catch (error) {
      console.error('[CACHE ERROR] Failed to perform eviction:', error);
    }
  }

  /**
   * Initialize memory cache from storage on startup
   */
  initializeCacheFromStorage() {
    try {
      [localStorage, sessionStorage].forEach(storage => {
        const keys = Object.keys(storage);
        
        keys.forEach(key => {
          if (this.isCacheKey(key)) {
            try {
              const data = JSON.parse(storage.getItem(key));
              if (data && data.cacheType && this.isValidCacheEntry(data, data.cacheType)) {
                this.memoryCache.set(key, data);
              } else {
                storage.removeItem(key);
              }
            } catch (e) {
              storage.removeItem(key);
            }
          }
        });
      });
      
      console.log(`[CACHE INIT] Loaded ${this.memoryCache.size} entries into memory cache`);
    } catch (error) {
      console.error('[CACHE ERROR] Failed to initialize from storage:', error);
    }
  }

  /**
   * Check if key is a cache key
   */
  isCacheKey(key) {
    return Object.keys(CACHE_CONFIG).some(cacheType => key.startsWith(`${cacheType}:`));
  }

  /**
   * Setup cleanup interval
   */
  setupCleanupInterval() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries() {
    try {
      let removedCount = 0;

      // Clean memory cache
      for (const [key, data] of this.memoryCache.entries()) {
        if (!this.isValidCacheEntry(data, data.cacheType)) {
          this.memoryCache.delete(key);
          removedCount++;
        }
      }

      // Clean storage
      [localStorage, sessionStorage].forEach(storage => {
        const keys = Object.keys(storage);
        
        keys.forEach(key => {
          if (this.isCacheKey(key)) {
            try {
              const data = JSON.parse(storage.getItem(key));
              if (!this.isValidCacheEntry(data, data.cacheType)) {
                storage.removeItem(key);
                removedCount++;
              }
            } catch (e) {
              storage.removeItem(key);
              removedCount++;
            }
          }
        });
      });

      if (removedCount > 0) {
        console.log(`[CACHE CLEANUP] Removed ${removedCount} expired entries`);
      }
    } catch (error) {
      console.error('[CACHE ERROR] Cleanup failed:', error);
    }
  }

  /**
   * Clear cache by type or pattern
   */
  clear(cacheType = null, pattern = null) {
    if (cacheType) {
      // Clear specific cache type
      const keysToRemove = [];
      
      for (const key of this.memoryCache.keys()) {
        if (key.startsWith(`${cacheType}:`)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        this.memoryCache.delete(key);
        [localStorage, sessionStorage].forEach(storage => {
          storage.removeItem(key);
        });
      });
      
      console.log(`[CACHE CLEAR] Cleared ${keysToRemove.length} entries from ${cacheType} cache`);
    } else {
      // Clear all caches
      this.memoryCache.clear();
      this.clearAllStorageCaches();
      console.log('[CACHE CLEAR] Cleared all caches');
    }
  }

  /**
   * Clear all cache entries from storage
   */
  clearAllStorageCaches() {
    [localStorage, sessionStorage].forEach(storage => {
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (this.isCacheKey(key)) {
          storage.removeItem(key);
        }
      });
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const memorySize = this.memoryCache.size;
    const storageSize = this.getStorageSize(localStorage) + this.getStorageSize(sessionStorage);
    
    return {
      ...this.cacheStats,
      memoryEntries: memorySize,
      storageSize: `${(storageSize / 1024 / 1024).toFixed(2)} MB`,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100 || 0
    };
  }

  /**
   * Destroy cache instance
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.memoryCache.clear();
  }
}

// Create singleton instance
export const apiCache = new APIResponseCache();

// Export cache types for use in other modules
export const CACHE_TYPES = {
  PLAYER_DATA: 'PLAYER_DATA',
  MATCH_HISTORY: 'MATCH_HISTORY',
  MATCH_DETAILS: 'MATCH_DETAILS',
  HERO_DATA: 'HERO_DATA',
  CS2_DATA: 'CS2_DATA',
  META_DATA: 'META_DATA',
  SESSION_DATA: 'SESSION_DATA'
};

export default apiCache;
