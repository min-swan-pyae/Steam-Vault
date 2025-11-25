import React, { useEffect, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/helpers';
import InlineLoader from '../components/ui/InlineLoader';
import InlineError from '../components/ui/InlineError';

export default function NotificationsAll() {
  const { markAsRead } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [list, setList] = useState([]);
  const navigate = useNavigate();
  const API_BASE = getApiBaseUrl();
  const prodEndpoint = `${API_BASE}/api/notifications`;
  const testEndpoint = `${API_BASE}/api/test/notifications`;
  const useTest = import.meta.env.DEV;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = useTest ? testEndpoint : prodEndpoint;
      const res = await fetch(`${base}?limit=100&includeRead=false`, { credentials:'include' });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch notifications: ${res.status}`);
      }
      
      const data = await res.json();
      setList(data.notifications || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
      setError(e.message || 'Failed to load notifications');
    } finally { setLoading(false); }
  };

  useEffect(()=>{ load(); }, []);

  const resolveUrl = (n) => {
    if (n?.url) return n.url;
    if (n?.data?.url) return n.data.url;
    if (n?.type?.includes('forum')) {
      const data = n?.data || {};
      const postId = data.postId;
      if (!postId) return '/forum';
      const params = new URLSearchParams();
      if (data.commentId) params.set('commentId', data.commentId);
      if (data.parentCommentId) params.set('parentCommentId', data.parentCommentId);
      const query = params.toString();
      return `/forum/posts/${postId}${query ? `?${query}` : ''}`;
    }
    return '/';
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-6">Unread Notifications</h1>
        {loading && <InlineLoader size="md" message="Loading notifications..." />}
        {error && <InlineError message={error} onRetry={load} />}
        {!loading && !error && list.length===0 && <div className="text-gray-400 text-center p-8">No unread notifications</div>}
        {!loading && !error && (
        <div className="space-y-3">
          {list.map(n => (
            <button
              key={n.id}
              onClick={async () => {
                await markAsRead(n.id);
                navigate(resolveUrl(n));
              }}
              className="w-full p-4 rounded border border-blue-600 bg-blue-900/20 hover:bg-blue-900/30 transition-colors text-left"
            >
              <div className="flex items-start gap-3">
                <div className="text-xl">{n.type==='price_drop'?'💰':'💬'}</div>
                <div className="flex-1">
                  <h2 className="text-white font-semibold text-sm">{n.title}</h2>
                  <p className="text-gray-300 text-xs mt-1 line-clamp-3">{n.message}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                    <span>{n.createdAt ? new Date(n.createdAt._seconds? n.createdAt._seconds*1000:n.createdAt).toLocaleString() : ''}</span>
                    {n.isSent && <span className="text-green-400">Email</span>}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}
