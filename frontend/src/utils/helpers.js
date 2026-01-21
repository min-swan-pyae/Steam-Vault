/**
 * Helper Utilities
 * 
 * Common helper functions used across the application.
 */

/**
 * Get display name from various entity formats
 * Handles different naming conventions from different APIs
 * @param {object} entity - Entity object that might have various name properties
 * @returns {string} Display name or fallback
 */
export const getDisplayName = (entity = {}) => {
  return (
    entity.personaName ||
    entity.displayName ||
    entity.name ||
    entity.username ||
    entity.profile?.personaName ||
    entity.profile?.personaname ||
    entity.steamProfile?.personaname ||
    entity.authorDisplayName ||
    (entity.steamId ? `Player ${entity.steamId}` : 'Unknown Player')
  );
};

/**
 * Safely parse JSON with fallback
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Fallback value if parsing fails
 * @returns {*} Parsed object or fallback
 */
export const safeJsonParse = (jsonString, fallback = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return fallback;
  }
};

/**
 * Check if a value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Debounce a function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle a function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit = 300) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Get API base URL with proper fallback
 * @returns {string} API base URL
 */
export const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envUrl && envUrl.trim() !== '') {
    return envUrl;
  }
  
  // In development, return empty string to use relative URLs (goes through Vite proxy)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use same origin
  return window.location.origin;
};

/**
 * Validate Steam ID format
 * @param {string} steamId - Steam ID to validate
 * @returns {boolean} True if valid Steam ID format
 */
export const isValidSteamId = (steamId) => {
  if (!steamId) return false;
  // Steam ID is typically 17 digits starting with 7656119
  return /^7656119\d{10}$/.test(String(steamId));
};

/**
 * Sleep/delay function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after delay
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of the function
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

/**
 * Deep clone an object (simple version)
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Group array of objects by a key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Calculate percentage change
 * @param {number} oldValue - Old value
 * @param {number} newValue - New value
 * @returns {number} Percentage change
 */
export const percentageChange = (oldValue, newValue) => {
  if (!oldValue || oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

/**
 * Clamp a number between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
export const clamp = (value, min, max) => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Generate a random ID
 * @param {number} length - Length of ID
 * @returns {string} Random ID
 */
export const generateId = (length = 8) => {
  return Math.random().toString(36).substring(2, 2 + length);
};

/**
 * Check if code is running in browser
 * @returns {boolean} True if in browser environment
 */
export const isBrowser = () => {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
};

/**
 * Get value from nested object using dot notation
 * @param {object} obj - Object to get value from
 * @param {string} path - Dot notation path (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Value at path or default value
 */
export const getNestedValue = (obj, path, defaultValue = undefined) => {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result == null) return defaultValue;
    result = result[key];
  }
  
  return result !== undefined ? result : defaultValue;
};

/**
 * Remove duplicates from array
 * @param {Array} array - Array to deduplicate
 * @param {string} key - Optional key for object arrays
 * @returns {Array} Deduplicated array
 */
export const removeDuplicates = (array, key = null) => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};
