import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ErrorMessage from './ErrorMessage';
import LoadingSpinner from './LoadingSpinner';
import NotAuthenticated from './NotAuthenticated';

/**
 * CS2 Profile Data Component - Professional Statistics Display
 * 
 * Displays comprehensive CS2 statistics like professional sites (CSSTATS.GG)
 * Uses Steam API for historical data and Firebase for real-time GSI data
 */

const CS2ProfileData = ({ steamId: propSteamId }) => {
  const { steamId: paramSteamId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Use prop steamId if provided, otherwise use param steamId
  const steamId = propSteamId || paramSteamId;
  
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) {
      console.log('[CS2 PROFILE] User not authenticated');
      setLoading(false);
      return;
    }

    if (!steamId) {
      console.log('[CS2 PROFILE] No Steam ID provided');
      setError('Steam ID is required');
      setLoading(false);
      return;
    }

    fetchProfileData();
  }, [steamId, user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`[CS2 PROFILE] Fetching comprehensive profile data for: ${steamId}`);
      
            const response = await fetch(`/api/cs2/player/${steamId}/profile`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('[CS2 PROFILE] Profile data loaded successfully');
      console.log('[CS2 PROFILE] Raw API response:', data);
      setProfileData(data);
    } catch (err) {
      console.error('[CS2 PROFILE] Error fetching profile data:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <NotAuthenticated />;
  }

  if (loading) {
    return (
      <div>
        <LoadingSpinner message="Loading CS2 profile data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <ErrorMessage 
            message={error} 
            onRetry={fetchProfileData}
            className="mb-6"
          />
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-8">
            <p className="text-gray-400">No profile data available</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if profile is private or doesn't own CS2
  if (profileData.profile?.isPrivate || !profileData.gameInfo?.ownsCS2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-900" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {profileData.profile?.isPrivate ? 'Private Profile' : 'CS2 Not Found'}
                </h3>
                <p className="text-gray-300 mb-4">
                  {profileData.profile?.isPrivate 
                    ? 'This Steam profile is private. CS2 statistics are not available for private profiles.'
                    : 'CS2 was not found in this Steam account\'s game library.'
                  }
                </p>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-white mb-2">Player Information</h4>
                <p className="text-sm text-gray-300">
                  <span className="font-medium">Name:</span> {profileData.profile?.personaName || 'Unknown'}
                </p>
                <p className="text-sm text-gray-300">
                  <span className="font-medium">Steam ID:</span> {profileData.profile?.steamId || steamId}
                </p>
              </div>
              
              {profileData.profile?.isPrivate && (
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-100 mb-2">To view CS2 statistics:</h4>
                  <ol className="text-sm text-blue-200 text-left space-y-1">
                    <li>1. Go to your Steam profile</li>
                    <li>2. Click "Edit Profile"</li>
                    <li>3. Go to "Privacy Settings"</li>
                    <li>4. Set "Game Details" to "Public"</li>
                    <li>5. Refresh this page</li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-2 sm:p-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Profile Header */}
        <ProfileHeader profile={profileData.profile} gameInfo={profileData.gameInfo} />
        
        {/* Statistics Overview */}
        <StatisticsOverview statistics={profileData.statistics} />
        
        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <RankCard rank={profileData.rank} statistics={profileData.statistics} />
          <TrendsCard trends={profileData.trends} />
        </div>
        
        {/* Data Quality and Sources */}
        <DataQualityCard 
          dataQuality={profileData.dataQuality} 
          gameInfo={profileData.gameInfo}
          steamId={steamId}
        />
        
        {/* Recent Matches */}
        <RecentMatchesCard matches={profileData.recentMatches} />
        
        {/* Performance Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <MapPerformanceCard maps={profileData.mapPerformance} />
          <WeaponPerformanceCard weapons={profileData.weaponPerformance} />
        </div>
        
      </div>
    </div>
  );
};

const ProfileHeader = ({ profile, gameInfo }) => {
  const formatPlaytime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    if (hours >= 1000) {
      return `${(hours / 1000).toFixed(1)}k hours`;
    }
    return `${hours.toLocaleString()} hours`;
  };

  const formatRecentPlaytime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours}h past 2 weeks` : 'No recent activity';
  };

  return (
    <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-blue-600">
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="relative self-center sm:self-auto">
          <img 
            src={profile.avatarUrl} 
            alt={profile.personaName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-blue-400 shadow-lg"
          />
          <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-blue-800 ${
            profile.isPrivate ? 'bg-red-500' : 'bg-green-500'
          }`}></div>
        </div>
        
        <div className="flex-1 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{profile.personaName}</h1>
          <div className="text-blue-200 mb-3 space-y-1">
            {profile.realName && <div className="text-sm">Real Name: {profile.realName}</div>}
            {profile.createdAt && (
              <div className="text-sm">
                Steam Member Since: {new Date(profile.createdAt).toLocaleDateString()}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-blue-200 text-xs sm:text-sm">Total Playtime</div>
              <div className="text-white font-bold text-sm sm:text-base">
                {formatPlaytime(gameInfo.playtimeForever)}
              </div>
            </div>
            
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-blue-200 text-xs sm:text-sm">Recent Activity</div>
              <div className="text-white font-bold text-sm sm:text-base">
                {formatRecentPlaytime(gameInfo.playtimeTwoWeeks)}
              </div>
            </div>
            
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-blue-200 text-xs sm:text-sm">Achievements</div>
              <div className="text-white font-bold text-sm sm:text-base">
                {gameInfo.achievementCount}
              </div>
            </div>
            
            <div className="bg-blue-800 bg-opacity-50 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-blue-200 text-xs sm:text-sm">Profile Status</div>
              <div className={`font-bold text-sm sm:text-base ${profile.isPrivate ? 'text-red-300' : 'text-green-300'}`}>
                {profile.isPrivate ? 'Private' : 'Public'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatisticsOverview = ({ statistics }) => {
  // Debug: Log the statistics data to see what we're receiving
  console.log('[CS2 PROFILE] Statistics data received:', statistics);
  
  const mainStats = [
    { label: 'K/D Ratio', value: statistics?.kdRatio, format: 'decimal', color: 'blue' },
    { label: 'Win Rate', value: statistics?.winRate, format: 'percent', color: 'green' },
    { label: 'Headshot %', value: statistics?.headshotPercentage, format: 'percent', color: 'red' },
    { label: 'Total Kills', value: statistics?.totalKills, format: 'number', color: 'yellow' },
    { label: 'Total Deaths', value: statistics?.totalDeaths, format: 'number', color: 'gray' },
    { label: 'Total Matches', value: statistics?.totalMatches, format: 'number', color: 'purple' }
  ];

  // Weapon statistics
  const weaponStats = [
    { label: 'AK-47 Kills', value: statistics?.ak47Kills, format: 'number' },
    { label: 'M4A1 Kills', value: statistics?.m4a1Kills, format: 'number' },
    { label: 'AWP Kills', value: statistics?.awpKills, format: 'number' },
    { label: 'Headshot Kills', value: statistics?.headshotKills, format: 'number' }
  ];

  // Objective statistics
  const objectiveStats = [
    { label: 'Bombs Planted', value: statistics?.bombsPlanted, format: 'number' },
    { label: 'Bombs Defused', value: statistics?.bombsDefused, format: 'number' },
    { label: 'Rounds Played', value: statistics?.roundsPlayed, format: 'number' },
    { label: 'Hostages Rescued', value: statistics?.hostagesRescued, format: 'number' }
  ];

  const formatValue = (value, format, suffix = '') => {
    if (value === null || value === undefined) return '--';
    
    switch (format) {
      case 'decimal':
        return Number(value).toFixed(2);
      case 'percent':
        return Number(value).toFixed(1) + '%';
      case 'number':
        return Number(value).toLocaleString();
      case 'time':
        return Number(value).toLocaleString() + (suffix ? ` ${suffix}` : '');
      default:
        return value;
    }
  };

  const getColorClass = (color) => {
    const colors = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      red: 'text-red-400',
      yellow: 'text-yellow-400',
      gray: 'text-gray-400',
      purple: 'text-purple-400'
    };
    return colors[color] || 'text-blue-400';
  };

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-gray-700">
      <h2 className="text-xl sm:text-2xl font-bold text-blue-300 mb-4 sm:mb-6 text-center sm:text-left">📊 Statistics Overview</h2>
      
      {/* Main Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
        {mainStats.map(({ label, value, format, color }) => (
          <div key={label} className="bg-gray-700 rounded-lg p-2 sm:p-4 text-center transform hover:scale-105 transition-transform">
            <div className={`text-lg sm:text-2xl font-bold ${getColorClass(color)} mb-1`}>
              {formatValue(value, format)}
            </div>
            <div className="text-xs sm:text-xs text-gray-400 leading-tight">{label}</div>
          </div>
        ))}
      </div>
      
      {/* Weapon Statistics */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">🔫 Weapon Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {weaponStats.map(({ label, value, format }) => (
            <div key={label} className="bg-gray-700 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-base sm:text-lg font-bold text-orange-400">
                {formatValue(value, format)}
              </div>
              <div className="text-xs text-gray-400 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Objective Statistics */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3">🎯 Objective Statistics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          {objectiveStats.map(({ label, value, format }) => (
            <div key={label} className="bg-gray-700 rounded-lg p-2 sm:p-3 text-center">
              <div className="text-base sm:text-lg font-bold text-cyan-400">
                {formatValue(value, format)}
              </div>
              <div className="text-xs text-gray-400 leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Source Information */}
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-700 rounded-lg p-3 space-y-2 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2">
            <span className={`inline-block w-3 h-3 rounded-full ${
              statistics?.dataSources?.steam ? 'bg-green-400' : 'bg-red-400'
            }`}></span>
            <span className="text-xs sm:text-sm text-gray-300">
              Steam API: {statistics?.dataSources?.steam ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`inline-block w-3 h-3 rounded-full ${
              statistics?.dataSources?.gsi ? 'bg-green-400' : 'bg-yellow-400'
            }`}></span>
            <span className="text-xs sm:text-sm text-gray-300">
              GSI: {statistics?.dataSources?.gsi ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
        <span className="text-xs text-gray-500 text-center sm:text-right">
          Updated: {statistics?.lastUpdated ? new Date(statistics.lastUpdated).toLocaleDateString() : 'Unknown'}
        </span>
      </div>
    </div>
  );
};

const RankCard = ({ rank, statistics }) => {
  const getRankColor = (rankName) => {
    const rankColors = {
      'Unranked': 'from-gray-600 to-gray-700 border-gray-500',
      'Silver': 'from-gray-400 to-gray-500 border-gray-400',
      'Gold Nova': 'from-yellow-500 to-yellow-600 border-yellow-400',
      'Master Guardian': 'from-blue-500 to-blue-600 border-blue-400',
      'Legendary Eagle': 'from-purple-500 to-purple-600 border-purple-400',
      'Supreme': 'from-red-500 to-red-600 border-red-400',
      'Global Elite': 'from-orange-500 to-orange-600 border-orange-400'
    };
    return rankColors[rankName] || 'from-gray-600 to-gray-700 border-gray-500';
  };

  const rankColor = getRankColor(rank.estimatedRank);

  return (
    <div className={`bg-gradient-to-br ${rankColor} rounded-xl p-4 sm:p-6 shadow-lg border`}>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">🏆 Estimated Rank</h3>
      <div className="text-center">
        <div className="text-2xl sm:text-3xl font-bold text-white mb-2">{rank.estimatedRank}</div>
        <div className="text-xs sm:text-sm text-gray-200 mb-3 sm:mb-4 leading-tight">
          {rank.confidence > 0 ? (
            <>Confidence: {rank.confidence}% ({rank.basedOnMatches} matches)</>
          ) : (
            <>Play matches to get rank estimation</>
          )}
        </div>
        
        {/* Performance Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="bg-black bg-opacity-20 rounded-lg p-2 sm:p-3">
            <div className="text-gray-200 text-xs sm:text-sm">K/D Ratio</div>
            <div className="text-white text-base sm:text-lg font-bold">
              {statistics?.kdRatio ? Number(statistics.kdRatio).toFixed(2) : '--'}
            </div>
          </div>
          <div className="bg-black bg-opacity-20 rounded-lg p-2 sm:p-3">
            <div className="text-gray-200 text-xs sm:text-sm">Win Rate</div>
            <div className="text-white text-base sm:text-lg font-bold">
              {statistics?.winRate ? Number(statistics.winRate).toFixed(1) + '%' : '--'}
            </div>
          </div>
        </div>
        
        {/* Skill Indicators */}
        <div className="mt-3 sm:mt-4 grid grid-cols-1 gap-2 text-xs sm:text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-200">Headshot Rate</span>
            <span className="text-white">
              {statistics?.headshotPercentage ? Number(statistics.headshotPercentage).toFixed(1) + '%' : '--'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-200">Total Matches</span>
            <span className="text-white">
              {statistics?.totalMatches ? Number(statistics.totalMatches).toLocaleString() : '--'}
            </span>
          </div>
        </div>
        
        {rank.estimatedRank === 'Unranked' && (
          <div className="mt-3 sm:mt-4 bg-black bg-opacity-30 rounded-lg p-2 sm:p-3">
            <div className="text-xs text-gray-300 leading-tight">
              💡 Play more matches to get an accurate rank estimation
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TrendsCard = ({ trends }) => {
  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'improving': return 'text-green-400';
      case 'declining': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-900 to-purple-800 rounded-xl p-4 sm:p-6 shadow-lg border border-purple-600">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4">📈 Performance Trends</h3>
      
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-purple-200 text-xs sm:text-sm">K/D Ratio</span>
          <div className="flex items-center space-x-2">
            <span className={getTrendColor(trends.kdTrend)}>
              {getTrendIcon(trends.kdTrend)}
            </span>
            <span className="text-white text-xs sm:text-sm">{trends.kdTrend}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-purple-200 text-xs sm:text-sm">Win Rate</span>
          <div className="flex items-center space-x-2">
            <span className={getTrendColor(trends.winRateTrend)}>
              {getTrendIcon(trends.winRateTrend)}
            </span>
            <span className="text-white text-xs sm:text-sm">{trends.winRateTrend}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-purple-200 text-xs sm:text-sm">Damage Output</span>
          <div className="flex items-center space-x-2">
            <span className={getTrendColor(trends.damageTrend)}>
              {getTrendIcon(trends.damageTrend)}
            </span>
            <span className="text-white text-xs sm:text-sm">{trends.damageTrend}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-purple-800 rounded-lg">
        <div className="text-center">
          <span className="text-purple-200 text-xs sm:text-sm">Overall Performance: </span>
          <span className={`font-bold text-xs sm:text-sm ${getTrendColor(trends.recentPerformance)}`}>
            {trends.recentPerformance}
          </span>
        </div>
      </div>
    </div>
  );
};

const DataQualityCard = ({ dataQuality, gameInfo, steamId }) => {
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  const getQualityColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getQualityLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 50) return 'Good';
    if (score >= 25) return 'Fair';
    return 'Poor';
  };

  const generateGSIConfig = () => {
    // GSI needs to send data directly to backend, not through frontend proxy
    // In development: backend is on port 3000
    // In production: backend should be on the same domain
    const isLocalDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const backendUrl = isLocalDev 
      ? 'http://localhost:3000' 
      : window.location.origin;
    
    return `"Steam Vault CS2 Integration"
{
    "uri"          "${backendUrl}/api/cs2/gsi/${steamId}"
    "timeout"      "5.0"
    "buffer"       "0.1"
    "throttle"     "0.1"
    "heartbeat"    "30.0"
    "auth"
    {
        "steamid" "${steamId}"
    }
    "output"
    {
        "precision_time" "3"
        "precision_position" "1"
        "precision_vector" "3"
    }
    "data"
    {
        "provider"            "1"
        "map"                 "1"
        "round"               "1"
        "player"              "1"
        "allplayers"          "1"
        "bomb"                "1"
        "phase_countdowns"    "1"
        "allgrenades"         "1"
        "weapons"             "1"
    }
}`;
  };

  const downloadGSIConfig = () => {
    const config = generateGSIConfig();
    const blob = new Blob([config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gamestate_integration_steamvault.cfg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyConfigToClipboard = async () => {
    const config = generateGSIConfig();
    try {
      await navigator.clipboard.writeText(config);
      // You could add a toast notification here
      console.log('GSI config copied to clipboard');
    } catch (err) {
      console.error('Failed to copy config to clipboard:', err);
      // Fallback: select the text in the modal
    }
  };

  // Extract the score and details from the nested structure
  const score = dataQuality?.dataCompleteness?.score || 0;
  const details = dataQuality?.dataCompleteness?.details || {};
  const recommendation = dataQuality?.dataCompleteness?.recommendation || 'No recommendation available';

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-gray-700">
      <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 sm:mb-4">📊 Data Quality & Sources</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-300 text-sm sm:text-base">Data Completeness</span>
            <div className="text-right">
              <span className="text-blue-300 font-bold text-sm sm:text-base">{score}%</span>
              <span className="text-xs sm:text-sm text-gray-400 ml-2">({getQualityLabel(score)})</span>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 sm:h-3 mb-4">
            <div 
              className={`h-2 sm:h-3 rounded-full ${getQualityColor(score)} transition-all duration-300`}
              style={{ width: `${score}%` }}
            ></div>
          </div>
          
          {/* Data Statistics */}
          <div className="grid grid-cols-3 gap-1 sm:gap-2 mb-4">
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-xs sm:text-sm font-bold text-white">{dataQuality?.matchDataCount || 0}</div>
              <div className="text-xs text-gray-400 leading-tight">Matches</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-xs sm:text-sm font-bold text-white">{dataQuality?.mapDataCount || 0}</div>
              <div className="text-xs text-gray-400 leading-tight">Maps</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-2 text-center">
              <div className="text-xs sm:text-sm font-bold text-white">{dataQuality?.weaponDataCount || 0}</div>
              <div className="text-xs text-gray-400 leading-tight">Weapons</div>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-gray-400 mb-4 leading-relaxed">{recommendation}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Available Data Sources</h4>
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                  details.steamApiData ? 'bg-green-400' : 'bg-gray-500'
                }`}></span>
                <span className="text-gray-300 text-xs sm:text-sm">Steam API Statistics</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                details.steamApiData ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
              }`}>
                {details.steamApiData ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                  details.matchHistory ? 'bg-green-400' : 'bg-gray-500'
                }`}></span>
                <span className="text-gray-300 text-xs sm:text-sm">Match History (GSI)</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                details.matchHistory ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
              }`}>
                {details.matchHistory ? 'Active' : 'Setup Required'}
              </span>
            </div>
            
            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                  details.mapStatistics ? 'bg-green-400' : 'bg-gray-500'
                }`}></span>
                <span className="text-gray-300 text-xs sm:text-sm">Map Statistics</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                details.mapStatistics ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
              }`}>
                {details.mapStatistics ? 'Available' : 'Not Available'}
              </span>
            </div>
            
            <div className="flex items-center justify-between bg-gray-700 rounded-lg p-2 sm:p-3">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <span className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${
                  details.weaponStatistics ? 'bg-green-400' : 'bg-gray-500'
                }`}></span>
                <span className="text-gray-300 text-xs sm:text-sm">Weapon Statistics</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${
                details.weaponStatistics ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
              }`}>
                {details.weaponStatistics ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* GSI Setup if needed */}
      {score < 50 && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg border border-blue-700">
          <h4 className="font-semibold text-blue-300 mb-2 text-sm sm:text-base">💡 Improve Data Quality</h4>
          <p className="text-blue-200 text-xs sm:text-sm mb-3 leading-relaxed">
            Set up Game State Integration (GSI) to collect real-time match data and improve your statistics.
          </p>
          <div className="space-y-2">
            <div className="text-xs text-blue-200 bg-blue-800 bg-opacity-50 rounded p-2 leading-relaxed">
              <strong>To set up GSI:</strong><br/>
              1. Navigate to your CS2 game folder<br/>
              2. Create a "gamestate_integration_steamvault.cfg" file in the cfg folder<br/>
              3. Add the GSI configuration provided in our documentation<br/>
              4. Restart CS2 and start playing matches
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <button 
                onClick={downloadGSIConfig}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors shadow-lg"
              >
                📥 Download GSI Config
              </button>
              <button 
                onClick={() => setShowConfigModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors shadow-lg"
              >
                📋 Show Config
              </button>
              <button 
                onClick={() => window.open('https://developer.valvesoftware.com/wiki/Counter-Strike:_Global_Offensive_Game_State_Integration', '_blank')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors shadow-lg"
              >
                📚 View GSI Documentation
              </button>
              <button 
                onClick={() => window.location.reload()}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm transition-colors shadow-lg"
              >
                🔄 Refresh Statistics
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Last Updated */}
      <div className="mt-4 text-center">
        <span className="text-xs text-gray-500">
          Last Updated: {dataQuality?.lastUpdated ? new Date(dataQuality.lastUpdated).toLocaleString() : 'Unknown'}
        </span>
      </div>

      {/* GSI Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg sm:text-xl font-bold text-white">GSI Configuration File</h3>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-gray-400 hover:text-white text-xl sm:text-2xl"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-300 text-xs sm:text-sm mb-2 leading-relaxed">
                Copy this configuration and save it as <code className="bg-gray-700 px-2 py-1 rounded text-blue-300 text-xs">gamestate_integration_steamvault.cfg</code> in your CS2 cfg folder:
              </p>
              <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                📁 Usually located at: <code className="bg-gray-700 px-2 py-1 rounded text-yellow-300 text-xs break-all">Steam/steamapps/common/Counter-Strike Global Offensive/game/csgo/cfg/</code>
              </p>
            </div>

            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-3 sm:p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap font-mono border border-gray-600">
{generateGSIConfig()}
              </pre>
              <button
                onClick={copyConfigToClipboard}
                className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1 rounded text-xs transition-colors"
              >
                📋 Copy
              </button>
            </div>

            <div className="mt-4 bg-blue-900 bg-opacity-50 rounded-lg p-3 border border-blue-700">
              <h4 className="font-semibold text-blue-300 text-sm mb-2">Setup Instructions:</h4>
              <ol className="text-blue-200 text-xs space-y-1 leading-relaxed">
                <li>1. Navigate to your CS2 installation folder</li>
                <li>2. Go to <code className="bg-blue-800 px-1 rounded">game/csgo/cfg/</code> folder</li>
                <li>3. Create a new file called <code className="bg-blue-800 px-1 rounded">gamestate_integration_steamvault.cfg</code></li>
                <li>4. Copy and paste the configuration above into the file</li>
                <li>5. Save the file and restart CS2</li>
                <li>6. Start playing matches to begin collecting data</li>
              </ol>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={downloadGSIConfig}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                📥 Download File
              </button>
              <button
                onClick={() => setShowConfigModal(false)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RecentMatchesCard = ({ matches }) => (
  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg border border-gray-700">
    <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 sm:mb-4">🎯 Recent Matches</h3>
    
    {matches && matches.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-2 text-gray-300 text-xs sm:text-sm">Date</th>
              <th className="text-left py-2 text-gray-300 text-xs sm:text-sm">Map</th>
              <th className="text-left py-2 text-gray-300 text-xs sm:text-sm">Result</th>
              <th className="text-left py-2 text-gray-300 text-xs sm:text-sm">K/D</th>
              <th className="text-left py-2 text-gray-300 text-xs sm:text-sm">Score</th>
              <th className="text-left py-2 text-gray-300 text-xs sm:text-sm">Damage</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((match, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="py-2 text-gray-300 text-xs sm:text-sm">
                  {new Date(match.date).toLocaleDateString()}
                </td>
                <td className="py-2 text-gray-300 text-xs sm:text-sm">{match.map || 'Unknown'}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    match.result === 'win' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                  }`}>
                    {match.result || 'Unknown'}
                  </span>
                </td>
                <td className="py-2 text-gray-300 text-xs sm:text-sm">
                  {match.kills || 0}/{match.deaths || 0}
                </td>
                <td className="py-2 text-gray-300 text-xs sm:text-sm">{match.score || 'N/A'}</td>
                <td className="py-2 text-gray-300 text-xs sm:text-sm">{match.damage || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
        No recent matches found. Play CS2 with GSI enabled to see match history.
      </div>
    )}
  </div>
);

const MapPerformanceCard = ({ maps }) => (
  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
    <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 sm:mb-4">🗺️ Map Performance</h3>
    
    {maps && maps.length > 0 ? (
      <div className="space-y-2 sm:space-y-3">
        {maps.slice(0, 8).map((map, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-2 sm:p-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3">
              <span className="text-blue-300 font-semibold text-sm sm:text-base">{map.mapName}</span>
              <span className="text-gray-400 text-xs sm:text-sm">{map.matchesPlayed} matches</span>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold text-sm sm:text-base">
                {map.wins || 0}W - {(map.matchesPlayed - map.wins) || 0}L
              </div>
              <div className="text-gray-400 text-xs sm:text-sm">
                {map.matchesPlayed > 0 ? `${((map.wins / map.matchesPlayed) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
        No map statistics available. Play more matches to see map performance.
      </div>
    )}
  </div>
);

const WeaponPerformanceCard = ({ weapons }) => (
  <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 sm:p-6 shadow-lg border border-gray-700">
    <h3 className="text-lg sm:text-xl font-bold text-blue-300 mb-3 sm:mb-4">🔫 Weapon Performance</h3>
    
    {weapons && weapons.length > 0 ? (
      <div className="space-y-2 sm:space-y-3">
        {weapons.slice(0, 8).map((weapon, index) => (
          <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-2 sm:p-3">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <span className="text-blue-300 font-semibold text-sm sm:text-base">{weapon.weaponName}</span>
            </div>
            <div className="text-right">
              <div className="text-green-400 font-bold text-sm sm:text-base">{weapon.kills || 0} kills</div>
              <div className="text-gray-400 text-xs sm:text-sm">
                {weapon.headshots || 0} HS ({weapon.headshotPercentage || 0}%)
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="text-center py-6 sm:py-8 text-gray-400 text-sm sm:text-base">
        No weapon statistics available. Play more matches to see weapon performance.
      </div>
    )}
  </div>
);

export default CS2ProfileData;
