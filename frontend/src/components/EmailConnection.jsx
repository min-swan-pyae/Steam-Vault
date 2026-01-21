import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

const EmailConnection = () => {
  const { user, isAuthenticated } = useAuth();
  const [emailStatus, setEmailStatus] = useState({
    hasEmail: false,
    email: null,
    isVerified: false
  });
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showEmailInput, setShowEmailInput] = useState(false);

  // Fetch email connection status
  const fetchEmailStatus = async () => {
    if (!isAuthenticated) return;

    try {
      setLoading(true);
      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/email/status`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setEmailStatus(data);
      } else {
        console.error('Failed to fetch email status');
      }
    } catch (error) {
      console.error('Error fetching email status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmailStatus();
  }, [isAuthenticated]);

  const handleConnectEmail = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setMessage({ text: 'Please enter a valid email address', type: 'error' });
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: '', type: '' });

      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/email/connect-email`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message, type: 'success' });
        setEmail('');
        setShowEmailInput(false);
        fetchEmailStatus(); // Refresh status
      } else {
        setMessage({ text: data.error || 'Failed to connect email', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectEmail = async () => {
    if (!confirm('Are you sure you want to disconnect your email? You will stop receiving notifications.')) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ text: '', type: '' });

      const API_BASE = getApiBaseUrl();
      const response = await fetch(`${API_BASE}/api/email/disconnect`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message, type: 'success' });
        fetchEmailStatus(); // Refresh status
      } else {
        setMessage({ text: data.error || 'Failed to disconnect email', type: 'error' });
      }
    } catch (error) {
      setMessage({ text: 'Network error. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">📧 Email Notifications</h3>
        <p className="text-gray-400">Please log in with Steam to manage your email notifications.</p>
      </div>
    );
  }

  if (loading && !emailStatus.hasEmail) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <LoadingSpinner message="Loading email settings..." />
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">📧 Email Notifications</h3>
      
      {message.text && (
        <div className={`p-3 rounded-lg mb-4 ${
          message.type === 'error' 
            ? 'bg-red-900/50 border border-red-700 text-red-200' 
            : 'bg-green-900/50 border border-green-700 text-green-200'
        }`}>
          {message.text}
        </div>
      )}

      {emailStatus.hasEmail ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              emailStatus.isVerified 
                ? 'bg-green-900/50 text-green-200 border border-green-700' 
                : 'bg-yellow-900/50 text-yellow-200 border border-yellow-700'
            }`}>
              {emailStatus.isVerified ? '✅ Verified' : '⏳ Pending Verification'}
            </span>
            <span className="text-gray-300">{emailStatus.email}</span>
          </div>

          {!emailStatus.isVerified && (
            <div className="bg-yellow-900/30 border border-yellow-700 p-3 rounded-lg">
              <p className="text-yellow-200 text-sm">
                📬 Please check your email and click the verification link to start receiving notifications.
              </p>
            </div>
          )}

          {emailStatus.isVerified && (
            <div className="bg-green-900/30 border border-green-700 p-3 rounded-lg">
              <p className="text-green-200 text-sm font-medium mb-2">🎉 You'll receive notifications for:</p>
              <ul className="text-green-200 text-sm space-y-1 list-disc list-inside">
                <li>💰 Steam marketplace price drops</li>
                <li>💬 Forum activity updates</li>
                <li>📊 System announcements</li>
                <li>⚡ Real-time alerts</li>
              </ul>
            </div>
          )}

          <button
            onClick={handleDisconnectEmail}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            {loading ? 'Disconnecting...' : 'Disconnect Email'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-400 mb-4">
            Connect your email to receive notifications about price drops, forum activity, and more!
          </p>

          {!showEmailInput ? (
            <button
              onClick={() => setShowEmailInput(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              📧 Connect Email
            </button>
          ) : (
            <form onSubmit={handleConnectEmail} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {loading ? 'Connecting...' : 'Connect Email'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailInput(false);
                    setEmail('');
                    setMessage({ text: '', type: '' });
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailConnection;