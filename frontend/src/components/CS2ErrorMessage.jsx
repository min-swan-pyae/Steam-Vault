import React from 'react';


const CS2ErrorMessage = ({ message, error, onRetry, onSetupGSI }) => {
  const getErrorInfo = () => {
    switch (error) {
      case 'AUTHENTICATION_REQUIRED':
        return {
          title: '🔐 Authentication Required',
          description: 'Please login with Steam to access CS2 statistics.',
          action: 'login',
          actionText: 'Login with Steam'
        };
      
      case 'NO_DATA_FOUND':
      case 'NO_MATCHES_FOUND':
      case 'NO_WEAPONS_DATA_FOUND':
      case 'NO_MAPS_DATA_FOUND':
        return {
          title: '📊 No Data Available',
          description: 'No CS2 statistics found. Game State Integration (GSI) needs to be configured.',
          action: 'setup',
          actionText: 'Setup GSI',
          instructions: [
            'GSI collects real-time data during matches',
            'Modern approach used by professional sites',
            'No need to upload demo files',
            'Automatic statistics tracking'
          ]
        };
      
      case 'PERMISSION_DENIED':
        return {
          title: '❌ Permission Denied',
          description: 'You don\'t have permission to access this data.',
          action: 'retry',
          actionText: 'Try Again'
        };
      
      case 'SERVICE_UNAVAILABLE':
        return {
          title: '🔧 Service Unavailable',
          description: 'CS2 statistics service is temporarily unavailable.',
          action: 'retry',
          actionText: 'Retry'
        };
      
      case 'INVALID_STEAM_ID':
        return {
          title: '🔍 Invalid Steam ID',
          description: 'The provided Steam ID is invalid or malformed.',
          action: 'retry',
          actionText: 'Try Again'
        };
      
      default:
        return {
          title: '⚠️ Error',
          description: message || 'An unexpected error occurred.',
          action: 'retry',
          actionText: 'Try Again'
        };
    }
  };

  const errorInfo = getErrorInfo();

  const handleAction = () => {
    switch (errorInfo.action) {
      case 'login':
        window.location.href = '/auth/steam';
        break;
      case 'setup':
        if (onSetupGSI) onSetupGSI();
        break;
      case 'retry':
        if (onRetry) onRetry();
        break;
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-gradient-to-br from-red-900 to-red-800 rounded-xl p-6 border border-red-600 shadow-lg">
      <div className="text-center">
        <h3 className="text-xl font-bold text-white mb-2">
          {errorInfo.title}
        </h3>
        <p className="text-red-100 mb-4">
          {errorInfo.description}
        </p>
        
        {errorInfo.instructions && (
          <div className="bg-red-800 rounded-lg p-4 mb-4 text-left">
            <h4 className="font-semibold text-white mb-2">Why GSI?</h4>
            <ul className="text-red-100 text-sm space-y-1">
              {errorInfo.instructions.map((instruction, index) => (
                <li key={index}>• {instruction}</li>
              ))}
            </ul>
          </div>
        )}
        
        {errorInfo.action && (
          <button
            onClick={handleAction}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            {errorInfo.actionText}
          </button>
        )}
      </div>
    </div>
  );
};

export default CS2ErrorMessage;
