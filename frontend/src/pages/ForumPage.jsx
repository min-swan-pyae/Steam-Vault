import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { forumApi } from '../services/forumService';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import useForumRealtime from '../hooks/useForumRealtime';
import SuspensionBanner from '../components/SuspensionBanner';

// Client-side fallback in case categories fetch fails
const DEFAULT_CATEGORIES = [
  { id: 'general', name: 'General' },
  { id: 'cs2', name: 'CS2' },
  { id: 'dota2', name: 'Dota 2' },
  { id: 'marketplace', name: 'Marketplace' },
  { id: 'announcements', name: 'Announcements' }
];

const POSTS_CACHE = new Map();
const CACHE_TTL_MS = 45 * 1000;

const CategoryPill = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 rounded-full text-sm border transition-colors ${active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'}`}
  >
    {children}
  </button>
);

const AuthorAvatar = ({ src, name, sizeClass = 'w-12 h-12' }) => {
  const initials = (name || 'U').trim().slice(0, 2).toUpperCase();
  if (src) {
    return (
      <img
        src={src}
        alt={`${name || 'Unknown user'} avatar`}
        className={`${sizeClass} rounded-full object-cover border border-gray-700 flex-shrink-0`}
        loading="lazy"
      />
    );
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-sm font-semibold text-white border border-gray-700 flex-shrink-0`}>
      {initials}
    </div>
  );
};

const PostCard = ({ post, onClick, onLike, onReport, canEdit, canDelete = false, onEdit, onDelete, isAuthenticated, currentUserSteamId, isSuspended = false }) => {
  const isOwnPost = currentUserSteamId && post.authorSteamId === currentUserSteamId;
  const showActions = Boolean(isAuthenticated && !isSuspended);
  const showLike = showActions && typeof onLike === 'function';
  const showReport = showActions && !isOwnPost && typeof onReport === 'function';

  return (
    <div onClick={onClick} className="p-4 rounded-lg border border-gray-700 bg-gray-800 hover:border-blue-600 transition-colors cursor-pointer group">
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center min-w-[4.5rem]">
          <AuthorAvatar src={post.authorAvatarUrl} name={post.authorDisplayName} />
          <span className="mt-2 text-xs text-gray-300 font-semibold text-center line-clamp-2">
            {post.authorDisplayName || 'Unknown'}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-white line-clamp-1">{post.title} {post.editHistory?.length ? <span className="text-[10px] text-gray-400 font-normal">(edited)</span> : null} {post.__reported && <span className="text-[10px] bg-red-800 text-red-200 px-1.5 py-0.5 rounded">reported</span>}</h3>
            {post.isPinned && <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">Pinned</span>}
            {post.isLocked && <span className="text-xs bg-red-600 px-2 py-0.5 rounded">Locked</span>}
          </div>
          <p className="text-gray-300 text-sm mt-1 line-clamp-2">{post.content}</p>
          <div className="flex items-center gap-4 text-xs text-gray-400 mt-3">
            <span>💬 {post.stats?.comments || 0}</span>
            <span>👍 {post.stats?.likes || 0}</span>
            <span>⏱️ {post.lastActivity ? new Date(post.lastActivity._seconds ? post.lastActivity._seconds * 1000 : post.lastActivity).toLocaleString() : ''}</span>
          </div>
          {post.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {post.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-200">#{t}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e)=>e.stopPropagation()}>
          {showLike && (
            <button className="px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs" onClick={() => onLike(post)}>
              {post.__liked ? 'Unlike' : 'Like'}
            </button>
          )}
          {showReport && (
            <button
              disabled={post.__reported}
              className={`px-2 py-0.5 rounded text-xs ${post.__reported ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600 text-white'}`}
              onClick={(e)=>{e.stopPropagation(); onReport(post);}}
            >
              {post.__reported ? 'Reported' : 'Report'}
            </button>
          )}
          {canEdit && <button className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white text-xs" onClick={() => onEdit(post)}>Edit</button>}
          {canDelete && <button className="px-2 py-0.5 rounded bg-yellow-700 hover:bg-yellow-600 text-white text-xs" onClick={(e)=>{e.stopPropagation(); onDelete(post);}}>Delete</button>}
        </div>
      </div>
    </div>
  );
};

const NewPostModal = ({ open, onClose, onSubmit, categories, defaultCategoryId, submitting = false }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || '');
  const [tags, setTags] = useState('');
  useEffect(() => { if (open) { setTitle(''); setContent(''); setTags(''); setCategoryId(defaultCategoryId || ''); } }, [open, defaultCategoryId]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">Create New Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✖</button>
        </div>
        <div className="grid gap-3">
          <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <select className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <textarea className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[160px]" placeholder="Write something..." value={content} onChange={e => setContent(e.target.value)} />
          <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded bg-gray-700 text-white" disabled={submitting}>Cancel</button>
          <button
            onClick={() => {
              if (!submitting) {
                onSubmit({ title, content, categoryId, tags: tags.split(',').map(s => s.trim()).filter(Boolean) });
              }
            }}
            disabled={submitting}
            className={`px-3 py-2 text-sm rounded text-white ${submitting ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {submitting ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ForumPage() {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = Boolean(user?.role === 'admin' || (Array.isArray(user?.roles) && user.roles.includes('admin')));
  const isSuspended = Boolean(user?.moderation?.suspension?.active);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0); // server reported total
  const [myPostsMode, setMyPostsMode] = useState(false); // when true, ignore category and show user's posts
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const initialLoadRef = useRef(false);
  
  // Debug: Log component mount/unmount
  useEffect(() => {
    console.log(`[ForumPage DEBUG] Component MOUNTED`);
    return () => console.log(`[ForumPage DEBUG] Component UNMOUNTED`);
  }, []);
  // Personal mode sorting state
  const [personalSortBy, setPersonalSortBy] = useState('lastActivity'); // lastActivity | createdAt | title
  const [personalSortOrder, setPersonalSortOrder] = useState('desc'); // desc | asc (title toggles)
  const postsCacheRef = useRef(POSTS_CACHE);
  const activeRequestRef = useRef(0);
  const realtimeReloadRef = useRef(null);

  const getCacheKey = useCallback((categoryId, pg, ps, personal) => {
    if (personal) {
      return `mine|${pg}|${ps}|${personalSortBy}|${personalSortOrder}`;
    }
    return `cat|${categoryId}|${pg}|${ps}`;
  }, [personalSortBy, personalSortOrder]);

  const invalidateCache = useCallback(({ categoryId, personal } = {}) => {
    const store = postsCacheRef.current;
    if (!store) return;
    if (!categoryId && typeof personal === 'undefined') {
      store.clear();
      return;
    }
    const keys = Array.from(store.keys());
    keys.forEach((key) => {
      const isMineKey = key.startsWith('mine|');
      if (personal && isMineKey) {
        store.delete(key);
      }
      if (categoryId && key.startsWith(`cat|${categoryId}|`)) {
        store.delete(key);
      }
    });
  }, []);

  // Cleanup: remove stale cache entries on mount and clear scheduled reloads on unmount
  useEffect(() => {
    // Clear leftover cache from previous visits so we always start fresh
    postsCacheRef.current.clear();
    const now = Date.now();
    const store = postsCacheRef.current;
    const keys = Array.from(store.keys());
    keys.forEach(key => {
      const entry = store.get(key);
      if (entry && now - entry.fetchedAt > CACHE_TTL_MS) {
        store.delete(key);
      }
    });
    
    return () => {
      if (realtimeReloadRef.current) {
        clearTimeout(realtimeReloadRef.current);
      }
      postsCacheRef.current.clear();
    };
  }, []);

  // Load categories
  useEffect(() => {
    (async () => {
      try {
        const res = await forumApi.getCategories();
        const cats = res?.categories || res || [];
        const list = Array.isArray(cats) ? cats : [];
        setCategories(list);
        const fromUrl = searchParams.get('categoryId');
        const modeFromUrl = searchParams.get('mode');
        if (modeFromUrl === 'mine') setMyPostsMode(true);
        const defId = fromUrl || (list[0]?.id || '');
        setActiveCategory(defId);
        if (!fromUrl && defId) setSearchParams({ categoryId: defId });
      } catch (e) {
        console.error('Categories load error', e);
        // Fallback to built-in defaults so UI remains usable
        setCategories(DEFAULT_CATEGORIES);
        const fromUrl = searchParams.get('categoryId');
        const modeFromUrl = searchParams.get('mode');
        if (modeFromUrl === 'mine') setMyPostsMode(true);
        const defId = fromUrl || 'general';
        setActiveCategory(defId);
        if (!fromUrl) setSearchParams({ categoryId: defId });
        setError('Failed to load categories');
      }
    })();
  }, []);

  const loadPosts = useCallback(async (categoryId, pg = 1, ps = pageSize, personal = myPostsMode, options = {}) => {
    const { forceRefresh = false } = options;
    if (!personal && !categoryId) {
      setLoading(false);
      return;
    }
    const cacheKey = getCacheKey(categoryId, pg, ps, personal);
    const cached = postsCacheRef.current.get(cacheKey);
    const cacheIsFresh = cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS;
    
    console.log(`[ForumPage DEBUG] loadPosts called: categoryId=${categoryId}, forceRefresh=${forceRefresh}, cacheIsFresh=${cacheIsFresh}`);
    if (cached) {
      const postStats = cached.posts?.map(p => `${p.id.slice(-4)}:${p.stats?.comments}c`).join(', ');
      console.log(`[ForumPage DEBUG] cached data: [${postStats}]`);
    }
    
    // Only use cached data if NOT force refreshing and cache is fresh
    if (cached && !forceRefresh && cacheIsFresh) {
      setPosts(cached.posts);
      setTotal(cached.total);
      setLoading(false);
      return;
    }
    
    // Show cached data temporarily while fetching, but only if not forcing refresh
    if (cached && !forceRefresh) {
      setPosts(cached.posts);
      setTotal(cached.total);
    }

    const requestId = ++activeRequestRef.current;

    const runFetch = async () => {
      if (personal) {
        try {
          if (!cached || forceRefresh) setLoading(true);
          setError('');
          const offset = (pg - 1) * ps;
          const res = await forumApi.getMyPosts({ limit: ps, offset, sortBy: personalSortBy, sortOrder: personalSortOrder }, { forceRefresh: forceRefresh || !cacheIsFresh });
          if (activeRequestRef.current !== requestId) return;
          const list = res?.posts || res || [];
          const totalFromServer = res?.total ?? list.length;
          setPosts(list);
          setTotal(totalFromServer);
          postsCacheRef.current.set(cacheKey, { posts: list, total: totalFromServer, fetchedAt: Date.now() });
        } catch (e) {
          if (activeRequestRef.current === requestId) {
            setError('Failed to load your posts');
          }
        } finally {
          if (activeRequestRef.current === requestId) {
            setLoading(false);
          }
        }
        return;
      }

      if (!categoryId) return;
      try {
        if (!cached || forceRefresh) setLoading(true);
        setError('');
        const offset = (pg - 1) * ps;
        const res = await forumApi.getPosts({ categoryId, limit: ps, offset, sortBy: 'lastActivity', sortOrder: 'desc' }, { forceRefresh: forceRefresh || !cacheIsFresh });
        if (activeRequestRef.current !== requestId) return;
        const list = res?.posts || res || [];
        const totalFromServer = res?.total ?? list.length;
        const postStats = list.map(p => `${p.id.slice(-4)}:${p.stats?.comments}c`).join(', ');
        console.log(`[ForumPage DEBUG] API response: [${postStats}]`);
        setPosts(list);
        setTotal(totalFromServer);
        postsCacheRef.current.set(cacheKey, { posts: list, total: totalFromServer, fetchedAt: Date.now() });
      } catch (e) {
        if (activeRequestRef.current === requestId) {
          setError('Failed to load posts');
        }
      } finally {
        if (activeRequestRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    return runFetch();
  }, [pageSize, myPostsMode, personalSortBy, personalSortOrder, getCacheKey]);

  const scheduleRealtimeReload = useCallback(({ forceMyMode, categoryId } = {}) => {
    const targetMyMode = typeof forceMyMode === 'boolean' ? forceMyMode : myPostsMode;
    const resolvedCategory = targetMyMode ? undefined : (categoryId || activeCategory);
    if (realtimeReloadRef.current) return;
    realtimeReloadRef.current = setTimeout(() => {
      realtimeReloadRef.current = null;
      if (targetMyMode) {
        invalidateCache({ personal: true });
        loadPosts(undefined, page, pageSize, true, { forceRefresh: true });
      } else if (resolvedCategory) {
        invalidateCache({ categoryId: resolvedCategory });
        loadPosts(resolvedCategory, page, pageSize, false, { forceRefresh: true });
      }
    }, 350);
  }, [myPostsMode, loadPosts, invalidateCache, activeCategory, page, pageSize]);

  const handleRealtimePost = useCallback((event) => {
    if (!event?.type) return;
    
    // Skip like events - handleRealtimeLike handles those with optimistic updates
    if (event.type === 'post:liked') return;
    
    const post = event.post;
    const ownerSteamId = post?.authorSteamId || event.postAuthorSteamId;
    const categoryId = post?.categoryId || event.categoryId;
    if (myPostsMode) {
      if (!user?.steamId || !ownerSteamId || ownerSteamId !== user.steamId) return;
      scheduleRealtimeReload({ forceMyMode: true });
      return;
    }
    if (categoryId && activeCategory && categoryId !== activeCategory) return;
    if (!post && event.type === 'post:deleted' && !categoryId) return;
    scheduleRealtimeReload({ categoryId });
  }, [myPostsMode, user?.steamId, activeCategory, scheduleRealtimeReload]);

  const handleRealtimeComment = useCallback((event) => {
    // Skip like events - handleRealtimeLike handles those
    if (event.type === 'comment:liked') return;
    
    const targetPostId = event.comment?.postId || event.postId;
    if (!targetPostId) return;
    
    // Immediately update comment count for the affected post
    if (event.type === 'comment:created') {
      console.log(`[ForumPage DEBUG] SSE comment:created: postId=${targetPostId}`);
      setPosts(prev => {
        const post = prev.find(p => p.id === targetPostId);
        console.log(`[ForumPage DEBUG] comment:created - found post: ${post?.id?.slice(-4)}, current comments=${post?.stats?.comments}`);
        return prev.map(p => {
          if (p.id === targetPostId) {
            const newCount = (p.stats?.comments || 0) + 1;
            console.log(`[ForumPage DEBUG] comment:created - updating ${p.id.slice(-4)}: ${p.stats?.comments} -> ${newCount}`);
            return {
              ...p,
              stats: { ...p.stats, comments: newCount }
            };
          }
          return p;
        });
      });
      // Also update cache
      const cacheKey = getCacheKey(activeCategory, page, pageSize, myPostsMode);
      const cached = postsCacheRef.current.get(cacheKey);
      if (cached) {
        cached.posts = cached.posts.map(p => {
          if (p.id === targetPostId) {
            return { ...p, stats: { ...p.stats, comments: (p.stats?.comments || 0) + 1 } };
          }
          return p;
        });
      }
      return;
    }
    
    if (event.type === 'comment:deleted') {
      setPosts(prev => prev.map(p => {
        if (p.id === targetPostId) {
          return {
            ...p,
            stats: { ...p.stats, comments: Math.max(0, (p.stats?.comments || 0) - 1) }
          };
        }
        return p;
      }));
      // Also update cache
      const cacheKey = getCacheKey(activeCategory, page, pageSize, myPostsMode);
      const cached = postsCacheRef.current.get(cacheKey);
      if (cached) {
        cached.posts = cached.posts.map(p => {
          if (p.id === targetPostId) {
            return { ...p, stats: { ...p.stats, comments: Math.max(0, (p.stats?.comments || 0) - 1) } };
          }
          return p;
        });
      }
      return;
    }
    
    // For other comment events, fall back to reload
    const targetPost = posts.find(p => p.id === targetPostId);
    if (!targetPost) {
      // Post not in current list, but still invalidate cache in case it's in another tab
      scheduleRealtimeReload({ categoryId: activeCategory });
      return;
    }
    if (myPostsMode) {
      scheduleRealtimeReload({ forceMyMode: true });
      return;
    }
    scheduleRealtimeReload({ categoryId: targetPost.categoryId });
  }, [posts, myPostsMode, activeCategory, scheduleRealtimeReload, getCacheKey, page, pageSize, setPosts]);

  const handleRealtimeLike = useCallback((event) => {
    if (!event) return;
    const { type, postId: targetPostId, actorSteamId } = event;
    
    // Ignore SSE events from current user's own actions (optimistic update already applied)
    if (actorSteamId === user?.steamId) return;
    
    if (type === 'post:liked' && targetPostId) {
      // Update post like count immediately
      setPosts(prev => prev.map(p => {
        if (p.id === targetPostId) {
          const currentLikes = p.stats?.likes || 0;
          const increment = event.liked ? 1 : -1;
          return {
            ...p,
            stats: {
              ...p.stats,
              likes: Math.max(0, currentLikes + increment)
            }
          };
        }
        return p;
      }));
    }
    // Comment likes don't affect ForumPage view - no action needed
  }, [user?.steamId, setPosts]);

  useForumRealtime({ 
    onPostChange: handleRealtimePost, 
    onCommentChange: handleRealtimeComment,
    onLikeChange: handleRealtimeLike
  });

  // React to category/page changes
  useEffect(() => {
    // Check if we need to force refresh (e.g., after deleting a post)
    const needsRefresh = searchParams.get('refresh') === '1';
    const isInitialLoad = !initialLoadRef.current;
    if (isInitialLoad) {
      initialLoadRef.current = true;
    }
    const shouldForceRefresh = needsRefresh || isInitialLoad;
    if (needsRefresh) {
      // Remove the refresh param from URL without triggering a re-render loop
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('refresh');
      setSearchParams(newParams, { replace: true });
    }
    
    if (myPostsMode) {
      loadPosts(undefined, page, pageSize, true, { forceRefresh: shouldForceRefresh });
    } else if (activeCategory) {
      loadPosts(activeCategory, page, pageSize, false, { forceRefresh: shouldForceRefresh });
    }
  }, [activeCategory, page, pageSize, loadPosts, myPostsMode, searchParams, setSearchParams]);

  // Refetch when personal sorting changes while in myPostsMode
  useEffect(() => {
    if (myPostsMode) {
      loadPosts(undefined, 1, pageSize, true);
    }
  }, [personalSortBy, personalSortOrder, myPostsMode, pageSize, loadPosts]);

  // Clamp page if pageSize changes reducing total pages
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [pageSize, total]);

  const handleCreatePost = async ({ title, content, categoryId, tags }) => {
    if (createSubmitting) return;
    try {
      setCreateSubmitting(true);
      await forumApi.createPost({ title, content, categoryId, tags });
      setCreateOpen(false);
      toast.success('Post created');
      setPage(1);
      if (categoryId) invalidateCache({ categoryId });
      invalidateCache({ personal: true });
      if (!myPostsMode && categoryId && categoryId !== activeCategory) {
        setActiveCategory(categoryId);
        setSearchParams(prev => {
          const params = Object.fromEntries([...searchParams]);
          params.categoryId = categoryId;
          return params;
        });
      }
      // Reload the correct view: personal if in myPostsMode, else the target/active category
      if (myPostsMode) {
        await loadPosts(undefined, 1, pageSize, true, { forceRefresh: true });
      } else {
        await loadPosts(categoryId || activeCategory, 1, pageSize, false, { forceRefresh: true });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to create post';
      toast.error(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleLike = async (post) => {
    if (!isAuthenticated) {
      toast.error('Please log in to like posts.');
      return;
    }
    const delta = post.__liked ? -1 : 1;
    try {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, __liked: !p.__liked, stats: { ...p.stats, likes: (p.stats?.likes || 0) + delta } } : p));
      await forumApi.likePost(post.id);
      if (myPostsMode) {
        invalidateCache({ personal: true });
      } else {
        const bucketCategory = post.categoryId || activeCategory;
        if (bucketCategory) invalidateCache({ categoryId: bucketCategory });
      }
    } catch (e) {
      toast.error('Failed to toggle like');
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, __liked: !p.__liked, stats: { ...p.stats, likes: (p.stats?.likes || 0) - delta } } : p));
    }
  };

  // Modal state for delete/report
  const [modal, setModal] = useState({ open:false, mode:null, target:null });
  const [reason, setReason] = useState('');
  const requiredPhrase = 'DELETE';
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  const openDelete = (post) => setModal({ open:true, mode:'delete', target:post });
  const openReport = (post) => setModal({ open:true, mode:'report', target:post });
  const closeModal = () => { setModal({ open:false, mode:null, target:null }); setReason(''); setConfirmPhrase(''); };

  const executeModal = async () => {
    if (!modal.mode || modalLoading) return;
    setModalLoading(true);
    try {
      if (modal.mode === 'delete') {
        if (confirmPhrase !== requiredPhrase) return;
        await forumApi.deletePost(modal.target.id);
        setPosts(prev => prev.filter(p => p.id !== modal.target.id));
        setTotal(prev => {
          const next = Math.max(0, prev - 1);
          setPage(p => {
            const maxPage = Math.max(1, Math.ceil(Math.max(next, 1) / pageSize));
            return Math.min(p, maxPage);
          });
          return next;
        });
        toast.success('Post deleted');
        const targetCategoryId = modal.target?.categoryId || modal.target?.category?.id || activeCategory;
        const ownsTarget = Boolean(modal.target?.authorSteamId && modal.target.authorSteamId === user?.steamId);
        if (targetCategoryId) invalidateCache({ categoryId: targetCategoryId });
        if (ownsTarget || myPostsMode) invalidateCache({ personal: true });
      } else if (modal.mode === 'report') {
        if (!reason.trim()) { toast.error('Reason required'); return; }
        await forumApi.report({ contentType:'post', contentId: modal.target.id, reason: reason.trim() });
        setPosts(prev => prev.map(p => p.id === modal.target.id ? { ...p, __reported: true } : p));
        toast.success('Report submitted');
        const targetCategoryId = modal.target?.categoryId || modal.target?.category?.id || activeCategory;
        if (targetCategoryId) invalidateCache({ categoryId: targetCategoryId });
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Action failed');
    } finally {
      setModalLoading(false);
      closeModal();
    }
  };

  const [editPost, setEditPost] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');

  const startEdit = (post) => {
    setEditPost(post);
    setEditTitle(post.title);
    setEditContent(post.content);
    setEditTags((post.tags || []).join(','));
  };

  const submitEdit = async () => {
    if (!editPost) return;
    try {
      const update = { title: editTitle, content: editContent, tags: editTags.split(',').map(t=>t.trim()).filter(Boolean) };
      const updated = await forumApi.updatePost(editPost.id, update);
      const serverPayload = updated?.post || updated || {};
      const mergedUpdate = { ...editPost, ...update, ...serverPayload };
      setPosts(prev => prev.map(p => p.id === editPost.id ? mergedUpdate : p));
      setEditPost(null);
      const targetCategoryId = editPost.categoryId || activeCategory;
      if (targetCategoryId) invalidateCache({ categoryId: targetCategoryId });
      invalidateCache({ personal: true });
      if (!myPostsMode) {
        loadPosts(activeCategory, page, pageSize, false);
      } else {
        loadPosts(undefined, page, pageSize, true);
      }
      toast.success('Post updated');
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update post');
    }
  };

  const deletePost = (post) => openDelete(post);
  const handleReport = (post) => {
    if (!isAuthenticated) {
      toast.error('Please log in to report posts.');
      return;
    }
    if (user?.steamId && post.authorSteamId === user.steamId) {
      toast.error('You cannot report your own post.');
      return;
    }
    openReport(post);
  };

  const visiblePosts = useMemo(() => {
    // Show all posts in both Public Posts and Your Posts modes
    // No need to filter out user's own posts in Public Posts view
    return posts;
  }, [posts]);

  return (
    <>
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Community Forum</h1>
          {isAuthenticated && (
            <div className="mt-4 inline-flex rounded-lg overflow-hidden border border-gray-700 shadow-sm">
              <button
                onClick={() => { if (myPostsMode) { setMyPostsMode(false); setPage(1); setSearchParams(prev=>{ const p=Object.fromEntries([...searchParams]); delete p.mode; if (activeCategory) p.categoryId=activeCategory; return p;}); /* Removed direct loadPosts call to prevent duplicate fetch; effect will handle */ } }}
                className={`px-4 py-2 text-sm font-medium transition ${!myPostsMode ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >Public Posts</button>
              <button
                onClick={() => { if (!myPostsMode) { setMyPostsMode(true); setPage(1); setSearchParams(prev=>{ const p=Object.fromEntries([...searchParams]); p.mode='mine'; if (activeCategory) p.categoryId=activeCategory; return p;}); /* Removed direct loadPosts call to prevent duplicate fetch; effect will handle */ } }}
                className={`px-4 py-2 text-sm font-medium transition ${myPostsMode ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white shadow-inner' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >Your Posts</button>
            </div>
          )}
        </div>

        {/* Suspension Banner */}
        {isSuspended && <SuspensionBanner suspension={user?.moderation?.suspension} />}

  {/* Categories */}
        {!myPostsMode && (
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map(c => (
              <CategoryPill key={c.id} active={c.id === activeCategory} onClick={() => { setActiveCategory(c.id); setSearchParams({ categoryId: c.id }); setPage(1); }}>
                {c.name}
              </CategoryPill>
            ))}
          </div>
        )}

        {/** Public view hides your own posts */}
        {/** Derive the list we actually show to avoid repeated filters */}
        {/** Memoization ensures we do not recompute unless source changes */}
        {/** visiblePosts is used for both counts and rendering */}
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div className="text-sm text-gray-400">
            {myPostsMode
              ? `Showing ${posts.length} of ${total} posts`
              : user?.steamId
                ? `Other users' posts`
                : `${total} posts`}
          </div>
          {myPostsMode && (
            <div className="inline-flex items-center gap-2 text-xs">
              <span className="text-gray-400">Sort:</span>
              {['lastActivity','createdAt','title'].map(key => {
                const label = key==='lastActivity'? 'Active' : key==='createdAt'? 'Newest' : 'Title';
                const active = personalSortBy === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      if (active) {
                        // Toggle order when clicking same active sort key
                        setPersonalSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
                      } else {
                        setPersonalSortBy(key);
                        // Default order per field (title alphabetical asc, others desc)
                        setPersonalSortOrder(key === 'title' ? 'asc' : 'desc');
                      }
                      setPage(1); // Effect listening to sort state will refetch
                    }}
                    className={`px-2 py-1 rounded border text-xs ${active ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                  >{label}{active && (personalSortOrder==='asc'? ' ↑':' ↓')}</button>
                );
              })}
            </div>
          )}
          {isAuthenticated && !isSuspended && (
            <button onClick={() => setCreateOpen(true)} className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white">+ New Post</button>
          )}
          {isAuthenticated && isSuspended && (
            <button disabled className="px-3 py-2 text-sm rounded bg-gray-700 text-gray-500 cursor-not-allowed" title="You are suspended and cannot create posts">+ New Post</button>
          )}
        </div>

        {/* Posts list */}
        <div className="grid gap-3">
          {loading && <div className="text-gray-300">Loading posts...</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!loading && !error && visiblePosts.length === 0 && (
            <div className="text-gray-400">No posts yet.</div>
          )}
          {!loading && !error && visiblePosts.map(p => {
            const canEdit = Boolean(user && user.steamId === p.authorSteamId && !isSuspended);
            const canDelete = Boolean(user && (user.steamId === p.authorSteamId || isAdmin) && !isSuspended);
            return (
              <PostCard
                key={p.id}
                post={p}
                onClick={() => navigate(`/forum/posts/${p.id}`)}
                onLike={handleLike}
                onReport={handleReport}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={startEdit}
                onDelete={deletePost}
                isAuthenticated={isAuthenticated}
                currentUserSteamId={user?.steamId}
                isSuspended={isSuspended}
              />
            );
          })}
        </div>

        {/* Pagination */}
        {total > 0 && (
        <div className="mt-4 flex items-center gap-2">
          {(() => { const totalPages = Math.max(1, Math.ceil(total / pageSize)); return (
            <>
              <button className="px-3 py-2 text-sm rounded bg-gray-700 text-white disabled:opacity-50" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
              <span className="text-sm text-gray-300">Page {page} of {totalPages}</span>
              <button className="px-3 py-2 text-sm rounded bg-gray-700 text-white disabled:opacity-50" disabled={loading || page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
            </>
          ); })()}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">Per page</span>
            <select className="bg-gray-800 text-xs text-gray-200 rounded px-2 py-1 border border-gray-700" value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>)}
      </div>

      <NewPostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreatePost}
        categories={categories}
        defaultCategoryId={activeCategory}
        submitting={createSubmitting}
      />

      {/* Edit Post Modal */}
      {editPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">Edit Post</h3>
              <button onClick={()=>setEditPost(null)} className="text-gray-400 hover:text-white">✖</button>
            </div>
            <div className="grid gap-3">
              <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
              <textarea className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[160px]" value={editContent} onChange={e=>setEditContent(e.target.value)} />
              <input className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" placeholder="Tags (comma separated)" value={editTags} onChange={e=>setEditTags(e.target.value)} />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={()=>setEditPost(null)} className="px-3 py-2 text-sm rounded bg-gray-700 text-white">Cancel</button>
              <button onClick={submitEdit} className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
    <Modal
      open={modal.open}
      title={modal.mode === 'delete' ? 'Delete Post' : 'Report Post'}
      onClose={modalLoading ? ()=>{} : closeModal}
      onConfirm={executeModal}
      confirmText={modal.mode==='delete' ? 'Delete' : 'Submit'}
      confirmDisabled={(modal.mode==='delete' && confirmPhrase!==requiredPhrase) || (modal.mode==='report' && !reason.trim())}
      loading={modalLoading}
      size="md"
    >
      {modal.mode === 'delete' && (
        <>
          <p className="text-sm text-gray-300">Type <span className="font-mono text-red-400">{requiredPhrase}</span> to permanently delete this post.</p>
          <input value={confirmPhrase} onChange={e=>setConfirmPhrase(e.target.value)} placeholder={requiredPhrase} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </>
      )}
      {modal.mode === 'report' && (
        <>
          <p className="text-sm text-gray-300">Enter a reason for reporting this post.</p>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[120px]" placeholder="Reason (spam, abuse, etc.)" />
        </>
      )}
    </Modal>
    </>
  );
}