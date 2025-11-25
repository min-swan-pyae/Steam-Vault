import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import NotAuthenticated from '../components/NotAuthenticated';
import CS2CommunityStats from '../components/CS2CommunityStats';
import CS2ProfileData from '../components/CS2ProfileData';

/**
 * CS2 Dashboard - Professional Statistics Display
 * 
 * Modern CS2 statistics dashboard that displays comprehensive statistics
 * like professional sites (CSSTATS.GG) using both Steam API and GSI data.
 * 
 * Features:
 * - Complete historical statistics from Steam API
 * - Real-time match data from Game State Integration (GSI)
 * - Professional-grade statistics display
 * - Comprehensive performance analysis
 * - Rank estimation and trend analysis
 * - Authentication required
 * - Beautiful and responsive UI
 */

export default function Cs2Dashboard() {
  const { user } = useAuth();
  const { steamId } = useParams();
  const navigate = useNavigate();
  const [selectedSteamId, setSelectedSteamId] = useState(undefined);
  
  // Use selected Steam ID, URL param, or logged in user's Steam ID (no hardcoded fallback)
  const targetSteamId = selectedSteamId || steamId || user?.steamId;
  
  const [showProfileData, setShowProfileData] = useState(true);
  const [showCommunityStats, setShowCommunityStats] = useState(false);

  // If route has :steamId, prioritize showing profile tab
  useEffect(() => {
    if (steamId) {
      setShowProfileData(true);
      setShowCommunityStats(false);
      // Clear locally selected ID to prefer the route param
      setSelectedSteamId(undefined);
    }
  }, [steamId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    if (!targetSteamId) {
      return;
    }

  }, [targetSteamId, user]);

  
  if (!user) {
    return <NotAuthenticated />;
  }

  if (!targetSteamId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <ErrorMessage message="Steam ID is required" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-slate-800 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-blue-400 mb-2">Competitive Insights</p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
              Counter-Strike 2 Intelligence Hub
            </h1>
            <p className="text-gray-300 mt-3 max-w-2xl text-sm sm:text-base">
              Deep analytics, live telemetry, and leaderboard intelligence unified into one polished experience.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 text-sm text-gray-300">
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-wide text-gray-400">Steam ID</p>
              <p className="text-white font-semibold break-all">{targetSteamId}</p>
            </div>
            <div className="bg-gray-800/60 border border-gray-700 rounded-2xl px-5 py-4 shadow-inner shadow-black/20">
              <p className="text-xs uppercase tracking-wide text-gray-400">Status</p>
              <p className="text-green-400 font-semibold">Secure & Synced</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-900/60 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="inline-flex rounded-full bg-gray-800/70 border border-gray-700 overflow-hidden">
              <button
                onClick={() => {
                  setShowProfileData(true);
                  setShowCommunityStats(false);
                }}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${
                  showProfileData
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                📊 Player Profile
              </button>
              <button
                onClick={() => {
                  setShowProfileData(false);
                  setShowCommunityStats(true);
                }}
                className={`px-6 py-2 text-sm font-semibold transition-colors ${
                  showCommunityStats
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                🏆 Community & Leaderboard
              </button>
            </div>
            {showProfileData && user?.steamId && String(targetSteamId) !== String(user.steamId) && (
              <button
                onClick={() => {
                  setSelectedSteamId(user.steamId);
                  setShowProfileData(true);
                  setShowCommunityStats(false);
                }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-full transition"
              >
                View My Profile
              </button>
            )}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 sm:p-4 lg:p-6">
        {showProfileData && (
          <div className="max-w-7xl mx-auto">
            <CS2ProfileData steamId={targetSteamId} />
          </div>
        )}
        {showCommunityStats && (
          <div className="max-w-7xl mx-auto">
            <CS2CommunityStats 
              onSelectPlayer={(id) => {
                setSelectedSteamId(id);
                setShowProfileData(true);
                setShowCommunityStats(false);
                // Stay on /cs2 (no navigation) so the tab swaps in place
              }}
            />
          </div>
        )}
      </div>
      
    </div>
  );
}
