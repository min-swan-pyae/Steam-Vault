/**
 * Cache Status Dashboard Component
 * Provides real-time monitoring and management of all cache systems
 */

import React, { useState } from 'react';
import { useCacheManager } from '../hooks/useCache.js';

const CacheStatusDashboard = ({ isOpen, onClose }) => {
  const { 
    stats, 
    isLoading, 
    refreshStats, 
    clearAllCaches, 
    warmCache,
    exportData,
    importData 
  } = useCacheManager();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isClearing, setIsClearing] = useState(false);

  if (!isOpen) return null;

  const handleClearCaches = async () => {
    setIsClearing(true);
    try {
      await clearAllCaches();
    } finally {
      setIsClearing(false);
    }
  };

  const handleExportCache = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `steam-vault-cache-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="text-white">Loading cache statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-4/5 h-4/5 max-w-6xl max-h-screen overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Cache Status Dashboard</h2>
          <div className="flex gap-2">
            <button
              onClick={refreshStats}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 px-6 border-b border-gray-700">
          <div className="flex space-x-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'api', label: 'API Cache' },
              { id: 'images', label: 'Image Cache' },
              { id: 'rtk', label: 'RTK Query' },
              { id: 'background', label: 'Background Refresh' },
              { id: 'actions', label: 'Actions' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-full">
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Performance Metrics */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Performance Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {stats.performance.cacheHitRate}
                    </div>
                    <div className="text-sm text-gray-400">Cache Hit Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {stats.performance.requestCount}
                    </div>
                    <div className="text-sm text-gray-400">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      {stats.uptime.hours}h
                    </div>
                    <div className="text-sm text-gray-400">Uptime</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">
                      {stats.memory && stats.memory.used ? stats.memory.used : 'N/A'}
                    </div>
                    <div className="text-sm text-gray-400">Memory Used</div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">API Cache</h4>
                  <div className="text-sm text-gray-300">
                    <div>Entries: {stats.apiCache.totalEntries}</div>
                    <div>Size: {formatBytes(stats.apiCache.totalSize || 0)}</div>
                    <div>Hit Rate: {stats.apiCache.hitRate}%</div>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Image Cache</h4>
                  <div className="text-sm text-gray-300">
                    <div>Images: {stats.imageCache.totalImages}</div>
                    <div>Size: {formatBytes(stats.imageCache.totalSize)}</div>
                    <div>Hit Rate: {stats.imageCache.hitRate}%</div>
                  </div>
                </div>
                
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">RTK Query</h4>
                  <div className="text-sm text-gray-300">
                    <div>Queries: {stats.rtqQuery.queries}</div>
                    <div>Subscriptions: {stats.rtqQuery.subscriptions}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api' && stats?.apiCache && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">API Cache Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Total Entries</div>
                    <div className="text-white font-medium">{stats.apiCache.totalEntries}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Cache Size</div>
                    <div className="text-white font-medium">{formatBytes(stats.apiCache.totalSize || 0)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Hit Rate</div>
                    <div className="text-white font-medium">{stats.apiCache.hitRate}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Memory Usage</div>
                    <div className="text-white font-medium">{formatBytes(stats.apiCache.memorySize || 0)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && stats?.imageCache && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Image Cache Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Total Images</div>
                    <div className="text-white font-medium">{stats.imageCache.totalImages}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Cache Size</div>
                    <div className="text-white font-medium">{formatBytes(stats.imageCache.totalSize)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Hit Rate</div>
                    <div className="text-white font-medium">{stats.imageCache.hitRate}%</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Preloaded</div>
                    <div className="text-white font-medium">{stats.imageCache.preloadedCount || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'background' && stats?.backgroundRefresh && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Background Refresh Status</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-400">Service Status</div>
                    <div className={`font-medium ${stats.backgroundRefresh.isActive ? 'text-green-400' : 'text-red-400'}`}>
                      {stats.backgroundRefresh.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Active Refreshes</div>
                    <div className="text-white font-medium">{stats.backgroundRefresh.activeRefreshes}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Scheduled</div>
                    <div className="text-white font-medium">{stats.backgroundRefresh.scheduledRefreshes}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Queue</div>
                    <div className="text-white font-medium">{stats.backgroundRefresh.queuedRefreshes}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Cache Management Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={handleClearCaches}
                    disabled={isClearing}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white px-4 py-2 rounded transition-colors"
                  >
                    {isClearing ? 'Clearing...' : 'Clear All Caches'}
                  </button>
                  
                  <button
                    onClick={handleExportCache}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Export Cache Data
                  </button>
                  
                  <button
                    onClick={() => warmCache({ playerId: 'current' })}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Warm Cache
                  </button>
                  
                  <button
                    onClick={refreshStats}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors"
                  >
                    Refresh Statistics
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CacheStatusDashboard;
