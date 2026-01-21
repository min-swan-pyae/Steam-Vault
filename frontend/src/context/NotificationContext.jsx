import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getApiBaseUrl } from '../utils/helpers';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated, refreshAuth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const API_BASE = getApiBaseUrl();

  const prodEndpoint = `${API_BASE}/api/notifications`;
  const testEndpoint = `${API_BASE}/api/test/notifications`;
  // Always use production endpoint since we've implemented all features there
  const useTest = false;

  const fetchNotifications = useCallback(async ({ limit = 40, includeRead = true } = {}) => {
    if (!isAuthenticated) return [];
    const base = useTest ? testEndpoint : prodEndpoint;
    try {
      const response = await fetch(`${base}?limit=${limit}&includeRead=${includeRead}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`Failed to fetch notifications (${response.status})`);
      const result = await response.json();
      const list = Array.isArray(result.notifications) ? result.notifications : [];
      setNotifications(list);
      const derivedUnread = typeof result.unreadTotal === 'number' ? result.unreadTotal : list.filter(n => !n.isRead).length;
      setUnreadCount(derivedUnread);
      return list;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }, [isAuthenticated, useTest, prodEndpoint, testEndpoint]);

  const markAsRead = async (notificationId) => {
    const base = useTest ? testEndpoint : prodEndpoint;
    try {
      const response = await fetch(`${base}/${notificationId}/read`, { method: 'POST', credentials: 'include' });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    const base = useTest ? testEndpoint : prodEndpoint;
    try {
      const response = await fetch(`${base}/${notificationId}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setUnreadCount(prev => {
          const notif = notifications.find(n => n.id === notificationId);
          return notif && !notif.isRead ? Math.max(0, prev - 1) : prev;
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  };

  const clearAll = async () => {
    const base = useTest ? testEndpoint : prodEndpoint;
    try {
      const response = await fetch(base, { method: 'DELETE', credentials: 'include' });
      if (response.ok) { 
        setNotifications([]); 
        setUnreadCount(0);
        return true; 
      }
      return false;
    } catch (error) { 
      console.error('Error clearing notifications:', error);
      return false;
    }
  };

  // Auto-fetch notifications on auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => fetchNotifications(), 30000);
      // SSE stream (production + dev)
      const apiBase = API_BASE;
      try {
        const es = new EventSource(`${apiBase}/api/notifications/stream`, { withCredentials: true });
        es.addEventListener('notification', (ev) => {
          try {
            const data = JSON.parse(ev.data);
            setNotifications(prev => {
              const deduped = prev.filter(n => n.id !== data.id);
              return [data, ...deduped].slice(0, 50);
            });
            setUnreadCount(prev => prev + 1);
            
            // Refresh auth when suspension-related notifications arrive
            if (data.title && (data.title.includes('Account Suspended') || data.title.includes('Suspension Cleared') || data.title.includes('Suspension Lifted') || data.title.includes('Warning'))) {
              setTimeout(() => refreshAuth?.(), 500); // Small delay to ensure backend has updated
            }
          } catch (_) {}
        });
        es.onerror = () => { es.close(); };
        return () => { clearInterval(interval); es.close(); };
      } catch (_) {
        return () => clearInterval(interval);
      }
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [isAuthenticated, fetchNotifications, API_BASE]);

  const value = {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    clearAll
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};