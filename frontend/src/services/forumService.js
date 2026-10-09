import api from './api';
import { CACHE_TYPES } from './apiCache';

function qs(params = {}) {
  const entries = Object.entries(params).filter(([_,v]) => v !== undefined && v !== null && v !== '');
  if (!entries.length) return '';
  const search = entries.map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  return `?${search}`;
}

export const forumApi = {
  // Note: enhanced api.get returns data directly (not { data })
  getCategories: async ({ forceRefresh = false } = {}) => api.get('/api/forum/categories', { cacheType: CACHE_TYPES.FORUM_DATA, forceRefresh }),
  getPosts: async ({ categoryId, limit = 20, offset = 0, sortBy = 'lastActivity', sortOrder = 'desc' }, { forceRefresh = false } = {}) =>
    api.get('/api/forum/posts', { params: { categoryId, limit, offset, sortBy, sortOrder }, cacheType: CACHE_TYPES.FORUM_DATA, forceRefresh }),
  getMyPosts: async ({ limit = 20, offset = 0, sortBy = 'lastActivity', sortOrder = 'desc' } = {}, { forceRefresh = false } = {}) =>
    api.get('/api/forum/posts', { params: { mine: 1, limit, offset, sortBy, sortOrder }, cacheType: CACHE_TYPES.FORUM_DATA, forceRefresh }),
  getPost: async (postId, { forceRefresh = false } = {}) => api.get(`/api/forum/posts/${postId}`, { cacheType: CACHE_TYPES.FORUM_DATA, forceRefresh }),
  getComments: async (postId, { limit = 50, sortOrder = 'asc', forceRefresh = false } = {}) =>
    api.get(`/api/forum/posts/${postId}/comments`, { params: { limit, sortOrder }, cacheType: CACHE_TYPES.FORUM_DATA, forceRefresh }),
  createPost: async (data) => {
    const res = await api.post('/api/forum/posts', data);
    api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
    return res;
  },
  updatePost: async (postId, data) => {
    const res = await api.put(`/api/forum/posts/${postId}`, data);
    api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
    return res;
  },
  deletePost: async (postId) => {
    // Optimistic removal: rely on caller updating UI; rollback responsibility remains there if needed.
    try {
      const res = await api.delete(`/api/forum/posts/${postId}`);
      api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
      return res;
    } catch (e) { throw e; }
  },
  createComment: async (data) => {
    const res = await api.post('/api/forum/comments', data);
    api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
    return res;
  },
  createReply: async (commentId, data) => {
    const res = await api.post(`/api/forum/comments/${commentId}/reply`, data);
    api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
    return res;
  },
  updateComment: async (commentId, data) => {
    const res = await api.put(`/api/forum/comments/${commentId}`, data);
    api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
    return res;
  },
  deleteComment: async (commentId) => {
    try {
      const res = await api.delete(`/api/forum/comments/${commentId}`);
      api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
      return res;
    } catch (e) { throw e; }
  },
  // Like operations use optimistic updates - no need to clear cache
  // SSE will handle cache invalidation for other users/pages
  likePost: async (postId) => api.post(`/api/forum/posts/${postId}/like`),
  likeComment: async (commentId) => api.post(`/api/forum/comments/${commentId}/like`),
  report: async (data) => {
    const res = await api.post('/api/forum/reports', data);
    api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA);
    return res;
  },
  // Admin / moderation utilities
  getAdminSummary: () => api.get('/api/forum/admin/summary', { forceRefresh: true, cacheType: CACHE_TYPES.FORUM_DATA }),
  // getPurgeStats: () => api.get('/api/forum/admin/purge-stats'),
  resolveReports: async (payload) => {
    const res = await api.post('/api/forum/admin/reports/resolve', payload);
    return res.data;
  },
  bulkDelete: async (payload) => {
    const res = await api.post('/api/forum/admin/bulk-delete', payload);
    return res.data;
  },
  clearSuspension: async (steamId) => {
    const res = await api.post('/api/forum/admin/clear-suspension', { steamId });
    return res.data;
  },
  getModerationStatus: (steamId) => api.get(`/api/forum/admin/moderation-status/${steamId}`, { forceRefresh: true, cacheType: CACHE_TYPES.FORUM_DATA }),
  listAdminEntities: (entity, { limit = 25, cursor } = {}) => api.get(`/api/forum/admin/list/${entity}${qs({ limit, cursor })}`, { forceRefresh: true, cacheType: CACHE_TYPES.FORUM_DATA }),
  listAdminEntitiesFiltered: (entity, { limit = 25, cursor, q, steamId, status, sortField, sortDir, reporterSteamId, contentType, searchName, searchFields } = {}) =>
    api.get(`/api/forum/admin/list/${entity}${qs({ limit, cursor, q, steamId, status, sortField, sortDir, reporterSteamId, contentType, searchName, searchFields })}`,
      { forceRefresh: true, cacheType: CACHE_TYPES.FORUM_DATA }),
  applySuspension: async ({ steamId, level, hours, reason }) => {
    const res = await api.post('/api/forum/admin/apply-suspension', { steamId, level, hours, reason });
    return res.data;
  },
  adminDeletePost: async (postId) => {
    const res = await api.delete(`/api/forum/admin/delete/post/${postId}`);
    return res.data;
  },
  adminDeleteComment: async (commentId) => {
    const res = await api.delete(`/api/forum/admin/delete/comment/${commentId}`);
    return res.data;
  },
  adminDeleteReport: async (reportId) => {
    const res = await api.delete(`/api/forum/admin/delete/report/${reportId}`);
    return res.data;
  },
  adminDeleteNotification: async (notificationId) => {
    const res = await api.delete(`/api/forum/admin/delete/notification/${notificationId}`);
    return res.data;
  },
  deleteAll: async (entity) => {
    const res = await api.delete(`/api/forum/admin/delete-all/${entity}`);
    return res.data;
  },
  clearAdminCache: () => api.clearCache && api.clearCache(CACHE_TYPES.FORUM_DATA)
};

export default forumApi;
