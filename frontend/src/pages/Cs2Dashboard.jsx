import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { firebaseDataService } from '../services/firebaseData';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import DemoUploadComponent from '../components/DemoUploadComponent';
import CS2CommunityStats from '../components/CS2CommunityStats';

const STAT_BLOCKS = [
  { label: 'K/D Ratio', key: 'kdRatio', digits: 2 },
  { label: 'Win Rate', key: 'winRate', digits: 2, suffix: '%' },
  { label: 'Headshot %', key: 'headshotPercentage', digits: 2, suffix: '%' },
  { label: 'Total Kills', key: 'totalKills' },
  { label: 'Total Deaths', key: 'totalDeaths' },
  { label: 'Total Matches', key: 'totalMatches' },
];

const StatGrid = ({ stats }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-2">
    {STAT_BLOCKS.map(({ label, key, digits, suffix }) => (
      <div key={key} className="flex flex-col items-center bg-gray-800 rounded-lg p-3 shadow-sm">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-lg font-bold text-primary-300">
          {stats && stats[key] !== undefined && stats[key] !== null
            ? (digits ? Number(stats[key]).toFixed(digits) : stats[key]) + (suffix || '')
            : '--'}
        </span>
      </div>
    ))}
  </div>
);

const TableCard = ({ title, columns, rows, emptyText }) => (
  <div className="bg-gray-800 rounded-xl p-4 mb-6 shadow-lg">
    <h3 className="font-semibold text-lg mb-3">{title}</h3>
    {rows && rows.length ? (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} className="px-2 py-2 font-medium text-left text-gray-400">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ridx) => (
              <tr key={row.id || ridx} className="hover:bg-gray-700 transition">
                {columns.map(col => (
                  <td key={col.key} className="px-2 py-2">{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-gray-400 italic">{emptyText}</div>
    )}
  </div>
);

const Cs2Dashboard = () => {
  
 
  const { user } = useSelector((state) => state.auth);
   const  steamId  = user.steamId || useParams().steamId;
  
  // Use logged in user's Steam ID if available, otherwise use URL param or fallback
  const targetSteamId = steamId || user?.steamId || '76561198111251027';
  
  const [activeTab, setActiveTab] = useState('overview');
  const [playerStats, setPlayerStats] = useState(null);
  const [playerMatches, setPlayerMatches] = useState(null);
  const [playerWeapons, setPlayerWeapons] = useState(null);
  const [playerMaps, setPlayerMaps] = useState(null);
  const [realtimeSubscriptions, setRealtimeSubscriptions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchCs2Data = async () => {
    try {
      setLoading(true);
      
      // Fetch initial data via API (handles caching and Firebase backend)
      const [stats, matches, weapons, maps] = await Promise.all([
        firebaseDataService.getPlayerStats(targetSteamId),
        firebaseDataService.getPlayerMatches(targetSteamId),
        firebaseDataService.getPlayerWeapons(targetSteamId),
        firebaseDataService.getPlayerMaps(targetSteamId)
      ]);

      setPlayerStats(stats);
      setPlayerMatches(matches);
      setPlayerWeapons(weapons);
      setPlayerMaps(maps);

      // Set up real-time subscriptions for live updates
      if (user && user.steamId === targetSteamId) {
        setupRealtimeSubscriptions();
      }
    } catch (err) {
      console.error('Error fetching CS2 data:', err);
      setError('Failed to fetch CS2 data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Clean up existing subscriptions
    realtimeSubscriptions.forEach(unsubscribe => unsubscribe());
    
    const subscriptions = [
      // Subscribe to real-time stats updates
      firebaseDataService.subscribeToPlayerStats(targetSteamId, (stats) => {
        if (stats) {
          setPlayerStats(stats);
        }
      }),
      
      // Subscribe to real-time match updates
      firebaseDataService.subscribeToPlayerMatches(targetSteamId, (matches) => {
        setPlayerMatches(matches);
      }),
      
      // Subscribe to real-time weapon stats
      firebaseDataService.subscribeToWeaponStats(targetSteamId, (weapons) => {
        setPlayerWeapons(weapons);
      }),
      
      // Subscribe to real-time map stats
      firebaseDataService.subscribeToMapStats(targetSteamId, (maps) => {
        setPlayerMaps(maps);
      })
    ];
    
    setRealtimeSubscriptions(subscriptions);
  };

  const handleUploadSuccess = (response) => {
    console.log('Demo upload successful:', response);
    // Real-time subscriptions will automatically update the UI
    // Force refresh as backup
    setRefreshKey(prev => prev + 1);
  };

  useEffect(() => {
    if (targetSteamId) {
      fetchCs2Data();
    }
    
    // Cleanup subscriptions on unmount
    return () => {
      realtimeSubscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [targetSteamId, refreshKey]);

  // Clean up subscriptions when component unmounts
  useEffect(() => {
    return () => {
      realtimeSubscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error)
    return <div className="flex justify-center items-center h-[50vh]"><ErrorMessage message={error} /></div>;

  if (!playerStats || Object.keys(playerStats).length === 0 || playerStats.error) {
    return <div className="flex justify-center items-center h-[50vh]"><ErrorMessage message="No CS2 data found for this player." /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white px-2 sm:px-6 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {playerStats?.personaName || user?.displayName || 'Player'} 
              <span className="text-primary-300"> / CS2</span>
            </h1>
            <div className="text-gray-400 text-sm mt-1">
              Steam ID: <span className="font-mono">{targetSteamId}</span>
              {user && user.steamId === targetSteamId && (
                <span className="ml-2 px-2 py-1 bg-green-600 text-white text-xs rounded">Your Profile</span>
              )}
            </div>
          </div>
          {/* Avatar */}
          {(playerStats?.avatar || user?.avatar) && (
            <img
              src={playerStats?.avatar || user?.avatar}
              alt="Player Avatar"
              className="w-16 h-16 rounded-full border-2 border-primary-400 shadow"
            />
          )}
        </header>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-1 bg-gray-800 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'matches', label: 'Matches', icon: '🎮' },
              { id: 'weapons', label: 'Weapons', icon: '🔫' },
              { id: 'maps', label: 'Maps', icon: '🗺️' },
              { id: 'community', label: 'Community', icon: '👥' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white shadow'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Stat Blocks */}
            <section aria-label="Player Core Stats" className="mb-7">
              <StatGrid stats={playerStats} />
            </section>

            {/* Demo Upload Component - only show for own profile */}
            {user && user.steamId === targetSteamId && (
              <DemoUploadComponent 
                steamId={targetSteamId} 
                onUploadSuccess={handleUploadSuccess}
              />
            )}

            {/* Status indicators */}
            {user && user.steamId === targetSteamId && realtimeSubscriptions.length > 0 && (
              <div className="mb-6 p-3 bg-green-900/30 border border-green-700 rounded-lg">
                <div className="flex items-center text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm">Live stats - Data updates automatically when new demos are processed</span>
                </div>
              </div>
            )}

            {playerStats && !playerStats.isDemo && (
              <div className="mb-6 p-3 bg-yellow-900/30 border border-yellow-700 rounded-lg">
                <div className="flex items-center text-yellow-300">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">
                    {user && user.steamId === targetSteamId 
                      ? "Currently showing sample data. Upload your demo files to see real statistics."
                      : "This player hasn't uploaded any demo files yet. Showing sample data."
                    }
                  </span>
                </div>
              </div>
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TableCard
                title="Recent Matches"
                columns={[
                  { key: 'mapName', header: 'Map' },
                  { key: 'result', header: 'Result' },
                  { key: 'kills', header: 'K' },
                  { key: 'deaths', header: 'D' },
                  { key: 'assists', header: 'A' }
                ]}
                rows={
                  playerMatches ? playerMatches.slice(0, 5).map(item => ({
                    ...item,
                    result: (
                      <span className={item.result === "Win" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                        {item.result}
                      </span>
                    ),
                  })) : []
                }
                emptyText="No recent matches found."
              />
              
              <TableCard
                title="Top Weapons"
                columns={[
                  { key: 'weaponName', header: 'Weapon' },
                  { key: 'kills', header: 'Kills' },
                  { key: 'headshotPercentage', header: 'HS %' }
                ]}
                rows={
                  playerWeapons
                    ? playerWeapons.slice(0, 5).map(w => ({
                      ...w,
                      headshotPercentage: w.headshotPercentage !== undefined
                        ? `${w.headshotPercentage}%` : 'N/A'
                    }))
                    : []
                }
                emptyText="No weapon statistics found."
              />
            </div>
          </>
        )}

        {activeTab === 'matches' && (
          <TableCard
            title="Match History"
            columns={[
              { key: 'matchId', header: 'Match ID' },
              { key: 'mapName', header: 'Map' },
              { key: 'result', header: 'Result' },
              { key: 'kills', header: 'Kills' },
              { key: 'deaths', header: 'Deaths' },
              { key: 'assists', header: 'Assists' },
              { key: 'score', header: 'Score' }
            ]}
            rows={
              playerMatches ? playerMatches.map(item => ({
                ...item,
                result: (
                  <span className={item.result === "Win" ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                    {item.result}
                  </span>
                ),
              })) : []
            }
            emptyText="No matches found."
          />
        )}

        {activeTab === 'weapons' && (
          <TableCard
            title="Weapon Statistics"
            columns={[
              { key: 'weaponName', header: 'Weapon' },
              { key: 'kills', header: 'Kills' },
              { key: 'headshotPercentage', header: 'Headshot %' },
              { key: 'accuracy', header: 'Accuracy' }
            ]}
            rows={
              playerWeapons
                ? playerWeapons.map(w => ({
                  ...w,
                  headshotPercentage: w.headshotPercentage !== undefined
                    ? `${w.headshotPercentage}%` : 'N/A',
                  accuracy: w.accuracy !== undefined
                    ? `${w.accuracy}%` : 'N/A'
                }))
                : []
            }
            emptyText="No weapon statistics found."
          />
        )}

        {activeTab === 'maps' && (
          <TableCard
            title="Map Statistics"
            columns={[
              { key: 'mapName', header: 'Map' },
              { key: 'wins', header: 'Wins' },
              { key: 'losses', header: 'Losses' },
              { key: 'winRate', header: 'Win Rate' },
              { key: 'avgKills', header: 'Avg Kills' },
              { key: 'avgDeaths', header: 'Avg Deaths' }
            ]}
            rows={
              playerMaps
                ? playerMaps.map(map => ({
                  ...map,
                  winRate: map.winRate !== undefined ? `${map.winRate}%` : 'N/A'
                }))
                : []
            }
            emptyText="No map statistics found."
          />
        )}

        {activeTab === 'community' && (
          <CS2CommunityStats />
        )}
      </div>
    </div>
  );
};

export default Cs2Dashboard;