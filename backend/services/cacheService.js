import NodeCache from 'node-cache';

/**
 * Centralized cache service with different TTL strategies
 * This provides better cache management and monitoring
 */
class CacheService {
  constructor() {
    // Different cache instances for different types of data
    this.caches = {
      // Static data that rarely changes
      heroData: new NodeCache({ 
        stdTTL: 86400 * 7, // 7 days
        checkperiod: 3600,  // Check for expired keys every hour
        useClones: false    // Better performance for static data
      }),
      
      // Player profiles and stats
      playerData: new NodeCache({ 
        stdTTL: 3600,      // 1 hour
        checkperiod: 600,   // Check every 10 minutes
        useClones: false
      }),
      
      // Match data
      matchData: new NodeCache({ 
        stdTTL: 7200,      // 2 hours
        checkperiod: 600,
        useClones: false
      }),
      
      // Match history
      matchHistory: new NodeCache({ 
        stdTTL: 900,       // 15 minutes
        checkperiod: 300,   // Check every 5 minutes
        useClones: false
      }),
      
      // Meta and pro player data
      metaData: new NodeCache({ 
        stdTTL: 3600,      // 1 hour
        checkperiod: 600,
        useClones: false
      }),
      
      // Images and static assets
      imageData: new NodeCache({ 
        stdTTL: 86400 * 30, // 30 days
        checkperiod: 3600,
        useClones: false
      }),
      
      // CS2 specific data
      cs2Data: new NodeCache({ 
        stdTTL: 1800,      // 30 minutes
        checkperiod: 300,
        useClones: false
      }),
      
      // Market data (prices, searches)
      // Increased TTL to reduce Steam API calls and prevent 429 rate limiting
      marketData: new NodeCache({
        stdTTL: 900,       // 15 minutes (was 5 minutes)
        checkperiod: 300,
        useClones: false
      }),
      
      // API rate limiting cache
      rateLimiting: new NodeCache({ 
        stdTTL: 60,        // 1 minute
        checkperiod: 60,
        useClones: false
      })
    };

    // Cache hit/miss statistics
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };

    // Request deduplication map
    this.pendingRequests = new Map();
    
    // Background warming interval
    this.warmingInterval = null;
    
    // Set up event listeners and start background tasks
    this.setupEventListeners();
    this.startBackgroundTasks();
  }

  setupEventListeners() {
    Object.keys(this.caches).forEach(cacheType => {
      const cache = this.caches[cacheType];
      
      cache.on('set', (key, value) => {
        this.stats.sets++;
      });

      cache.on('del', (key, value) => {
      });

      cache.on('expired', (key, value) => {
      });
    });
  }

  /**
   * Get data from cache
   */
  get(cacheType, key) {
    const cache = this.caches[cacheType];
    if (!cache) {
      console.error(`Cache type ${cacheType} not found`);
      return undefined;
    }

    const value = cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
    } else {
      this.stats.misses++;
    }
    
    return value;
  }

  /**
   * Set data in cache
   */
  set(cacheType, key, value, ttl = null) {
    const cache = this.caches[cacheType];
    if (!cache) {
      console.error(`Cache type ${cacheType} not found`);
      return false;
    }

    return cache.set(key, value, ttl);
  }

  /**
   * Delete data from cache
   */
  del(cacheType, key) {
    const cache = this.caches[cacheType];
    if (!cache) {
      console.error(`Cache type ${cacheType} not found`);
      return false;
    }

    return cache.del(key);
  }

  /**
   * Check if key exists in cache
   */
  has(cacheType, key) {
    const cache = this.caches[cacheType];
    if (!cache) {
      console.error(`Cache type ${cacheType} not found`);
      return false;
    }

    return cache.has(key);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = {};
    
    Object.keys(this.caches).forEach(cacheType => {
      const cache = this.caches[cacheType];
      cacheStats[cacheType] = {
        keys: cache.keys().length,
        hitCount: cache.getStats().hits,
        missCount: cache.getStats().misses,
        vsize: cache.getStats().vsize,
        ksize: cache.getStats().ksize
      };
    });

    return {
      global: this.stats,
      caches: cacheStats,
      totalMemoryUsage: this.getTotalMemoryUsage()
    };
  }

  /**
   * Get total memory usage across all caches
   */
  getTotalMemoryUsage() {
    let totalSize = 0;
    Object.keys(this.caches).forEach(cacheType => {
      const stats = this.caches[cacheType].getStats();
      totalSize += stats.vsize + stats.ksize;
    });
    return totalSize;
  }

  /**
   * Clear specific cache
   */
  clearCache(cacheType) {
    const cache = this.caches[cacheType];
    if (!cache) {
      console.error(`Cache type ${cacheType} not found`);
      return false;
    }

    cache.flushAll();
    return true;
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    Object.keys(this.caches).forEach(cacheType => {
      this.caches[cacheType].flushAll();
    });
    
    this.stats = { hits: 0, misses: 0, sets: 0 };
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidateByPattern(cacheType, pattern) {
    const cache = this.caches[cacheType];
    if (!cache) {
      console.error(`Cache type ${cacheType} not found`);
      return false;
    }

    const keys = cache.keys();
    const regex = new RegExp(pattern);
    const deletedKeys = [];

    keys.forEach(key => {
      if (regex.test(key)) {
        cache.del(key);
        deletedKeys.push(key);
      }
    });

    return deletedKeys;
  }

  /**
   * Get or set pattern - if key doesn't exist, execute function and cache result
   */
  async getOrSet(cacheType, key, asyncFunction, ttl = null) {
    let value = this.get(cacheType, key);
    
    if (value === undefined) {
      try {
        value = await asyncFunction();
        this.set(cacheType, key, value, ttl);
      } catch (error) {
        console.error(`[CACHE ERROR] Failed to execute function for key ${key}:`, error);
        throw error;
      }
    }
    
    return value;
  }

  /**
   * Deduplicated get or set - prevents multiple identical requests
   */
  async getOrSetDeduped(cacheType, key, asyncFunction, ttl = null) {
    // Check cache first
    let value = this.get(cacheType, key);
    if (value !== undefined) {
      return value;
    }

    // Check if request is already pending
    const requestKey = `${cacheType}:${key}`;
    if (this.pendingRequests.has(requestKey)) {
      return this.pendingRequests.get(requestKey);
    }

    // Execute function and cache the promise
    const promise = asyncFunction()
      .then(result => {
        this.set(cacheType, key, result, ttl);
        this.pendingRequests.delete(requestKey);
        return result;
      })
      .catch(error => {
        this.pendingRequests.delete(requestKey);
        throw error;
      });

    this.pendingRequests.set(requestKey, promise);
    return promise;
  }

  /**
   * Start background cache warming tasks
   */
  startBackgroundTasks() {
    // Warm hero data every 6 hours
    this.warmingInterval = setInterval(() => {
      this.warmHeroData();
    }, 6 * 60 * 60 * 1000);

    // Initial warming
    setTimeout(() => this.warmHeroData(), 5000);
  }

  /**
   * Warm hero data cache in background
   */
  async warmHeroData() {
    try {
      
      // Warm hero list
      if (!this.has(CACHE_TYPES.HERO_DATA, 'all_heroes')) {
        // This would typically call your hero loading function
      }
      
    } catch (error) {
      console.error('[CACHE WARMING] Error warming hero data:', error);
    }
  }

  /**
   * Stop background tasks
   */
  stopBackgroundTasks() {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
  }

  /**
   * Preload cache with data
   */
  async preload(cacheType, dataLoader) {
    try {
      await dataLoader(this.caches[cacheType]);
    } catch (error) {
      console.error(`[CACHE PRELOAD ERROR] Failed to preload ${cacheType}:`, error);
    }
  }
}

// Create singleton instance
export const cacheService = new CacheService();

// Cache type constants for better code maintainability
export const CACHE_TYPES = {
  HERO_DATA: 'heroData',
  PLAYER_DATA: 'playerData', 
  MATCH_DATA: 'matchData',
  MATCH_HISTORY: 'matchHistory',
  META_DATA: 'metaData',
  IMAGE_DATA: 'imageData',
  CS2_DATA: 'cs2Data',
  MARKET_DATA: 'marketData',
  RATE_LIMITING: 'rateLimiting'
};

export default cacheService;
