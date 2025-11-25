import React from 'react';

export default function SuspensionBanner({ suspension }) {
  if (!suspension?.active) return null;

  const getExpirationDate = () => {
    if (!suspension.expiresAt) return 'Unknown';
    
    let expiresMillis;
    const ex = suspension.expiresAt;
    
    if (ex?.toMillis) {
      expiresMillis = ex.toMillis();
    } else if (ex._seconds) {
      expiresMillis = ex._seconds * 1000;
    } else if (ex.seconds) {
      expiresMillis = ex.seconds * 1000;
    } else {
      expiresMillis = Date.parse(ex);
    }
    
    return new Date(expiresMillis).toLocaleString();
  };

  const getTimeRemaining = () => {
    if (!suspension.expiresAt) return '';
    
    let expiresMillis;
    const ex = suspension.expiresAt;
    
    if (ex?.toMillis) {
      expiresMillis = ex.toMillis();
    } else if (ex._seconds) {
      expiresMillis = ex._seconds * 1000;
    } else if (ex.seconds) {
      expiresMillis = ex.seconds * 1000;
    } else {
      expiresMillis = Date.parse(ex);
    }
    
    const now = Date.now();
    const diff = expiresMillis - now;
    
    if (diff <= 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  return (
    <div className="mb-6 p-4 bg-red-900/20 border-2 border-red-500 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="text-3xl">🚫</div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-red-400 mb-2">
            Your Account is Suspended
          </h3>
          <p className="text-gray-300 mb-2">
            <strong>Reason:</strong> {suspension.reason || 'Multiple community guideline violations'}
          </p>
          {suspension.expiresAt && (
            <>
              <p className="text-gray-400 text-sm">
                <strong>Expires:</strong> {getExpirationDate()}
              </p>
              <p className="text-yellow-400 text-sm font-semibold mt-1">
                {getTimeRemaining()}
              </p>
            </>
          )}
          <p className="text-gray-400 text-sm mt-3">
            You cannot create posts or comments while suspended. You can still read all content.
          </p>
        </div>
      </div>
    </div>
  );
}
