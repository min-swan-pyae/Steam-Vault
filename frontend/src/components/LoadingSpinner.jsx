import React from 'react';

const LoadingSpinner = React.memo(({ overlay = false, message = "Processing data... Please wait 🎮" }) => {
  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-[#040915] via-[#060e1c] to-[#0b1529]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500"></div>
          <p className="text-white text-lg">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500"></div>
      <p className="text-gray-300">{message}</p>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner; 