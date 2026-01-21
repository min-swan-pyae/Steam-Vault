import React from 'react';

/**
 * Inline error component for use within sections
 * @param {string} message - Error message
 * @param {function} onRetry - Optional retry callback
 */
const InlineError = ({ message = 'An error occurred', onRetry = null }) => {
  return (
    <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center">
      <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-semibold">Error</span>
      </div>
      <p className="text-gray-300 text-sm mb-3">{message}</p>
      {onRetry && (
        <button 
          onClick={onRetry}
          className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 rounded transition-colors duration-200"
        >
          Retry
        </button>
      )}
    </div>
  );
};

export default InlineError;
