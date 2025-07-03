import { imageCacheConfig } from '../config/heroConfig';

class ImageCache {
  constructor() {
    this.cacheKey = 'dota2_image_cache';
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
    } catch (error) {
      console.error('Failed to initialize image cache:', error);
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
      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to set cache:', error);
      this.clearOldEntries();
    }
  }

  async getImage(url) {
    const cache = this.getCache();
    const now = Date.now();
    
    // Check if image exists in cache and is not expired
    if (cache.images[url]) {
      if (now - cache.timestamps[url] < imageCacheConfig.maxAge) {
        return cache.images[url];
      } else {
        // Remove expired entry
        this.removeEntry(url);
      }
    }

    try {
      // Fetch and cache new image
      const response = await fetch(url);
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);
      
      this.addEntry(url, base64);
      return base64;
    } catch (error) {
      console.error('Failed to fetch and cache image:', error);
      return null;
    }
  }

  addEntry(url, base64) {
    const cache = this.getCache();
    
    // Remove oldest entry if cache is full
    if (cache.size >= imageCacheConfig.maxSize) {
      const oldestUrl = Object.keys(cache.timestamps).reduce((a, b) => 
        cache.timestamps[a] < cache.timestamps[b] ? a : b
      );
      this.removeEntry(oldestUrl);
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
    cache.size--;
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

  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
}

export const imageCache = new ImageCache(); 