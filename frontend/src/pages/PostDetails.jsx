import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { forumApi } from '../services/forumService';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { FaArrowLeft } from 'react-icons/fa';
import Modal from '../components/ui/Modal';
import PageLoader from '../components/ui/PageLoader';
import PageError from '../components/ui/PageError';
import useForumRealtime from '../hooks/useForumRealtime';
import SuspensionBanner from '../components/SuspensionBanner';

const MAX_REPLY_DEPTH = 5;

const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value._seconds) return value._seconds * 1000 + (value._nanoseconds || 0) / 1e6;
  if (value.seconds) return value.seconds * 1000 + (value.nanoseconds || 0) / 1e6;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const AuthorAvatar = ({ src, name, sizeClass = 'w-10 h-10' }) => {
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
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-sm font-semibold border border-gray-700 flex-shrink-0`}>
      {initials}
    </div>
  );
};

const Comment = ({
  comment,
  depth = 0,
  onLike,
  onReport,
  auth,
  canEdit,
  canDelete = false,
  onEdit,
  onDelete,
  onReply,
  currentUserSteamId,
  canReply = true,
  hasReplies = false,
  repliesOpen = true,
  onToggleReplies,
  repliesCount = 0,
  isSuspended = false
}) => {
  const isOwnComment = currentUserSteamId && comment.authorSteamId === currentUserSteamId;
  const avatarSize = depth === 0 ? 'w-10 h-10' : depth === 1 ? 'w-9 h-9' : 'w-8 h-8';
  const canShowReply = auth && !isOwnComment && canReply && !isSuspended;
  const replyLimitReached = auth && !isOwnComment && !canReply;

  return (
    <div className="flex gap-3">
      <AuthorAvatar
        src={comment.authorAvatarUrl}
        name={comment.authorDisplayName}
        sizeClass={avatarSize}
      />
      
      <div className="flex-1 min-w-0">
        <div className="p-3 rounded-lg bg-gray-800 group">
          <div className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-2 flex-wrap">
            <span>{comment.authorDisplayName || 'Unknown'}</span>
            {comment.editHistory?.length ? <span className="text-[10px] text-gray-400">(edited)</span> : null}
            {comment.__reported && <span className="text-[10px] bg-red-800 text-red-200 px-1.5 py-0.5 rounded align-middle">reported</span>}
          </div>
          <div className="text-sm text-white whitespace-pre-wrap">{comment.content}</div>
        </div>
        <div className="text-xs text-gray-400 mt-1 flex items-center gap-3 px-3 flex-wrap">
          <span>👍 {comment.stats?.likes || 0}</span>
          <span>{comment.createdAt ? new Date(comment.createdAt._seconds ? comment.createdAt._seconds * 1000 : comment.createdAt).toLocaleString() : ''}</span>
          {auth && !isSuspended && (
            <>
              <button onClick={() => onLike(comment)} className="px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200">
                {comment.__liked ? 'Unlike' : 'Like'}
              </button>
              {!isOwnComment && (
                <button
                  disabled={comment.__reported}
                  onClick={() => onReport('comment', comment.id)}
                  className={`px-2 py-0.5 rounded ${comment.__reported ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600 text-white'}`}
                >
                  {comment.__reported ? 'Reported' : 'Report'}
                </button>
              )}
              {canShowReply && (
                <button onClick={() => onReply(comment)} className="px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200">
                  Reply
                </button>
              )}
              {replyLimitReached && (
                <span className="text-[11px] text-gray-500">Reply limit reached</span>
              )}
            </>
          )}
          {canEdit && (
            <button onClick={() => onEdit(comment)} className="px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white">Edit</button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(comment)} className="px-2 py-0.5 rounded bg-yellow-700 hover:bg-yellow-600 text-white">Delete</button>
          )}
          {hasReplies && (
            <button
              onClick={() => onToggleReplies?.(comment.id)}
              className="px-2 py-0.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200"
            >
              {repliesOpen ? 'Hide replies' : `Show replies (${repliesCount})`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default function PostDetails() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = Boolean(user?.role === 'admin' || (Array.isArray(user?.roles) && user.roles.includes('admin')));
  const isSuspended = Boolean(user?.moderation?.suspension?.active);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReplies, setShowReplies] = useState({});
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [highlightTarget, setHighlightTarget] = useState(() => {
    const commentId = searchParams.get('commentId');
    if (!commentId) return null;
    return {
      commentId,
      parentCommentId: searchParams.get('parentCommentId') || null
    };
  });
  const commentLookupRef = useRef(new Map());
  const inflightLoadRef = useRef(false);
  const repliesSignature = JSON.stringify(showReplies);
  useEffect(() => {
    const map = new Map();
    comments.forEach(c => map.set(c.id, c));
    commentLookupRef.current = map;
  }, [comments]);

  const commentTree = useMemo(() => {
    if (!comments.length) return [];
    const map = new Map();
    comments.forEach(c => {
      map.set(c.id, { ...c, children: [] });
    });
    const roots = [];
    map.forEach(node => {
      if (node.parentCommentId && map.has(node.parentCommentId)) {
        map.get(node.parentCommentId).children.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortNodes = (nodes) => {
      nodes.sort((a, b) => timestampToMillis(a.createdAt) - timestampToMillis(b.createdAt));
      nodes.forEach(child => {
        if (child.children?.length) sortNodes(child.children);
      });
      return nodes;
    };
    return sortNodes(roots);
  }, [comments]);

  const toggleRepliesVisibility = useCallback((commentId, nextState) => {
    setShowReplies(prev => {
      const current = prev[commentId];
      const desired = typeof nextState === 'boolean' ? nextState : !current;
      if (current === desired) return prev;
      return { ...prev, [commentId]: desired };
    });
  }, []);

  const expandThreadAncestors = useCallback((startId) => {
    if (!startId) return;
    setShowReplies(prev => {
      const next = { ...prev };
      let changed = false;
      let current = startId;
      const visited = new Set();
      while (current && !visited.has(current)) {
        visited.add(current);
        if (!next[current]) {
          next[current] = true;
          changed = true;
        }
        const parent = commentLookupRef.current.get(current)?.parentCommentId || null;
        current = parent;
      }
      return changed ? next : prev;
    });
  }, []);
  const isOwnPost = Boolean(user?.steamId && post?.authorSteamId && user.steamId === post.authorSteamId);
  const canEditPost = isOwnPost;
  const canDeletePost = Boolean(user?.steamId && (isOwnPost || isAdmin));

  const load = useCallback(async ({ silent = false, forceRefresh = false } = {}) => {
    if (silent && inflightLoadRef.current) return;
    inflightLoadRef.current = true;
    try {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      const p = await forumApi.getPost(postId, { forceRefresh });
      setPost(p?.id ? p : (p?.post || p));
      try {
        const c = await forumApi.getComments(postId, { limit: 200, sortOrder: 'asc', forceRefresh });
        const normalized = (c?.comments || c || []).map(cm => ({
          ...cm,
          __liked: !!cm.__liked,
          __reported: !!cm.__reported
        }));
        setComments(normalized);
      } catch (commentsErr) {
        console.warn('[UI] Failed to load comments (showing post anyway):', commentsErr?.message || commentsErr);
        setComments([]);
      }
    } catch (e) {
      if (!silent) {
        setError('Failed to load post');
      } else {
        console.error('[UI] Silent forum reload failed:', e?.message || e);
      }
    } finally {
      inflightLoadRef.current = false;
      if (!silent) setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  // Reload when user returns to tab (in case they were away during SSE events)
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const tick = () => {
      if (!document.hidden) {
        load({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', tick);
    return () => {
      document.removeEventListener('visibilitychange', tick);
    };
  }, [load]);

  useEffect(() => {
    const commentId = searchParams.get('commentId');
    if (commentId) {
      setHighlightTarget({ commentId, parentCommentId: searchParams.get('parentCommentId') || null });
    } else {
      setHighlightTarget(null);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!highlightTarget?.parentCommentId) return;
    expandThreadAncestors(highlightTarget.parentCommentId);
  }, [highlightTarget?.parentCommentId, expandThreadAncestors]);

  useEffect(() => {
    if (!highlightTarget?.commentId) return;
    const el = document.querySelector(`[data-comment-id="${highlightTarget.commentId}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-blue-500', 'rounded-lg');
    const timeout = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-blue-500');
    }, 3000);
    setHighlightTarget(null);
    return () => clearTimeout(timeout);
  }, [highlightTarget, comments, repliesSignature]);

  const addComment = async () => {
    if (!commentText.trim() || commentSubmitting) return;
    try {
      setCommentSubmitting(true);
      const created = await forumApi.createComment({ postId, content: commentText });
      setCommentText('');
      toast.success('Comment added');
      await load({ silent: true, forceRefresh: true });
      if (created?.id) {
        setHighlightTarget({ commentId: created.id, parentCommentId: created.parentCommentId || null });
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to add comment';
      toast.error(msg);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const likePost = async () => {
    try {
      await forumApi.likePost(postId);
      setPost(prev => prev ? { ...prev, __liked: !prev.__liked, stats: { ...prev.stats, likes: (prev.stats?.likes || 0) + (prev.__liked ? -1 : 1) } } : prev);
    } catch (e) {
      toast.error('Failed to toggle like');
    }
  };

  const likeComment = async (comment) => {
    // Optimistic local flip
    setComments(prev => prev.map(c => c.id === comment.id
      ? { ...c, __liked: !c.__liked, stats: { ...c.stats, likes: (c.stats?.likes || 0) + (c.__liked ? -1 : 1) } }
      : c));
    try {
      const res = await forumApi.likeComment(comment.id);
      if (res && typeof res.liked === 'boolean') {
        setComments(prev => prev.map(c => c.id === comment.id ? { ...c, __liked: res.liked } : c));
      }
    } catch (e) {
      // Revert
      setComments(prev => prev.map(c => c.id === comment.id
        ? { ...c, __liked: !c.__liked, stats: { ...c.stats, likes: (c.stats?.likes || 0) + (c.__liked ? 1 : -1) } }
        : c));
      toast.error(e?.response?.data?.error || 'Failed to toggle like');
    }
  };

  // Unified modal for report/delete (post or comment)
  const [modal, setModal] = useState({ open:false, mode:null, targetType:null, targetId:null, targetObj:null });
  const [reason, setReason] = useState('');
  const requiredPhrase = 'DELETE';
  const [confirmPhrase, setConfirmPhrase] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [editPostOpen, setEditPostOpen] = useState(false);
  const [editPostTitle, setEditPostTitle] = useState('');
  const [editPostContent, setEditPostContent] = useState('');
  const [editPostTags, setEditPostTags] = useState('');
  const [editPostLoading, setEditPostLoading] = useState(false);

  const openReport = (type, id, obj) => setModal({ open:true, mode:'report', targetType:type, targetId:id, targetObj:obj });
  const openDeleteComment = (comment) => setModal({ open:true, mode:'delete-comment', targetType:'comment', targetId:comment.id, targetObj:comment });
  const openDeletePost = () => setModal({ open:true, mode:'delete-post', targetType:'post', targetId:postId, targetObj:post });
  const closeModal = () => { setModal({ open:false, mode:null, targetType:null, targetId:null, targetObj:null }); setReason(''); setConfirmPhrase(''); };

  const executeModal = async () => {
    if (!modal.mode || modalLoading) return;
    setModalLoading(true);
    try {
      if (modal.mode === 'report') {
        if (!reason.trim()) { toast.error('Reason required'); return; }
        await forumApi.report({ contentType: modal.targetType, contentId: modal.targetId, reason: reason.trim() });
        if (modal.targetType === 'post') setPost(prev => prev ? { ...prev, __reported: true } : prev);
        if (modal.targetType === 'comment') setComments(prev => prev.map(c => c.id === modal.targetId ? { ...c, __reported: true } : c));
        toast.success('Report submitted');
      } else if (modal.mode === 'delete-comment') {
        if (confirmPhrase !== requiredPhrase) return;
        await forumApi.deleteComment(modal.targetId);
        setComments(prev => prev.filter(c => c.id !== modal.targetId));
        toast.success('Comment deleted');
      } else if (modal.mode === 'delete-post') {
        if (confirmPhrase !== requiredPhrase) return;
        await forumApi.deletePost(postId);
        toast.success('Post deleted');
        navigate('/forum');
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Action failed');
    } finally {
      setModalLoading(false);
      closeModal();
    }
  };

  const startEditPost = () => {
    if (!post) return;
    setEditPostTitle(post.title || '');
    setEditPostContent(post.content || '');
    setEditPostTags(Array.isArray(post.tags) ? post.tags.join(', ') : '');
    setEditPostOpen(true);
  };

  const closeEditPostModal = () => {
    if (editPostLoading) return;
    setEditPostOpen(false);
  };

  const submitEditPost = async () => {
    if (!editPostTitle.trim() || !editPostContent.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    try {
      setEditPostLoading(true);
      const tags = editPostTags
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      await forumApi.updatePost(postId, {
        title: editPostTitle.trim(),
        content: editPostContent,
        tags
      });
      toast.success('Post updated');
      setEditPostOpen(false);
      await load({ silent: true });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update post');
    } finally {
      setEditPostLoading(false);
    }
  };

  // Editing comments
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentSubmitting, setEditCommentSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const startEditComment = (comment) => {
    setEditingComment(comment);
    setEditCommentText(comment.content);
  };

  const startReply = (comment) => {
    setReplyingTo(comment);
    setReplyText('');
  };

  const submitReply = async () => {
    if (!replyingTo || !replyText.trim() || replySubmitting) return;
    try {
      setReplySubmitting(true);
      const created = await forumApi.createReply(replyingTo.id, { content: replyText });
      const parentId = replyingTo.parentCommentId || replyingTo.id;
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply posted');
      await load({ silent: true, forceRefresh: true });
      expandThreadAncestors(parentId);
      if (created?.id) {
        setHighlightTarget({ commentId: created.id, parentCommentId: parentId });
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to reply');
    } finally {
      setReplySubmitting(false);
    }
  };

  const submitEditComment = async () => {
    if (!editingComment || editCommentSubmitting) return;
    try {
      setEditCommentSubmitting(true);
      await forumApi.updateComment(editingComment.id, { content: editCommentText });
      setEditingComment(null);
      toast.success('Comment updated');
      await load({ silent: true, forceRefresh: true });
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to update comment');
    } finally {
      setEditCommentSubmitting(false);
    }
  };

  const deleteComment = (comment) => openDeleteComment(comment);
  const reportContent = (type, id) => {
    if (!isAuthenticated) {
      toast.error('Please log in to report content.');
      return;
    }

    if (type === 'post') {
      if (user?.steamId && post?.authorSteamId === user.steamId) {
        toast.error('You cannot report your own post.');
        return;
      }
      openReport('post', id, post);
      return;
    }

    const targetComment = comments.find(c => c.id === id);
    if (!targetComment) return;
    if (user?.steamId && targetComment.authorSteamId === user.steamId) {
      toast.error('You cannot report your own comment.');
      return;
    }
    openReport('comment', id, targetComment);
  };

  const CommentThread = ({ node, depth = 0 }) => {
    const hasReplies = Array.isArray(node.children) && node.children.length > 0;
    const isOpen = showReplies[node.id] ?? depth < 1;
    const canReplyHere = depth < MAX_REPLY_DEPTH - 1;
    const containerClass = depth === 0 ? 'space-y-3' : 'space-y-3 border-l border-gray-800 pl-4';
    const canEdit = Boolean(user && user.steamId === node.authorSteamId);
    const canDelete = Boolean(user && (user.steamId === node.authorSteamId || isAdmin));

    return (
      <div className={containerClass} data-comment-id={node.id}>
        <Comment
          comment={node}
          depth={depth}
          onLike={likeComment}
          onReport={reportContent}
          auth={isAuthenticated}
          canEdit={canEdit && !isSuspended}
          canDelete={canDelete && !isSuspended}
          onEdit={startEditComment}
          onDelete={deleteComment}
          onReply={startReply}
          currentUserSteamId={user?.steamId}
          canReply={isAuthenticated && canReplyHere}
          hasReplies={hasReplies}
          repliesOpen={hasReplies ? isOpen : false}
          onToggleReplies={() => toggleRepliesVisibility(node.id, !isOpen)}
          repliesCount={node.children?.length || 0}
          isSuspended={isSuspended}
        />
        {hasReplies && isOpen && (
          <div className="space-y-3 mt-3">
            {node.children.map(child => (
              <CommentThread key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const handlePostRealtime = useCallback((event) => {
    const targetId = event.post?.id || event.postId;
    if (targetId !== postId) return;
    if (event.type === 'post:deleted') {
      toast.error('This post was removed.');
      navigate('/forum');
      return;
    }
    load({ silent: true });
  }, [postId, load, navigate]);

  const handleCommentRealtime = useCallback((event) => {
    const targetPostId = event.comment?.postId || event.postId;
    if (targetPostId !== postId) return;
    if (event.type === 'comment:deleted') {
      load({ silent: true });
      return;
    }
    const parentId = event.comment?.parentCommentId || event.parentCommentId || null;
    if (parentId) {
      expandThreadAncestors(parentId);
    }
    const newCommentId = event.comment?.id || event.commentId || null;
    if (newCommentId) {
      setHighlightTarget({ commentId: newCommentId, parentCommentId: parentId });
    }
    load({ silent: true });
  }, [postId, load, expandThreadAncestors]);

  const handleRealtimeLike = useCallback((event) => {
    if (!event) return;
    const { type, postId: targetPostId, commentId: targetCommentId, actorSteamId } = event;
    
    // Ignore SSE events from current user's own actions (optimistic update already applied)
    if (actorSteamId === user?.steamId) return;
    
    // Update post like count immediately
    if (type === 'post:liked' && targetPostId === postId) {
      setPost(prev => {
        if (!prev) return prev;
        const currentLikes = prev.stats?.likes || 0;
        const increment = event.liked ? 1 : -1;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            likes: Math.max(0, currentLikes + increment)
          }
        };
      });
    }
    
    // Update comment like count immediately
    if (type === 'comment:liked' && targetCommentId) {
      setComments(prev => prev.map(c => {
        if (c.id === targetCommentId) {
          const currentLikes = c.stats?.likes || 0;
          const increment = event.liked ? 1 : -1;
          return {
            ...c,
            stats: {
              ...c.stats,
              likes: Math.max(0, currentLikes + increment)
            }
          };
        }
        return c;
      }));
    }
  }, [postId, user?.steamId, setPost, setComments]);

  useForumRealtime({ 
    onPostChange: handlePostRealtime, 
    onCommentChange: handleCommentRealtime,
    onLikeChange: handleRealtimeLike
  });

  if (loading && !post) return <PageLoader message="Loading post..." />;
  if (error) return <PageError message={error} onRetry={load} />;
  if (!post) return <PageError message="Post not found" onRetry={() => navigate('/forum')} />;

  return (
    <>
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/forum')}
        className="mb-4 flex items-center gap-2 bg-blue-600 text-gray-300 hover:text-blue-300 transition-colors max-w-5xl mx-auto"
      >
        <FaArrowLeft /> Back to Forum
      </button>
      
      {/* Suspension Banner */}
      {isSuspended && (
        <div className="max-w-4xl mx-auto mb-4">
          <SuspensionBanner suspension={user?.moderation?.suspension} />
        </div>
      )}
      
      <div className="max-w-4xl mx-auto">
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-4 sm:p-6">
          <div className="flex gap-4">
            <AuthorAvatar src={post.authorAvatarUrl} name={post.authorDisplayName} sizeClass="w-12 h-12" />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  {post.title}
                  {post.editHistory?.length ? <span className="text-xs text-gray-400 font-normal">(edited)</span> : null}
                  {post.__reported && <span className="text-[10px] bg-red-800 text-red-200 px-2 py-0.5 rounded">reported</span>}
                </h1>
                {post.isPinned && <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">Pinned</span>}
                {post.isLocked && <span className="text-xs bg-red-600 px-2 py-0.5 rounded">Locked</span>}
              </div>
              <div className="text-xs text-gray-400 mt-1">By {post.authorDisplayName || 'Unknown'}</div>
            </div>
          </div>
          <div className="text-gray-300 whitespace-pre-wrap mt-3">{post.content}</div>
          {post.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {post.tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-700 text-gray-200">#{t}</span>)}
            </div>
          )}
          <div className="text-xs text-gray-400 mt-3 flex items-center gap-4">
            <span>💬 {post.stats?.comments || 0}</span>
            <span>👍 {post.stats?.likes || 0}</span>
            <span>⏱️ {post.lastActivity ? new Date(post.lastActivity._seconds ? post.lastActivity._seconds * 1000 : post.lastActivity).toLocaleString() : ''}</span>
            {isAuthenticated && !isSuspended && (
              <div className="ml-auto flex items-center gap-2">
                <button onClick={likePost} className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-200">{post.__liked ? 'Unlike' : 'Like'}</button>
                {!isOwnPost && (
                  <button
                    disabled={post.__reported}
                    onClick={() => reportContent('post', postId)}
                    className={`px-3 py-1 rounded ${post.__reported ? 'bg-gray-600 text-gray-300 cursor-not-allowed' : 'bg-red-700 hover:bg-red-600 text-white'}`}
                  >
                    {post.__reported ? 'Reported' : 'Report'}
                  </button>
                )}
                {canEditPost && (
                  <button onClick={startEditPost} className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white">Edit</button>
                )}
                {canDeletePost && (
                  <button onClick={openDeletePost} className="px-3 py-1 rounded bg-yellow-700 hover:bg-yellow-600 text-white">Delete</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Comments */}
        <div className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Comments</h2>
          <div className="grid gap-4">
            {commentTree.length === 0 && <div className="text-gray-400 text-sm">No comments yet.</div>}
            {commentTree.map(node => (
              <CommentThread key={node.id} node={node} depth={0} />
            ))}
          </div>

          {isAuthenticated && !isSuspended && (
            <div className="mt-4">
              <textarea value={commentText} onChange={e => setCommentText(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[120px]" placeholder="Write a comment..." disabled={commentSubmitting} />
              <div className="mt-2 flex justify-end">
                <button onClick={addComment} className={`px-3 py-2 text-sm rounded text-white ${commentSubmitting ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={commentSubmitting}>{commentSubmitting ? 'Posting...' : 'Post Comment'}</button>
              </div>
            </div>
          )}
          {isAuthenticated && isSuspended && (
            <div className="mt-4 p-3 rounded bg-gray-800 border border-gray-700 text-gray-500 text-sm text-center">
              You are suspended and cannot post comments.
            </div>
          )}
        </div>
      </div>
    </div>
    {replyingTo && (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Reply to Comment</h3>
            <button onClick={()=>setReplyingTo(null)} className="text-gray-400 hover:text-white" disabled={replySubmitting}>✖</button>
          </div>
          <div className="text-xs text-gray-400 mb-2 line-clamp-2">{replyingTo.content}</div>
          <textarea className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[140px]" value={replyText} onChange={e=>setReplyText(e.target.value)} disabled={replySubmitting} />
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={()=>setReplyingTo(null)} className="px-3 py-2 text-sm rounded bg-gray-700 text-white" disabled={replySubmitting}>Cancel</button>
            <button onClick={submitReply} className={`px-3 py-2 text-sm rounded text-white ${replySubmitting ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={replySubmitting}>{replySubmitting ? 'Posting...' : 'Reply'}</button>
          </div>
        </div>
      </div>
    )}
  {editingComment && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Edit Comment</h3>
            <button onClick={()=>setEditingComment(null)} className="text-gray-400 hover:text-white" disabled={editCommentSubmitting}>✖</button>
          </div>
          <textarea className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[140px]" value={editCommentText} onChange={e=>setEditCommentText(e.target.value)} disabled={editCommentSubmitting} />
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={()=>setEditingComment(null)} className="px-3 py-2 text-sm rounded bg-gray-700 text-white" disabled={editCommentSubmitting}>Cancel</button>
            <button onClick={submitEditComment} className={`px-3 py-2 text-sm rounded text-white ${editCommentSubmitting ? 'bg-blue-800 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`} disabled={editCommentSubmitting}>{editCommentSubmitting ? 'Saving...' : 'Save'}</button>
          </div>
        </div>
      </div>
    )}
    {editPostOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
        <div className="w-full max-w-2xl bg-gray-900 border border-gray-700 rounded-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Edit Post</h3>
            <button onClick={closeEditPostModal} className="text-gray-400 hover:text-white" disabled={editPostLoading}>✖</button>
          </div>
          <div className="grid gap-3">
            <input
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              value={editPostTitle}
              onChange={e => setEditPostTitle(e.target.value)}
              placeholder="Post title"
            />
            <textarea
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[160px]"
              value={editPostContent}
              onChange={e => setEditPostContent(e.target.value)}
              placeholder="Post content"
            />
            <input
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white"
              value={editPostTags}
              onChange={e => setEditPostTags(e.target.value)}
              placeholder="Tags (comma separated)"
            />
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button onClick={closeEditPostModal} className="px-3 py-2 text-sm rounded bg-gray-700 text-white" disabled={editPostLoading}>Cancel</button>
            <button
              onClick={submitEditPost}
              className={`px-3 py-2 text-sm rounded bg-blue-600 text-white ${editPostLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              disabled={editPostLoading}
            >
              {editPostLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )}
    <Modal
      open={modal.open}
      title={modal.mode === 'report' ? 'Report' : modal.mode === 'delete-comment' ? 'Delete Comment' : modal.mode === 'delete-post' ? 'Delete Post' : ''}
      onClose={modalLoading ? ()=>{} : closeModal}
      onConfirm={executeModal}
      confirmText={modal.mode==='report' ? 'Submit' : 'Delete'}
      confirmDisabled={(modal.mode==='report' && !reason.trim()) || ((modal.mode==='delete-comment' || modal.mode==='delete-post') && confirmPhrase!==requiredPhrase)}
      loading={modalLoading}
      size="md"
    >
      {modal.mode === 'report' && (
        <>
          <p className="text-sm text-gray-300">Enter a reason for reporting this {modal.targetType}.</p>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white min-h-[120px]" placeholder="Reason (spam, abuse, etc.)" />
        </>
      )}
      {(modal.mode === 'delete-comment' || modal.mode === 'delete-post') && (
        <>
          <p className="text-sm text-gray-300">Type <span className="font-mono text-red-400">{requiredPhrase}</span> to confirm permanent deletion of this {modal.mode === 'delete-post' ? 'post (all its comments will be gone)' : 'comment'}.</p>
          <input value={confirmPhrase} onChange={e=>setConfirmPhrase(e.target.value)} placeholder={requiredPhrase} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
        </>
      )}
    </Modal>
    </>
  );
}
