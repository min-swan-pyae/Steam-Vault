import React from 'react';

const ErrorMessage = React.memo(({ message }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
      <div className="max-w-xl w-full text-center">
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p className="text-red-400">{message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.message === nextProps.message);

ErrorMessage.displayName = 'ErrorMessage';

export default ErrorMessage; 