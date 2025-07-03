import axios from 'axios';

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

// Add a request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add timestamp to GET requests to avoid browser caching
    if (config.method === 'get') {
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

api.interceptors.response.use(
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
      
      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Add retry configuration to each request
api.interceptors.request.use(config => {
  config.retry = 0;
  config.maxRetries = config.maxRetries || api.defaults.maxRetries;
  config.retryDelay = config.retryDelay || api.defaults.retryDelay;
  return config;
});

export default api; 