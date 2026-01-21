import React, { useState, useEffect } from 'react';
import { firebaseDataService } from '../services/firebaseData';
import { getDisplayName } from '../utils/helpers';
import { formatPercent } from '../utils/formatters';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

/**
 * CS2 Community Stats Component
 * 
 * Updated to use the new Steam API + GSI combined endpoints
 * Displays leaderboards, recent activity, and player search
 */

const CS2CommunityStats = ({ onSelectPlayer }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedStat, setSelectedStat] = useState('kdRatio');
  const [loading, setLoading] = useState({ leaderboard: true, activity: true, search: false });
  const [error, setError] = useState({ leaderboard: null, activity: null, search: null });

  const statOptions = [
    { value: 'kdRatio', label: 'K/D Ratio' },
    { value: 'totalKills', label: 'Total Kills' },
    { value: 'winRate', label: 'Win Rate' },
    { value: 'headshotPercentage', label: 'Headshot %' }
  ];

  const fetchLeaderboard = React.useCallback(async (forceRefresh = false) => {
    try {
      setLoading(prev => ({ ...prev, leaderboard: true }));
      setError(prev => ({ ...prev, leaderboard: null }));
      const data = await firebaseDataService.getCS2Leaderboard(25, selectedStat, { refresh: forceRefresh });
      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching CS2 leaderboard:', err);
      setError(prev => ({ ...prev, leaderboard: err.message || 'Failed to load leaderboard' }));
      setLeaderboard([]);
    } finally {
      setLoading(prev => ({ ...prev, leaderboard: false }));
    }
  }, [selectedStat]);

  const fetchRecentActivity = React.useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, activity: true }));
      setError(prev => ({ ...prev, activity: null }));
      
      const data = await firebaseDataService.getCS2RecentActivity(15);
      setRecentActivity(data);
    } catch (err) {
      console.error('Error fetching CS2 recent activity:', err);
      setError(prev => ({ ...prev, activity: err.message || 'Failed to load recent activity' }));
      setRecentActivity([]);
    } finally {
      setLoading(prev => ({ ...prev, activity: false }));
    }
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, search: true }));
      setError(prev => ({ ...prev, search: null }));
      setHasSearched(true);
      
      const data = await firebaseDataService.searchCS2Players(searchTerm.trim(), 10);
      setSearchResults(data);
    } catch (err) {
      console.error('Error searching CS2 players:', err);
      // Don't show error for 404 (no results found) - it's not an error
      if (err.message && err.message.includes('No CS2 players found')) {
        setSearchResults([]);
      } else {
        setError(prev => ({ ...prev, search: err.message || 'Failed to search players' }));
        setSearchResults([]);
      }
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  // Handle search term changes - always reset hasSearched when typing
  const handleSearchTermChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Reset search state when typing - user must click Search to trigger new search
    setHasSearched(false);
    if (!value.trim()) {
      setSearchResults([]);
    }
  };

  // handleKeyPress removed - form onSubmit will handle Enter key automatically

  useEffect(() => {
    fetchLeaderboard();
    fetchRecentActivity();
  }, [selectedStat, fetchLeaderboard, fetchRecentActivity]);

  const renderLeaderboard = () => {
    if (loading.leaderboard) {
      return (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      );
    }

    if (error.leaderboard) {
      return <ErrorMessage message={error.leaderboard} />;
    }

    if (leaderboard.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No leaderboard data available. Players need to setup GSI and play matches to appear here.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {leaderboard.map((player, index) => (
          <div
            key={player.steamId || index}
            className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-lg space-y-2 sm:space-y-0 cursor-pointer ${
              index === 0 ? 'bg-yellow-600' : 
              index === 1 ? 'bg-gray-500' : 
              index === 2 ? 'bg-amber-600' : 
              'bg-gray-700'
            } hover:bg-opacity-80 transition-colors`}
            onClick={() => onSelectPlayer && onSelectPlayer(player.steamId)}
          >
            <div className="flex items-center space-x-3">
              <span className="font-bold text-white w-6 sm:w-8 text-center text-sm sm:text-base">#{index + 1}</span>
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                {player.avatarUrl && (
                  <img 
                    src={player.avatarUrl} 
                    alt={player.personaName}
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                  />
                )}
                <span className="font-medium text-white text-sm sm:text-base truncate">
                  {getDisplayName(player)}
                </span>
              </div>
            </div>
            <div className="flex justify-between sm:block sm:text-right">
              <div className="font-bold text-white text-sm sm:text-base">
                {selectedStat === 'kdRatio' && player.kdRatio?.toFixed(2)}
                {selectedStat === 'totalKills' && player.totalKills}
                {selectedStat === 'winRate' && formatPercent(player.winRate)}
                {selectedStat === 'headshotPercentage' && formatPercent(player.headshotPercentage)}
              </div>
              <div className="text-xs sm:text-xs text-gray-300">
                {player.totalMatches || 0} matches
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRecentActivity = () => {
    if (loading.activity) {
      return (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      );
    }

    if (error.activity) {
      return <ErrorMessage message={error.activity} />;
    }

    if (recentActivity.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No recent activity found. Players need to setup GSI and play matches to generate activity.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {recentActivity.map((activity, index) => (
          <div
            key={activity.id || index}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors space-y-2 sm:space-y-0 cursor-pointer"
            onClick={() => onSelectPlayer && onSelectPlayer(activity.steamId)}
          >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {activity.avatarUrl && (
                <img 
                  src={activity.avatarUrl} 
                  alt={activity.personaName}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-medium text-white text-sm sm:text-base truncate">
                  {getDisplayName(activity)}
                </div>
                <div className="text-xs sm:text-sm text-gray-400">
                  {activity.action || 'played a match'}
                </div>
              </div>
            </div>
            <div className="flex justify-between sm:block sm:text-right">
              <div className="text-xs sm:text-sm text-gray-300">
                {activity.mapName && `on ${activity.mapName}`}
              </div>
              <div className="text-xs text-gray-400">
                {activity.timeAgo || 'recently'}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderSearchResults = () => {
    if (loading.search) {
      return (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      );
    }

    if (error.search) {
      return <ErrorMessage message={error.search} />;
    }

    // Only show 'no results' after user has actually searched
    if (searchResults.length === 0 && hasSearched && searchTerm.trim()) {
      return (
        <div className="text-center py-8 text-gray-400">
          No players found matching "{searchTerm}". Try a different search term.
        </div>
      );
    }

    if (searchResults.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          Enter a player name to search for CS2 players.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {searchResults.map((player, index) => {
          const steamMatches = Number(player.steamTotalMatches ?? 0);
          const gsiMatches = Number(player.gsiTotalMatches ?? 0);
          const fallbackMatches = Number(player.totalMatches ?? 0);
          const matchesDisplay = steamMatches > 0 ? steamMatches : (fallbackMatches > 0 ? fallbackMatches : gsiMatches);
          const matchLabel = steamMatches > 0 ? 'matches' : gsiMatches > 0 ? 'tracked matches' : 'matches';

            return (
            <div
            key={player.steamId || index}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer space-y-2 sm:space-y-0"
            onClick={() => onSelectPlayer && onSelectPlayer(player.steamId)}
            >
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {player.avatarUrl && (
              <img 
                src={player.avatarUrl} 
                alt={getDisplayName(player)}
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0"
              />
              )}
              <div className="min-w-0 flex-1">
              <div className="font-medium text-white text-sm sm:text-base truncate">
                {getDisplayName(player)}
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                {matchesDisplay} {matchLabel} • {player.kdRatio?.toFixed(2) || '0.00'} K/D
              </div>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center space-y-1">
              <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelectPlayer && onSelectPlayer(player.steamId); }}
              className="text-xs sm:text-sm text-dark bg-green-500 hover:underline px-3 py-1 rounded"
              >
              View Profile
              </button>
              <div className="text-xs text-gray-400">
              {player.dataSources?.steam && player.dataSources?.gsi ? 'Complete Data' : 
               player.dataSources?.steam ? 'Steam Data' : 
               player.dataSources?.gsi ? 'GSI Data' : 'Limited Data'}
              </div>
            </div>
            </div>
          );})}
      </div>
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
    

      {/* Player Search */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
        <h3 className="font-bold text-lg sm:text-xl mb-4 text-blue-300">🔍 Player Search</h3>
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchTermChange}
              placeholder="Search for players..."
              className="flex-1 bg-gray-700 text-white px-4 py-2 sm:py-3 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm sm:text-base"
            />
            <button
              type="submit"
              disabled={loading.search}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg transition-colors disabled:opacity-50 text-sm sm:text-base font-medium"
            >
              {loading.search ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>
        {renderSearchResults()}
      </div>

      {/* Leaderboard */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
          <h3 className="font-bold text-lg sm:text-xl text-blue-300">🏆 Leaderboard</h3>
          <div className="flex items-center space-x-2">
          <select
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm sm:text-base w-full sm:w-auto"
          >
            {statOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          </div>
        </div>
        {renderLeaderboard()}
      </div>

      {/* Recent Activity */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
        <h3 className="font-bold text-lg sm:text-xl mb-4 text-blue-300">📈 Recent Activity</h3>
        {renderRecentActivity()}
      </div>
    </div>
  );
};

export default CS2CommunityStats;
