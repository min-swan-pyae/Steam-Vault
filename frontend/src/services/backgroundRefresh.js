/**
 * Background Data Refreshing Service
 * Handles automatic cache updates and data synchronization
 */

import { apiCache, CACHE_TYPES } from './apiCache.js';
import api from './api.js';

class BackgroundRefreshService {
  constructor() {
    this.refreshIntervals = new Map();
    this.isActive = false; // PERMANENTLY DISABLED to prevent price API call rate limiting
    this.refreshQueue = [];
    this.currentlyRefreshing = new Set();
    
    // Configuration for different data types
    this.refreshConfig = {
      [CACHE_TYPES.PLAYER_DATA]: { 
        interval: 30 * 60 * 1000, // 30 minutes
        priority: 'normal',
        retryAttempts: 3
      },
      [CACHE_TYPES.MATCH_HISTORY]: { 
        interval: 15 * 60 * 1000, // 15 minutes
        priority: 'high',
        retryAttempts: 2
      },
      [CACHE_TYPES.MATCH_DETAILS]: { 
        interval: 60 * 60 * 1000, // 1 hour
        priority: 'low',
        retryAttempts: 2
      },
      [CACHE_TYPES.HERO_DATA]: { 
        interval: 6 * 60 * 60 * 1000, // 6 hours
        priority: 'low',
        retryAttempts: 1
      },
      [CACHE_TYPES.CS2_DATA]: { 
        interval: 30 * 60 * 1000, // 30 minutes
        priority: 'normal',
        retryAttempts: 2
      },
      [CACHE_TYPES.META_DATA]: { 
        interval: 60 * 60 * 1000, // 1 hour
        priority: 'normal',
        retryAttempts: 2
      }
    };

    // DISABLED: Background refresh to prevent price API rate limiting
    // this.setupVisibilityHandling();
    // this.setupNetworkHandling();
    // this.startBackgroundRefresh();
    
  }

  /**
   * Start background refresh for all cached data
   */
  startBackgroundRefresh() {
    Object.keys(this.refreshConfig).forEach(cacheType => {
      this.scheduleRefresh(cacheType);
    });

  }

  /**
   * Schedule refresh for a specific cache type
   */
  scheduleRefresh(cacheType) {
    const config = this.refreshConfig[cacheType];
    if (!config || this.refreshIntervals.has(cacheType)) return;

    const intervalId = setInterval(() => {
      if (this.isActive) {
        this.refreshCacheType(cacheType);
      }
    }, config.interval);

    this.refreshIntervals.set(cacheType, intervalId);
  }

  /**
   * Refresh all entries of a specific cache type
   */
  async refreshCacheType(cacheType) {
    if (this.currentlyRefreshing.has(cacheType)) {
      return;
    }

    this.currentlyRefreshing.add(cacheType);

    try {
      const entries = this.getCachedEntries(cacheType);

      // Process entries in batches to avoid overwhelming the server
      const batchSize = this.getBatchSize(cacheType);
      const batches = this.createBatches(entries, batchSize);

      for (const batch of batches) {
        await this.processBatch(batch, cacheType);
        
        // Small delay between batches
        await this.delay(500);
      }

    } catch (error) {
      console.error(`[BACKGROUND REFRESH] Error refreshing ${cacheType}:`, error);
    } finally {
      this.currentlyRefreshing.delete(cacheType);
    }
  }

  /**
   * Get cached entries for a specific type
   */
  getCachedEntries(cacheType) {
    const entries = [];
    
    // Check localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${cacheType}:`)) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data && data.endpoint) {
            entries.push({
              key,
              endpoint: data.endpoint,
              params: data.params || {},
              timestamp: data.timestamp
            });
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by timestamp (oldest first for refresh priority)
    return entries.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get appropriate batch size for cache type
   */
  getBatchSize(cacheType) {
    const config = this.refreshConfig[cacheType];
    
    switch (config.priority) {
      case 'high': return 3;
      case 'normal': return 2;
      case 'low': return 1;
      default: return 2;
    }
  }

  /**
   * Create batches from entries array
   */
  createBatches(entries, batchSize) {
    const batches = [];
    for (let i = 0; i < entries.length; i += batchSize) {
      batches.push(entries.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process a batch of refresh requests
   */
  async processBatch(batch, cacheType) {
    const promises = batch.map(entry => 
      this.refreshEntry(entry, cacheType).catch(error => {
        console.error(`[BACKGROUND REFRESH] Failed to refresh ${entry.endpoint}:`, error);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  /**
   * Refresh a single cache entry
   */
  async refreshEntry(entry, cacheType) {
    const { endpoint, params } = entry;
    const config = this.refreshConfig[cacheType];

    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
      try {
        const response = await api.get(endpoint, { 
          params, 
          _skipCache: true // Skip cache for refresh
        });

        if (response) {
          apiCache.set(endpoint, params, response, cacheType);
          return response;
        }
      } catch (error) {
        if (attempt === config.retryAttempts) {
          throw error;
        }
        
        // Exponential backoff for retries
        await this.delay(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  /**
   * Smart refresh based on user activity and data age
   */
  async smartRefresh() {
    const now = Date.now();
    const urgentRefreshThreshold = 5 * 60 * 1000; // 5 minutes
    
    Object.keys(this.refreshConfig).forEach(cacheType => {
      const entries = this.getCachedEntries(cacheType);
      
      // Find entries that need urgent refresh
      const urgentEntries = entries.filter(entry => {
        const age = now - entry.timestamp;
        const maxAge = this.refreshConfig[cacheType].interval;
        return age > (maxAge - urgentRefreshThreshold);
      });

      if (urgentEntries.length > 0) {
        this.processBatch(urgentEntries.slice(0, 3), cacheType); // Limit to 3 urgent items
      }
    });
  }

  /**
   * Handle page visibility changes
   */
  setupVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
        // Perform smart refresh when page becomes visible
        setTimeout(() => this.smartRefresh(), 1000);
      }
    });
  }

  /**
   * Handle network connectivity changes
   */
  setupNetworkHandling() {
    window.addEventListener('online', () => {
      this.resume();
      setTimeout(() => this.smartRefresh(), 2000);
    });

    window.addEventListener('offline', () => {
      this.pause();
    });
  }

  /**
   * Pause background refresh
   */
  pause() {
    this.isActive = false;
  }

  /**
   * Resume background refresh
   */
  resume() {
    this.isActive = true;
  }

  /**
   * Stop background refresh service
   */
  stop() {
    this.isActive = false;
    
    // Clear all intervals
    for (const intervalId of this.refreshIntervals.values()) {
      clearInterval(intervalId);
    }
    
    this.refreshIntervals.clear();
  }

  /**
   * Manually trigger refresh for specific data
   */
  async refreshNow(endpoint, params = {}, cacheType = CACHE_TYPES.PLAYER_DATA) {
    try {
      console.log(`[MANUAL REFRESH] ${endpoint}`);
      return await this.refreshEntry({ endpoint, params }, cacheType);
    } catch (error) {
      console.error(`[MANUAL REFRESH] Failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get refresh service statistics
   */
  getStats() {
    const stats = {
      isActive: this.isActive,
      activeRefreshes: this.currentlyRefreshing.size,
      scheduledRefreshes: this.refreshIntervals.size,
      queuedRefreshes: this.refreshQueue.length
    };

    Object.keys(this.refreshConfig).forEach(cacheType => {
      const entries = this.getCachedEntries(cacheType);
      stats[`${cacheType}_entries`] = entries.length;
      
      if (entries.length > 0) {
        const oldestEntry = Math.min(...entries.map(e => e.timestamp));
        const newestEntry = Math.max(...entries.map(e => e.timestamp));
        stats[`${cacheType}_age_range`] = {
          oldest: new Date(oldestEntry).toISOString(),
          newest: new Date(newestEntry).toISOString()
        };
      }
    });

    return stats;
  }

  /**
   * Utility: Delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const backgroundRefreshService = new BackgroundRefreshService();

export default backgroundRefreshService;
