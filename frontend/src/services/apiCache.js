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
  FORUM_DATA: { ttl: 15 * 60 * 1000, storage: 'localStorage' }, // forum listing + post details, shorter TTL
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
      const dataString = JSON.stringify(cacheEntry);
      
      // Skip caching if data is too large (> 5MB)
      if (dataString.length > 5 * 1024 * 1024) {
        console.warn(`[CACHE WARNING] Data too large to cache (${(dataString.length / 1024 / 1024).toFixed(2)}MB), skipping: ${cacheKey}`);
        return;
      }
      
      // Check storage quota before writing
      if (this.checkStorageQuota(storage, cacheKey, cacheEntry)) {
        storage.setItem(cacheKey, dataString);
        this.cacheStats.writes++;
      } else {
        console.warn(`[CACHE WARNING] Storage quota exceeded for ${cacheKey}, performing eviction...`);
        this.performCacheEviction(storage, cacheType);
        // Try again after eviction
        try {
          storage.setItem(cacheKey, dataString);
          this.cacheStats.writes++;
        } catch (retryError) {
          console.warn(`[CACHE WARNING] Still can't cache after eviction, skipping: ${cacheKey}`);
        }
      }
    } catch (error) {
      console.error('[CACHE ERROR] Failed to set in storage:', error);
      
      // If storage is full, try to clear some space
      if (error.name === 'QuotaExceededError') {
        this.performCacheEviction(this.getStorage(cacheType), cacheType);
        // Don't retry, just skip this cache write
        console.warn(`[CACHE WARNING] Quota exceeded, skipped caching: ${cacheKey}`);
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
      
    } else {
      // Clear all caches
      this.memoryCache.clear();
      this.clearAllStorageCaches();
    }
  }

  /**
   * Clear cache entries matching a URL pattern
   */
  clearByPattern(urlPattern, cacheType = null) {
    const keysToRemove = [];
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (cacheType && !key.startsWith(`${cacheType}:`)) continue;
      if (entry.endpoint && entry.endpoint.includes(urlPattern)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => {
      this.memoryCache.delete(key);
      [localStorage, sessionStorage].forEach(storage => {
        storage.removeItem(key);
      });
    });
    
    if (keysToRemove.length > 0) {
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
   * Cleanup old/expired entries (called by cache manager)
   */
  cleanup() {
    
    // Clean memory cache
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValidCacheEntry(entry, entry.cacheType)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean storage caches
    [localStorage, sessionStorage].forEach(storage => {
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (this.isCacheKey(key)) {
          try {
            const entry = JSON.parse(storage.getItem(key));
            if (!this.isValidCacheEntry(entry, entry.cacheType)) {
              storage.removeItem(key);
              cleaned++;
            }
          } catch (e) {
            // Invalid entry, remove it
            storage.removeItem(key);
            cleaned++;
          }
        }
      });
    });
    
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
  SESSION_DATA: 'SESSION_DATA',
  FORUM_DATA: 'FORUM_DATA'
};

export default apiCache;
