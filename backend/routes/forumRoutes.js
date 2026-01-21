import express from 'express';
import firebaseService, { admin } from '../services/firebaseService.js';
import eventBus, { EVENT_TOPICS } from '../utils/eventBus.js';

const router = express.Router();
const SSE_HEARTBEAT_MS = 25000;

const emitForumEvent = (payload = {}) => {
  try {
    eventBus.emit(EVENT_TOPICS.FORUM, {
      ...payload,
      emittedAt: Date.now()
    });
  } catch (e) {
    console.warn('[FORUM] Failed to emit realtime event', e?.message || e);
  }
};

// Simple admin check (single-role model: user, verified, admin)
const requireAdmin = async (req, res, next) => {
  if (!req.user || !req.user.steamId) return res.status(401).json({ error: 'Authentication required' });
  try {
    const u = await firebaseService.getUser(req.user.steamId);
    const roles = u?.roles || [];
    if (roles.includes('admin')) return next();
    return res.status(403).json({ error: 'Admin only' });
  } catch (e) {
    return res.status(500).json({ error: 'Role check failed' });
  }
};

// Simple auth check using session (Passport attaches req.user)
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.steamId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// GET /api/forum/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await firebaseService.getForumCategories();
    res.json({ categories });
  } catch (error) {
    console.error('[FORUM] Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// SSE stream for realtime forum updates
router.get('/stream', requireAuth, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const send = (eventName, data) => {
    res.write(`event: ${eventName}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send('connected', { ok: true, ts: Date.now() });

  const listener = (payload) => send('forum', payload);
  eventBus.on(EVENT_TOPICS.FORUM, listener);

  const heartbeat = setInterval(() => send('ping', { ts: Date.now() }), SSE_HEARTBEAT_MS);

  req.on('close', () => {
    clearInterval(heartbeat);
    eventBus.off(EVENT_TOPICS.FORUM, listener);
  });
});

// GET /api/forum/posts?categoryId=...&limit=20&offset=0&sortBy=lastActivity&sortOrder=desc
router.get('/posts', async (req, res) => {
  try {
  let { categoryId, limit = 20, offset = 0, sortBy = 'lastActivity', sortOrder = 'desc', page, mine } = req.query;
    limit = Number(limit); offset = Number(offset);
    const wantsMine = mine === '1' || mine === 'true';
    if (wantsMine) {
      if (!req.user || !req.user.steamId) return res.status(401).json({ error: 'Authentication required' });
      const steamId = req.user.steamId;
      // Fetch up to 500 user posts and sort in-memory (volume bounded)
      const snap = await firebaseService.forumPosts
        .where('authorSteamId', '==', steamId)
        .limit(500)
        .get();
      const getTs = (v) => v? (v._seconds? v._seconds*1000 + (v._nanoseconds||0)/1e6 : (v.seconds? v.seconds*1000 + (v.nanoseconds||0)/1e6 : (Number.isNaN(Date.parse(v))?0:Date.parse(v)))) : 0;
      let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      posts.sort((a,b) => {
        if (sortBy === 'lastActivity') {
          const ta = getTs(a.lastActivity); const tb = getTs(b.lastActivity);
          return sortOrder==='desc'? (tb-ta):(ta-tb);
        }
        if (sortBy === 'createdAt') {
          const ta = getTs(a.createdAt); const tb = getTs(b.createdAt);
          return sortOrder==='desc'? (tb-ta):(ta-tb);
        }
        if (sortBy === 'title') {
          return String(a.title||'').localeCompare(String(b.title||'')) * (sortOrder==='desc'?-1:1);
        }
        // default fallback lastActivity if unknown
        const ta = getTs(a.lastActivity); const tb = getTs(b.lastActivity);
        return sortOrder==='desc'? (tb-ta):(ta-tb);
      });
      const total = posts.length;
      const sliced = posts.slice(offset, offset + limit);
      const annotated = await Promise.all(sliced.map(async p => {
        let reported = false;
        try {
          const repSnap = await firebaseService.forumReports
            .where('reporterSteamId','==', steamId)
            .where('contentType','==','post')
            .where('contentId','==', p.id)
            .limit(1).get();
          reported = !repSnap.empty;
        } catch(_){}
        return { ...p, __liked: Array.isArray(p.likedBy)? p.likedBy.includes(steamId):false, __reported: reported };
      }));
      return res.json({ posts: annotated, total, limit, offset, mode: 'mine' });
    }
    if (!categoryId) return res.status(400).json({ error: 'categoryId is required' });
    // Support page param (1-based) -> offset conversion if provided
    if (page && !req.query.offset) {
      const p = Math.max(1, Number(page));
      offset = (p - 1) * Number(limit);
    }
    const { items: posts, total } = await firebaseService.getForumPosts(categoryId, {
      limit: Number(limit),
      offset: Number(offset),
      sortBy: String(sortBy),
      sortOrder: String(sortOrder)
    });
    // Add lightweight meta if authenticated
    if (req.user && req.user.steamId) {
      const steamId = req.user.steamId;
      const postsWithMeta = await Promise.all(posts.map(async p => {
        let liked = false;
        if (Array.isArray(p.likedBy)) liked = p.likedBy.includes(steamId);
        // check reported (fast query limited to 1)
        let reported = false;
        try {
          const repSnap = await firebaseService.forumReports
            .where('reporterSteamId', '==', steamId)
            .where('contentType', '==', 'post')
            .where('contentId', '==', p.id)
            .limit(1).get();
          reported = !repSnap.empty;
        } catch (_) {}
        return { ...p, __liked: liked, __reported: reported };
      }));
      return res.json({ posts: postsWithMeta, total, limit: Number(limit), offset: Number(offset) });
    }
    res.json({ posts, total, limit: Number(limit), offset: Number(offset) });
  } catch (error) {
    console.error('[FORUM] Error fetching posts:', error?.message || error);
    // Fallback without composite indexes
    try {
      const snap = await firebaseService.forumPosts
        .where('categoryId', '==', String(req.query.categoryId))
        .limit(1000)
        .get();
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const filtered = raw; // hard delete model – all remaining posts are active
      const getTs = (v) => v? (v._seconds? v._seconds*1000 + (v._nanoseconds||0)/1e6 : (v.seconds? v.seconds*1000 + (v.nanoseconds||0)/1e6 : (Number.isNaN(Date.parse(v))? 0 : Date.parse(v)))) : 0;
      const sb = String(req.query.sortBy || 'lastActivity');
      const so = String(req.query.sortOrder || 'desc');
      filtered.sort((a,b) => {
        const pin = (a.isPinned?1:0) - (b.isPinned?1:0);
        if (pin !== 0) return -pin; // pinned first
        const ta = sb==='lastActivity'? getTs(a.lastActivity) : getTs(a.createdAt);
        const tb = sb==='lastActivity'? getTs(b.lastActivity) : getTs(b.createdAt);
        return so==='desc'? (tb-ta) : (ta-tb);
      });
      const start = Math.max(0, Number(req.query.offset||0));
      const end = start + Number(req.query.limit||20);
      return res.json({ posts: filtered.slice(start, end) });
    } catch (e2) {
      console.error('[FORUM] Fallback posts fetch failed:', e2?.message || e2);
      return res.json({ posts: [] });
    }
  }
});

// GET /api/forum/my-posts?limit=20&offset=0&sortBy=lastActivity&sortOrder=desc
router.get('/my-posts', requireAuth, async (req, res) => {
  try {
    let { limit = 20, offset = 0, sortBy = 'lastActivity', sortOrder = 'desc' } = req.query;
    limit = Number(limit); offset = Number(offset);
    const steamId = req.user.steamId;
    // Fetch up to 500 posts by this user and sort in-memory (author volume typically low)
    const snap = await firebaseService.forumPosts
      .where('authorSteamId', '==', steamId)
      .limit(500)
      .get();
    let posts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const getTs = (v) => v? (v._seconds? v._seconds*1000 + (v._nanoseconds||0)/1e6 : (v.seconds? v.seconds*1000 + (v.nanoseconds||0)/1e6 : (Number.isNaN(Date.parse(v))?0:Date.parse(v)))):0;
    posts.sort((a,b) => {
      if (sortBy === 'lastActivity') {
        const ta = getTs(a.lastActivity); const tb = getTs(b.lastActivity);
        return sortOrder==='desc'? (tb-ta):(ta-tb);
      } else if (sortBy==='createdAt') {
        const ta = getTs(a.createdAt); const tb = getTs(b.createdAt);
        return sortOrder==='desc'? (tb-ta):(ta-tb);
      }
      // Fallback alphabetical by title
      return String(a.title||'').localeCompare(String(b.title||'')) * (sortOrder==='desc'? -1:1);
    });
    const total = posts.length;
    const sliced = posts.slice(offset, offset + limit);
    // annotate liked/reported
    const annotated = await Promise.all(sliced.map(async p => {
      let reported = false;
      try {
        const repSnap = await firebaseService.forumReports
          .where('reporterSteamId','==', steamId)
          .where('contentType','==','post')
          .where('contentId','==', p.id)
          .limit(1).get();
        reported = !repSnap.empty;
      } catch(_){}
      return { ...p, __liked: Array.isArray(p.likedBy)? p.likedBy.includes(steamId):false, __reported: reported };
    }));
    res.json({ posts: annotated, total, limit, offset, mode: 'my-posts' });
  } catch (e) {
    console.error('[FORUM] Error fetching my posts:', e?.message||e);
    res.status(500).json({ error: 'Failed to fetch your posts' });
  }
});

// GET /api/forum/posts/:postId
router.get('/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    console.log(`[FORUM DEBUG] GET /posts/${postId} - Fetching post from Firestore`);
    const doc = await firebaseService.forumPosts.doc(postId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Post not found' });
    const data = { id: doc.id, ...doc.data() };
    console.log(`[FORUM DEBUG] GET /posts/${postId} - stats.comments=${data.stats?.comments}, stats.likes=${data.stats?.likes}`);
    if (req.user && req.user.steamId) {
      const steamId = req.user.steamId;
      data.__liked = Array.isArray(data.likedBy) ? data.likedBy.includes(steamId) : false;
      try {
        const repSnap = await firebaseService.forumReports
          .where('reporterSteamId', '==', steamId)
          .where('contentType', '==', 'post')
          .where('contentId', '==', postId)
          .limit(1).get();
        data.__reported = !repSnap.empty;
      } catch (_) { data.__reported = false; }
    }
    res.json(data);
  } catch (error) {
    console.error('[FORUM] Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// POST /api/forum/posts
router.post('/posts', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { title, content, categoryId, tags = [] } = req.body || {};
    if (!title || !content || !categoryId) {
      return res.status(400).json({ error: 'Please make sure you filled all the form fields' });
    }
    const ref = await firebaseService.createForumPost(steamId, { title, content, categoryId, tags });
    const doc = await ref.get();
    const payload = { id: ref.id, ...doc.data() };
    emitForumEvent({ type: 'post:created', post: payload, actorSteamId: steamId });
    res.status(201).json(payload);
  } catch (error) {
    console.error('[FORUM] Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// PUT /api/forum/posts/:postId (edit post)
router.put('/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const steamId = req.user.steamId;
    const { title, content, tags, isPinned, isLocked } = req.body || {};
    const updated = await firebaseService.updateForumPost(steamId, postId, { title, content, tags, isPinned, isLocked });
    emitForumEvent({ type: 'post:updated', post: updated, actorSteamId: steamId });
    res.json(updated);
  } catch (error) {
    console.error('[FORUM] Error updating post:', error?.message || error, {
      body: req.body,
      user: req.user?.steamId,
      postId: req.params.postId
    });
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'Post not found') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// DELETE /api/forum/posts/:postId (hard delete now)
router.delete('/posts/:postId', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const steamId = req.user.steamId;
    const deleted = await firebaseService.deleteForumPost(steamId, postId);
    emitForumEvent({
      type: 'post:deleted',
      postId,
      categoryId: deleted?.categoryId || null,
      postAuthorSteamId: deleted?.authorSteamId || null,
      actorSteamId: steamId
    });
    res.json(deleted);
  } catch (error) {
    console.error('[FORUM] Error deleting post:', error?.message || error);
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'Post not found') return res.status(404).json({ error: 'Post not found' });
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// GET /api/forum/posts/:postId/comments?limit=50&sortOrder=asc
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 50, sortOrder = 'asc' } = req.query;
    let { items: comments, total } = await firebaseService.getForumComments(postId, { limit: Number(limit), sortOrder: String(sortOrder) });

    // Enrich with user-specific meta if authenticated
    if (req.user && req.user.steamId && Array.isArray(comments) && comments.length) {
      const steamId = req.user.steamId;
      // Mark likes directly from likedBy array
      comments = comments.map(c => ({
        ...c,
        __liked: Array.isArray(c.likedBy) ? c.likedBy.includes(steamId) : false,
        __reported: false // placeholder until filled
      }));

      // Collect IDs for batch report lookup
      const ids = comments.map(c => c.id).filter(Boolean);
      const reportedMap = {};
      if (ids.length) {
        // Try batch 'in' queries (chunks of 10)
        try {
          const chunkSize = 10;
            for (let i = 0; i < ids.length; i += chunkSize) {
              const chunk = ids.slice(i, i + chunkSize);
              const snap = await firebaseService.forumReports
                .where('reporterSteamId', '==', steamId)
                .where('contentType', '==', 'comment')
                .where('contentId', 'in', chunk)
                .get();
              snap.docs.forEach(d => {
                const r = d.data();
                if (r.contentId) reportedMap[r.contentId] = true;
              });
            }
        } catch (batchErr) {
          // Fallback: per-id check (could be slower but ensures correctness without new index requirements)
          console.warn('[FORUM] Batch report lookup failed, falling back to per-comment checks:', batchErr?.message);
          await Promise.all(ids.map(async id => {
            const has = await firebaseService.hasUserReported(steamId, 'comment', id);
            if (has) reportedMap[id] = true;
          }));
        }
      }
      comments = comments.map(c => ({ ...c, __reported: !!reportedMap[c.id] }));
    }

    res.json({ comments, total, limit: Number(limit) });
  } catch (error) {
    console.error('[FORUM] Error fetching comments:', error?.message || error);
    // Fallback without composite indexes
    try {
      const snap = await firebaseService.forumComments
        .where('postId', '==', req.params.postId)
        .limit(1000)
        .get();
      const toMillis = (v) => v ? (v._seconds ? (v._seconds * 1000 + (v._nanoseconds || 0) / 1e6) : (v.seconds ? (v.seconds * 1000 + (v.nanoseconds || 0) / 1e6) : (Number.isNaN(Date.parse(v)) ? 0 : Date.parse(v)))) : 0;
      let raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  // hard delete model – no soft delete flag
      raw.sort((a, b) => {
        const ta = toMillis(a.createdAt);
        const tb = toMillis(b.createdAt);
        return String(req.query.sortOrder || 'asc') === 'desc' ? (tb - ta) : (ta - tb);
      });
      let sliced = raw.slice(0, Number(req.query.limit || 50));
      // Even in fallback, attempt meta enrichment
      if (req.user && req.user.steamId) {
        const steamId = req.user.steamId;
        sliced = await Promise.all(sliced.map(async c => {
          const meta = { __liked: Array.isArray(c.likedBy) ? c.likedBy.includes(steamId) : false, __reported: false };
          try {
            meta.__reported = await firebaseService.hasUserReported(steamId, 'comment', c.id);
          } catch (_) {}
          return { ...c, ...meta };
        }));
      }
      return res.json({ comments: sliced, total: sliced.length, limit: Number(req.query.limit || 50) });
    } catch (e2) {
      console.error('[FORUM] Fallback comments fetch failed:', e2?.message || e2);
      return res.json({ comments: [], total: 0, limit: Number(req.query.limit || 50) });
    }
  }
});

// POST /api/forum/comments
router.post('/comments', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { postId, content, parentCommentId = null } = req.body || {};
    if (!postId || !content) {
      return res.status(400).json({ error: 'postId and content are required' });
    }
    const ref = await firebaseService.createForumComment(steamId, { postId, content, parentCommentId });

    // Notify post author of new comment (if not self)
    try {
      const postDoc = await firebaseService.forumPosts.doc(postId).get();
      if (postDoc.exists) {
        const post = postDoc.data();
        if (post.authorSteamId && post.authorSteamId !== steamId) {
          // Fetch displayName of commenter for message clarity
          const actor = await firebaseService.getUser(steamId);
          const display = actor?.displayName || 'Someone';
          const commentId = ref.id;
          const postUrl = `/forum/posts/${postId}?commentId=${commentId}`;
          await firebaseService.createNotification(post.authorSteamId, {
            type: 'forum_comment',
            title: 'New comment on your post',
            message: `${display} commented on: ${post.title}`,
            url: postUrl,
            data: { postId, commentId, url: postUrl }
          });
        }
      }
    } catch (notifyErr) {
      console.warn('[FORUM] Failed to send comment notification:', notifyErr?.message);
    }

    const doc = await ref.get();
    const payload = { id: ref.id, ...doc.data() };
    console.log(`[FORUM DEBUG] Comment created: id=${payload.id}, postId=${payload.postId}, by=${steamId}`);
    emitForumEvent({ type: 'comment:created', comment: payload, actorSteamId: steamId });
    console.log(`[FORUM DEBUG] SSE event emitted: comment:created for postId=${payload.postId}`);
    res.status(201).json(payload);
  } catch (error) {
    console.error('[FORUM] Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// POST /api/forum/comments/:commentId/reply  (creates a child comment and notifies parent author)
router.post('/comments/:commentId/reply', requireAuth, async (req, res) => {
  try {
    const steamId = req.user.steamId;
    const { commentId } = req.params;
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: 'content required' });
    const parentDoc = await firebaseService.forumComments.doc(commentId).get();
    if (!parentDoc.exists) return res.status(404).json({ error: 'Parent comment not found' });
    const parent = parentDoc.data();
    const ref = await firebaseService.createForumComment(steamId, { postId: parent.postId, content, parentCommentId: commentId });
    // notify parent author (if different)
    if (parent.authorSteamId && parent.authorSteamId !== steamId) {
      try {
        const replyId = ref.id;
        const replyUrl = `/forum/posts/${parent.postId}?commentId=${replyId}&parentCommentId=${commentId}`;
        await firebaseService.createNotification(parent.authorSteamId, {
          type: 'forum_comment',
          title: 'New reply to your comment',
          message: content.slice(0,140),
          url: replyUrl,
          data: { postId: parent.postId, commentId: replyId, parentCommentId: commentId, url: replyUrl }
        });
      } catch (e) { /* non-fatal */ }
    }
    const doc = await ref.get();
    const payload = { id: ref.id, ...doc.data() };
    emitForumEvent({ type: 'comment:created', comment: payload, actorSteamId: steamId });
    res.status(201).json(payload);
  } catch (e) {
    console.error('[FORUM] reply failed', e?.message||e);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

// PUT /api/forum/comments/:commentId (edit comment)
router.put('/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const steamId = req.user.steamId;
    const { content } = req.body || {};
    const updated = await firebaseService.updateForumComment(steamId, commentId, { content });
    emitForumEvent({ type: 'comment:updated', comment: updated, actorSteamId: steamId });
    res.json(updated);
  } catch (error) {
    console.error('[FORUM] Error updating comment:', error?.message || error, { commentId: req.params.commentId, user: req.user?.steamId, body: req.body });
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'Comment not found') return res.status(404).json({ error: 'Comment not found' });
    if (error.message === 'Cannot edit deleted comment') return res.status(400).json({ error: 'Cannot edit deleted comment' });
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// DELETE /api/forum/comments/:commentId (hard delete now)
router.delete('/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const steamId = req.user.steamId;
    const deleted = await firebaseService.deleteForumComment(steamId, commentId);
    emitForumEvent({
      type: 'comment:deleted',
      commentId,
      postId: deleted?.postId || null,
      parentCommentId: deleted?.parentCommentId || null,
      commentAuthorSteamId: deleted?.authorSteamId || null,
      actorSteamId: steamId
    });
    res.json(deleted);
  } catch (error) {
    console.error('[FORUM] Error deleting comment:', error?.message || error);
    if (error.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    if (error.message === 'Comment not found') return res.status(404).json({ error: 'Comment not found' });
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// POST /api/forum/posts/:postId/like (toggle)
router.post('/posts/:postId/like', requireAuth, async (req, res) => {
  try {
    const { postId } = req.params;
    const steamId = req.user.steamId;
    const postRef = firebaseService.forumPosts.doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Post not found' });
    const data = doc.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(steamId);
    await postRef.update({
      'stats.likes': admin.firestore.FieldValue.increment(hasLiked ? -1 : 1),
      likedBy: hasLiked ? admin.firestore.FieldValue.arrayRemove(steamId) : admin.firestore.FieldValue.arrayUnion(steamId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    emitForumEvent({ type: 'post:liked', postId, actorSteamId: steamId, liked: !hasLiked });
    res.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error('[FORUM] Error toggling post like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/forum/comments/:commentId/like (toggle)
router.post('/comments/:commentId/like', requireAuth, async (req, res) => {
  try {
    const { commentId } = req.params;
    const steamId = req.user.steamId;
    const commentRef = firebaseService.forumComments.doc(commentId);
    const doc = await commentRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Comment not found' });
    const data = doc.data();
    const likedBy = data.likedBy || [];
    const hasLiked = likedBy.includes(steamId);
    await commentRef.update({
      'stats.likes': admin.firestore.FieldValue.increment(hasLiked ? -1 : 1),
      likedBy: hasLiked ? admin.firestore.FieldValue.arrayRemove(steamId) : admin.firestore.FieldValue.arrayUnion(steamId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    emitForumEvent({ type: 'comment:liked', commentId, actorSteamId: steamId, liked: !hasLiked });
    res.json({ success: true, liked: !hasLiked });
  } catch (error) {
    console.error('[FORUM] Error toggling comment like:', error);
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// POST /api/forum/reports
router.post('/reports', requireAuth, async (req, res) => {
  try {
    const reporterSteamId = req.user.steamId;
    const { contentType, contentId, reason } = req.body || {};
    if (!contentType || !contentId || !reason) {
      return res.status(400).json({ error: 'contentType, contentId and reason are required' });
    }
    try {
      const ref = await firebaseService.createForumReport(reporterSteamId, { contentType, contentId, reason });
      const doc = await ref.get();
      const payload = { id: ref.id, ...doc.data() };
      emitForumEvent({ type: 'report:created', report: payload, actorSteamId: reporterSteamId });
      res.status(201).json(payload);
    } catch (e) {
      if (e.code === 'ALREADY_REPORTED' || e.message === 'Already reported') {
        return res.status(409).json({ error: 'You have already reported this content' });
      }
      if (e.message === 'Target content not found') {
        return res.status(404).json({ error: 'Content not found' });
      }
      throw e;
    }
  } catch (error) {
    console.error('[FORUM] Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Utility endpoint to check which contents user has reported (batch) to power disabling buttons
router.post('/reports/check', requireAuth, async (req, res) => {
  try {
    const reporterSteamId = req.user.steamId;
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required' });
    }
    // items: [{contentType, contentId}]
    const results = {};
    await Promise.all(items.map(async (it) => {
      if (!it?.contentType || !it?.contentId) return;
      const key = `${it.contentType}:${it.contentId}`;
      results[key] = await firebaseService.hasUserReported(reporterSteamId, it.contentType, it.contentId);
    }));
    res.json({ reported: results });
  } catch (error) {
    console.error('[FORUM] Error checking reports:', error);
    res.status(500).json({ error: 'Failed to check reports' });
  }
});

// ADMIN / MODERATION SUMMARY
// GET /api/forum/admin/summary
router.get('/admin/summary', requireAdmin, async (req, res) => {
  try {
    // Use Firestore aggregation count() when available; fall back to limited scans.
    const countOrScan = async (colRef) => {
      try {
        const snap = await colRef.count().get();
        return snap.data().count || 0;
      } catch (_) {
        const scan = await colRef.limit(1000).get();
        return scan.size;
      }
    };
    const [postsCount, commentsCount, reportsCount, usersCount, notificationsCount, openReports] = await Promise.all([
      countOrScan(firebaseService.forumPosts),
      countOrScan(firebaseService.forumComments),
      countOrScan(firebaseService.forumReports),
      countOrScan(firebaseService.users),
      countOrScan(firebaseService.notifications),
      (async () => {
        try {
          const pendingSnap = await firebaseService.forumReports.where('status','==','pending').count().get();
          return pendingSnap.data().count || 0;
        } catch { // fallback
          const scan = await firebaseService.forumReports.where('status','==','pending').limit(1000).get();
          return scan.size;
        }
      })()
    ]);
    res.json({
      posts: postsCount,
      comments: commentsCount,
      reports: reportsCount,
      openReports,
      users: usersCount,
      notifications: notificationsCount
    });
  } catch (e) {
    console.error('[FORUM] Admin summary failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// BULK resolve reports
// POST /api/forum/admin/reports/resolve { reportIds:[], status, notes, action }
router.post('/admin/reports/resolve', requireAdmin, async (req, res) => {
  try {
    const { reportIds = [], status = 'resolved', notes = null, action = null } = req.body || {};
    if (!Array.isArray(reportIds) || !reportIds.length) {
      return res.status(400).json({ error: 'reportIds array required' });
    }
    const result = await firebaseService.resolveReports(req.user.steamId, reportIds, { status, notes, action });
    if (result?.processed) {
      emitForumEvent({
        type: 'report:resolved',
        reportIds: result.reportIds || [],
        status,
        actorSteamId: req.user.steamId
      });
    }
    res.json(result);
  } catch (e) {
    console.error('[FORUM] Resolve reports failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to resolve reports' });
  }
});

// BULK delete content
// POST /api/forum/admin/bulk-delete { postIds:[], commentIds:[] }
router.post('/admin/bulk-delete', requireAdmin, async (req, res) => {
  try {
    const { postIds = [], commentIds = [] } = req.body || {};
    if (!Array.isArray(postIds) && !Array.isArray(commentIds)) {
      return res.status(400).json({ error: 'postIds or commentIds arrays required' });
    }
    const result = await firebaseService.bulkDeleteContent(req.user.steamId, { postIds, commentIds });
    res.json(result);
  } catch (e) {
    console.error('[FORUM] Bulk delete failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to bulk delete content' });
  }
});

// PURGE statistics endpoint
// GET /api/forum/admin/purge-stats
// router.get('/admin/purge-stats', requireAdmin, async (req, res) => {
//   try {
//     const stats = await firebaseService.getPurgeStatistics();
//     res.json(stats);
//   } catch (e) {
//     console.error('[FORUM] Purge stats failed:', e?.message || e);
//     res.status(500).json({ error: 'Failed to fetch purge statistics' });
//   }
// });

// ADMIN: Clear a user's suspension early
// POST /api/forum/admin/clear-suspension { steamId }
router.post('/admin/clear-suspension', requireAdmin, async (req, res) => {
  try {
    const { steamId } = req.body || {};
    if (!steamId) return res.status(400).json({ error: 'steamId required' });
    const result = await firebaseService.clearUserSuspension(req.user.steamId, steamId);
    res.json(result);
  } catch (e) {
    if (e.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    console.error('[FORUM] Clear suspension failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to clear suspension' });
  }
});

// ADMIN: Get user moderation status
// GET /api/forum/admin/moderation-status/:steamId
router.get('/admin/moderation-status/:steamId', requireAdmin, async (req, res) => {
  try {
    const { steamId } = req.params;
    const status = await firebaseService.getUserModerationStatus(req.user.steamId, steamId);
    res.json(status);
  } catch (e) {
    if (e.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    console.error('[FORUM] Moderation status fetch failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to fetch moderation status' });
  }
});

// ADMIN: Generic entity listing for dashboard (users, posts, comments, reports, notifications)
router.get('/admin/list/:entity', requireAdmin, async (req, res) => {
  try {
    const { entity } = req.params;
  let { limit = 25, cursor, q, steamId, status, sortField, sortDir, reporterSteamId, contentType, searchName, searchFields } = req.query;
    const l = Math.min(Number(limit) || 25, 100);
    let collection;
    switch(entity) {
      case 'users': collection = firebaseService.users; break;
      case 'posts': collection = firebaseService.forumPosts; break;
      case 'comments': collection = firebaseService.forumComments; break;
      case 'reports': collection = firebaseService.forumReports; break;
      case 'notifications': collection = firebaseService.notifications; break;
      default: return res.status(400).json({ error: 'Unsupported entity'});
    }
    let queryRef = collection;
    if (entity === 'users' && steamId) queryRef = queryRef.where('steamId','==', steamId);
    if (entity === 'posts' && steamId) queryRef = queryRef.where('authorSteamId','==', steamId);
    if (entity === 'comments' && steamId) queryRef = queryRef.where('authorSteamId','==', steamId);
    if (entity === 'reports') {
      if (steamId) queryRef = queryRef.where('targetSteamId','==', steamId);
      if (reporterSteamId) queryRef = queryRef.where('reporterSteamId','==', reporterSteamId);
      if (status) queryRef = queryRef.where('status','==', status);
      if (contentType) queryRef = queryRef.where('contentType','==', contentType);
    }

    // Server-side prefix search attempt (requires lowercase indexed field presence)
    // Multi-field prefix search support
    // For posts: allow searching by titleLower, authorDisplayNameLower, authorSteamId, id
    // For comments: contentLower, authorDisplayNameLower, authorSteamId, id
    // For reports: reporterDisplayNameLower, targetDisplayNameLower, reporterSteamId, targetSteamId, contentSnippetLower, reasonLower, contentType, status
  let usedSearch = false;
  let primarySearchField = null;
  let skipFinalFilter = false; // when we perform explicit fallback filtering earlier
    const qTrim = (q && typeof q === 'string') ? q.trim() : '';
    if (qTrim.length >= 2) {
      const qLower = qTrim.toLowerCase();
      // Determine candidate fields and choose first available indexed for prefix
      let candidateFields = [];
      if (entity === 'posts') {
        candidateFields = ['titleLower','authorDisplayNameLower'];
      } else if (entity === 'comments') {
        candidateFields = ['contentLower','authorDisplayNameLower'];
      } else if (entity === 'reports') {
        // allow switching between reporter/target by searchName param; default to reporter
        if (searchName === 'target') candidateFields = ['targetDisplayNameLower','reporterDisplayNameLower']; else candidateFields = ['reporterDisplayNameLower','targetDisplayNameLower'];
        candidateFields.push('contentSnippetLower','reasonLower');
      } else if (entity === 'users') {
        // displayNameLower supports prefix; roles is array so handled via fallback filtering (not prefix)
        candidateFields = ['displayNameLower'];
      } else if (entity === 'notifications') {
        candidateFields = ['titleLower'];
      }
      // If caller supplied explicit searchFields (comma-separated) intersect with candidates
      if (searchFields) {
        const requested = String(searchFields).split(',').map(s=>s.trim()).filter(Boolean);
        candidateFields = candidateFields.filter(f=>requested.includes(f));
      }
      for (const f of candidateFields) {
        try {
          queryRef = queryRef.orderBy(f).startAt(qLower).endAt(qLower + '\uf8ff');
          primarySearchField = f;
          usedSearch = true;
          break;
        } catch (e) {
          // try next field silently
        }
      }
      if (!usedSearch) {
        console.warn('[ADMIN] No indexed field accepted for prefix search, will fallback to in-memory filtering for entity', entity);
      }
    }

    // Sorting: whitelist fields per entity
    const sortWhitelist = {
      users: ['lastSeen','updatedAt','createdAt','displayNameLower','steamId','role'],
      posts: ['updatedAt','lastActivity','createdAt','stats.comments','stats.likes','titleLower','authorDisplayNameLower'],
      comments: ['updatedAt','createdAt','contentLower','authorDisplayNameLower'],
      reports: ['updatedAt','createdAt','status','reporterDisplayNameLower','targetDisplayNameLower'],
      notifications: ['createdAt','updatedAt','titleLower','steamId','type'] // added steamId & type so sorting works in UI
    };
    const fallbackOrder = (() => {
      switch (entity) {
        case 'notifications': return 'createdAt';
        case 'users': return 'createdAt';
        case 'posts': return 'updatedAt';
        case 'comments': return 'updatedAt';
        case 'reports': return 'updatedAt';
        default: return 'updatedAt';
      }
    })();
    const allowed = sortWhitelist[entity] || [];
    if (!sortField || !allowed.includes(sortField)) sortField = fallbackOrder;
    sortDir = (sortDir === 'asc' ? 'asc' : 'desc');

    if (!usedSearch) {
      queryRef = queryRef.orderBy(sortField, sortDir);
    } else {
      if (sortField && sortField !== primarySearchField) {
        try { queryRef = queryRef.orderBy(sortField, sortDir); } catch (_) {}
      }
    }
  // NOTE: Removed documentId() tie-breaker to avoid composite index requirements for every ordered field.

    // Cursor only applied when not doing search OR when searching on primarySearchField (safe ordering)
    if (cursor) {
      try {
        const cur = await collection.doc(String(cursor)).get();
        if (cur.exists) {
          const primaryValue = usedSearch && primarySearchField ? cur.get(primarySearchField) : cur.get(sortField);
          // Only include primaryValue in startAfter if we actually ordered by that field
          if (usedSearch && primarySearchField) {
            queryRef = queryRef.startAfter(primaryValue, cur.id);
          } else {
            queryRef = queryRef.startAfter(primaryValue || cur.id);
          }
        }
      } catch (cErr) {
        console.warn('[ADMIN] Cursor application failed, ignoring cursor', cErr?.message);
      }
    }

    queryRef = queryRef.limit(l);
    let snap;
    try {
      snap = await queryRef.get();
    } catch (err) {
      const msg = String(err.message || '');
      if (!msg.includes('requires an index')) throw err;
      console.warn('[ADMIN] Index required for primary query, attempting degraded strategy for', entity);
      try {
        if (usedSearch && primarySearchField) {
          // Just order by search field (no secondary ordering) then in-memory sort if needed
          let q1 = collection.orderBy(primarySearchField);
          if (cursor) {
            const curDoc = await collection.doc(String(cursor)).get();
            if (curDoc.exists) {
              const pv = curDoc.get(primarySearchField) || null;
              q1 = q1.startAfter(pv);
            }
          }
          snap = await q1.limit(l).get();
        } else {
          // Simple order by sortField alone
          let q2 = collection.orderBy(sortField, sortDir).limit(l);
          if (cursor) {
            const curDoc = await collection.doc(String(cursor)).get();
            if (curDoc.exists) {
              const sv = curDoc.get(sortField) || null;
              q2 = q2.startAfter(sv);
            }
          }
          snap = await q2.get();
        }
      } catch (err2) {
        console.warn('[ADMIN] Degraded query also failed, falling back to id scan', err2?.message);
        let idQuery = collection.orderBy(admin.firestore.FieldPath.documentId()).limit(l);
        if (cursor) idQuery = idQuery.startAfter(String(cursor));
        snap = await idQuery.get();
      }
    }
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // If the chosen prefix search field produced zero results, attempt a graceful fallback:
    // 1. Run a generic orderBy(sortField) query (larger window) and client-filter across multiple fields (id, steam/author names, etc.)
    // This enables searching by fields that aren't explicitly indexed for prefix (e.g., steamId, document id) on first attempt.
    if (usedSearch && items.length === 0 && qTrim) {
      try {
        // Fetch a broader slice for filtering (cap at 200 to limit cost)
        // For users, prefer displayNameLower for broad scan (guaranteed field) to support role-based substring search
        let altOrderField = sortField;
        if (entity === 'users' && !['displayNameLower','createdAt','lastSeen','updatedAt'].includes(sortField)) {
          altOrderField = 'displayNameLower';
        }
        if (entity === 'users' && sortField === 'updatedAt') {
          // 'updatedAt' may be missing on many user docs; prefer createdAt or displayNameLower
          altOrderField = 'createdAt';
        }
        if (entity === 'notifications' && sortField === 'updatedAt') {
          altOrderField = 'createdAt';
        }
        let altQ = collection.orderBy(altOrderField, sortDir === 'asc' ? 'asc' : 'desc').limit(Math.min(l * 4, 200));
        const altSnap = await altQ.get();
        let altItems = altSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const qLower = qTrim.toLowerCase();
        altItems = altItems.filter(i => {
          const bucket = [];
          if (entity === 'posts') bucket.push(i.id, i.authorSteamId, i.title, i.authorDisplayName, i.authorDisplayNameLower, i.titleLower);
          else if (entity === 'comments') bucket.push(i.id, i.authorSteamId, i.content, i.authorDisplayName, i.authorDisplayNameLower, i.contentLower, i.postId);
          else if (entity === 'reports') bucket.push(i.id, i.reporterSteamId, i.targetSteamId, i.reason, i.contentSnippet, i.reporterDisplayName, i.targetDisplayName, i.contentType, i.status, i.reporterDisplayNameLower, i.targetDisplayNameLower, i.reasonLower, i.contentSnippetLower);
          else if (entity === 'users') bucket.push(i.id, i.displayName, i.displayNameLower, i.steamId, i.role);
          else if (entity === 'notifications') bucket.push(i.id, i.title, i.titleLower, i.steamId, i.type);
          return bucket.some(v => typeof v === 'string' && v.toLowerCase().includes(qLower));
        });
        // Sort in-memory by current sortField (if numeric/date, attempt sensible ordering)
        altItems.sort((a,b) => {
          const av = a[sortField]; const bv = b[sortField];
          if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
            // Firestore timestamps or objects with _seconds
          const unwrap = v => (v && typeof v === 'object' && '_seconds' in v) ? v._seconds : v;
          const ua = unwrap(av); const ub = unwrap(bv);
          if (typeof ua === 'number' && typeof ub === 'number') return sortDir === 'asc' ? ua - ub : ub - ua;
          return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
        });
        items = altItems.slice(0, l);
        // Mark that we did not succeed with server prefix search so final generic filter step should be skipped (already filtered)
        usedSearch = false; primarySearchField = null; skipFinalFilter = true;
      } catch (fbErr) {
        console.warn('[ADMIN] Fallback multi-field search failed', fbErr?.message);
      }
    }

    // If we used a degraded prefix search AND requested a different sortField, sort in-memory
    if (usedSearch && primarySearchField && sortField && sortField !== primarySearchField) {
      try {
        items.sort((a, b) => {
          const av = a[sortField];
            const bv = b[sortField];
          if (av == null && bv == null) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
          const as = String(av).toLowerCase();
          const bs = String(bv).toLowerCase();
          return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
        });
      } catch (memSortErr) {
        console.warn('[ADMIN] In-memory secondary sort failed', memSortErr?.message);
      }
    }

    // Enrich with user display names (for multi-field search & UI convenience)
    try {
      if (entity === 'posts') {
        const authorIds = [...new Set(items.map(i => i.authorSteamId).filter(Boolean))];
        if (authorIds.length) {
          const userDocs = await Promise.all(authorIds.map(id => firebaseService.users.doc(id).get()));
          const map = {}; userDocs.forEach(doc => { if (doc.exists) map[doc.id] = doc.data().displayName || null; });
          items = items.map(i => ({ ...i, authorDisplayName: map[i.authorSteamId] || null }));
        }
      } else if (entity === 'comments') {
        const authorIds = [...new Set(items.map(i => i.authorSteamId).filter(Boolean))];
        if (authorIds.length) {
          const userDocs = await Promise.all(authorIds.map(id => firebaseService.users.doc(id).get()));
          const map = {}; userDocs.forEach(doc => { if (doc.exists) map[doc.id] = doc.data().displayName || null; });
          items = items.map(i => ({ ...i, authorDisplayName: map[i.authorSteamId] || null }));
        }
      } else if (entity === 'reports') {
        const reporterIds = [...new Set(items.map(i => i.reporterSteamId).filter(Boolean))];
        const targetIds = [...new Set(items.map(i => i.targetSteamId).filter(Boolean))];
        const needIds = [...new Set([...reporterIds, ...targetIds])];
        if (needIds.length) {
          const userDocs = await Promise.all(needIds.map(id => firebaseService.users.doc(id).get()));
          const map = {}; userDocs.forEach(doc => { if (doc.exists) map[doc.id] = doc.data().displayName || null; });
          items = items.map(i => ({ ...i, reporterDisplayName: map[i.reporterSteamId] || null, targetDisplayName: map[i.targetSteamId] || null }));
        }
      }
    } catch (nameErr) {
      console.warn('[ADMIN] name enrichment failed', nameErr?.message);
    }

    // Client-side fallback substring filtering if prefix search not used (now includes enriched names)
  if (qTrim && (!usedSearch || items.length && items[0][primarySearchField] == null) && !skipFinalFilter) {
      const qLower = qTrim.toLowerCase();
      items = items.filter(i => {
        // Generic string field scan plus id / steam ids explicit
        const extra = [];
        if (entity === 'posts') extra.push(i.id, i.authorSteamId, i.title, i.authorDisplayName);
        if (entity === 'comments') extra.push(i.id, i.authorSteamId, i.content, i.authorDisplayName);
        if (entity === 'reports') extra.push(i.id, i.reporterSteamId, i.targetSteamId, i.reason, i.contentSnippet, i.reporterDisplayName, i.targetDisplayName, i.contentType, i.status);
  if (entity === 'users') extra.push(i.displayName, i.displayNameLower, i.steamId, i.role);
        return [...Object.values(i), ...extra].some(v => typeof v === 'string' && v.toLowerCase().includes(qLower));
      });
      // Apply in-memory sort for filtered results if not already ordered by sortField due to server query (safe generic sort)
      if (sortField) {
        try {
          items.sort((a,b)=>{
            const av = a[sortField]; const bv = b[sortField];
            if (av == null && bv == null) return 0; if (av == null) return 1; if (bv == null) return -1;
            const unwrap = v => (v && typeof v === 'object' && '_seconds' in v) ? v._seconds : v;
            const ua = unwrap(av); const ub = unwrap(bv);
            if (typeof ua === 'number' && typeof ub === 'number') return sortDir === 'asc' ? ua - ub : ub - ua;
            return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
          });
        } catch (e) {
          console.warn('[ADMIN] post-filter sort failed', e?.message);
        }
      }
    }
    res.json({ items, nextCursor: items.length === l ? items[items.length - 1].id : null });
  } catch (e) {
    console.error('[ADMIN] list failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to list entities'});
  }
});

// ADMIN: Delete all content for an entity (destructive!)
router.delete('/admin/delete-all/:entity', requireAdmin, async (req, res) => {
  try {
    const { entity } = req.params;
    const allowed = ['posts','comments','reports','notifications'];
    if (!allowed.includes(entity)) return res.status(400).json({ error: 'Unsupported entity for delete-all' });
    let collection;
    switch(entity) {
      case 'posts': collection = firebaseService.forumPosts; break;
      case 'comments': collection = firebaseService.forumComments; break;
      case 'reports': collection = firebaseService.forumReports; break;
      case 'notifications': collection = firebaseService.notifications; break;
    }
    const snap = await collection.limit(500).get(); // safety cap per request
    if (snap.empty) return res.json({ deleted: 0 });
    let batch = firebaseService.db.batch();
    let ops = 0; let deleted = 0;
    for (const d of snap.docs) {
      batch.delete(collection.doc(d.id));
      ops++; deleted++;
      if (ops >= 450) { await batch.commit(); batch = firebaseService.db.batch(); ops = 0; }
    }
    if (ops) await batch.commit();
    res.json({ deleted, partial: snap.size === 500 });
  } catch (e) {
    console.error('[ADMIN] delete-all failed:', e?.message || e);
    res.status(500).json({ error: 'Failed to delete all' });
  }
});

// ADMIN: Apply a manual suspension
// POST /api/forum/admin/apply-suspension { steamId, level, hours, reason }
router.post('/admin/apply-suspension', requireAdmin, async (req, res) => {
  try {
    const { steamId, level, hours = 0, reason } = req.body || {};
    if (!steamId || !level || !reason) return res.status(400).json({ error: 'steamId, level, reason required' });
    const durationHours = Number(hours) > 0 ? Number(hours) : null;
    await firebaseService._applySuspension(steamId, { durationHours, level, reason });
    res.json({ applied: true });
  } catch (e) {
    console.error('[ADMIN] apply suspension failed', e?.message || e);
    res.status(500).json({ error: 'Failed to apply suspension' });
  }
});

// ADMIN: Hard delete a post
router.delete('/admin/delete/post/:postId', requireAdmin, async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await firebaseService.deleteForumPost(req.user.steamId, postId);
    emitForumEvent({
      type: 'post:deleted',
      postId,
      categoryId: result?.categoryId || null,
      postAuthorSteamId: result?.authorSteamId || null,
      actorSteamId: req.user.steamId
    });
    res.json(result);
  } catch (e) {
    if (e.message === 'Post not found') return res.status(404).json({ error: 'Post not found' });
    if (e.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    console.error('[ADMIN] delete post failed', e?.message || e);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// ADMIN: Hard delete a comment
router.delete('/admin/delete/comment/:commentId', requireAdmin, async (req, res) => {
  try {
    const { commentId } = req.params;
    const result = await firebaseService.deleteForumComment(req.user.steamId, commentId);
    emitForumEvent({
      type: 'comment:deleted',
      commentId,
      postId: result?.postId || null,
      parentCommentId: result?.parentCommentId || null,
      commentAuthorSteamId: result?.authorSteamId || null,
      actorSteamId: req.user.steamId
    });
    res.json(result);
  } catch (e) {
    if (e.message === 'Comment not found') return res.status(404).json({ error: 'Comment not found' });
    if (e.message === 'Forbidden') return res.status(403).json({ error: 'Forbidden' });
    console.error('[ADMIN] delete comment failed', e?.message || e);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// ADMIN: Delete a report
router.delete('/admin/delete/report/:reportId', requireAdmin, async (req, res) => {
  try {
    const { reportId } = req.params;
    await firebaseService.forumReports.doc(reportId).delete();
    emitForumEvent({
      type: 'report:deleted',
      reportId,
      actorSteamId: req.user.steamId
    });
    res.json({ success: true, reportId });
  } catch (e) {
    console.error('[ADMIN] delete report failed', e?.message || e);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// ADMIN: Delete a notification
router.delete('/admin/delete/notification/:notificationId', requireAdmin, async (req, res) => {
  try {
    const { notificationId } = req.params;
    await firebaseService.notifications.doc(notificationId).delete();
    emitForumEvent({
      type: 'notification:deleted',
      notificationId,
      actorSteamId: req.user.steamId
    });
    res.json({ success: true, notificationId });
  } catch (e) {
    console.error('[ADMIN] delete notification failed', e?.message || e);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Global error handler for suspension feedback (wrap create routes earlier OR check error messages)
router.use((err, req, res, next) => {
  if (err && err.message === 'SUSPENDED') {
    return res.status(403).json({ error: 'Your account is currently suspended from posting/commenting.' });
  }
  return next(err);
});

export default router;
