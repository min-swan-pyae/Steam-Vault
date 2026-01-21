import axios from 'axios';
import { apiCache, CACHE_TYPES } from './apiCache.js';
import { backgroundRefreshService } from './backgroundRefresh.js';
import { requestQueue } from './requestQueue.js';
import { getApiBaseUrl } from '../utils/helpers.js';

// Create axios instance with better configuration
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for handling cookies with CORS
  timeout: 30000, // 30s timeout (increased to prevent failures on slow operations)
  retryDelay: 1000, // 1s delay between retries
  maxRetries: 3 // Retry failed requests 3 times (increased for network issues)
});

// Cache-first request wrapper with rate limiting and request queueing
const cachedRequest = async (config, cacheType = CACHE_TYPES.PLAYER_DATA, forceRefresh = false, useQueue = true) => {
  const { url, params, method } = config;
  
  // Only cache GET requests
  if (method && method.toLowerCase() !== 'get') {
    // Non-GET requests should still respect rate limits
    if (useQueue) {
      return requestQueue.enqueue(() => api(config), url, 1);
    }
    return api(config);
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    try {
      const cachedData = apiCache.get(url, params, cacheType);
      if (cachedData) {
        console.log('[API CACHE] Using cached data for', url);
        return Promise.resolve(cachedData);
      }
    } catch (cacheError) {
      console.warn('[API] Cache get failed, proceeding with API request:', cacheError.message);
      // Continue with API request if cache fails
    }
  }

  // Make API request through queue to prevent rate limiting
  const makeRequest = async () => {
    try {
      const response = await api(config);
      
      // Extract data from axios response
      const responseData = response.data;
      
      // Cache successful responses (cache the data, not the full response object)
      if (responseData !== undefined) {
        try {
          apiCache.set(url, params, responseData, cacheType);
          console.log('[API CACHE] Cached response for', url);
        } catch (cacheError) {
          console.warn('[API] Cache set failed, but API request succeeded:', cacheError.message);
          // Continue without caching - the response is still valid
        }
      }
      
      return responseData;
    } catch (error) {
      // If network error and we have stale cache data, return it as fallback
      if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.warn('[API] Network/timeout error, checking for stale cache...');
        const staleData = apiCache.get(url, params, cacheType);
        if (staleData) {
          console.warn('[API FALLBACK] Using stale cache data due to network error');
          return staleData;
        }
      }
      
      // For 429 errors, let the queue handle retries
      if (error?.response?.status === 429) {
        console.warn('[API] Rate limit (429) detected for', url);
      }
      
      throw error;
    }
  };

  // Use request queue for rate limiting protection
  if (useQueue) {
    return requestQueue.enqueue(makeRequest, url, 0);
  }
  
  return makeRequest();
};

// Enhanced API object with caching methods
const enhancedAPI = {
  // Original axios instance for non-cached requests
  raw: api,
  
  // Cached GET request with queue support
  get: (url, config = {}) => {
    const { cacheType = CACHE_TYPES.PLAYER_DATA, forceRefresh = false, useQueue = true, ...axiosConfig } = config;
    return cachedRequest({ ...axiosConfig, url, method: 'get' }, cacheType, forceRefresh, useQueue);
  },
  
  // Non-cached requests (optionally queued)
  post: (url, data, config = {}) => {
    const { useQueue = false, ...axiosConfig } = config;
    if (useQueue) {
      return requestQueue.enqueue(() => api.post(url, data, axiosConfig), url, 1);
    }
    return api.post(url, data, axiosConfig);
  },
  put: (url, data, config = {}) => {
    const { useQueue = false, ...axiosConfig } = config;
    if (useQueue) {
      return requestQueue.enqueue(() => api.put(url, data, axiosConfig), url, 1);
    }
    return api.put(url, data, axiosConfig);
  },
  delete: (url, config = {}) => {
    const { useQueue = false, ...axiosConfig } = config;
    if (useQueue) {
      return requestQueue.enqueue(() => api.delete(url, axiosConfig), url, 1);
    }
    return api.delete(url, axiosConfig);
  },
  patch: (url, data, config = {}) => {
    const { useQueue = false, ...axiosConfig } = config;
    if (useQueue) {
      return requestQueue.enqueue(() => api.patch(url, data, axiosConfig), url, 1);
    }
    return api.patch(url, data, axiosConfig);
  },
  
  // Cache management methods
  clearCache: (cacheType) => apiCache.clear(cacheType),
  clearCacheByPattern: (urlPattern, cacheType) => apiCache.clearByPattern(urlPattern, cacheType),
  getCacheStats: () => ({
    cache: apiCache.getStats(),
    queue: requestQueue.getStats()
  }),
  
  // Request queue methods
  getQueueStats: () => requestQueue.getStats(),
  configureQueue: (config) => requestQueue.configure(config),
  clearQueue: () => requestQueue.clear(),
  
  // Background refresh - updates cache without blocking UI
  backgroundRefresh: async (url, params = {}, cacheType = CACHE_TYPES.PLAYER_DATA) => {
    try {
      const response = await api.get(url, { params });
      apiCache.set(url, params, response, cacheType);
      console.log(`[BACKGROUND REFRESH] Updated cache for ${url}`);
      return response;
    } catch (error) {
      console.error(`[BACKGROUND REFRESH] Failed for ${url}:`, error);
    }
  }
};

// Add a request interceptor for authentication
enhancedAPI.raw.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Remove timestamp for cached requests to improve cache hit rate
    if (config.method === 'get' && !config._skipCache) {
      // Don't add timestamp for cached requests
    } else if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now()
      };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor for error handling and retries
let isRefreshing = false;
let failedQueue = [];

enhancedAPI.raw.interceptors.response.use(
  (response) => response, // Return full response object - makeRequest will extract .data
  async (error) => {
    const originalRequest = error.config;
    
    // If we've already tried to retry this request, reject
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle unauthorized access
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (typeof window !== 'undefined' && window.location) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Implement retry logic for 429 with Retry-After, network errors and 5xx responses
    const status = error.response?.status;
    const retryAfterHeader = error.response?.headers?.['retry-after'];
    let retryAfterMs = 0;
    if (retryAfterHeader) {
      const asInt = parseInt(retryAfterHeader, 10);
      if (!Number.isNaN(asInt)) retryAfterMs = asInt * 1000;
    }

    const isRetryable = (
      status === 429 ||
      error.message.includes('network') || 
      error.message.includes('timeout') || 
      (status && status >= 500)
    );

    if (isRetryable && originalRequest.retry < originalRequest.maxRetries) {
      
      originalRequest._retry = true;
      originalRequest.retry = (originalRequest.retry || 0) + 1;
      
      // Respect Retry-After when present, else exponential backoff
      const delay = retryAfterMs > 0 ? retryAfterMs : originalRequest.retryDelay * (2 ** (originalRequest.retry - 1));
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return enhancedAPI.raw(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Add retry configuration to each request
enhancedAPI.raw.interceptors.request.use(config => {
  config.retry = 0;
  config.maxRetries = config.maxRetries || enhancedAPI.raw.defaults.maxRetries;
  config.retryDelay = config.retryDelay || enhancedAPI.raw.defaults.retryDelay;
  return config;
});

// Add background refresh capabilities
enhancedAPI.backgroundRefresh = (endpoint, params = {}, cacheType = CACHE_TYPES.PLAYER_DATA) => {
  return backgroundRefreshService.refreshNow(endpoint, params, cacheType);
};

// Enhanced cache statistics including background refresh
enhancedAPI.getCacheStats = () => {
  return {
    cache: apiCache.getStats(),
    backgroundRefresh: backgroundRefreshService.getStats()
  };
};

export default enhancedAPI; 