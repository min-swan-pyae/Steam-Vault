import React from 'react';

/**
 * Small inline loading spinner for use within components
 * @param {string} size - Size: 'sm', 'md', 'lg'
 * @param {string} message - Optional message
 */
const InlineLoader = React.memo(({ size = 'md', message = '' }) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 ${sizes[size]}`}></div>
      {message && <span className="text-gray-300 text-sm">{message}</span>}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.size === nextProps.size && prevProps.message === nextProps.message;
});

InlineLoader.displayName = 'InlineLoader';

export default InlineLoader;
