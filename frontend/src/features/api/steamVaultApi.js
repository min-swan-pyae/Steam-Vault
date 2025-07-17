import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { apiCache, CACHE_TYPES } from '../../services/apiCache.js'

// Base query with caching integration
const baseQueryWithCache = fetchBaseQuery({
  baseUrl: 'http://localhost:3000/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = localStorage.getItem('token');
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Enhanced base query with fallback caching
const baseQueryWithCacheFallback = async (args, api, extraOptions) => {
  // Extract endpoint and params for cache key
  const endpoint = typeof args === 'string' ? args : args.url;
  const params = args.params || {};
  
  try {
    const result = await baseQueryWithCache(args, api, extraOptions);
    
    // Cache successful responses
    if (result.data) {
      const cacheType = getCacheTypeFromEndpoint(endpoint);
      apiCache.set(endpoint, params, result.data, cacheType);
    }
    
    return result;
  } catch (error) {
    // On error, try to return cached data as fallback
    const cacheType = getCacheTypeFromEndpoint(endpoint);
    const cachedData = apiCache.get(endpoint, params, cacheType);
    
    if (cachedData) {
      console.warn('[RTK FALLBACK] Using cached data due to network error');
      return { data: cachedData };
    }
    
    return { error };
  }
};

// Determine cache type based on endpoint
const getCacheTypeFromEndpoint = (endpoint) => {
  if (endpoint.includes('/dota2/match-history')) return CACHE_TYPES.MATCH_HISTORY;
  if (endpoint.includes('/dota2/match-details')) return CACHE_TYPES.MATCH_DETAILS;
  if (endpoint.includes('/cs2/player')) return CACHE_TYPES.CS2_DATA;
  if (endpoint.includes('/heroes') || endpoint.includes('/meta')) return CACHE_TYPES.HERO_DATA;
  return CACHE_TYPES.PLAYER_DATA;
};

// Main API slice with aggressive caching
export const steamVaultApi = createApi({
  reducerPath: 'steamVaultApi',
  baseQuery: baseQueryWithCacheFallback,
  
  // Define tags for cache invalidation
  tagTypes: [
    'PlayerData', 
    'MatchHistory', 
    'MatchDetails', 
    'HeroData', 
    'CS2Data', 
    'MetaData'
  ],
  
  // Keep cached data for 24 hours
  keepUnusedDataFor: 24 * 60 * 60, // 24 hours in seconds
  
  endpoints: (builder) => ({
    // Dota 2 endpoints
    getMatchHistory: builder.query({
      query: ({ accountId, startAtMatchId, limit = 100 }) => ({
        url: `/dota2/match-history/${accountId}`,
        params: { start_at_match_id: startAtMatchId, limit }
      }),
      providesTags: (result, error, { accountId }) => [
        { type: 'MatchHistory', id: accountId }
      ],
      // Keep match history for 15 minutes
      keepUnusedDataFor: 15 * 60,
    }),
    
    getMatchDetails: builder.query({
      query: (matchId) => `/dota2/match-details/${matchId}`,
      providesTags: (result, error, matchId) => [
        { type: 'MatchDetails', id: matchId }
      ],
      // Keep match details for 1 hour
      keepUnusedDataFor: 60 * 60,
    }),
    
    getPlayerProfile: builder.query({
      query: (steamId) => `/dota2/player/${steamId}`,
      providesTags: (result, error, steamId) => [
        { type: 'PlayerData', id: steamId }
      ],
      // Keep player data for 30 minutes
      keepUnusedDataFor: 30 * 60,
    }),
    
    getPlayerHeroStats: builder.query({
      query: (steamId) => `/dota2/player/${steamId}/hero-stats`,
      providesTags: (result, error, steamId) => [
        { type: 'PlayerData', id: `hero-${steamId}` }
      ],
      keepUnusedDataFor: 30 * 60,
    }),
    
    getPlaytimeTrends: builder.query({
      query: (steamId) => `/dota2/player/${steamId}/playtime-trends`,
      providesTags: (result, error, steamId) => [
        { type: 'PlayerData', id: `playtime-${steamId}` }
      ],
      keepUnusedDataFor: 60 * 60,
    }),
    
    getPlayerBehavior: builder.query({
      query: (steamId) => `/dota2/player/${steamId}/behavior`,
      providesTags: (result, error, steamId) => [
        { type: 'PlayerData', id: `behavior-${steamId}` }
      ],
      keepUnusedDataFor: 60 * 60,
    }),
    
    getPerformanceSummary: builder.query({
      query: (steamId) => `/dota2/player/${steamId}/performance-summary`,
      providesTags: (result, error, steamId) => [
        { type: 'PlayerData', id: `performance-${steamId}` }
      ],
      keepUnusedDataFor: 30 * 60,
    }),
    
    // CS2 endpoints
    getCS2PlayerStats: builder.query({
      query: (steamId) => `/cs2/player/${steamId}`,
      providesTags: (result, error, steamId) => [
        { type: 'CS2Data', id: steamId }
      ],
      keepUnusedDataFor: 30 * 60,
    }),
    
    getCS2PlayerMatches: builder.query({
      query: ({ steamId, limit = 20 }) => ({
        url: `/cs2/player/${steamId}/matches`,
        params: { limit }
      }),
      providesTags: (result, error, { steamId }) => [
        { type: 'CS2Data', id: `matches-${steamId}` }
      ],
      keepUnusedDataFor: 30 * 60,
    }),
    
    getCS2PlayerWeapons: builder.query({
      query: (steamId) => `/cs2/player/${steamId}/weapons`,
      providesTags: (result, error, steamId) => [
        { type: 'CS2Data', id: `weapons-${steamId}` }
      ],
      keepUnusedDataFor: 60 * 60,
    }),
    
    getCS2PlayerMaps: builder.query({
      query: (steamId) => `/cs2/player/${steamId}/maps`,
      providesTags: (result, error, steamId) => [
        { type: 'CS2Data', id: `maps-${steamId}` }
      ],
      keepUnusedDataFor: 60 * 60,
    }),
    
    // Meta data endpoints
    getProPlayersLive: builder.query({
      query: () => '/dota2/meta/pro-players-live',
      providesTags: ['MetaData'],
      // Refresh every 10 minutes
      keepUnusedDataFor: 10 * 60,
    }),
    
    getMetaStats: builder.query({
      query: () => '/dota2/meta/stats',
      providesTags: ['MetaData'],
      keepUnusedDataFor: 60 * 60,
    }),
    
    getHeroStats: builder.query({
      query: () => '/dota2/meta/hero-stats',
      providesTags: ['HeroData'],
      // Hero stats change infrequently
      keepUnusedDataFor: 4 * 60 * 60, // 4 hours
    }),
    
    // Cache management endpoints
    getCacheStats: builder.query({
      query: () => '/cache/stats',
      // Don't cache cache stats
      keepUnusedDataFor: 0,
    }),
  }),
});

// Export hooks for components
export const {
  useGetMatchHistoryQuery,
  useGetMatchDetailsQuery,
  useGetPlayerProfileQuery,
  useGetPlayerHeroStatsQuery,
  useGetPlaytimeTrendsQuery,
  useGetPlayerBehaviorQuery,
  useGetPerformanceSummaryQuery,
  useGetCS2PlayerStatsQuery,
  useGetCS2PlayerMatchesQuery,
  useGetCS2PlayerWeaponsQuery,
  useGetCS2PlayerMapsQuery,
  useGetProPlayersLiveQuery,
  useGetMetaStatsQuery,
  useGetHeroStatsQuery,
  useGetCacheStatsQuery,
  
  // Lazy query hooks for manual triggering
  useLazyGetMatchHistoryQuery,
  useLazyGetMatchDetailsQuery,
  useLazyGetPlayerProfileQuery,
} = steamVaultApi;

// Prefetch functions for background loading
export const prefetchQueries = {
  matchHistory: (accountId, options = {}) => 
    steamVaultApi.util.prefetch('getMatchHistory', { accountId, ...options }),
  
  playerProfile: (steamId) => 
    steamVaultApi.util.prefetch('getPlayerProfile', steamId),
    
  heroStats: () => 
    steamVaultApi.util.prefetch('getHeroStats', undefined),
    
  cs2PlayerStats: (steamId) => 
    steamVaultApi.util.prefetch('getCS2PlayerStats', steamId),
};

export default steamVaultApi;
