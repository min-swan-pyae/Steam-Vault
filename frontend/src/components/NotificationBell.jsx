import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { formatTimeAgo } from '../utils/formatters';

const NotificationBell = React.memo(() => {
  const { notifications, unreadCount, markAsRead, deleteNotification, clearAll, fetchNotifications } = useNotifications();
  const navigate = useNavigate();
  const [clearing, setClearing] = useState(false);

  const buildForumUrl = (notification) => {
    const data = notification?.data || {};
    const postId = data.postId || notification.postId;
    if (!postId) return '/forum';
    const params = new URLSearchParams();
    if (data.commentId) params.set('commentId', data.commentId);
    if (data.parentCommentId) params.set('parentCommentId', data.parentCommentId);
    const query = params.toString();
    return `/forum/posts/${postId}${query ? `?${query}` : ''}`;
  };

  const resolveUrl = (notification) => {
    if (notification?.url) return notification.url;
    if (notification?.data?.url) return notification.data.url;
    if (notification?.type?.startsWith('forum')) return buildForumUrl(notification);
    return '/';
  };
  const [showDropdown, setShowDropdown] = useState(false);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'price_drop': return '💰';
      case 'forum_activity':
      case 'forum_comment': return '💬';
      default: return '🔔';
    }
  };

  const handleNotificationClick = async (notification) => {
    const dest = resolveUrl(notification);
    
    // Close dropdown first for better UX
    setShowDropdown(false);
    
    // Navigate first, then delete in background
    if (dest) {
      navigate(dest);
      // Delete notification after navigation (non-blocking)
      deleteNotification(notification.id).catch(err => {
        console.error('Failed to delete notification:', err);
      });
    } else {
      // If no destination, just delete
      await deleteNotification(notification.id);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all notifications? This cannot be undone.')) return;
    setClearing(true);
    const success = await clearAll();
    setClearing(false);
    if (success) {
      setShowDropdown(false);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(prev => {
      const next = !prev;
      if (next) fetchNotifications();
      return next;
    });
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-300 hover:text-white transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M15 17h5l-3.5-3.5M7.5 13.5L6 12l1.5-1.5M12 2l1 2h6v4l-2 1v9a2 2 0 01-2 2H9a2 2 0 01-2-2v-9l-2-1V4h6l1-2z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-20 max-h-96 overflow-y-auto">
            <div className="p-3 border-b border-gray-700">
              <h3 className="text-white font-medium">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-gray-400 text-sm">{unreadCount} unread</p>
              )}
            </div>

            <div className="divide-y divide-gray-700">
              {notifications.filter(n => !n.isRead).length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-sm">No unread notifications</p>
                </div>
              ) : (
                notifications.filter(n => !n.isRead).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 hover:bg-gray-700 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-900/20 border-l-2 border-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-lg flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm truncate">
                          {notification.title}
                        </p>
                        <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-gray-500 text-xs">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          <div className="flex items-center space-x-2 text-xs">
                            {notification.isSent && (
                              <span className="text-green-400" title="Email sent">📧</span>
                            )}
                            {!notification.isRead && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" title="Unread"/>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-700">
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate('/notifications');
                    }}
                    className="text-blue-400 bg-transparent border border-gray-700 hover:text-blue-300 text-sm transition-colors"
                  >
                    View All Notifications
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={clearing}
                    className="text-red-400  bg-transparent border border-gray-700 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
                  >
                    {clearing ? 'Clearing...' : '🗑️ Clear All Notifications'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
});

NotificationBell.displayName = 'NotificationBell';

export default NotificationBell;