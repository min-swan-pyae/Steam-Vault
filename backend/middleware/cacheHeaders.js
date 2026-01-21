/**
 * HTTP Cache Headers Middleware
 * Sets appropriate Cache-Control headers based on route patterns
 */

// Cache duration presets (in seconds)
const CACHE_DURATIONS = {
  NONE: 0,
  SHORT: 60,           // 1 minute - for frequently changing data
  MEDIUM: 300,         // 5 minutes - for semi-dynamic data
  LONG: 3600,          // 1 hour - for relatively static data
  STATIC: 86400,       // 1 day - for static content
  IMMUTABLE: 604800    // 1 week - for truly static content
};

// Route patterns and their cache durations
const CACHE_RULES = [
  // No cache - user-specific or frequently changing
  { pattern: /\/auth\//, duration: CACHE_DURATIONS.NONE, private: true },
  { pattern: /\/notifications/, duration: CACHE_DURATIONS.NONE, private: true },
  { pattern: /\/watchlist/, duration: CACHE_DURATIONS.NONE, private: true },
  { pattern: /\/forum\/posts$/, duration: CACHE_DURATIONS.NONE }, // POST lists change frequently
  { pattern: /\/forum\/posts\/[^/]+$/, duration: CACHE_DURATIONS.NONE }, // Individual posts - no cache (comments change)
  { pattern: /\/forum\/posts\/[^/]+\/comments/, duration: CACHE_DURATIONS.NONE }, // Comments - no cache
  
  // Short cache - dynamic but not user-specific
  { pattern: /\/market\/search/, duration: CACHE_DURATIONS.SHORT },
  { pattern: /\/market\/trending/, duration: CACHE_DURATIONS.SHORT },
  { pattern: /\/pro-players\/live/, duration: CACHE_DURATIONS.SHORT },
  { pattern: /\/leaderboard/, duration: CACHE_DURATIONS.SHORT },
  
  // Medium cache - semi-static data
  { pattern: /\/player\/.*\/stats/, duration: CACHE_DURATIONS.MEDIUM },
  { pattern: /\/player\/.*\/matches/, duration: CACHE_DURATIONS.MEDIUM },
  { pattern: /\/match\/\d+/, duration: CACHE_DURATIONS.MEDIUM },
  { pattern: /\/meta/, duration: CACHE_DURATIONS.MEDIUM },
  
  // Long cache - rarely changing data
  { pattern: /\/heroes/, duration: CACHE_DURATIONS.LONG },
  { pattern: /\/categories/, duration: CACHE_DURATIONS.LONG },
  
  // Static/immutable - truly static content
  { pattern: /\/heroes\/image/, duration: CACHE_DURATIONS.STATIC },
];

/**
 * Middleware to set cache headers based on route
 */
export const setCacheHeaders = (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') {
    res.set('Cache-Control', 'no-store');
    return next();
  }

  // Find matching cache rule
  const rule = CACHE_RULES.find(r => r.pattern.test(req.path));
  
  if (rule) {
    if (rule.duration === 0) {
      res.set('Cache-Control', rule.private ? 'private, no-store' : 'no-store');
    } else {
      const visibility = rule.private ? 'private' : 'public';
      res.set('Cache-Control', `${visibility}, max-age=${rule.duration}, stale-while-revalidate=${Math.floor(rule.duration / 2)}`);
    }
  } else {
    // Default: short cache for unknown routes
    res.set('Cache-Control', 'public, max-age=60');
  }

  next();
};

/**
 * Middleware to add ETag support for conditional requests
 */
export const addETag = (req, res, next) => {
  // Store original json method
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    // Generate simple ETag from response data
    if (data && req.method === 'GET') {
      const hash = simpleHash(JSON.stringify(data));
      res.set('ETag', `"${hash}"`);
      
      // Check If-None-Match header
      const clientETag = req.get('If-None-Match');
      if (clientETag === `"${hash}"`) {
        return res.status(304).end();
      }
    }
    
    return originalJson(data);
  };
  
  next();
};

/**
 * Simple hash function for ETag generation
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export default { setCacheHeaders, addETag };
