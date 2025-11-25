import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailConnection from '../components/EmailConnection';
import PriceSimulator from '../components/PriceSimulator';
import { useNavigate } from 'react-router-dom';

const UserSettings = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) return;
    const loadPrefs = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
        const res = await fetch(`${API_BASE}/api/users/preferences`, {
          method: 'GET',
          credentials: 'include'
        });
        if (!res.ok) return;
        const data = await res.json();
        const p = data?.preferences || {};
        const setChecked = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.checked = !!val;
        };
  setChecked('pref_price', p.priceAlerts ?? true);
  setChecked('pref_forum', p.forumNotifications ?? true);
      } catch (e) {
        // Non-fatal
        console.warn('Failed to load preferences');
      }
    };
    loadPrefs();
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">🔒 Authentication Required</h2>
            <p className="text-gray-400 mb-6">Please log in with Steam to access your account settings.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-gray-900 to-gray-800 px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">⚙️ Account Settings</h1>
          <p className="text-gray-400">Manage your Steam Vault account preferences and notifications</p>
        </div>

        <div className="space-y-6">
          {/* Steam Account Info */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">🎮 Steam Account</h3>
            
            <div className="flex items-center space-x-4 mb-4">
              {user.avatar && (
                <img 
                  src={user.avatar} 
                  alt={user.displayName} 
                  className="w-16 h-16 rounded-lg"
                />
              )}
              <div>
                <h4 className="text-white font-medium">{user.displayName}</h4>
                <p className="text-gray-400 text-sm">Steam ID: {user.steamId}</p>
                {user.profileUrl && (
                  <a 
                    href={user.profileUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    View Steam Profile →
                  </a>
                )}
              </div>
            </div>

            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
            >
              🚪 Logout from Steam
            </button>
          </div>

          {/* Email Notifications */}
          <EmailConnection />

          {/* Notification Preferences */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">🔔 Notification Preferences</h3>
            <p className="text-gray-400 text-sm mb-4">
              Choose what notifications you'd like to receive via email
            </p>

            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  id="pref_price"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-white font-medium">💰 Price Drop Alerts</span>
                  <p className="text-gray-400 text-xs">Get notified when Steam items you're watching drop in price</p>
                </div>
              </label>

              <label className="flex items-center space-x-3">
                <input
                  id="pref_forum"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-white font-medium">💬 Forum Activity</span>
                  <p className="text-gray-400 text-xs">Replies to your forum posts and mentions</p>
                </div>
              </label>
            </div>

            <div className="mt-6">
              <button
                onClick={async () => {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
                  const payload = {
                    preferences: {
                      enableNotifications: true,
                      emailNotifications: true,
                      priceAlerts: document.getElementById('pref_price')?.checked || false,
                      forumNotifications: document.getElementById('pref_forum')?.checked || false,
                      notificationFrequency: 'instant'
                    }
                  };
                  try {
                    const res = await fetch(`${API_BASE}/api/users/preferences`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                      alert('Preferences saved');
                    } else {
                      const d = await res.json().catch(() => ({}));
                      alert(`Failed to save preferences: ${d.error || res.status}`);
                    }
                  } catch (e) {
                    alert('Network error saving preferences');
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                💾 Save Preferences
              </button>
            </div>
          </div>

          {/* Price Alert Simulator - Development Only */}
          {process.env.NODE_ENV !== 'production' && (
            <PriceSimulator />
          )}

          {/* Data Export */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">📦 Data Export</h3>
            <p className="text-gray-400 text-sm mb-3">
              Download your Steam Vault data including match history, statistics, watchlist, and preferences.
            </p>
            <button
              onClick={async () => {
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
                  const res = await fetch(`${API_BASE}/api/users/export`, {
                    method: 'GET',
                    credentials: 'include'
                  });
                  if (!res.ok) throw new Error('Export failed');

                  // Parse JSON bundle
                  const bundle = await res.json();

                  // Lazy-load XLSX to keep main bundle small
                  const XLSXMod = await import('xlsx');
                  const XLSX = XLSXMod.default || XLSXMod;

                  // Flatten nested objects for better readability in Excel
                  const isFirestoreTimestamp = (obj) => obj && typeof obj === 'object' &&
                    (('seconds' in obj && 'nanoseconds' in obj) || ('_seconds' in obj && '_nanoseconds' in obj));

                  const toIsoIfTimestamp = (obj) => {
                    if (!isFirestoreTimestamp(obj)) return null;
                    const s = obj.seconds ?? obj._seconds;
                    return new Date(s * 1000).toISOString();
                  };

                  const flattenRow = (row, prefix = '') => {
                    if (row == null) return row;
                    if (Array.isArray(row)) return JSON.stringify(row);
                    if (typeof row !== 'object') return row;
                    const ts = toIsoIfTimestamp(row);
                    if (ts) return ts;
                    const out = {};
                    for (const [k, v] of Object.entries(row)) {
                      const key = prefix ? `${prefix}.${k}` : k;
                      if (v && typeof v === 'object' && !Array.isArray(v)) {
                        const maybeTs = toIsoIfTimestamp(v);
                        if (maybeTs) {
                          out[key] = maybeTs;
                          continue;
                        }
                        const nested = flattenRow(v, key);
                        Object.assign(out, nested);
                      } else if (Array.isArray(v)) {
                        out[key] = JSON.stringify(v);
                      } else {
                        out[key] = v;
                      }
                    }
                    return out;
                  };
                  const flattenRows = (data) => {
                    const arr = Array.isArray(data) ? data : (data ? [data] : []);
                    return arr.map(r => flattenRow(r));
                  };

                  // Build a workbook with meaningful sheets
                  const wb = XLSX.utils.book_new();

                  // Helper: add a sheet from array of objects safely
                  const addSheet = (name, data) => {
                    try {
                      const arr = flattenRows(data);
                      const ws = XLSX.utils.json_to_sheet(arr.length ? arr : [{}]);
                      XLSX.utils.book_append_sheet(wb, ws, name);
                    } catch (_) {
                      // Fallback: write the raw value as a single-cell sheet
                      const ws = XLSX.utils.aoa_to_sheet([[typeof data === 'object' ? JSON.stringify(data) : data]]);
                      XLSX.utils.book_append_sheet(wb, ws, name);
                    }
                  };

                  // Top-level meta
                  addSheet('meta', [{
                    exportVersion: bundle.exportVersion,
                    exportedAt: bundle.exportedAt,
                    steamId: bundle.steamId
                  }]);

                  // Core entities
                  addSheet('user', bundle.user);
                  addSheet('profile', bundle.profile);
                  addSheet('emailConnection', bundle.emailConnection);
                  addSheet('notifications', bundle.notifications);
                  addSheet('watchlist', bundle.watchlist);
                  addSheet('priceAlerts', bundle.priceAlerts);
                  addSheet('matches', bundle.matches);
                  addSheet('playerStats', bundle.playerStats);
                  addSheet('weaponStats', bundle.weaponStats);
                  addSheet('mapStats', bundle.mapStats);

                  // Generate a file and trigger download
                  const filename = `steamvault-export-${user?.steamId || 'me'}.xlsx`;
                  XLSX.writeFile(wb, filename, { compression: true });
                } catch (e) {
                  console.error('Export error', e);
                }
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              📥 Export My Data (Excel)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;