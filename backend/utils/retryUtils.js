/**
 * Retry utility with exponential backoff for external API calls
 * Implements resilient patterns for Steam, OpenDota, and other external services
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry configuration
 * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.shouldRetry - Custom retry condition (default: retry on network/timeout errors)
 * @param {string} options.context - Context for logging (e.g., 'Steam API', 'OpenDota')
 * @returns {Promise} Result of successful function execution
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 2,         // Reduced from 3 - fail faster on first load
    initialDelay = 500,     // Reduced from 1000 - faster retries
    maxDelay = 5000,        // Reduced from 10000 - don't wait too long
    shouldRetry = defaultShouldRetry,
    context = 'External API'
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[RETRY] ${context} - Attempt ${attempt + 1}/${maxRetries + 1}`);
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (!shouldRetry(error) || attempt === maxRetries) {
        console.error(`[RETRY] ${context} - Failed after ${attempt + 1} attempts:`, error.message);
        throw error;
      }
      
      // Calculate exponential backoff with jitter
      const delay = Math.min(
        initialDelay * Math.pow(2, attempt) + Math.random() * 1000,
        maxDelay
      );
      
      console.warn(`[RETRY] ${context} - Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
        error: error.message,
        status: error?.response?.status
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Default retry condition - retry on network errors, timeouts, and 5xx errors
 */
function defaultShouldRetry(error) {
  // Network errors
  if (error.code === 'ECONNABORTED' || 
      error.code === 'ENOTFOUND' || 
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNRESET') {
    return true;
  }
  
  // Timeout errors
  if (/timeout/i.test(error.message || '')) {
    return true;
  }
  
  // HTTP status codes
  const status = error?.response?.status;
  if (!status) return false;
  
  // Retry on 429 (rate limit), 502, 503, 504
  if (status === 429 || status === 502 || status === 503 || status === 504) {
    return true;
  }
  
  // Don't retry on client errors (4xx except 429)
  if (status >= 400 && status < 500) {
    return false;
  }
  
  // Retry on server errors (5xx)
  if (status >= 500) {
    return true;
  }
  
  return false;
}

/**
 * Wrapper to add timeout to any promise
 * @param {Promise} promise - Promise to add timeout to
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} context - Context for error message
 * @returns {Promise} Promise that rejects if timeout is exceeded
 */
export function withTimeout(promise, timeoutMs, context = 'Request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${context} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

/**
 * Preset timeout values for different external services
 * Increased to handle slow external API responses
 */
export const TIMEOUTS = {
  STEAM_API: 15000,       // Steam API - 15 seconds (can be slow)
  OPENDOTA: 20000,        // OpenDota - 20 seconds (free tier is very slow)
  STEAM_MARKET: 20000,    // Steam Market - 20 seconds (increased from 12s - can be very slow with filters)
  FIRESTORE: 5000,        // Firestore - 5 seconds
  DEFAULT: 15000          // Default - 15 seconds
};

/**
 * Combined retry with timeout for external API calls
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Configuration
 * @param {number} options.timeout - Timeout in ms
 * @param {number} options.maxRetries - Max retry attempts
 * @param {string} options.context - Context for logging
 * @returns {Promise} Result of successful execution
 */
export async function resilientFetch(fn, options = {}) {
  const {
    timeout = TIMEOUTS.DEFAULT,
    maxRetries = 3,
    context = 'External API'
  } = options;
  
  return retryWithBackoff(
    () => withTimeout(fn(), timeout, context),
    { maxRetries, context }
  );
}

export default {
  retryWithBackoff,
  withTimeout,
  resilientFetch,
  TIMEOUTS
};
