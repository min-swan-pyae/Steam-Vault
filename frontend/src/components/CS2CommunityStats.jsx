import React, { useState, useEffect } from 'react';
import { firebaseDataService } from '../services/firebaseData';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';

const CS2CommunityStats = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStat, setSelectedStat] = useState('kdRatio');
  const [loading, setLoading] = useState({ leaderboard: true, activity: true, search: false });
  const [error, setError] = useState({ leaderboard: null, activity: null, search: null });

  const statOptions = [
    { value: 'kdRatio', label: 'K/D Ratio' },
    { value: 'totalKills', label: 'Total Kills' },
    { value: 'headshotPercentage', label: 'Headshot %' },
    { value: 'winRate', label: 'Win Rate' },
    { value: 'totalMatches', label: 'Matches Played' }
  ];

  const fetchLeaderboard = async () => {
    try {
      setLoading(prev => ({ ...prev, leaderboard: true }));
      setError(prev => ({ ...prev, leaderboard: null }));
      
      const data = await firebaseDataService.getLeaderboard(selectedStat, 25);
      setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(prev => ({ ...prev, leaderboard: 'Failed to load leaderboard' }));
    } finally {
      setLoading(prev => ({ ...prev, leaderboard: false }));
    }
  };

  const fetchRecentActivity = async () => {
    try {
      setLoading(prev => ({ ...prev, activity: true }));
      setError(prev => ({ ...prev, activity: null }));
      
      const data = await firebaseDataService.getRecentActivity(15);
      setRecentActivity(data);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError(prev => ({ ...prev, activity: 'Failed to load recent activity' }));
    } finally {
      setLoading(prev => ({ ...prev, activity: false }));
    }
  };

  const handleSearch = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(prev => ({ ...prev, search: true }));
      setError(prev => ({ ...prev, search: null }));
      
      const results = await firebaseDataService.searchPlayers(term);
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching players:', err);
      setError(prev => ({ ...prev, search: 'Search failed' }));
    } finally {
      setLoading(prev => ({ ...prev, search: false }));
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedStat]);

  useEffect(() => {
    fetchRecentActivity();
    
    // Refresh activity every 30 seconds
    const interval = setInterval(fetchRecentActivity, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const formatStatValue = (value, statType) => {
    switch (statType) {
      case 'kdRatio':
        return typeof value === 'number' ? value.toFixed(2) : '--';
      case 'headshotPercentage':
      case 'winRate':
        return typeof value === 'number' ? `${value.toFixed(1)}%` : '--';
      default:
        return value || '--';
    }
  };

  const getRankBadgeColor = (rank) => {
    if (rank === 1) return 'bg-yellow-500 text-black';
    if (rank === 2) return 'bg-gray-400 text-black';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-gray-700 text-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Player Search */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-white">Find Players</h3>
        
        <div className="relative">
          <input
            type="text"
            placeholder="Search by player name or Steam ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          
          {loading.search && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
            </div>
          )}
        </div>

        {error.search && (
          <ErrorMessage message={error.search} className="mt-2" />
        )}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map((player) => (
              <div
                key={player.steamId}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition cursor-pointer"
                onClick={() => window.open(`/cs2-dashboard/${player.steamId}`, '_blank')}
              >
                <div className="flex items-center space-x-3">
                  {player.avatar && (
                    <img
                      src={player.avatar}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium text-white">{player.personaName || 'Unknown Player'}</div>
                    <div className="text-sm text-gray-400">ID: {player.steamId}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-primary-300">K/D: {formatStatValue(player.kdRatio, 'kdRatio')}</div>
                  <div className="text-xs text-gray-400">{player.totalMatches || 0} matches</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="text-xl font-semibold text-white mb-2 sm:mb-0">Leaderboard</h3>
          
          <select
            value={selectedStat}
            onChange={(e) => setSelectedStat(e.target.value)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {statOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {loading.leaderboard ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error.leaderboard ? (
          <ErrorMessage message={error.leaderboard} />
        ) : (
          <div className="space-y-2">
            {leaderboard.map((player) => (
              <div
                key={player.steamId}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition cursor-pointer"
                onClick={() => window.open(`/cs2-dashboard/${player.steamId}`, '_blank')}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadgeColor(player.rank)}`}>
                    {player.rank}
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {player.avatar && (
                      <img
                        src={player.avatar}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div>
                      <div className="font-medium text-white">{player.personaName || 'Unknown Player'}</div>
                      <div className="text-sm text-gray-400">{player.totalMatches || 0} matches</div>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-lg font-bold text-primary-300">
                    {formatStatValue(player[selectedStat], selectedStat)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {statOptions.find(opt => opt.value === selectedStat)?.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-800 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
          <div className="flex items-center text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            Live
          </div>
        </div>

        {loading.activity ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error.activity ? (
          <ErrorMessage message={error.activity} />
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
                  <div>
                    <div className="text-white">
                      <span className="font-medium">{activity.playerName}</span> completed a match
                    </div>
                    <div className="text-sm text-gray-400">
                      {activity.mapName} • {activity.kills}/{activity.deaths} K/D
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-400">
                  {activity.createdAt && new Date(activity.createdAt.seconds * 1000).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CS2CommunityStats;
