import api from './api';

const DEFAULT_APPID = 730; // CS2 by default

export const marketApi = {
  trending: ({ appid = DEFAULT_APPID, count = 20 } = {}) =>
    api.get('/api/market/trending', { params: { appid, count }, cacheType: 'META_DATA' }),

  search: ({ appid = DEFAULT_APPID, q = '', start = 0, count = 20, filters = {} } = {}) => {
    return api.get('/api/market/search', { params: { appid, q, start, count, ...filters }, cacheType: 'META_DATA' })
      .then(response => {
        return response;
      })
      .catch(error => {
        console.error('[MARKET API] Search error:', error);
        throw error;
      });
  },

  // Paginated search with proper start/pageSize support
  searchBulk: ({ appid = DEFAULT_APPID, q = '', start = 0, pageSize = 10, filters = {}, sortBy = 'popularity', minPrice, maxPrice, bustCache = false } = {}) => {
    const params = { appid, q, start, pageSize, sortBy, ...filters };
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (bustCache) params._debug = Date.now(); // Cache busting parameter
    
    const cacheOptions = { cacheType: 'META_DATA' };
    if (bustCache) cacheOptions.forceRefresh = true;
    
    return api.get('/api/market/search/bulk', { params, ...cacheOptions })
      .then(response => {
        // Handle case where response might be undefined or malformed
        if (!response || typeof response !== 'object') {
          console.error('[MARKET API] Invalid response format:', response);
          return { results: [], total: 0, start: 0, error: 'Invalid response format' };
        }
        // Ensure response has required structure
        return {
          results: response.results || [],
          total: response.total || 0,
          start: response.start || start,
          ...response
        };
      })
      .catch(error => {
        console.error('[MARKET API] Bulk search error:', error);
        // Return safe fallback instead of throwing
        return { results: [], total: 0, start: 0, error: error.message || 'Search failed' };
      });
  },

  // Price API - use sparingly to avoid rate limiting
  getPrice: ({ appid = DEFAULT_APPID, hashName, currency = 1 }) =>
    api.get('/api/market/price', { params: { appid, hashName, currency }, cacheType: 'META_DATA', forceRefresh: false }),

  getPriceHistory: ({ appid = DEFAULT_APPID, hashName, currency = 1 }) =>
    api.get('/api/market/price/history', { params: { appid, hashName, currency }, cacheType: 'META_DATA', forceRefresh: false }),

  getCategories: ({ appid = DEFAULT_APPID } = {}) =>
    api.get('/api/market/categories', { params: { appid }, cacheType: 'META_DATA' }),

  getWatchlist: (steamId) => api.get(`/api/market/watchlist/${steamId}`, { cacheType: 'META_DATA', forceRefresh: true }),
  upsertWatchItem: (steamId, item) => api.post(`/api/market/watchlist/${steamId}`, item),
  removeWatchItem: (steamId, id) => api.delete(`/api/market/watchlist/${steamId}/${encodeURIComponent(id)}`)
};

export default marketApi;
