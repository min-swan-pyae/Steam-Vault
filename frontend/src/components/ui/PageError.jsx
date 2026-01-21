import React from 'react';

/**
 * Consistent full-page error component with retry functionality
 * @param {string} message - Error message to display
 * @param {function} onRetry - Optional retry callback
 * @param {boolean} showRetry - Whether to show retry button
 */
const PageError = ({ 
  message = 'Something went wrong', 
  onRetry = null,
  showRetry = true 
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
      <div className="max-w-xl w-full text-center">
        <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-8 backdrop-blur-sm">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4 text-red-400">Error</h2>
          <p className="text-gray-300 mb-6">{message}</p>
          {showRetry && (
            <button 
              onClick={handleRetry}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 font-semibold"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PageError;
