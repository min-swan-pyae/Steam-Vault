import { imageCacheConfig, cdnConfig } from '../config/heroConfig';

class ImageCache {
  constructor() {
    this.cacheKey = 'dota2_image_cache';
    this.memoryCache = new Map(); // Add memory cache for faster access
    this.preloadQueue = new Set(); // Track preloading images
    this.preloadPromises = new Map(); // Track ongoing preload promises
    this.intersectionObserver = null; // For lazy loading
    this.prefetchBatch = []; // Batch prefetch requests
    this.prefetchTimer = null;
    
    this.init();
    this.setupIntersectionObserver();
  }

  init() {
    try {
      const cache = localStorage.getItem(this.cacheKey);
      if (!cache) {
        localStorage.setItem(this.cacheKey, JSON.stringify({
          images: {},
          timestamps: {},
          size: 0
        }));
      }
      // Preload memory cache from localStorage
      this.loadMemoryCache();
      this.startBackgroundTasks();
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
    }
  }

  /**
   * Setup intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              this.loadImage(src).then(base64 => {
                if (base64 && base64 !== this.getFallbackImage()) {
                  img.src = base64;
                  img.removeAttribute('data-src');
                }
              });
              this.intersectionObserver.unobserve(img);
            }
          }
        });
      }, {
        rootMargin: '50px' // Start loading 50px before image comes into view
      });
    }
  }

  /**
   * Register image for lazy loading
   */
  lazyLoad(imgElement, src) {
    if (this.intersectionObserver && imgElement) {
      imgElement.dataset.src = src;
      this.intersectionObserver.observe(imgElement);
      
      // Set placeholder while loading
      imgElement.src = this.getFallbackImage();
    }
  }

  /**
   * Enhanced preload with priority and batching
   */
  async preloadHeroImages(heroIds, priority = 'normal') {
    const promises = heroIds.map(heroId => {
      const url = `/heroes/${heroId}.png`;
      return this.priorityPreload(url, priority);
    });
    
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    return results;
  }

  /**
   * Priority-based preloading
   */
  async priorityPreload(url, priority = 'normal') {
    // Check if already cached
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url);
    }

    // Check if already preloading
    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url);
    }

    const preloadPromise = this.loadImageWithPriority(url, priority);
    this.preloadPromises.set(url, preloadPromise);
    
    try {
      const result = await preloadPromise;
      this.preloadPromises.delete(url);
      return result;
    } catch (error) {
      this.preloadPromises.delete(url);
      throw error;
    }
  }

  /**
   * Load image with priority (high/normal/low)
   */
  async loadImageWithPriority(url, priority = 'normal') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set priority attributes for modern browsers
      if (priority === 'high') {
        img.loading = 'eager';
        img.fetchPriority = 'high';
      } else if (priority === 'low') {
        img.loading = 'lazy';
        img.fetchPriority = 'low';
      }
      
      img.onload = async () => {
        try {
          // Convert to base64
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          
          const base64 = canvas.toDataURL('image/png');
          
          // Cache the result
          this.addEntry(url, base64);
          this.memoryCache.set(url, base64);
          
          resolve(base64);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Batch prefetch images to avoid overwhelming the browser
   */
  batchPrefetch(urls, batchSize = 5, delay = 100) {
    return new Promise((resolve) => {
      const results = [];
      let index = 0;

      const processBatch = async () => {
        const batch = urls.slice(index, index + batchSize);
        if (batch.length === 0) {
          resolve(results);
          return;
        }

        const batchPromises = batch.map(url => 
          this.priorityPreload(url, 'low').catch(error => ({ error, url }))
        );

        const batchResults = await Promise.allSettled(batchPromises);
        results.push(...batchResults);
        
        index += batchSize;
        
        // Small delay between batches to prevent blocking
        setTimeout(processBatch, delay);
      };

      processBatch();
    });
  }

  /**
   * Smart preloading based on usage patterns
   */
  async smartPreload() {
    try {
      const cache = this.getCache();
      const now = Date.now();
      
      // Find frequently accessed images
      const frequentImages = Object.keys(cache.timestamps)
        .filter(url => {
          const age = now - cache.timestamps[url];
          return age < 7 * 24 * 60 * 60 * 1000; // Last 7 days
        })
        .sort((a, b) => cache.timestamps[b] - cache.timestamps[a])
        .slice(0, 20); // Top 20 most recent
      
      
      await this.batchPrefetch(frequentImages, 3, 200);
    } catch (error) {
      console.error('[SMART PRELOAD] Error:', error);
    }
  }

  /**
   * Start background tasks
   */
  startBackgroundTasks() {
    // Smart preload every 10 minutes
    setInterval(() => {
      this.smartPreload();
    }, 10 * 60 * 1000);

    // Cleanup old entries every 5 minutes
    setInterval(() => {
      this.clearOldEntries();
    }, 5 * 60 * 1000);

    // Initial smart preload after 2 seconds
    setTimeout(() => {
      this.smartPreload();
    }, 2000);
  }

  /**
   * Enhanced getImage with better fallback handling
   */
  async getImage(url) {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url);
    }

    const cache = this.getCache();
    const now = Date.now();
    
    // Check localStorage cache
    if (cache.images[url]) {
      if (now - cache.timestamps[url] < imageCacheConfig.maxAge) {
        const image = cache.images[url];
        this.memoryCache.set(url, image); // Add to memory cache
        return image;
      } else {
        // Remove expired entry
        this.removeEntry(url);
      }
    }

    try {
      // Load image with retry logic
      return await this.loadImageWithRetry(url);
    } catch (error) {
      console.error(`Failed to fetch image ${url}:`, error);
      return this.getFallbackImage();
    }
  }

  /**
   * Load image with retry logic
   */
  async loadImageWithRetry(url, maxRetries = 2) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

        const response = await fetch(url, { 
          signal: controller.signal,
          cache: 'force-cache' // Use browser cache if available
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);
        
        this.addEntry(url, base64);
        this.memoryCache.set(url, base64);
        return base64;
      } catch (error) {
        // If aborted, don't retry (component probably unmounted)
        if (error.name === 'AbortError') {
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff only for network errors
        await new Promise(resolve => setTimeout(resolve, 500 * attempt));
      }
    }
  }

  loadMemoryCache() {
    try {
      const cache = this.getCache();
      const now = Date.now();
      
      Object.keys(cache.images).forEach(url => {
        // Only load non-expired images to memory
        if (now - cache.timestamps[url] < imageCacheConfig.maxAge) {
          this.memoryCache.set(url, cache.images[url]);
        }
      });
    } catch (error) {
      console.error('Failed to load memory cache:', error);
    }
  }

  getCache() {
    try {
      return JSON.parse(localStorage.getItem(this.cacheKey)) || {
        images: {},
        timestamps: {},
        size: 0
      };
    } catch (error) {
      console.error('Failed to get cache:', error);
      return {
        images: {},
        timestamps: {},
        size: 0
      };
    }
  }

  setCache(cache) {
    try {
      // Check localStorage quota before saving
      const cacheString = JSON.stringify(cache);
      if (cacheString.length > 2 * 1024 * 1024) { // Reduced to 2MB limit
        console.warn('[IMAGE CACHE] Cache size limit reached, cleaning old entries');
        this.clearOldEntries();
        return;
      }
      localStorage.setItem(this.cacheKey, cacheString);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[IMAGE CACHE] LocalStorage quota exceeded, clearing cache');
        this.clearCache();
        // Try again with empty cache
        try {
          localStorage.setItem(this.cacheKey, JSON.stringify({
            images: {},
            timestamps: {},
            size: 0
          }));
        } catch (e) {
          console.error('[IMAGE CACHE] Failed to reset cache:', e);
        }
      } else {
        console.error('[IMAGE CACHE] Failed to set cache:', error);
      }
    }
  }

  async getImage(url) {
    // Check memory cache first (fastest)
    if (this.memoryCache.has(url)) {
      return this.memoryCache.get(url);
    }

    const cache = this.getCache();
    const now = Date.now();
    
    // Check localStorage cache
    if (cache.images[url]) {
      if (now - cache.timestamps[url] < imageCacheConfig.maxAge) {
        const image = cache.images[url];
        this.memoryCache.set(url, image); // Add to memory cache
        return image;
      } else {
        // Remove expired entry
        this.removeEntry(url);
      }
    }

    try {
      // Load image with retry logic
      return await this.loadImageWithRetry(url);
    } catch (error) {
      // Don't log AbortError as it's expected when components unmount
      if (error.name !== 'AbortError') {
        console.warn(`Failed to fetch image ${url}:`, error.message);
      }
      return this.getFallbackImage();
    }
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      if (!blob) {
        resolve(this.getFallbackImage());
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  getFallbackImage() {
    // Return a default hero placeholder image
    return cdnConfig.fallbackHero;
  }

  addEntry(url, base64) {
    const cache = this.getCache();
    
    // Remove oldest entries if cache is full
    while (cache.size >= imageCacheConfig.maxSize) {
      const oldestUrl = Object.keys(cache.timestamps).reduce((a, b) => 
        cache.timestamps[a] < cache.timestamps[b] ? a : b
      );
      this.removeEntry(oldestUrl);
      cache.size--;
    }

    // Add new entry
    cache.images[url] = base64;
    cache.timestamps[url] = Date.now();
    cache.size++;
    
    this.setCache(cache);
  }

  removeEntry(url) {
    const cache = this.getCache();
    delete cache.images[url];
    delete cache.timestamps[url];
    if (cache.size > 0) cache.size--;
    this.memoryCache.delete(url);
    this.setCache(cache);
  }

  clearOldEntries() {
    const cache = this.getCache();
    const now = Date.now();
    
    Object.keys(cache.timestamps).forEach(url => {
      if (now - cache.timestamps[url] >= imageCacheConfig.maxAge) {
        this.removeEntry(url);
      }
    });
  }

  /**
   * Optimized image component with caching
   */
  createOptimizedImage(src, alt = '', className = '', options = {}) {
    const img = document.createElement('img');
    img.alt = alt;
    img.className = className;
    
    const {
      lazy = false,
      priority = 'normal',
      placeholder = true,
      onLoad = null,
      onError = null
    } = options;

    if (placeholder) {
      img.src = this.getFallbackImage();
    }

    if (lazy && this.intersectionObserver) {
      this.lazyLoad(img, src);
    } else {
      this.getImage(src).then(base64 => {
        if (base64 && base64 !== this.getFallbackImage()) {
          img.src = base64;
          if (onLoad) onLoad(img);
        }
      }).catch(error => {
        console.error('Error loading image:', error);
        if (onError) onError(error);
      });
    }

    return img;
  }

  /**
   * React hook integration
   */
  useImageCache() {
    return {
      getImage: this.getImage.bind(this),
      preloadHeroImages: this.preloadHeroImages.bind(this),
      createOptimizedImage: this.createOptimizedImage.bind(this),
      clearCache: this.clearCache.bind(this),
      getStats: () => ({
        memorySize: this.memoryCache.size,
        storageSize: this.getCache().size,
        ...this.getCache()
      })
    };
  }

  /**
   * Enhanced cache statistics
   */
  getDetailedStats() {
    const cache = this.getCache();
    const now = Date.now();
    
    let totalSize = 0;
    let oldEntries = 0;
    
    Object.keys(cache.images).forEach(url => {
      totalSize += cache.images[url].length;
      if (now - cache.timestamps[url] > imageCacheConfig.maxAge) {
        oldEntries++;
      }
    });

    return {
      totalEntries: Object.keys(cache.images).length,
      memoryEntries: this.memoryCache.size,
      totalSizeKB: Math.round(totalSize / 1024),
      oldEntries,
      preloadingCount: this.preloadPromises.size,
      cacheHitRate: this.calculateHitRate()
    };
  }

  /**
   * Calculate cache hit rate (approximate)
   */
  calculateHitRate() {
    // This is a simplified hit rate calculation
    // In a real app, you'd track hits/misses more precisely
    const cache = this.getCache();
    const totalRequests = Object.keys(cache.images).length;
    const memoryHits = this.memoryCache.size;
    
    return totalRequests > 0 ? (memoryHits / totalRequests * 100).toFixed(1) : 0;
  }

  // ...existing methods...

  /**
   * Clear all cache
   */
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      this.memoryCache.clear();
      this.preloadPromises.clear();
      this.init();
      console.log('[IMAGE CACHE] Cache cleared');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Cleanup method for cache manager
   * Removes expired entries and manages cache size
   */
  cleanup() {
    try {
      console.log('[IMAGE CACHE] Running cleanup...');
      
      const cache = this.getCache();
      const now = Date.now();
      let removedCount = 0;
      
      // Remove expired entries
      Object.keys(cache.timestamps).forEach(url => {
        if (now - cache.timestamps[url] >= imageCacheConfig.maxAge) {
          this.removeEntry(url);
          removedCount++;
        }
      });

      // If still too large, remove least recently used
      const currentSize = JSON.stringify(cache).length;
      if (currentSize > 1.5 * 1024 * 1024) { // If over 1.5MB
        const sortedUrls = Object.keys(cache.timestamps)
          .sort((a, b) => cache.timestamps[a] - cache.timestamps[b]);
        
        // Remove oldest 30% of entries
        const toRemove = Math.ceil(sortedUrls.length * 0.3);
        for (let i = 0; i < toRemove; i++) {
          this.removeEntry(sortedUrls[i]);
          removedCount++;
        }
      }

      console.log(`[IMAGE CACHE] Cleanup completed. Removed ${removedCount} entries.`);
      
      return removedCount;
    } catch (error) {
      console.error('[IMAGE CACHE] Cleanup failed:', error);
      return 0;
    }
  }
}

export const imageCache = new ImageCache();