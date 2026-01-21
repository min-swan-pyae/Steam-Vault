import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { forumApi } from '../services/forumService';
import { toast } from 'react-hot-toast';
import useForumRealtime from '../hooks/useForumRealtime';

// Reusable table component
const AdminTable = React.memo(function AdminTable({ columns, rows, emptyMessage = 'No data', loading, sortField, sortDir, onSort, hiddenCols }) {
  return (
    <div className="overflow-x-auto border border-gray-700 rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-850 bg-gray-800 text-gray-200">
          <tr>
            {columns.filter(c=>!hiddenCols[c.key]).map(c => {
              const isSortable = !!c.sortKey;
              const active = sortField === (c.sortKey || c.key);
              return (
                <th key={c.key} className="px-3 py-2 text-left font-semibold">
                  {isSortable ? (
                    <button
                      onClick={() => onSort(c.sortKey || c.key)}
                      className={`inline-flex items-center gap-1 group ${active ? 'text-blue-300' : 'text-gray-300 hover:text-white'}`}
                    >
                      <span>{c.label}</span>
                      <span className={`transition-transform text-[10px] ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'} ${active && sortDir==='asc' ? 'rotate-180' : ''}`}>▲</span>
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {loading && <tr><td colSpan={columns.filter(c=>!hiddenCols[c.key]).length} className="px-3 py-6 text-center text-gray-400">Loading...</td></tr>}
          {!loading && rows.length === 0 && <tr><td colSpan={columns.filter(c=>!hiddenCols[c.key]).length} className="px-3 py-6 text-center text-gray-500">{emptyMessage}</td></tr>}
          {!loading && rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-800/70">
              {columns.filter(c=>!hiddenCols[c.key]).map(c => <td key={c.key} className="px-3 py-2 whitespace-pre-wrap align-top text-gray-100">{c.render ? c.render(r[c.key], r) : (r[c.key] ?? '')}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default function AdminDashboard() {
  const { user } = useAuth();
  const isAdmin = !!user && (user.role === 'admin' || (Array.isArray(user.roles) && user.roles.includes('admin')));
  const rolesLoaded = !user || user.role || Array.isArray(user.roles);
  const [summary, setSummary] = useState(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false); // track fetch attempt
  const [targetSteamId, setTargetSteamId] = useState('');
  const [moderationStatus, setModerationStatus] = useState(null);
  const [resolving, setResolving] = useState(false);
  const [reportIds, setReportIds] = useState('');
  // legacy bulk delete removed
  const [view, setView] = useState('overview');
  // New unified dataset + pagination (client-side)
  const [allRows, setAllRows] = useState([]); // full (capped) dataset for current entity + search
  const viewDataCache = useRef({}); // Store data per view to prevent cross-contamination
  const [entityLoading, setEntityLoading] = useState(false);
  const PAGE_SIZE = 15;
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  // Unified search state (submittedSearch triggers API; inputSearch is controlled field)
  const [inputSearch, setInputSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [suspendForm, setSuspendForm] = useState({ steamId: '', level: 'temp', hours: 24, reason: '' });
  const initialSort = (viewName) => {
    switch(viewName) {
      case 'notifications': return { f: 'createdAt', d: 'desc' };
      case 'users': return { f: 'createdAt', d: 'desc' };
      case 'posts': return { f: 'updatedAt', d: 'desc' };
      case 'comments': return { f: 'updatedAt', d: 'desc' };
      case 'reports': return { f: 'updatedAt', d: 'desc' };
      default: return { f: 'updatedAt', d: 'desc' };
    }
  };
  const init = initialSort('overview');
  const [sortField, setSortField] = useState(init.f);
  const [sortDir, setSortDir] = useState(init.d);
  const [hiddenCols, setHiddenCols] = useState({});

  const reloadSummary = useCallback(async () => {
    try {
      setSummaryLoaded(false);
      const s = await forumApi.getAdminSummary().catch(() => null);
      setSummary(s);
    } catch (e) {
      console.error('[ADMIN] refresh failed', e?.message || e);
    } finally {
      setSummaryLoaded(true);
    }
  }, []);
  const summaryRefreshRef = useRef(null);
  const pendingViewReloadRef = useRef({});

  // Helper: normalize value for sorting (timestamps / strings / numbers)
  const getSortVal = useCallback((row, field) => {
    const v = row?.[field];
    if (v == null) return null;
    if (typeof v === 'object' && v._seconds) return v._seconds * 1000 + (v._nanoseconds || 0) / 1e6;
    if (typeof v === 'string') return v.toLowerCase();
    return v;
  }, []);

  const applySortTo = useCallback((rows, field, dir) => {
    const arr = [...rows];
    arr.sort((a,b) => {
      const av = getSortVal(a, field);
      const bv = getSortVal(b, field);
      if (av === bv) return 0;
      if (av == null) return 1; // nulls last
      if (bv == null) return -1;
      if (av < bv) return dir==='asc' ? -1 : 1;
      return dir==='asc' ? 1 : -1;
    });
    return arr;
  }, [getSortVal]);

  // Full fetch (capped) then client-side sort + pagination
  const loadEntity = useCallback(async (entity, opts = {}) => {
    if (typeof opts === 'boolean') opts = { reset: opts };
    const { q: qOverride, sortF: sortFieldOverride, sortD: sortDirOverride, keepPage = false } = opts;
    const effectiveQ = (qOverride !== undefined ? qOverride : submittedSearch) || undefined;
    const effectiveSortField = sortFieldOverride || sortField;
    const effectiveSortDir = sortDirOverride || sortDir;

    setEntityLoading(true);
    try {
      const MAX_FETCH = 300; // cap to avoid excessive client memory
      const BATCH_LIMIT = 100;
      let cursor = undefined;
      let collected = [];
      let safety = 0;
      while (collected.length < MAX_FETCH && safety < 20) {
        safety++;
        const res = await forumApi.listAdminEntitiesFiltered(entity, {
          limit: BATCH_LIMIT,
            cursor,
            q: effectiveQ,
            // we can request server sort for first load; client will re-sort on toggles anyway
            sortField: effectiveSortField,
            sortDir: effectiveSortDir,
            ts: Date.now()
        });
        collected = collected.concat(res.items || []);
        if (!res.nextCursor) break;
        cursor = res.nextCursor;
        if (collected.length >= MAX_FETCH) break;
      }
      const sorted = applySortTo(collected, effectiveSortField, effectiveSortDir);
      setAllRows(sorted);
      // Cache the loaded data for this view
      viewDataCache.current[entity] = sorted;
      setCurrentPage(prev => {
        if (keepPage) {
          const maxPageIndex = Math.max(0, Math.ceil(sorted.length / PAGE_SIZE) - 1);
          return Math.min(prev, maxPageIndex);
        }
        return 0;
      });
    } catch (e) {
      toast.error('Failed loading ' + entity);
    } finally {
      setEntityLoading(false);
    }
  }, [submittedSearch, sortField, sortDir, applySortTo]);

  const refreshActiveView = useCallback((options = {}) => {
    if (view === 'overview') return Promise.resolve();
    return loadEntity(view, { keepPage: true, ...options });
  }, [view, loadEntity]);

  const scheduleSummaryRefresh = useCallback(() => {
    if (summaryRefreshRef.current) return;
    summaryRefreshRef.current = setTimeout(() => {
      summaryRefreshRef.current = null;
      reloadSummary();
    }, 800);
  }, [reloadSummary]);

  const scheduleEntityRefresh = useCallback((entity) => {
    // If not on this view, invalidate cache so it reloads when visited
    if (view !== entity) {
      delete viewDataCache.current[entity];
      loadedViewsRef.current.delete(entity);
      return;
    }
    // If on this view, schedule a refresh
    const pending = pendingViewReloadRef.current[entity];
    if (pending) return;
    pendingViewReloadRef.current[entity] = setTimeout(() => {
      pendingViewReloadRef.current[entity] = null;
      refreshActiveView({ keepPage: true });
    }, 400);
  }, [view, refreshActiveView]);

  useEffect(() => () => {
    if (summaryRefreshRef.current) {
      clearTimeout(summaryRefreshRef.current);
      summaryRefreshRef.current = null;
    }
    Object.values(pendingViewReloadRef.current || {}).forEach((timeoutId) => {
      if (timeoutId) clearTimeout(timeoutId);
    });
    pendingViewReloadRef.current = {};
  }, []);

  const handleRealtimePost = useCallback(() => {
    if (!isAdmin) return;
    scheduleSummaryRefresh();
    scheduleEntityRefresh('posts');
  }, [isAdmin, scheduleSummaryRefresh, scheduleEntityRefresh]);

  const handleRealtimeComment = useCallback(() => {
    if (!isAdmin) return;
    scheduleSummaryRefresh();
    scheduleEntityRefresh('comments');
  }, [isAdmin, scheduleSummaryRefresh, scheduleEntityRefresh]);

  const handleRealtimeReport = useCallback(() => {
    if (!isAdmin) return;
    scheduleSummaryRefresh();
    scheduleEntityRefresh('reports');
  }, [isAdmin, scheduleSummaryRefresh, scheduleEntityRefresh]);

  useForumRealtime({
    onPostChange: handleRealtimePost,
    onCommentChange: handleRealtimeComment,
    onReportChange: handleRealtimeReport
  });

  const handleSort = useCallback((field) => {
    // Calculate new state based on current state
    const isNewField = sortField !== field;
    const nextDir = isNewField ? 'asc' : (sortDir === 'asc' ? 'desc' : 'asc');
    
    // Update all state
    setSortField(field);
    setSortDir(nextDir);
    setAllRows(rows => applySortTo(rows, field, nextDir));
    setCurrentPage(0);
  }, [sortField, sortDir, applySortTo]);

  // Derived rows for current page
  const pagedRows = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return allRows.slice(start, start + PAGE_SIZE);
  }, [allRows, currentPage]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(allRows.length / PAGE_SIZE)), [allRows.length]);

  // Adjust page when dataset shrinks (e.g., deletions)
  useEffect(() => {
    if (currentPage > totalPages - 1) {
      setCurrentPage(totalPages - 1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (!isAdmin) return;
    reloadSummary();
  }, [isAdmin, reloadSummary]);

  const fetchModeration = useCallback(async (steamId) => {
    if (!steamId) return;
    try {
      const res = await forumApi.getModerationStatus(steamId);
      setModerationStatus(res);
    } catch (e) {
      toast.error('Failed to load moderation status');
    }
  }, []);

  const clearSuspension = useCallback(async (steamId) => {
    if (!steamId) return;
    try {
      const res = await forumApi.clearSuspension(steamId);
      if (res.cleared) {
        toast.success('Suspension cleared - All reports deleted');
        // Refetch moderation status to clear cached data
        await fetchModeration(steamId);
        await reloadSummary(); // Refresh counts
        // Clear forum cache to ensure user list updates immediately
        forumApi.clearAdminCache?.();
        // Invalidate users cache so it reloads when visited
        delete viewDataCache.current['users'];
        loadedViewsRef.current.delete('users');
        // If currently on users view, refresh immediately
        if (view === 'users') {
          await refreshActiveView();
        }
      } else {
        toast.info(res.reason || 'Unable to clear');
      }
    } catch (e) {
      console.error('Clear suspension error:', e);
      // Only show error if it's a real error (not a successful response)
      if (!e.response || e.response.status >= 500) {
        toast.error('Failed to clear suspension');
      }
    }
  }, [fetchModeration, reloadSummary, refreshActiveView, view]);

  const resolveSelectedReports = async () => {
    if (!reportIds.trim()) return;
    setResolving(true);
    try {
      const ids = reportIds.split(',').map(s=>s.trim()).filter(Boolean);
      const res = await forumApi.resolveReports({ reportIds: ids, status: 'resolved' });
      toast.success(`Deleted ${res.processed} report(s)`);
      setReportIds('');
      await refreshActiveView();
      await reloadSummary();
    } catch (e) {
      toast.error('Failed to delete reports');
    } finally {
      setResolving(false);
    }
  };

  // Modal state for confirmations
  const [modal, setModal] = useState({ open: false, mode: null, entity: null, id: null });
  const [confirmText, setConfirmText] = useState('');
  const [deleteAllProgress, setDeleteAllProgress] = useState({ running: false, deleted: 0, batches: 0 });

  const requiredPhrase = modal.mode === 'delete-all' ? `DELETE ALL ${String(modal.entity || '').toUpperCase()}` : 'DELETE';

  const openDeleteOne = useCallback((entity, id) => setModal({ open: true, mode: 'delete-one', entity, id }), []);
  const openDeleteAll = useCallback((entity) => setModal({ open: true, mode: 'delete-all', entity, id: null }), []);
  const closeModal = () => { if (!deleteAllProgress.running) { setModal({ open:false, mode:null, entity:null, id:null }); setConfirmText(''); } };

  if (!rolesLoaded) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-gray-300">Loading...</div>;
  }
  if (!isAdmin) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-gray-300">Admin access required.</div>;
  }

  // Track loaded views to prevent unnecessary reloads
  const loadedViewsRef = useRef(new Set());

  const handleViewChange = useCallback((newView) => {
    if (newView === view) return; // Already on this view
    
    // Save current view's data to cache before switching
    if (view !== 'overview' && allRows.length > 0) {
      viewDataCache.current[view] = allRows;
    }
    
    setView(newView);
    
    if (newView === 'overview') {
      // Overview doesn't need entity loading, clear rows
      setAllRows([]);
      return;
    }
    
    // Check if this view has cached data
    if (viewDataCache.current[newView]) {
      // Restore cached data
      setAllRows(viewDataCache.current[newView]);
      const s = initialSort(newView);
      setSortField(s.f);
      setSortDir(s.d);
      setCurrentPage(0);
      return;
    }
    
    // First time loading this view
    const s = initialSort(newView);
    setSortField(s.f);
    setSortDir(s.d);
    setAllRows([]); // Clear old data immediately
    setCurrentPage(0);
    loadedViewsRef.current.add(newView);
    loadEntity(newView, { sortF: s.f, sortD: s.d });
  }, [view, allRows, loadEntity]);

  const sidebar = (
    <div className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900/60 backdrop-blur-sm">
      <div className="p-4 font-semibold text-gray-200 tracking-wide">Admin</div>
      <nav className="space-y-1 px-2 pb-4">
        {[
          ['overview','Overview'],
          ['users','Users'],
          ['posts','Posts'],
          ['comments','Comments'],
          ['reports','Reports'],
          ['notifications','Notifications']
        ].map(([k,label]) => (
          <button 
            key={k} 
            onClick={() => handleViewChange(k)} 
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${view===k?'bg-blue-600 text-white':'text-gray-300 hover:bg-gray-800 hover:text-white'}`}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );

  const handleDelete = async () => {
    if (modal.mode !== 'delete-one' || !modal.id) return;
    const rowBeingDeleted = allRows.find(r=>r.id===modal.id);
    try {
  if (modal.entity === 'post' || modal.entity === 'posts') await forumApi.adminDeletePost(modal.id);
  else if (modal.entity === 'comment' || modal.entity === 'comments') await forumApi.adminDeleteComment(modal.id);
  else if (modal.entity === 'report' || modal.entity === 'reports') await forumApi.adminDeleteReport(modal.id);
  else if (modal.entity === 'notification' || modal.entity === 'notifications') await forumApi.adminDeleteNotification(modal.id);
  forumApi.clearAdminCache && forumApi.clearAdminCache();
      toast.success('Deleted');
      const updatedRows = allRows.filter(x => x.id !== modal.id);
      setAllRows(updatedRows);
      // Update cache with the new data
      viewDataCache.current[view] = updatedRows;
      // Optimistically adjust overview counts
      setSummary(s => {
        if (!s) return s;
        if (modal.entity === 'post' || modal.entity === 'posts') return { ...s, posts: Math.max(0, (s.posts||0) - 1) };
        if (modal.entity === 'comment' || modal.entity === 'comments') return { ...s, comments: Math.max(0, (s.comments||0) - 1) };
        if ((modal.entity === 'report' || modal.entity === 'reports')) {
          const delta = { ...s };
          delta.reports = Math.max(0, (s.reports||0) - 1);
          // If the report was open (status not resolved), decrement openReports
          if (rowBeingDeleted && rowBeingDeleted.status && rowBeingDeleted.status !== 'resolved') {
            delta.openReports = Math.max(0, (s.openReports||0) - 1);
          }
          return delta;
        }
        if (modal.entity === 'notification' || modal.entity === 'notifications') return { ...s, notifications: Math.max(0, (s.notifications||0) - 1) };
        return s;
      });
      await refreshActiveView();
    } catch (e) {
      toast.error('Delete failed');
    } finally {
      closeModal();
    }
  };

  const applySuspension = async () => {
    try {
      await forumApi.applySuspension(suspendForm);
      toast.success('Suspension applied');
      // Clear forum cache to ensure user list updates immediately
      forumApi.clearAdminCache?.();
      // Invalidate users cache so it reloads when visited
      delete viewDataCache.current['users'];
      loadedViewsRef.current.delete('users');
      // If currently on users view, refresh immediately
      if (view === 'users') {
        await refreshActiveView();
      }
    } catch (e) {
      toast.error('Apply failed');
    }
  };

  const runDeleteAll = async () => {
    if (modal.mode !== 'delete-all') return;
    setDeleteAllProgress({ running: true, deleted: 0, batches: 0 });
    try {
      let totalDeleted = 0; let batches = 0; let partial = true; const entity = modal.entity;
      while (partial) {
        const res = await forumApi.deleteAll(entity);
        totalDeleted += res.deleted || 0;
        batches += 1;
        setDeleteAllProgress({ running: true, deleted: totalDeleted, batches });
        partial = !!res.partial && (res.deleted || 0) > 0; // continue while server says partial
        if (!partial) break;
      }
      toast.success(`Deleted ${totalDeleted} ${entity}`);
      setAllRows([]);
      forumApi.clearAdminCache && forumApi.clearAdminCache();
      // Clear cached data for this view
      delete viewDataCache.current[view];
      loadedViewsRef.current.delete(view);
      // Update overview counts optimistically
      if (totalDeleted > 0) {
        setSummary(s => {
          if (!s) return s;
          if (entity === 'posts') return { ...s, posts: Math.max(0, (s.posts||0) - totalDeleted) };
          if (entity === 'comments') return { ...s, comments: Math.max(0, (s.comments||0) - totalDeleted) };
          if (entity === 'reports') return { ...s, reports: Math.max(0, (s.reports||0) - totalDeleted), openReports: 0 }; // assume all removed; will refresh
          return s;
        });
      }
      // Always refresh summary after bulk delete to ensure openReports and other derived stats stay accurate
      await reloadSummary();
      await refreshActiveView({ keepPage: false });
    } catch (e) {
      toast.error('Delete all failed');
    } finally {
      setDeleteAllProgress(p => ({ ...p, running: false }));
      closeModal();
    }
  };
  const confirmEnabled = confirmText.trim() === requiredPhrase;

  const renderOverview = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <button onClick={reloadSummary} className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm text-white">Refresh</button>
      </div>
      <section className="p-4 rounded-xl border border-gray-700 bg-gray-900">
          <h2 className="text-xl font-semibold text-white mb-3">Forum Overview</h2>
          {!summaryLoaded && !summary && <div className="text-gray-400 text-sm">Loading summary...</div>}
          {summaryLoaded && !summary && <div className="text-gray-500 text-sm">No summary data.</div>}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center text-sm">
              <div className="p-3 rounded bg-gray-800"><div className="text-gray-400">Users</div><div className="text-white text-lg font-semibold">{summary.users}</div></div>
              <div className="p-3 rounded bg-gray-800"><div className="text-gray-400">Posts</div><div className="text-white text-lg font-semibold">{summary.posts}</div></div>
              <div className="p-3 rounded bg-gray-800"><div className="text-gray-400">Comments</div><div className="text-white text-lg font-semibold">{summary.comments}</div></div>
              <div className="p-3 rounded bg-gray-800"><div className="text-gray-400">Reports</div><div className="text-white text-lg font-semibold">{summary.reports}</div></div>
              <div className="p-3 rounded bg-gray-800"><div className="text-gray-400">Notifications</div><div className="text-white text-lg font-semibold">{summary.notifications || 0}</div></div>
            </div>
          )}
        </section>
      <section className="p-4 rounded-xl border border-gray-700 bg-gray-900 space-y-4">
          <h2 className="text-xl font-semibold text-white">Moderation Tools</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {/* User Suspension Status Check */}
            <div className="space-y-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-blue-300 uppercase">User Suspension Status</h3>
              <input value={targetSteamId} onChange={e=>setTargetSteamId(e.target.value)} placeholder="Steam ID" className="w-full bg-gray-800/80 focus:bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:border-blue-500 transition-colors" />
              <div className="flex gap-2">
                <button onClick={()=>fetchModeration(targetSteamId)} className="px-3 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white">Fetch Status</button>
                <button onClick={()=>clearSuspension(targetSteamId)} className="px-3 py-2 text-sm rounded bg-yellow-600 hover:bg-yellow-500 text-white">Clear Suspension</button>
              </div>
               {moderationStatus && (
                <div className="text-xs bg-gray-800 rounded p-3 border border-gray-700 space-y-1">
                  {!moderationStatus.exists && <div className="text-gray-400">User not found.</div>}
                  {moderationStatus.exists && (
                    <>
                      <div className="text-white font-semibold"><span className="text-gray-400">Role:</span> {moderationStatus.role || (Array.isArray(moderationStatus.roles)? moderationStatus.roles.join(', '):'user')}</div>
                      <div className="text-white font-semibold"><span className="text-gray-400">Suspension Active:</span> {moderationStatus.moderation?.suspension?.active ? 'Yes' : 'No'}</div>
                      {moderationStatus.moderation?.suspension?.active && (
                        <>
                          <div className="text-white font-semibold"><span className="text-gray-400">Level:</span> {moderationStatus.moderation.suspension.level}</div>
                          <div className="text-white font-semibold"><span className="text-gray-400">Reason:</span> {moderationStatus.moderation.suspension.reason}</div>
                        </>
                      )}
                      {moderationStatus.moderation?.warning && (
                        <div className="text-yellow-400">Warning issued: {moderationStatus.moderation.warning.reason}</div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Manual Apply Suspension */}
            <div className="space-y-3 p-4 rounded-lg bg-gray-800/50 border border-gray-700">
              <h3 className="text-sm font-semibold text-purple-300 uppercase">Apply Suspension</h3>
              <input value={suspendForm.steamId} onChange={e=>setSuspendForm(f=>({...f,steamId:e.target.value}))} placeholder="Steam ID" className="w-full bg-gray-800/80 focus:bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500" />
              <div className="space-y-2">
                <label className="text-xs text-gray-400">Suspension Level</label>
                <select 
                  value={suspendForm.level} 
                  onChange={e=>{
                    const level = e.target.value;
                    let hours = suspendForm.hours;
                    // Auto-fill hours based on preset levels
                    if (level === 'temp') hours = 24;
                    else if (level === 'temp_severe') hours = 168; // 7 days
                    setSuspendForm(f=>({...f, level, hours}));
                  }} 
                  className="w-full bg-gray-800/80 focus:bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 focus:border-blue-500"
                >
                  <option value="temp">Temporary - 24 hours</option>
                  <option value="temp_severe">Severe - 7 days (168 hours)</option>
                  <option value="custom">Custom Duration</option>
                </select>
              </div>
              <div className="space-y-1">
                    <label className="text-xs text-gray-400">Duration (hours) {suspendForm.level !== 'custom' && <span className="text-gray-500">- auto-filled</span>}</label>
                    <input 
                      type="number" 
                      min="0" 
                      value={suspendForm.hours} 
                      onChange={e=>setSuspendForm(f=>({...f,hours:Number(e.target.value)}))} 
                      disabled={suspendForm.level !== 'custom'}
                      className={`w-full bg-gray-800/80 focus:bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500 ${suspendForm.level !== 'custom' ? 'opacity-60 cursor-not-allowed' : ''}`}
                      placeholder="Hours" 
                  />
                </div>
              <input value={suspendForm.reason} onChange={e=>setSuspendForm(f=>({...f,reason:e.target.value}))} placeholder="Reason (required)" className="w-full bg-gray-800/80 focus:bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-100 placeholder-gray-500 focus:border-blue-500" />
              <button onClick={applySuspension} className="w-full px-3 py-2 text-sm rounded bg-purple-600 hover:bg-purple-500 text-white shadow focus:ring-2 focus:ring-purple-400/60 font-semibold">Apply Suspension</button>
            </div>
          </div>

          {/* Resolve Reports Section */}
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 space-y-3">
            <h3 className="text-sm font-semibold text-green-300 uppercase">Resolve Reports</h3>
            <textarea value={reportIds} onChange={e=>setReportIds(e.target.value)} placeholder="Report IDs (comma separated)" className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white min-h-[80px] focus:border-green-500" />
            <button disabled={resolving} onClick={resolveSelectedReports} className="w-full px-3 py-2 text-sm rounded bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 font-semibold">{resolving?'Resolving...':'Resolve'}</button>
          </div>
        </section>
      {/* Removed legacy soft bulk delete section */}
    </div>
  );

  const fmtTs = v => v? new Date(v._seconds? v._seconds*1000 : v).toLocaleString(): '';
  const entityColumns = {
    users: [
      { key: 'steamId', label: 'Steam ID', sortKey: 'steamId' },
      { key: 'displayName', label: 'Name', sortKey: 'displayNameLower' },
      { key: 'role', label: 'Role', render: v => v || 'user', sortKey: 'role' },
      { key: 'suspension', label: 'Suspension', render: (_, row) => {
          const s = row?.moderation?.suspension;
          if (!s?.active) return 'No';
          const exp = s.expiresAt? fmtTs(s.expiresAt):'N/A';
          return `Active -> ${exp}`;
        }
      },
      { key: '__actions', label: 'Actions', render: (_, row) => {
          const s = row?.moderation?.suspension;
          const active = !!s?.active;
          return (
            <div className="flex gap-2">
              {active ? (
                <button onClick={()=>{ setTargetSteamId(row.steamId); clearSuspension(row.steamId); }} className="px-2 py-1 text-[11px] rounded bg-yellow-600 hover:bg-yellow-500 text-white">Clear</button>
              ) : (
                <button onClick={()=>{ setSuspendForm(f=>({ ...f, steamId: row.steamId })); setView('overview'); }} className="px-2 py-1 text-[11px] rounded bg-purple-600 hover:bg-purple-500 text-white">Suspend</button>
              )}
            </div>
          );
        }
      },
      { key: 'lastSeen', label: 'Last Seen', render: fmtTs, sortKey: 'lastSeen' }
    ],
    posts: [
      { key: 'id', label: 'ID', sortKey: 'createdAt' },
      { key: 'title', label: 'Title', sortKey: 'titleLower' },
      { key: 'authorDisplayName', label: 'Author Name', sortKey: 'authorDisplayNameLower' },
      { key: 'authorSteamId', label: 'Author SteamID' },
      { key: 'stats', label: 'Stats', render: v => v?`👍${v.likes||0} 💬${v.comments||0}`:'' },
      { key: 'updatedAt', label: 'Updated', render: fmtTs, sortKey: 'updatedAt' },
      { key: '__actions', label: 'Actions', render: (_, row) => <button onClick={()=>openDeleteOne('post', row.id)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500">Delete</button> }
    ],
    comments: [
      { key: 'id', label: 'ID', sortKey: 'createdAt' },
      { key: 'postId', label: 'Post', sortKey: 'postId' },
      { key: 'authorDisplayName', label: 'Author Name', sortKey: 'authorDisplayNameLower' },
      { key: 'authorSteamId', label: 'Author SteamID' },
      { key: 'content', label: 'Content', sortKey: 'contentLower' },
      { key: 'updatedAt', label: 'Updated', render: fmtTs, sortKey: 'updatedAt' },
      { key: '__actions', label: 'Actions', render: (_, row) => <button onClick={()=>openDeleteOne('comment', row.id)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500">Delete</button> }
    ],
    reports: [
      { key: 'id', label: 'ID', sortKey: 'createdAt' },
      { key: 'contentType', label: 'Type', sortKey: 'contentType' },
      { key: 'contentId', label: 'Content ID', sortKey: 'contentId' },
      { key: 'contentSnippet', label: 'Content Snippet', render: v => v ? (v.length > 100 ? v.slice(0, 100) + '...' : v) : '', sortKey: 'contentSnippetLower' },
      { key: 'targetDisplayName', label: 'Target Name', sortKey: 'targetDisplayNameLower' },
      { key: 'targetSteamId', label: 'Target SteamID', sortKey: 'targetSteamId' },
      { key: 'reporterDisplayName', label: 'Reported By', sortKey: 'reporterDisplayNameLower' },
      { key: 'reporterSteamId', label: 'Reporter SteamID', sortKey: 'reporterSteamId' },
      { key: 'status', label: 'Status', sortKey: 'status' },
      { key: 'reason', label: 'Reason', sortKey: 'reasonLower' },
      { key: 'createdAt', label: 'Created', render: fmtTs, sortKey: 'createdAt' },
      { key: '__actions', label: 'Actions', render: (_, row) => <button onClick={()=>openDeleteOne('report', row.id)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500">Delete</button> }
    ],
    notifications: [
      { key: 'id', label: 'ID', sortKey: 'createdAt' },
      { key: 'steamId', label: 'User SteamID', sortKey: 'steamId' },
      { key: 'title', label: 'Title', sortKey: 'titleLower' },
      { key: 'type', label: 'Type', sortKey: 'type' },
      { key: 'createdAt', label: 'Created', render: fmtTs, sortKey: 'createdAt' },
      { key: '__actions', label: 'Actions', render: (_, row) => <button onClick={()=>openDeleteOne('notification', row.id)} className="px-2 py-1 text-xs rounded bg-red-600 hover:bg-red-500">Delete</button> }
    ]
  };

  const columnsForView = useMemo(() => entityColumns[view] || [], [view]);

  const renderEntityView = () => {
    const cols = columnsForView;
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <h2 className="text-xl font-semibold text-white capitalize">{view}</h2>
          <div className="flex gap-2 ml-auto">
            {['posts','comments','reports','notifications'].includes(view) && (
              <button onClick={()=>openDeleteAll(view)} className="px-3 py-2 text-sm rounded bg-red-700 hover:bg-red-600 text-white">Delete All {view}</button>
            )}
          </div>
        </div>
  <AdminTable columns={cols} rows={pagedRows} loading={entityLoading} sortField={sortField} sortDir={sortDir} hiddenCols={hiddenCols} onSort={handleSort} />
       <div className="flex items-center gap-2 justify-center">
              <button disabled={currentPage===0} onClick={()=> setCurrentPage(p=>Math.max(0,p-1))} className={`px-3 py-2 text-sm rounded ${currentPage===0?'bg-gray-800 text-gray-500 cursor-not-allowed':'bg-gray-700 hover:bg-gray-600 text-white'}`}>Prev</button>
              <span className="text-xs text-gray-400">Page {totalPages === 0 ? 0 : currentPage+1} of {totalPages} ({allRows.length} rows)</span>
              <button disabled={currentPage >= totalPages-1} onClick={()=> setCurrentPage(p=>Math.min(totalPages-1,p+1))} className={`px-3 py-2 text-sm rounded ${currentPage >= totalPages-1?'bg-gray-800 text-gray-500 cursor-not-allowed':'bg-gray-700 hover:bg-gray-600 text-white'}`}>Next</button>
            </div>
      </div>
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex bg-gradient-to-br from-gray-950 to-gray-900">
      {sidebar}
      <div className="flex-1 px-6 py-8 overflow-y-auto space-y-6">
        {view !== 'overview' && (
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex flex-col flex-1 min-w-[260px]">
                <label className="text-xs uppercase tracking-wide text-gray-400">Search ({view})</label>
                <input value={inputSearch} onChange={e=>setInputSearch(e.target.value)} placeholder={view==='posts' ? 'Author name | steam id | post id | title' : view==='comments' ? 'Author name | steam id | comment id | content' : view==='reports' ? 'status | target steamID | author steamID | content id | type | target name | reporter name' : 'Search'} className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <button onClick={()=>{ const term = inputSearch.trim(); setSubmittedSearch(term); setAllRows([]); setCurrentPage(0); // pass explicit '' when empty so loadEntity treats as override
                loadEntity(view, { q: term === '' ? '' : term }); }} className="relative h-10 px-4 rounded bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white self-end flex items-center gap-2 disabled:opacity-60" disabled={entityLoading}>
                {entityLoading && <span className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                <span>{entityLoading ? 'Searching...' : 'Search'}</span>
              </button>
              <button onClick={()=>{ setInputSearch(''); setSubmittedSearch(''); const s=initialSort(view); setSortField(s.f); setSortDir(s.d); setHiddenCols({}); setAllRows([]); setCurrentPage(0); // explicit empty q override
                loadEntity(view,{ sortF:s.f, sortD:s.d, q:'' }); }} className="h-10 px-4 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white self-end">Clear Filter</button>
              
            </div>
            <div className="flex flex-wrap gap-4 items-start">
             
              <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                { columnsForView.filter(c=>c.key!=='__actions').map(c => (
                  <label key={c.key} className="flex items-center gap-1 cursor-pointer select-none">
                    <input type="checkbox" className="accent-blue-500" checked={!hiddenCols[c.key]} onChange={()=> setHiddenCols(h => ({ ...h, [c.key]: !h[c.key] }))} />
                    <span className="truncate max-w-[100px]">{c.label}</span>
                  </label>
                )) }
              </div>
            </div>
          </div>
        )}
        {view === 'overview' ? renderOverview() : renderEntityView()}
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 shadow-xl">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {modal.mode === 'delete-one' ? 'Confirm Deletion' : 'Bulk Destructive Action'}
                </h3>
                <button disabled={deleteAllProgress.running} onClick={closeModal} className="text-gray-400 hover:text-gray-200">✕</button>
              </div>
              <div className="p-5 space-y-4 text-sm text-gray-300">
                {modal.mode === 'delete-one' && (
                  <p>Type <span className="font-mono text-red-400">{requiredPhrase}</span> to permanently delete this {modal.entity} (ID: <span className="font-mono">{modal.id}</span>).</p>
                )}
                {modal.mode === 'delete-all' && (
                  <>
                    <p className="leading-relaxed">This will permanently and irreversibly delete <span className="font-semibold text-white">ALL {modal.entity}</span>. This cannot be undone.</p>
                    <p>Type <span className="font-mono text-red-400">{requiredPhrase}</span> to confirm.</p>
                    {deleteAllProgress.running && (
                      <div className="rounded bg-gray-800 px-3 py-2 text-xs text-gray-400 space-y-1">
                        <div>Progress: {deleteAllProgress.deleted} deleted in {deleteAllProgress.batches} batch(es)</div>
                        <div className="w-full h-1 bg-gray-700 rounded overflow-hidden">
                          <div className="h-full bg-red-600 animate-pulse" style={{ width: '75%' }} />
                        </div>
                        <div className="text-yellow-400">Continuing until collection drained (500 per batch)...</div>
                      </div>
                    )}
                  </>
                )}
                {!deleteAllProgress.running && (
                  <input autoFocus value={confirmText} onChange={e=>setConfirmText(e.target.value)} placeholder={requiredPhrase} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white" />
                )}
              </div>
              <div className="px-5 py-4 border-t border-gray-800 flex justify-end gap-3">
                <button disabled={deleteAllProgress.running} onClick={closeModal} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-sm text-white">Cancel</button>
                {modal.mode === 'delete-one' && (
                  <button disabled={!confirmEnabled || deleteAllProgress.running} onClick={handleDelete} className={`px-4 py-2 rounded text-sm font-medium ${confirmEnabled ? 'bg-red-600 hover:bg-red-500 text-white':'bg-red-900/40 text-red-300/40 cursor-not-allowed'}`}>Delete</button>
                )}
                {modal.mode === 'delete-all' && (
                  <button disabled={!confirmEnabled || deleteAllProgress.running} onClick={runDeleteAll} className={`px-4 py-2 rounded text-sm font-medium ${confirmEnabled ? 'bg-red-600 hover:bg-red-500 text-white':'bg-red-900/40 text-red-300/40 cursor-not-allowed'}`}>{deleteAllProgress.running ? 'Deleting...' : 'Delete All'}</button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
