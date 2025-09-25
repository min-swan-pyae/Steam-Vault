import api from './api';

const DEFAULT_APPID = 730; // CS2 by default

export const marketApi = {
  trending: ({ appid = DEFAULT_APPID, count = 20 } = {}) =>
    api.get('/api/market/trending', { params: { appid, count }, cacheType: 'META_DATA' }),

  search: ({ appid = DEFAULT_APPID, q = '', start = 0, count = 20, filters = {} } = {}) => {
    console.log('[MARKET API] Search request:', { appid, q, start, count, filters });
    return api.get('/api/market/search', { params: { appid, q, start, count, ...filters }, cacheType: 'META_DATA' })
      .then(response => {
        console.log('[MARKET API] Search response:', response);
        return response;
      })
      .catch(error => {
        console.error('[MARKET API] Search error:', error);
        throw error;
      });
  },

  // Paginated search with proper start/pageSize support
  searchBulk: ({ appid = DEFAULT_APPID, q = '', start = 0, pageSize = 10, filters = {}, sortBy = 'popularity', minPrice, maxPrice, bustCache = false } = {}) => {
    console.log('[MARKET API] Bulk search request:', { appid, q, start, pageSize, filters, sortBy, minPrice, maxPrice });
    const params = { appid, q, start, pageSize, sortBy, ...filters };
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (bustCache) params._debug = Date.now(); // Cache busting parameter
    
    const cacheOptions = { cacheType: 'META_DATA' };
    if (bustCache) cacheOptions.forceRefresh = true;
    
    return api.get('/api/market/search/bulk', { params, ...cacheOptions })
      .then(response => {
        console.log('[MARKET API] Bulk search response: got', response.results?.length || 0, 'items for page', Math.floor(start / pageSize) + 1);
        return response;
      })
      .catch(error => {
        console.error('[MARKET API] Bulk search error:', error);
        throw error;
      });
  },

  // DISABLED: Individual price API calls to prevent rate limiting
  // price: ({ appid = DEFAULT_APPID, hashName, currency = 1 }) =>
  // api.get('/api/market/price', { params: { appid, hashName, currency }, cacheType: 'META_DATA', forceRefresh: false }),

  // history: ({ appid = DEFAULT_APPID, hashName, currency = 1 }) =>
  // api.get('/api/market/price/history', { params: { appid, hashName, currency }, cacheType: 'META_DATA', forceRefresh: false }),

  getCategories: ({ appid = DEFAULT_APPID } = {}) =>
    api.get('/api/market/categories', { params: { appid }, cacheType: 'META_DATA' }),

  getWatchlist: (steamId) => api.get(`/api/market/watchlist/${steamId}`, { cacheType: 'META_DATA', forceRefresh: true }),
  upsertWatchItem: (steamId, item) => api.post(`/api/market/watchlist/${steamId}`, item),
  removeWatchItem: (steamId, id) => api.delete(`/api/market/watchlist/${steamId}/${encodeURIComponent(id)}`)
};

export default marketApi;
