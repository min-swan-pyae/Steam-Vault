import axios from 'axios';
import { apiCache, CACHE_TYPES } from './apiCache.js';
import { backgroundRefreshService } from './backgroundRefresh.js';

// Create axios instance with better configuration
const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for handling cookies with CORS
  timeout: 10000, // 10s timeout
  retryDelay: 1000, // 1s delay between retries
  maxRetries: 2 // Retry failed requests twice
});

// Cache-first request wrapper
const cachedRequest = async (config, cacheType = CACHE_TYPES.PLAYER_DATA, forceRefresh = false) => {
  const { url, params, method } = config;
  
  // Only cache GET requests
  if (method && method.toLowerCase() !== 'get') {
    return api(config);
  }

  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cachedData = apiCache.get(url, params, cacheType);
    if (cachedData) {
      return Promise.resolve(cachedData);
    }
  }

  // Make API request
  try {
    const response = await api(config);
    
    // Cache successful responses
    if (response && typeof response === 'object') {
      apiCache.set(url, params, response, cacheType);
    }
    
    return response;
  } catch (error) {
    // If network error and we have stale cache data, return it as fallback
    if (error.code === 'NETWORK_ERROR' || error.message.includes('timeout')) {
      const staleData = apiCache.get(url, params, cacheType);
      if (staleData) {
        console.warn('[API FALLBACK] Using stale cache data due to network error');
        return staleData;
      }
    }
    throw error;
  }
};

// Enhanced API object with caching methods
const enhancedAPI = {
  // Original axios instance for non-cached requests
  raw: api,
  
  // Cached GET request
  get: (url, config = {}) => {
    const { cacheType = CACHE_TYPES.PLAYER_DATA, forceRefresh = false, ...axiosConfig } = config;
    return cachedRequest({ ...axiosConfig, url, method: 'get' }, cacheType, forceRefresh);
  },
  
  // Non-cached requests
  post: (url, data, config) => api.post(url, data, config),
  put: (url, data, config) => api.put(url, data, config),
  delete: (url, config) => api.delete(url, config),
  patch: (url, data, config) => api.patch(url, data, config),
  
  // Cache management methods
  clearCache: (cacheType) => apiCache.clear(cacheType),
  getCacheStats: () => apiCache.getStats(),
  
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
  (response) => response.data, // Automatically return the data property
  async (error) => {
    const originalRequest = error.config;
    
    // If we've already tried to retry this request, reject
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    // Handle unauthorized access
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Implement retry logic for network errors and 5xx responses
    if ((error.message.includes('network') || 
         error.message.includes('timeout') || 
         (error.response && error.response.status >= 500)) && 
        originalRequest.retry < originalRequest.maxRetries) {
      
      originalRequest._retry = true;
      originalRequest.retry = (originalRequest.retry || 0) + 1;
      
      // Exponential backoff
      const delay = originalRequest.retryDelay * (2 ** (originalRequest.retry - 1));
      
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