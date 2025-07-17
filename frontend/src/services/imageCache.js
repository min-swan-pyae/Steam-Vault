import { imageCacheConfig } from '../config/heroConfig';

class ImageCache {
  constructor() {
    this.cacheKey = 'dota2_image_cache';
    this.memoryCache = new Map(); // Add memory cache for faster access
    this.init();
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
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
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
      if (cacheString.length > 5 * 1024 * 1024) { // 5MB limit
        this.clearOldEntries();
        return;
      }
      localStorage.setItem(this.cacheKey, cacheString);
    } catch (error) {
      console.error('Failed to set cache (quota exceeded):', error);
      this.clearOldEntries();
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
      // Fetch and cache new image with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
      console.error(`Failed to fetch image ${url}:`, error);
      // Return a fallback or placeholder image
      return this.getFallbackImage();
    }
  }

  getFallbackImage() {
    // Return a default hero placeholder image
    return '/heroes/default.png';
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

  // Preload hero images for better performance
  async preloadHeroImages(heroIds) {
    const promises = heroIds.map(heroId => 
      this.getImage(`/heroes/${heroId}.png`).catch(() => null)
    );
    await Promise.allSettled(promises);
  }

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Clear all cache
  clearCache() {
    try {
      localStorage.removeItem(this.cacheKey);
      this.memoryCache.clear();
      this.init();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

export const imageCache = new ImageCache();