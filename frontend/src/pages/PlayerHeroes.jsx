import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { dotaService } from '../services/dotaService';
import { heroNameMap } from '../config/heroConfig';
import NotAuthenticated from '../components/NotAuthenticated';
import { HeroImage } from '../components/HeroImage';
import PageLoader from '../components/ui/PageLoader';
import PageError from '../components/ui/PageError';

export default function PlayerHeroes() {
  const { user } = useSelector((state) => state.auth);
  const { steamId } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('games');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const heroesPerPage = 24;

  if (!user) {
    return <NotAuthenticated />;
      
  }

  const convertToSteam64 = (id) => {
    if (id && id.length < 16) {
      // This is a 32-bit ID, convert to 64-bit
      return (BigInt(id) + BigInt('76561197960265728')).toString();
    }
    return id;
  };

  useEffect(() => {
    const steam64Id = steamId ? convertToSteam64(steamId) : null;
    
    // If the ID was converted, update the URL
    if (steam64Id && steam64Id !== steamId) {
      window.history.replaceState(null, '', `/dota2/players/${steam64Id}/heroes`);
    }

    const fetchPlayerData = async () => {
      try {
        setIsLoading(true);
        // Use the converted ID for the API call
        const playerStats = await dotaService.getHeroPerformance(steam64Id || steamId);
        
        
        if (playerStats && playerStats.length > 0) {
        }
        
        // The API now returns an array directly
        if (Array.isArray(playerStats) && playerStats.length > 0) {
          setPlayer({ most_played_heroes: playerStats });
        } else {
          console.warn('⚠️ No hero data returned or empty array');
          setPlayer({ most_played_heroes: [] });
        }
      } catch (err) {
        console.error('❌ Error fetching player stats:', err);
        setError('Failed to load player data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    if (steamId) {
      fetchPlayerData();
    }
  }, [steamId]);

  // Get hero name from hero ID using the heroNameMap
  const getHeroName = (heroId) => {
    const heroName = heroNameMap[heroId];
    if (heroName) {
      // Convert snake_case to Title Case
      return heroName
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return `Hero ${heroId}`;
  };

  // Sort heroes based on selected criteria
  const getSortedHeroes = () => {
    if (!player?.most_played_heroes) return [];

    const filteredHeroes = player.most_played_heroes.filter(hero => {
      const heroName = getHeroName(hero.hero_id).toLowerCase();
      return heroName.includes(searchTerm.toLowerCase());
    });

    return filteredHeroes.sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'games':
          valueA = a.games;
          valueB = b.games;
          break;
        case 'winRate':
          valueA = a.games > 0 ? (a.win / a.games) : 0;
          valueB = b.games > 0 ? (b.win / b.games) : 0;
          break;
        case 'lastPlayed':
          valueA = a.last_played;
          valueB = b.last_played;
          break;
        default:
          valueA = a.games;
          valueB = b.games;
      }

      return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });
  };

  // Get current page heroes
  const getCurrentPageHeroes = () => {
    const sortedHeroes = getSortedHeroes();
    const indexOfLastHero = currentPage * heroesPerPage;
    const indexOfFirstHero = indexOfLastHero - heroesPerPage;
    return sortedHeroes.slice(indexOfFirstHero, indexOfLastHero);
  };

  // Change sort criteria
  const handleSortChange = (criteria) => {
    if (sortBy === criteria) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(criteria);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Format date from timestamp
  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  if (isLoading) {
    return <PageLoader message="Loading hero statistics..." />;
  }

  if (error) {
    return <PageError message={error} onRetry={() => window.location.reload()} />;
  }

  const sortedHeroes = getSortedHeroes();
  const currentHeroes = getCurrentPageHeroes();
  const totalPages = Math.ceil(sortedHeroes.length / heroesPerPage);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <button
              type="button"
              onClick={() => navigate(`/dota2/players/${steamId}`)}
              className="text-blue-400 hover:text-blue-300 mb-4 inline-block"
            >
              &larr; Back to Player Profile
            </button>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{player?.most_played_heroes?.[0]?.personaname || 'Player'}'s Heroes</h1>
            <p className="text-gray-400">Total Heroes Played: {player?.most_played_heroes?.length || 0}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 md:p-6 mb-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="w-full lg:w-1/3">
                <input
            type="text"
            placeholder="Search heroes..."
            value={searchTerm}
            onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <SortButton 
                label="Games Played" 
                active={sortBy === 'games'} 
                order={sortBy === 'games' ? sortOrder : null} 
                onClick={() => handleSortChange('games')} 
              />
              <SortButton 
                label="Win Rate" 
                active={sortBy === 'winRate'} 
                order={sortBy === 'winRate' ? sortOrder : null} 
                onClick={() => handleSortChange('winRate')} 
              />
              <SortButton 
                label="Last Played" 
                active={sortBy === 'lastPlayed'} 
                order={sortBy === 'lastPlayed' ? sortOrder : null} 
                onClick={() => handleSortChange('lastPlayed')} 
              />
            </div>
          </div>
        </div>

        {/* Heroes Grid */}
        {player?.most_played_heroes && player.most_played_heroes.length > 0 ? (
          <>
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4 mb-8">
              {currentHeroes.map((hero) => (
                <div key={hero.hero_id} className="bg-gray-700 rounded-lg p-3 md:p-4 hover:bg-gray-600 transition-colors">
                  <div className="flex flex-col items-center">
                    {/* <img
                      src={`/api/dota2/heroes/image/${hero.hero_id}`}
                      alt={getHeroName(hero.hero_id)}
                      className="w-full h-auto aspect-[16/10] object-cover rounded mb-2 md:mb-3"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://steamcdn-a.akamaihd.net/apps/dota2/images/blog/play/dota_hero_default.jpg';
                      }}
                    /> */}
                     <HeroImage
                          heroId={hero.hero_id}
                          alt={hero.hero_name || `Hero ${hero.hero_id}`}
                          className="w-full h-auto aspect-[16/10] object-cover rounded mb-2 md:mb-3 max-w-48 mx-auto"
                        />
                    <div className="text-center w-full">
                      <p className="font-semibold truncate text-sm md:text-base">{getHeroName(hero.hero_id)}</p>
                      <div className="flex justify-between text-xs md:text-sm text-gray-400 mt-1">
                        <span>Total Games:</span>
                        <span className="font-medium">{hero.games}</span>
                      </div>
                      <div className="flex justify-between text-xs md:text-sm mt-1 text-gray-400">
                        <span>Win Rate:</span>
                        <span className={`font-medium ${hero.win_rate >= 50 ? 'text-green-500' : 'text-red-500'}`}>
                          {hero.win_rate}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] md:text-xs mt-2 text-yellow-500">
                        <span>Last Match:</span>
                        <span className="text-right">{hero.last_played?formatDate(hero.last_played):"Unavailable"}</span>
                      </div>
                      {hero.with_games > 0 && (
                        <div className="flex justify-between text-[11px] md:text-xs mt-1 text-green-500">
                          <span>Allied:</span>
                          <span>{hero.with_win}/{hero.with_games}</span>
                        </div>
                      )}
                      {hero.against_games > 0 && (
                        <div className="flex justify-between text-[11px] md:text-xs mt-1 text-red-500">
                          <span>Against:</span>
                          <span>{hero.against_win}/{hero.against_games}</span>
                        </div>
                      )}
                        <Link 
                      to={`/dota2/players/${steamId}/hero/${hero.hero_id}`}
                      key={hero.hero_id} > <button className='text-xs text-blue-400 mt-4'>View Detailed Stats</button></Link>
                     
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mb-8">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-gray-700 rounded-md disabled:opacity-50"
                >
                  &larr;
                </button>
                <span className="text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-gray-700 rounded-md disabled:opacity-50"
                >
                  &rarr;
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-gray-500 py-12 bg-gray-800 rounded-lg">
            No hero data available for this player
          </div>
        )}
      </div>
    </div>
  );
}

function SortButton({ label, active, order, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
    >
      {label} {active && (order === 'desc' ? '↓' : '↑')}
    </button>
  );
}