import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../utils/helpers';
import api from '../services/api';

const HEARTBEAT_TIMEOUT_MS = 60000;
const RECONNECT_DELAY_MS = 1500;

/**
 * Listens to server-sent forum events and triggers callbacks when events arrive.
 * Consumer decides how to refetch/update UI for posts/comments.
 */
export default function useForumRealtime({ onPostChange, onCommentChange, onReportChange, onLikeChange } = {}) {
  const { isAuthenticated } = useAuth();
  const eventSourceRef = useRef(null);
  const heartbeatRef = useRef(null);
  const reconnectRef = useRef(null);
  const apiBase = getApiBaseUrl();
  const postHandlerRef = useRef(onPostChange);
  const commentHandlerRef = useRef(onCommentChange);
  const reportHandlerRef = useRef(onReportChange);
  const likeHandlerRef = useRef(onLikeChange);

  useEffect(() => { postHandlerRef.current = onPostChange; }, [onPostChange]);
  useEffect(() => { commentHandlerRef.current = onCommentChange; }, [onCommentChange]);
  useEffect(() => { reportHandlerRef.current = onReportChange; }, [onReportChange]);
  useEffect(() => { likeHandlerRef.current = onLikeChange; }, [onLikeChange]);

  useEffect(() => {
    const teardown = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearTimeout(heartbeatRef.current);
      heartbeatRef.current = null;
    };

    if (!isAuthenticated) {
      teardown();
      return undefined;
    }

    let stopped = false;

    const scheduleReconnect = () => {
      if (reconnectRef.current || stopped) return;
      reconnectRef.current = setTimeout(() => {
        reconnectRef.current = null;
        connect();
      }, RECONNECT_DELAY_MS);
    };

    const connect = () => {
      if (stopped) return;
      teardown();
      try {
        const es = new EventSource(`${apiBase}/api/forum/stream`, { withCredentials: true });
        eventSourceRef.current = es;

        const resetHeartbeat = () => {
          clearTimeout(heartbeatRef.current);
          heartbeatRef.current = setTimeout(() => {
            es.close();
            eventSourceRef.current = null;
            scheduleReconnect();
          }, HEARTBEAT_TIMEOUT_MS);
        };

        es.addEventListener('connected', resetHeartbeat);
        es.addEventListener('ping', resetHeartbeat);

        es.addEventListener('forum', (event) => {
          resetHeartbeat();
          try {
            const payload = JSON.parse(event.data);
            
            // Clear cache for specific post when comments change (NOT for likes - they use optimistic updates)
            if (payload.type?.startsWith('comment:') && payload.type !== 'comment:liked') {
              const postId = payload.comment?.postId || payload.postId;
              if (postId) {
                // Clear specific post detail and comments cache
                api.clearCacheByPattern(`/api/forum/posts/${postId}`, 'FORUM_DATA');
              }
              // Also clear the forum posts list cache since comment counts change
              api.clearCacheByPattern('/api/forum/posts', 'FORUM_DATA');
            }
            
            // Clear cache when posts are updated/deleted (NOT for likes)
            if (payload.type?.startsWith('post:') && payload.type !== 'post:liked') {
              const postId = payload.post?.id || payload.postId;
              if (postId) {
                api.clearCacheByPattern(`/api/forum/posts/${postId}`, 'FORUM_DATA');
              }
              // Also clear posts list cache
              api.clearCacheByPattern('/api/forum/posts', 'FORUM_DATA');
            }
            
            if (payload.type?.startsWith('post:') && typeof postHandlerRef.current === 'function') {
              postHandlerRef.current(payload);
            }
            if (payload.type?.startsWith('comment:') && typeof commentHandlerRef.current === 'function') {
              commentHandlerRef.current(payload);
            }
            if (payload.type?.startsWith('report:') && typeof reportHandlerRef.current === 'function') {
              reportHandlerRef.current(payload);
            }
            if ((payload.type === 'post:liked' || payload.type === 'comment:liked') && typeof likeHandlerRef.current === 'function') {
              likeHandlerRef.current(payload);
            }
          } catch (err) {
            console.warn('[ForumRealtime] Failed to parse event payload', err);
          }
        });

        es.onerror = () => {
          teardown();
          scheduleReconnect();
        };
      } catch (error) {
        console.error('[ForumRealtime] Failed to open SSE connection', error);
        scheduleReconnect();
      }
    };

    connect();

    return () => {
      stopped = true;
      teardown();
      clearTimeout(reconnectRef.current);
      reconnectRef.current = null;
    };
  }, [apiBase, isAuthenticated]);
}
