import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, useNavigate,Link } from 'react-router-dom';
import { dotaService } from '../services/dotaService';
import { heroNameMap } from '../config/heroConfig';
import { HeroImage } from '../components/HeroImage';
import { PlayerSearch } from '../components/PlayerSearch';
import LoadingSpinner from '../components/LoadingSpinner';

export default function PlayerProfile() {
  const { user } = useSelector((state) => state.auth);
  const { steamId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleMatches, setVisibleMatches] = useState(20);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [lastMatchId, setLastMatchId] = useState(null); // Add this state variable to track the last match ID

  const convertToSteam64 = (id) => {
    if (id && id.length < 16) {
      // This is a 32-bit ID, convert to 64-bit
      const steamId64 = (BigInt(id) + BigInt('76561197960265728')).toString();
      // Redirect to the Steam64 URL
      navigate(`/dota2/players/${steamId64}`, { replace: true });
      return steamId64;
    }
    return id;
  };
  
  useEffect(() => {
    setError(null); // Reset error state when steamId changes
    
    if (!steamId || isNaN(Number(steamId))) {
      setError({
        type: 'invalid',
        title: 'Invalid Steam ID',
        message: "Cannot access the user's steam id. This user profile is private or invalid steam id. Please use a valid steam id or dota2 account id."
      });
      setIsLoading(false);
      return;
    }

    convertToSteam64(steamId);

    const fetchPlayerData = async () => {
      try {
        setIsLoading(true);
        setRecentMatches([]);
        setVisibleMatches(10);
        setLastMatchId(null);
        setHasMoreMatches(true);
        
        try {
          const playerStats = await dotaService.getPlayer(steamId);
          setPlayer(playerStats);
          
          // Directly fetch match history using OpenDota API
          try {
            const matchHistory = await dotaService.getMatchHistory(steamId);
            if (Array.isArray(matchHistory) && matchHistory.length > 0) {
              setRecentMatches(matchHistory);
              setVisibleMatches(Math.min(20, matchHistory.length)); // Show 10 initially
              setHasMoreMatches(matchHistory.length >= 100); // Check if we got full 100 matches
              
              // Set the last match ID for pagination
              if (matchHistory.length > 0) {
                setLastMatchId(matchHistory[matchHistory.length - 1].match_id);
              }
            } else {
              console.warn('No matches found in history call');
              setHasMoreMatches(false);
            }
          } catch (matchErr) {
            console.error('Error fetching match history:', matchErr);
            setHasMoreMatches(false);
          }
          
        } catch (playerErr) {
          console.error('Error fetching player stats:', playerErr);
          const status = playerErr?.response?.status;
          const serverMsg = playerErr?.response?.data?.message;
          const errorCode = playerErr?.response?.data?.error;

          if (errorCode === 'NO_DOTA_DATA') {
            setError({
              type: 'no_data',
              title: 'No Public Dota Data',
              message: serverMsg || 'This Steam account has no public Dota 2 matches yet or match data is not shared.'
            });
          } else if (status === 404) {
            setError({
              type: 'not_found',
              title: 'Player Not Found',
              message: serverMsg || 'We could not find a player for that ID. Please verify the number or try searching by vanity URL.'
            });
          } else if (status === 403) {
            setError({
              type: 'private',
              title: 'This player profile is private!',
              message: serverMsg || 'Ask the player to make their Dota profile public or provide match sharing permissions.'
            });
          } else {
            setError({
              type: 'generic',
              title: 'Failed to load player data',
              message: serverMsg || 'Please try again later.'
            });
          }
          return;
        }
      } catch (err) {
        console.error('Error in fetchPlayerData:', err);
        setError({
          type: 'generic',
          title: 'Failed to load player data',
          message: 'Please try again later.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (steamId) {
      fetchPlayerData();
    }
  }, [steamId]);



  // Handle player search
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/dota2/players/${searchQuery.trim()}`);
    }
  };

  if (isLoading) {
    return (
      <LoadingSpinner overlay={true} message="Loading player profile..." />
    );
  }

  if (error) {
    const errorTitle = typeof error === 'string'
      ? 'User Not Found!'
      : error.title || (error.type === 'private' ? 'This player profile is private!' : 'User Not Found!');
    const errorMessage = typeof error === 'string' ? error : error.message;

    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-4">{errorTitle}</h2>
            <p className="text-red-400">{errorMessage}</p>
            <button className='mt-3' onClick={() => {
              window.location.reload();
            }}>Try again</button>
          </div>
          <PlayerSearch 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
            handleSearch={handleSearch} 
          />
        </div>
      </div>
    );
  }

  // Helper function to safely format KDA
  const formatKDA = (kda) => {
    if (kda === "∞") return kda;
    if (!kda || isNaN(Number(kda))) return "0.00";
    return Number(kda).toFixed(2);
  };

  // Helper to format large numbers
  const formatNumber = (num) => {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate('/dota2')}
          className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
        >
          &larr; Back to Dashboard
        </button>

        {/* Search Bar */}
        <PlayerSearch 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          handleSearch={handleSearch} 
        />

        {/* Player Overview */}
        <div className="bg-gray-800 rounded-lg p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center">
            <div className="mb-6 md:mb-0 md:mr-8">
              <img
                src={player?.avatar || 'https://steamcdn-a.akamaihd.net/apps/dota2/images/blog/play/dota_hero_default.jpg'}
                alt={player?.personaname}
                className="w-32 h-32 rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2">{player?.personaname || 'Unknown Player'}</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-400 mb-4">
                <div>
          
                  <div><span className="text-gray-500">Total Matches:</span> {formatNumber(player?.total_matches || player?.match_count || 0)}</div>
                  <div><span className="text-gray-500">Total Wins:</span> {formatNumber(player?.total_wins || player?.win_count || 0)}</div>
                  <div><span className="text-gray-500">Win Rate:</span> {player?.win_rate || '0%'}</div>
                </div>
                <div>
                <div><span className="text-gray-500">MMR:</span> {player?.mmr_estimate || player?.latest_mmr || 'TBD'}</div>
                  <div><span className="text-gray-500">Rank Medal:</span> {player?.rank_medal}</div>
                  <div className="flex space-x-4">
                    <a 
                      href={player?.profile_url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Steam Profile
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <StatCard
            title="Win Rate"
            value={player?.win_rate || '0%'}
            subValue={`${formatNumber(player?.win_count || 0)} wins / ${formatNumber(player?.total_matches || player?.match_count || 0)} games`}
          />
          <StatCard
            title="Most Played Role"
            value={player?.most_played_role?.role || 'Unknown'}
            subValue={`${player?.most_played_role?.games || 0} games`}
          />
          <StatCard
            title="Average KDA"
            value={formatKDA(player?.average_kda)}
            subValue="Kills / Deaths / Assists"
          />
        </div>

        {/* Performance Records */}
        {player?.records && (
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Performance Records in Last 1000 matches.</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 justify-center">
              {player.records.max_kills.value > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm text-gray-400">Most Kills</h3>
                  <p className="text-2xl font-bold">{player.records.max_kills.value}</p>
                </div>
              )}
              {player.records.max_kills.value > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm text-gray-400">Most Deaths</h3>
                  <p className="text-2xl font-bold">{player.records.max_deaths.value}</p>
                </div>
              )}
              {player.records.max_assists.value > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm text-gray-400">Most Assists</h3>
                  <p className="text-2xl font-bold">{player.records.max_assists.value}</p>
                </div>
              )}
              {player.records.max_gpm.value > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm text-gray-400">Highest GPM</h3>
                  <p className="text-2xl font-bold">{player.records.max_gpm.value}</p>
                </div>
              )}
              {player.records.max_hero_damage.value > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-sm text-gray-400">Most Hero Damage</h3>
                  <p className="text-2xl font-bold">{formatNumber(player.records.max_hero_damage.value)}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Most Played Heroes */}
        {player?.most_played_heroes && player.most_played_heroes.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold mb-6">Most Played Heroes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {player.most_played_heroes
                .sort((a, b) => b.games - a.games) // Sort by most played
                .slice(0, 18) // Show top 18 heroes initially
                .map((hero) => {
                  const winRate = hero.games > 0 ? Math.round((hero.win / hero.games) * 100) : 0;
                  return (
                    <div key={hero.hero_id} className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors" >
                      <div className="flex flex-col items-center">
                        <HeroImage
                          heroId={hero.hero_id}
                          alt={hero.hero_name || `Hero ${hero.hero_id}`}
                          className="w-50 h-20 rounded-lg mb-2 object-cover"
                        />
                        <div className="text-center">
                           <p className="font-semibold truncate w-full">
                             {heroNameMap[hero.hero_id] ? 
                               heroNameMap[hero.hero_id]
                                 .split('_')
                                 .map((word, idx) => word.charAt(0).toUpperCase() + word.slice(1))
                                 .join(' ') : 
                               `Hero ${hero.hero_id}`}
                           </p>
                           <p className="text-sm text-gray-400">{hero.games} games</p>
                           <p className={`text-sm ${winRate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                             {winRate}% win rate
                           </p>
                           <p className="text-xs text-gray-500 mt-1">
                             Last played: {new Date(hero.last_played * 1000).toLocaleDateString()}
                           </p>
                        
                         </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            {user ? (  
              <div className="mt-6 text-center">
                <button 
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                  onClick={() => window.open(`/dota2/players/${steamId}/heroes`, '_blank')}
                >
                  View All Heroes
                </button>
              </div>):(
              <div className="mt-6 text-center">
                <button 
                  className="px-4 py-2 bg-gray-600 text-gray-400 rounded-md cursor-not-allowed"
                  disabled
                >
                  Please Login First to View All Heroes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Recent Matches */}
        <div className="bg-gray-800 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-6">Recent Matches</h2>
          {recentMatches.length > 0 ? (
            <div className="space-y-4">
              {recentMatches.slice(0, visibleMatches).map((match) => (
                <Link
                  key={match.match_id}
                  to={`/dota2/match/${match.match_id}`}
                  className="block mb-4"
                >
                <div
                  className="bg-gray-700 p-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4 items-center"
                >
                
                  <div className="col-span-1">
                    <HeroImage heroId={match.hero_id} alt={match.hero_name || `Hero ${match.hero_id}`} className="w-24 h-16 rounded border border-gray-600" />
                  </div>
                  <div className="col-span-1 flex flex-col justify-center">
                    <span className="font-semibold text-lg truncate text-white">{match.hero_name || `Hero ${match.hero_id}`}</span>
                  </div>
                  
                  <div className="col-span-1 flex flex-col justify-center">
                    
                    <span className="text-white text-base">KDA: {match.kills || 0}/{match.deaths || 0}/{match.assists || 0}</span>
                  </div>
                  <div className="col-span-1 flex flex-col justify-center">
                    
                    <span className="text-white text-base">{match.start_time 
                       ? new Date(match.start_time * 1000).toLocaleDateString() 
                       : 'Unknown'}</span>
                  </div>
                  <div className="col-span-1 flex flex-col justify-center">
                   
                    <span className="text-white text-base">{match.game_mode.split(" ")[0]} Mode</span>
                  </div>
                  {match.duration && ( 
                    <div className="col-span-1 flex flex-col justify-center">
                     
                      <span className="text-white text-base">Duration: {Math.floor(match.duration / 60)}:{(match.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                  )}
                  <div className="col-span-1 flex flex-col justify-center">
                    <span className={`text-base md:text-lg font-bold ${match.player_won ? 'text-green-400' : 'text-red-400'}`}>
                      {match.player_won ? 'Victory' : 'Defeat'}
                    </span>
                  </div>
                </div>
                </Link>
              ))}

              {/* Load More Button */}
              {visibleMatches < recentMatches.length && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setVisibleMatches(prev => Math.min(prev + 20, recentMatches.length))}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    Load More Matches
                  </button>
                </div>
              )}

              {/* Show total matches loaded */}
              <div className="text-center text-gray-500 mt-6">
                Showing {Math.min(visibleMatches, recentMatches.length)} of {recentMatches.length} matches
              </div>
            </div>
            )
           : (
            <div className="text-center text-gray-500 py-8">
              No recent matches found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue }) {
  return (
    <div className="bg-gray-700 rounded-lg p-6">
      <h3 className="text-gray-400 text-sm mb-1">{title}</h3>
      <p className="text-3xl font-bold mb-2">{value}</p>
      <p className="text-sm text-gray-400">{subValue}</p>
    </div>
  );
}


