import React from 'react';
import { useAuth } from '../context/AuthContext';
import EmailConnection from '../components/EmailConnection';
import NotificationTester from '../components/NotificationTester';
import PriceSimulator from '../components/PriceSimulator';
import { useNavigate } from 'react-router-dom';

const UserSettings = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

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
                  id="pref_market"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-white font-medium">📈 Market Trends</span>
                  <p className="text-gray-400 text-xs">Weekly market analysis and trending items</p>
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



              <label className="flex items-center space-x-3">
                <input
                  id="pref_digest"
                  type="checkbox"
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <div>
                  <span className="text-white font-medium">📰 Weekly Digest</span>
                  <p className="text-gray-400 text-xs">Summary of your gaming activity and community updates</p>
                </div>
              </label>
            </div>

            <div className="mt-6">
              <button
                onClick={async () => {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
                  const payload = {
                    preferences: {
                      enableNotifications: true,
                      emailNotifications: true,
                      priceAlerts: document.getElementById('pref_price')?.checked || false,
                      forumNotifications: document.getElementById('pref_forum')?.checked || false,
                      weeklyDigest: document.getElementById('pref_digest')?.checked || false,
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

          {/* Notification Testing - Development Only */}
          {process.env.NODE_ENV !== 'production' && (
            <>
              <NotificationTester />
              <PriceSimulator />
            </>
          )}

          {/* Data Export */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">� Data Export</h3>
            <p className="text-gray-400 text-sm mb-3">
              Download your Steam Vault data including match history, statistics, watchlist, and preferences.
            </p>
            <button
              onClick={async () => {
                try {
                  const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
                  const res = await fetch(`${API_BASE}/api/users/export`, {
                    method: 'GET',
                    credentials: 'include'
                  });
                  if (!res.ok) {
                    throw new Error('Export failed');
                  }
                  const blob = await res.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `steamvault-export-${user?.steamId || 'me'}.json`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  window.URL.revokeObjectURL(url);
                } catch (e) {
                  console.error('Export error', e);
                }
              }}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors"
            >
              📥 Export My Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;