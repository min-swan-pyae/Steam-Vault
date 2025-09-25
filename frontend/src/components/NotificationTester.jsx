import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const NotificationTester = () => {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

  const testNotification = async (type) => {
    if (!isAuthenticated) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/test/notifications/${type}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        loadNotifications(); // Refresh notifications
      } else {
        alert(`❌ ${result.error || 'Failed to send notification'}`);
      }
    } catch (error) {
      alert(`❌ Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/test/notifications?limit=5&includeRead=true`, {
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        setNotifications(result.notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const clearNotifications = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await fetch(`${API_BASE}/api/test/notifications`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const result = await response.json();
      if (result.success) {
        alert(`✅ ${result.message}`);
        setNotifications([]);
      }
    } catch (error) {
      alert(`❌ Error clearing notifications: ${error.message}`);
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">🧪 Notification Tester</h3>
        <p className="text-gray-400">Please log in to test notifications.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">🧪 Notification Tester</h3>
      <p className="text-gray-400 text-sm mb-4">
        Test different notification types. Check your email if you have email notifications enabled!
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => testNotification('price-drop')}
          disabled={loading}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          💰 Test Price Drop
        </button>
        
        <button
          onClick={() => testNotification('market-trend')}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          📈 Test Market Trend
        </button>
        
        <button
          onClick={() => testNotification('forum-activity')}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          💬 Test Forum Activity
        </button>
        
        <button
          onClick={() => testNotification('weekly-digest')}
          disabled={loading}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
        >
          📰 Test Weekly Digest
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <button
          onClick={loadNotifications}
          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
        >
          🔄 Refresh
        </button>
        <button
          onClick={clearNotifications}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
        >
          🗑️ Clear All
        </button>
      </div>

      {notifications.length > 0 && (
        <div>
          <h4 className="text-white font-medium mb-3">Recent Notifications:</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.map((notification, index) => (
              <div
                key={notification.id || index}
                className="bg-gray-700 p-3 rounded border-l-4 border-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{notification.title}</p>
                    <p className="text-gray-300 text-xs mt-1">{notification.message}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Type: {notification.type} | 
                      Sent: {notification.isSent ? '✅' : '❌'} | 
                      Read: {notification.isRead ? '✅' : '❌'}
                    </p>
                  </div>
                  {notification.type && (
                    <span className="text-xs px-2 py-1 bg-gray-600 text-gray-300 rounded">
                      {notification.type.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notifications.length === 0 && (
        <div className="text-gray-400 text-sm text-center py-4 border border-gray-600 rounded">
          No notifications yet. Try testing one!
        </div>
      )}
    </div>
  );
};

export default NotificationTester;