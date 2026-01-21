import React from 'react';

/**
 * Consistent full-page loading spinner for use across all pages
 * @param {string} message - Optional custom loading message
 */
const PageLoader = React.memo(({ message = 'Loading...' }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
          <div className="absolute inset-0 rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-300 opacity-20 animate-ping"></div>
        </div>
        <p className="text-xl text-gray-300 animate-pulse">{message}</p>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.message === nextProps.message);

PageLoader.displayName = 'PageLoader';

export default PageLoader;
