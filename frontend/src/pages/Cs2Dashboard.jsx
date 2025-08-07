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
  
  // Use logged in user's Steam ID if available, otherwise use URL param, or use test Steam ID
  const targetSteamId = steamId|| user?.steamId|| '76561198008243030';
  // const targetSteamId ='76561198008243030';
  
  const [showProfileData, setShowProfileData] = useState(true);
  const [showCommunityStats, setShowCommunityStats] = useState(false);

  useEffect(() => {
    if (!user) {
      console.log('[CS2 DASHBOARD] User not authenticated');
      return;
    }

    if (!targetSteamId) {
      console.log('[CS2 DASHBOARD] No Steam ID provided');
      return;
    }

    console.log(`[CS2 DASHBOARD] Loading CS2 dashboard for Steam ID: ${targetSteamId}`);
  }, [targetSteamId, user]);

  
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
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
              CS2 Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-400 px-4">
              Complete Counter-Strike 2 statistics like professional sites
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-col sm:flex-row sm:space-x-8 space-y-2 sm:space-y-0">
            <button
              onClick={() => {
                setShowProfileData(true);
                setShowCommunityStats(false);
              }}
              className={`py-3 sm:py-4 px-2 sm:px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                showProfileData 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              📊 My Statistics
            </button>
            <button
              onClick={() => {
                setShowProfileData(false);
                setShowCommunityStats(true);
              }}
              className={`py-3 sm:py-4 px-2 sm:px-2 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                showCommunityStats 
                  ? 'border-blue-500 text-blue-400' 
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              🏆 Community & Leaderboard
            </button>
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
            <CS2CommunityStats />
          </div>
        )}
      </div>
      
    </div>
  );
}
