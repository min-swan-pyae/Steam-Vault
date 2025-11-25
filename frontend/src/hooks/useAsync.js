/**
 * Custom Hook for Async Operations
 * 
 * Provides a consistent pattern for handling async operations with loading, error, and data states.
 * Reduces code duplication across components.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for managing async operations with loading, error, and data states
 * @param {Function} asyncFunction - Async function to execute
 * @param {object} options - Configuration options
 * @returns {object} State and execute function
 */
export const useAsync = (asyncFunction, options = {}) => {
  const {
    immediate = false,
    onSuccess = null,
    onError = null,
    initialData = null,
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(initialData);
  const mountedRef = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args) => {
      setLoading(true);
      setError(null);

      try {
        const result = await asyncFunction(...args);
        
        if (mountedRef.current) {
          setData(result);
          setLoading(false);
          
          if (onSuccess) {
            onSuccess(result);
          }
        }
        
        return result;
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || 'An error occurred');
          setLoading(false);
          
          if (onError) {
            onError(err);
          }
        }
        
        throw err;
      }
    },
    [asyncFunction, onSuccess, onError]
  );

  // Execute immediately if requested
  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(initialData);
  }, [initialData]);

  return {
    loading,
    error,
    data,
    execute,
    reset,
    setData, // Allow manual data updates
    setError, // Allow manual error updates
  };
};

/**
 * Hook for managing multiple async operations
 * Useful for components that need to load multiple data sources
 * @param {object} operations - Object of async functions keyed by name
 * @returns {object} States and execute functions for each operation
 */
export const useMultipleAsync = (operations) => {
  const [states, setStates] = useState(() => {
    const initial = {};
    Object.keys(operations).forEach(key => {
      initial[key] = {
        loading: false,
        error: null,
        data: null,
      };
    });
    return initial;
  });

  const execute = useCallback(
    (operationName, ...args) => {
      if (!operations[operationName]) {
        throw new Error(`Operation "${operationName}" not found`);
      }

      setStates(prev => ({
        ...prev,
        [operationName]: {
          ...prev[operationName],
          loading: true,
          error: null,
        },
      }));

      return operations[operationName](...args)
        .then(result => {
          setStates(prev => ({
            ...prev,
            [operationName]: {
              loading: false,
              error: null,
              data: result,
            },
          }));
          return result;
        })
        .catch(err => {
          setStates(prev => ({
            ...prev,
            [operationName]: {
              loading: false,
              error: err.message || 'An error occurred',
              data: null,
            },
          }));
          throw err;
        });
    },
    [operations]
  );

  const executeAll = useCallback(
    async (...args) => {
      const promises = Object.keys(operations).map(key =>
        execute(key, ...args)
      );
      return Promise.all(promises);
    },
    [operations, execute]
  );

  return {
    states,
    execute,
    executeAll,
  };
};

/**
 * Hook for polling/refetching data at intervals
 * @param {Function} asyncFunction - Async function to execute
 * @param {number} interval - Poll interval in milliseconds
 * @param {object} options - Configuration options
 * @returns {object} State and control functions
 */
export const useAsyncPoll = (asyncFunction, interval = 5000, options = {}) => {
  const {
    immediate = true,
    enabled = true,
    onSuccess = null,
    onError = null,
  } = options;

  const { loading, error, data, execute, ...rest } = useAsync(asyncFunction, {
    immediate,
    onSuccess,
    onError,
  });

  const [isPolling, setIsPolling] = useState(enabled);
  const intervalRef = useRef(null);

  // Start/stop polling
  useEffect(() => {
    if (!isPolling || !enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      execute();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPolling, enabled, interval, execute]);

  const startPolling = useCallback(() => setIsPolling(true), []);
  const stopPolling = useCallback(() => setIsPolling(false), []);

  return {
    loading,
    error,
    data,
    execute,
    isPolling,
    startPolling,
    stopPolling,
    ...rest,
  };
};

export default useAsync;
