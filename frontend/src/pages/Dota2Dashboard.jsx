import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import SearchBar from '../components/SearchBar';
import { useAuth } from '../context/AuthContext';
import { dotaService } from '../services/dotaService';
import { Link } from 'react-router-dom';
import { HeroImage } from '../components/HeroImage';
import HeroPerformance from '../components/stats/HeroPerformance';
import PlaytimeTrends from '../components/stats/PlaytimeTrends';
import PlayerBehavior from '../components/stats/PlayerBehavior';
import PerformanceSummary from '../components/stats/PerformanceSummary';




export default function Dota2Dashboard() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const [proPlayers, setProPlayers] = useState([]);
  const [isPublicMatchData, setIsPublicMatchData] = useState(false);
  const [metaStats, setMetaStats] = useState([]);
  const [recentMatches, setRecentMatches] = useState([]);
  const [playerStats, setPlayerStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proPlayersError, setProPlayersError] = useState(false);
  const [proPlayersRefreshing, setProPlayersRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [refreshCooldown, setRefreshCooldown] = useState(0);

  // Constants for rate limiting
  const REFRESH_COOLDOWN_MS = 60000; // 60 seconds cooldown

  // Function to fetch pro players data
  const fetchProPlayersData = async () => {
    try {
      setProPlayersError(false);
      const proPlayersResponse = await dotaService.getProPlayersLive();
      // Response is now the data directly (not wrapped in .data)
      const rawData = Array.isArray(proPlayersResponse) ? proPlayersResponse : proPlayersResponse?.data || [];
      // Filter out invalid entries (must have match_id and account_id)
      const validPlayers = rawData.filter(player => player.match_id && player.account_id);
      setProPlayers(validPlayers);
      setIsPublicMatchData(proPlayersResponse?.isPublicMatchData || false);
      return validPlayers;
    } catch (err) {
      console.error('Failed to fetch pro players:', err);
      setProPlayersError(true);
      return [];
    }
  };

  // Handle manual refresh of pro players
  const handleProPlayersRefresh = async () => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTime;
    
    if (timeSinceLastRefresh < REFRESH_COOLDOWN_MS) {
      const remainingTime = Math.ceil((REFRESH_COOLDOWN_MS - timeSinceLastRefresh) / 1000);
      return; // Don't show alert, just disable the button
    }

    setProPlayersRefreshing(true);
    setLastRefreshTime(now);
    
    try {
      const result = await fetchProPlayersData();
      // Optional: Show a brief success message
      if (result && Array.isArray(result) && result.length > 0) {
      }
    } finally {
      setProPlayersRefreshing(false);
      
      // Start cooldown timer
      setRefreshCooldown(REFRESH_COOLDOWN_MS / 1000);
      const interval = setInterval(() => {
        setRefreshCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all data in parallel for better performance
        const promises = [
          fetchProPlayersData(),
          dotaService.getMetaStats().catch(err => {
            console.error('Failed to fetch meta stats:', err);
            return [];
          })
        ];

        // Add user data fetch to parallel promises if logged in
        if (user?.steamId) {
          promises.push(
            dotaService.getPlayer(user.steamId).catch(err => {
              console.error('Failed to fetch user data:', err);
              return null;
            })
          );
        }

        const results = await Promise.all(promises);
        const [proPlayersResponse, metaStatsData, playerData] = results;

        setMetaStats(metaStatsData || []);

        // Process user data if available
        if (playerData) {
          setPlayerStats(playerData);

          // Use recent_matches from player profile (now includes hero_name from backend fix)
          // This is faster than making a separate API call to getMatchHistory
          const processedMatches = playerData?.recent_matches || [];
          const formattedMatches = processedMatches.map(match => ({
            ...match,
            player_won: match.player_won !== undefined ? match.player_won :
              (match.player_slot < 128 ? match.radiant_win : !match.radiant_win),
            duration_formatted: match.duration_formatted ||
              (match.duration ? `${Math.floor(match.duration / 60)}:${(match.duration % 60).toString().padStart(2, '0')}` : '0:00')
          }));
          setRecentMatches(formattedMatches.slice(0, 6));
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, dispatch]);

  

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Error</h2>
            <p className="text-red-400">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0 bg-[url('/images/backgrounds/radiant_dire5.jpg')] opacity-20 bg-cover bg-center bg-no-repeat"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Dota 2 Statistics
            </h1>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
              Track your performance, analyze matches, and improve your gameplay with detailed statistics and insights
            </p>
            <SearchBar />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* User's Quick Stats (if logged in) */}
        {user && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold">Your Quick Stats</h2>
              {playerStats && (
                <Link 
                  to={`/dota2/players/${user.steamId}`}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  View Full Profile
                </Link>
              )}
               {console.log("Player stats : "+JSON.stringify(playerStats))}
            </div>
            
            {/* Performance Summary */}
            <div className="mb-8">
              <PerformanceSummary steamId={user.steamId} />
            </div>
            
            {/* Hero Performance Statistics */}
            <div className="mb-8">
              <HeroPerformance steamId={user.steamId} />
            </div>
            
            {/* Playtime Trends */}
            <div className="mb-8">
              <PlaytimeTrends steamId={user.steamId} />
            </div>
            
            {/* Player Behavior Metrics */}
            <div>
              <PlayerBehavior steamId={user.steamId} />
            </div>
          </div>
        )}

        {/* Featured Players */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-red-400">{isPublicMatchData ? "Live matches" : "Recent Pro Players Matches"}</h2>
              {(proPlayersError || (proPlayers.length === 0 && !isLoading)) && (
                <button
                  onClick={handleProPlayersRefresh}
                  disabled={proPlayersRefreshing || refreshCooldown > 0}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    proPlayersRefreshing || refreshCooldown > 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={
                    refreshCooldown > 0 
                      ? `Wait ${refreshCooldown} seconds before refreshing again` 
                      : proPlayersError 
                        ? 'Retry fetching pro players data' 
                        : 'Refresh to get latest matches'
                  }
                >
                  {proPlayersRefreshing ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Refreshing...
                    </span>
                  ) : refreshCooldown > 0 ? (
                    `Refresh (${refreshCooldown}s)`
                  ) : proPlayersError ? (
                    '↻ Retry'
                  ) : (
                    '↻ Refresh'
                  )}
                </button>
              )}
            </div>
            <div className="space-y-4">
              {proPlayersError && !isLoading && (
                <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-yellow-200 text-sm">
                        Failed to load pro players data. Showing cached or sample data.
                      </span>
                    </div>
                  </div>
                </div>
              )}
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 bg-gray-700 p-4 rounded-lg">
                    <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2 mt-2"></div>
                    </div>
                  </div>
                ))
              ) : (
                proPlayers.slice(0, 6).map((player) => (
                  <Link 
                    key={`${player.match_id}-${player.account_id}`}
                    to={`/dota2/match/${player.match_id}?radiant_team=${encodeURIComponent(player.team_name_radiant || '')}&dire_team=${encodeURIComponent(player.team_name_dire || '')}`}
                    className="flex items-center space-x-4 bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition"
                  >
                    <div className="flex-shrink-0 overflow-hidden ">
                      
                      <HeroImage
                        heroId={player.hero_id}
                        alt={`Hero ${player.hero_id}`}
                        className="w-[80px] h-[80px] object-cover rounded-full"
                      />
                    </div>
                   
                      {isPublicMatchData?(
                        <div>
                          <div className="text-md font-semibold"> {player.name}</div>
                            <div className="text-sm text-gray-400">
                              {player.team}
                            </div>
                        </div>)
                        :(
                        <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            {player.team_name_radiant !== "" && player.team_name_dire !== "" &&  <p className="font-semibold text-lg text-blue-300">{player.team_name_radiant} <span className="text-gray-400">vs</span> {player.team_name_dire}</p>}
                           
                            <p className="text-gray-400 text-sm mt-1">Score: <span className="font-bold text-white">{player.radiant_score}</span> - <span className="font-bold text-white">{player.dire_score}</span></p>
                             <p className="text-gray-400 text-sm">Player: <span className="font-bold text-white">{player.name}</span></p>
                            <p className="text-gray-400 text-sm">Team: <span className='font-bold text-white'>{player.team}</span> </p>
                          </div>
                          <div className="mt-2 sm:mt-0 sm:text-right">
                           
                          </div>
                        </div>
                        )}
                      
                      
                    
                  </Link>
                ))
              )}
              {proPlayers.length === 0 && !proPlayersRefreshing && (
                <div className="text-center text-gray-400 py-8">
                  <div className="mb-2">
                    {proPlayersError 
                      ? "Unable to load live match data" 
                      : "No live matches found at the moment"
                    }
                  </div>
                  <div className="text-sm text-gray-500">
                    {proPlayersError 
                      ? "Please check your connection and try refreshing" 
                      : "Pro players and public matches will appear here when available"
                    }
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4"> Your Recent Matches</h2>
            <div className="space-y-4">
              {isLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center space-x-4 bg-gray-700 p-4 rounded-lg">
                    <div className="w-12 h-12 bg-gray-600 rounded"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-600 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-600 rounded w-1/2 mt-2"></div>
                    </div>
                  </div>
                ))
              ) : user ? (
                recentMatches.length > 0 ? (
                  recentMatches.map((match) => (
                    <Link
                      key={match.match_id}
                      to={`/dota2/match/${match.match_id}`}
                      className="flex items-center space-x-4 bg-gray-700 p-4 rounded-lg hover:bg-gray-600 transition"
                    >
                      <div className="w-12 h-12 flex-shrink-0 overflow-hidden rounded">
                        <HeroImage
                          heroId={match.hero_id}
                          alt={match.hero_name || `Hero ${match.hero_id}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-semibold">
                          {match.hero_name || `Hero ${match.hero_id}`}
                        </div>
                        <div className="text-sm text-gray-400">
                          {match.start_time ? new Date(match.start_time * 1000).toLocaleDateString() : 'Unknown date'} • 
                          <span className={match.player_won ? 'text-green-500' : 'text-red-500'}>
                            {match.player_won ? ' Victory' : ' Defeat'}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center text-gray-400 py-8">
                    <div>No recent matches found.</div> 
                    <Link to={`/dota2/players/${user.steamId}`} className="text-blue-400 hover:underline">
                      View your full profile
                    </Link>
                    <div className="mt-2">
                      <button 
                        onClick={() => window.location.reload()} 
                        className="text-blue-500 hover:text-blue-400 text-sm"
                      >
                        ↻ Reload data
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center text-gray-400 py-8">
                  Login to see your recent matches
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta Stats */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Current Meta in Pro Scene</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 sm:gap-4">
            {isLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-gray-700 p-6 rounded-xl shadow-lg flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-gray-600 rounded-full mx-auto mb-4"></div>
                  <div className="h-5 bg-gray-600 rounded w-4/5 mb-2"></div>
                  <div className="h-4 bg-gray-600 rounded w-1/2"></div>
                </div>
              ))
            ) : (
              metaStats.slice(0, 6).map((hero) => (
                <div key={hero.hero_id} className="bg-gray-700 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-300 ease-in-out flex flex-col items-center text-center">
                  <div className="w-20 h-20 mx-auto mb-4 overflow-hidden rounded-full border-2 border-blue-500 flex-shrink-0">
                    <HeroImage
                      heroId={hero.hero_id}
                      alt={hero.name}
                      className="w-full h-full object-full"
                    />
                  </div>
                  <div className="font-bold text-md text-white truncate mb-2 w-full">{hero.name}</div>
                  <div className='flex flex-col space-y-1 text-sm w-full'>
                    <div className="text-gray-300 flex justify-between items-center">
                      <span className='text-green-400 font-medium'>Pick</span>
                      <span>{hero.pick_count} matches</span>
                    </div>
                    <div className="text-gray-300 flex justify-between items-center">
                      <span className='text-red-400 font-medium'>Ban</span>
                      <span>{hero.ban_count} matches</span>
                    </div>
                    <div className="text-gray-300 flex justify-between items-center">
                      <span className='text-blue-400 font-medium'>Win Rate</span>
                      <span>{hero.win_rate}%</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
        </div>
        
        
      </div>
    </div>
  );
}
