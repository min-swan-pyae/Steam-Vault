/**
 * Request queue manager to prevent API rate limiting
 * Implements request throttling and queueing with configurable limits
 */
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestCounts = new Map(); // Track requests per endpoint
    this.lastRequestTimes = new Map(); // Track last request time per endpoint
    
    // Configuration
    this.config = {
      maxConcurrent: 10, // Max concurrent requests (increased from 3)
      minDelay: 50, // Min delay between requests (ms) (reduced from 100)
      perEndpointLimit: 15, // Max requests per endpoint per window (increased from 5)
      windowSize: 10000, // Time window for rate limiting (ms)
      retryAfter429: 3000, // Default wait after 429 error (ms) (reduced from 5000)
    };
  }

  /**
   * Add a request to the queue
   * @param {Function} requestFn - Function that returns a Promise
   * @param {string} endpoint - Endpoint identifier for rate limiting
   * @param {number} priority - Higher priority = processed first (default: 0)
   * @returns {Promise} - Resolves when request completes
   */
  async enqueue(requestFn, endpoint = 'default', priority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        endpoint,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // Sort queue by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift();
      const { requestFn, endpoint, resolve, reject, timestamp } = request;

      try {
        // Check if we should throttle this endpoint
        if (this.shouldThrottle(endpoint)) {
          await this.waitForCooldown(endpoint);
        }

        // Clean up old request counts
        this.cleanupRequestCounts(endpoint);

        // Track this request
        this.recordRequest(endpoint);

        // Execute the request
        const result = await requestFn();
        resolve(result);

        // Delay between requests
        await this.delay(this.config.minDelay);

      } catch (error) {
        // Handle 429 rate limit errors
        if (error?.response?.status === 429) {
          const retryAfter = this.getRetryAfter(error);
          console.warn(`[REQUEST QUEUE] 429 error on ${endpoint}, waiting ${retryAfter}ms`);
          
          // Re-queue this request with lower priority
          this.queue.unshift({
            ...request,
            priority: request.priority - 1
          });

          // Wait before continuing
          await this.delay(retryAfter);
        } else {
          reject(error);
        }
      }
    }

    this.processing = false;
  }

  /**
   * Check if an endpoint should be throttled
   */
  shouldThrottle(endpoint) {
    const now = Date.now();
    const counts = this.requestCounts.get(endpoint) || [];
    const recentCounts = counts.filter(time => now - time < this.config.windowSize);
    
    return recentCounts.length >= this.config.perEndpointLimit;
  }

  /**
   * Wait for endpoint cooldown
   */
  async waitForCooldown(endpoint) {
    const now = Date.now();
    const counts = this.requestCounts.get(endpoint) || [];
    
    if (counts.length > 0) {
      const oldestRequest = Math.min(...counts);
      const waitTime = this.config.windowSize - (now - oldestRequest);
      
      if (waitTime > 0) {
        await this.delay(waitTime + 100); // Add 100ms buffer
      }
    }
  }

  /**
   * Record a request for rate limiting
   */
  recordRequest(endpoint) {
    const now = Date.now();
    const counts = this.requestCounts.get(endpoint) || [];
    counts.push(now);
    this.requestCounts.set(endpoint, counts);
    this.lastRequestTimes.set(endpoint, now);
  }

  /**
   * Clean up old request counts outside the time window
   */
  cleanupRequestCounts(endpoint) {
    const now = Date.now();
    const counts = this.requestCounts.get(endpoint) || [];
    const recentCounts = counts.filter(time => now - time < this.config.windowSize);
    this.requestCounts.set(endpoint, recentCounts);
  }

  /**
   * Extract Retry-After header or use default
   */
  getRetryAfter(error) {
    const retryAfterHeader = error?.response?.headers?.['retry-after'];
    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds)) {
        return seconds * 1000;
      }
    }
    return this.config.retryAfter429;
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      requestCounts: Object.fromEntries(this.requestCounts),
      config: this.config
    };
  }

  /**
   * Update configuration
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.requestCounts.clear();
    this.lastRequestTimes.clear();
  }
}

// Export singleton instance
export const requestQueue = new RequestQueue();

export default requestQueue;
