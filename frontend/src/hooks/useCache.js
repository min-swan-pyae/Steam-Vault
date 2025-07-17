/**
 * React Hooks for Cache Management
 * Provides easy-to-use hooks for cache operations in React components
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { cacheManager } from '../services/cacheManager.js';
import { imageCache } from '../services/imageCache.js';
import api from '../services/api.js';
import { steamVaultApi } from '../services/steamVaultApi.js';

/**
 * Hook for managing cache statistics and status
 */
export const useCacheManager = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStats = useCallback(() => {
    const newStats = cacheManager.getSystemStats();
    setStats(newStats);
  }, []);

  useEffect(() => {
    // Initial load
    refreshStats();
    setIsLoading(false);

    // Set up auto-refresh
    const interval = setInterval(refreshStats, 5000); // Update every 5 seconds

    // Listen to cache events
    const handleCacheUpdate = () => refreshStats();
    cacheManager.on('initialized', handleCacheUpdate);
    cacheManager.on('caches-cleared', handleCacheUpdate);
    cacheManager.on('cache-imported', handleCacheUpdate);

    return () => {
      clearInterval(interval);
      cacheManager.off('initialized', handleCacheUpdate);
      cacheManager.off('caches-cleared', handleCacheUpdate);
      cacheManager.off('cache-imported', handleCacheUpdate);
    };
  }, [refreshStats]);

  const clearAllCaches = useCallback(async () => {
    await cacheManager.clearAllCaches();
    refreshStats();
  }, [refreshStats]);

  const warmCache = useCallback(async (userContext) => {
    await cacheManager.warmCache(userContext);
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    isLoading,
    refreshStats,
    clearAllCaches,
    warmCache,
    exportData: cacheManager.exportCacheData.bind(cacheManager),
    importData: cacheManager.importCacheData.bind(cacheManager)
  };
};

/**
 * Hook for cached API requests with manual control
 */
export const useCachedApi = (endpoint, params = {}, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cacheHit, setCacheHit] = useState(false);
  
  const {
    enabled = true,
    cacheType = 'player_data',
    backgroundRefresh = true
  } = options;

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.cachedRequest(endpoint, params, cacheType, {
        forceRefresh
      });
      
      setData(response);
      setCacheHit(!forceRefresh);
      
      // Trigger background refresh if enabled
      if (backgroundRefresh && !forceRefresh) {
        api.backgroundRefresh(endpoint, params, cacheType);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, enabled, cacheType, backgroundRefresh]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    error,
    cacheHit,
    refetch
  };
};

/**
 * Hook for image caching with preloading
 */
export const useCachedImage = (url, options = {}) => {
  const [imageData, setImageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheHit, setCacheHit] = useState(false);
  
  const {
    priority = 'normal',
    placeholder = null,
    optimizeForComponent = false
  } = options;

  useEffect(() => {
    if (!url) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cached = imageCache.get(url);
        if (cached) {
          if (!cancelled) {
            setImageData(cached);
            setCacheHit(true);
            setLoading(false);
          }
          return;
        }

        // Load and cache image
        const result = await imageCache.preload(url, { priority });
        
        if (!cancelled) {
          setImageData(result);
          setCacheHit(false);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [url, priority]);

  // Create optimized image component if requested
  const OptimizedImage = useCallback(({ className, alt, ...props }) => {
    if (optimizeForComponent && imageData) {
      return imageCache.createOptimizedImage(url, {
        className,
        alt,
        ...props
      });
    }
    
    return null;
  }, [url, imageData, optimizeForComponent]);

  return {
    imageData,
    loading,
    error,
    cacheHit,
    OptimizedImage: optimizeForComponent ? OptimizedImage : null
  };
};

/**
 * Hook for RTK Query with cache monitoring
 */
export const useRTKQueryWithCache = (queryHook, arg, options = {}) => {
  const result = queryHook(arg, options);
  const [cacheInfo, setCacheInfo] = useState(null);
  
  const queryState = useSelector(state => {
    const queryKey = queryHook.name;
    const queries = state.steamVaultApi?.queries || {};
    return Object.entries(queries).find(([key]) => key.includes(queryKey));
  });

  useEffect(() => {
    if (queryState) {
      const [, queryData] = queryState;
      setCacheInfo({
        isCached: !!queryData,
        lastFulfilled: queryData?.fulfilledTimeStamp,
        cacheTime: queryData?.cacheTime,
        subscriptions: queryData?.subscriptionOptions?.refetchOnFocus
      });
    }
  }, [queryState]);

  return {
    ...result,
    cacheInfo
  };
};

/**
 * Hook for smart prefetching based on user behavior
 */
export const useSmartPrefetch = () => {
  const dispatch = useDispatch();
  const lastPrefetchRef = useRef(null);
  
  const prefetchPlayerData = useCallback((playerId) => {
    if (lastPrefetchRef.current === playerId) return;
    
    lastPrefetchRef.current = playerId;
    
    // Prefetch player profile and recent matches
    dispatch(steamVaultApi.endpoints.getPlayerProfile.initiate(playerId));
    dispatch(steamVaultApi.endpoints.getPlayerMatches.initiate({ 
      playerId, 
      limit: 10 
    }));
    
    console.log(`[SMART PREFETCH] Prefetched data for player ${playerId}`);
  }, [dispatch]);

  const prefetchHeroData = useCallback((heroId) => {
    dispatch(steamVaultApi.endpoints.getHeroStats.initiate(heroId));
    console.log(`[SMART PREFETCH] Prefetched data for hero ${heroId}`);
  }, [dispatch]);

  const prefetchMatchData = useCallback((matchId) => {
    dispatch(steamVaultApi.endpoints.getMatchDetails.initiate(matchId));
    console.log(`[SMART PREFETCH] Prefetched data for match ${matchId}`);
  }, [dispatch]);

  return {
    prefetchPlayerData,
    prefetchHeroData,
    prefetchMatchData
  };
};

/**
 * Hook for cache-aware infinite scrolling
 */
export const useCachedInfiniteQuery = (baseEndpoint, initialParams = {}) => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  const loadPage = useCallback(async (pageNumber = 0) => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = { ...initialParams, page: pageNumber, limit: 20 };
      const response = await api.cachedRequest(baseEndpoint, params);
      
      if (response && response.length > 0) {
        setPages(prev => [...prev, response]);
        setHasMore(response.length === params.limit);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      setError(err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [baseEndpoint, initialParams, loading, hasMore]);

  const reset = useCallback(() => {
    setPages([]);
    setHasMore(true);
    setError(null);
  }, []);

  const loadMore = useCallback(() => {
    loadPage(pages.length);
  }, [loadPage, pages.length]);

  useEffect(() => {
    if (pages.length === 0 && hasMore) {
      loadPage(0);
    }
  }, [loadPage, pages.length, hasMore]);

  return {
    pages,
    loading,
    error,
    hasMore,
    loadMore,
    reset
  };
};

export default {
  useCacheManager,
  useCachedApi,
  useCachedImage,
  useRTKQueryWithCache,
  useSmartPrefetch,
  useCachedInfiniteQuery
};
