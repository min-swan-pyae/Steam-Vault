import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { heroAttackType } from '../config/heroConfig';
import { fetchDetailedHeroStats } from '../features/stats/statsSlice';
import { FaChartBar,FaMapSigns, FaChartLine, FaUsers, FaGamepad, FaArrowUp, FaArrowDown, FaStar, FaShieldAlt, FaFistRaised, FaBrain, FaRunning, FaCoins, FaCrosshairs, FaSkullCrossbones, FaPlusSquare, FaPercentage } from 'react-icons/fa'; 
import { motion, AnimatePresence } from 'framer-motion'; // Added AnimatePresence

// Helper component for stat cards
const StatCard = ({ title, value, icon, color = 'blue', unit = '' }) => (
  <motion.div 
    className={`bg-gray-700/50 backdrop-blur-sm p-4 sm:p-5 rounded-xl shadow-lg hover:shadow-gray-600/50 transition-all duration-300 ease-in-out transform hover:-translate-y-1 border border-gray-600/50`}
    whileHover={{ scale: 1.03 }}
  >
    <div className="flex items-center justify-between mb-2">
      <p className={`text-sm font-medium text-gray-300`}>{title}</p>
      {React.createElement(icon, { className: `text-${color}-400 text-2xl` })}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-white">{value}{unit}</p>
  </motion.div>
);

export default function DetailedHeroStats() {
  const dispatch = useDispatch();
  const { steamId, heroId } = useParams();
  const { data: heroStats, status, error } = useSelector((state) => state.stats.detailedHeroStats);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    if (steamId && heroId) {
      dispatch(fetchDetailedHeroStats({ steamId, heroId }));
    }
  }, [dispatch, steamId, heroId]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-t-transparent border-blue-500 rounded-full mx-auto mb-4"
          ></motion.div>
          <p className="text-xl text-gray-300 font-semibold">Loading Hero Insights...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-pink-900 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/70 backdrop-blur-md rounded-xl p-8 text-center max-w-lg shadow-2xl border border-red-500/50"
        >
          <FaSkullCrossbones className="text-red-400 text-5xl mx-auto mb-6" />
          <h3 className="text-3xl font-bold text-white mb-3">Oops! Something Went Wrong</h3>
          <p className="text-gray-300 mb-8">We couldn't fetch the hero statistics. Please try again.</p>
          <p className="text-sm text-gray-500 mb-6">Error: {error}</p>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => dispatch(fetchDetailedHeroStats({ steamId, heroId }))}
            className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg"
          >
            Retry
          </motion.button>
        </motion.div>
      </div>
    );
  }

  if (!heroStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gray-800/70 backdrop-blur-md rounded-xl p-8 text-center max-w-lg shadow-2xl border border-gray-700/50"
        >
          <FaUsers className="text-gray-500 text-5xl mx-auto mb-6" />
          <h3 className="text-3xl font-bold text-white mb-3">No Data Found</h3>
          <p className="text-gray-300">It seems there are no statistics available for this hero.</p>
        </motion.div>
      </div>
    );
  }

  const formatPercentage = (value) => {
    if (value === undefined || value === null || typeof value !== 'number' || isNaN(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  const tabContentVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.3, ease: "easeIn" } }
  };

  const getFullPrimaryAttribute = (primaryAttr) => {
    switch (primaryAttr) {
      case 'str':
        return 'Strength';
      case 'agi':
        return 'Agility';
      case 'int':
        return 'Intelligence';
      case 'all':
        return 'Universal';
      default:
        return primaryAttr;
    }
  }
  const overviewStats = [
    { title: 'Analyzed Matches', value: heroStats.analyzed_matches_count || 0, icon: FaGamepad, color: 'blue' },
    { title: 'Wins (Analyzed)', value: heroStats.wins_in_analyzed_set || 0, icon: FaArrowUp, color: 'green' },
    { title: 'Losses (Analyzed)', value: heroStats.losses_in_analyzed_set || 0, icon: FaArrowDown, color: 'red' },
    { title: 'Win Rate (Analyzed)', value: formatPercentage(heroStats.win_rate_in_analyzed_set), icon: FaPercentage, color: 'yellow', unit: '' },
    { title: 'Avg Kills', value: heroStats.averages?.kills, icon: FaFistRaised, color: 'red' },
    { title: 'Avg Deaths', value: heroStats.averages?.deaths, icon: FaSkullCrossbones, color: 'gray' },
    { title: 'Avg Assists', value: heroStats.averages?.assists, icon: FaPlusSquare, color: 'teal' },
    { title: 'Avg GPM', value: heroStats.averages?.gpm, icon: FaCoins, color: 'yellow' },
    { title: 'Avg XPM', value: heroStats.averages?.xpm, icon: FaRunning, color: 'purple' },
  ];

  return (
    
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Header */} 
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700/50"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Placeholder for hero image - replace with actual image if available */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden shadow-lg ring-2 ring-purple-500/50 flex-shrink-0">
                <img 
                  src={`/api/dota2/heroes/image/${heroStats.hero_id}`}
                  alt={`${heroStats.hero_name} avatar`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                {console.log('heroStats:', JSON.stringify(heroStats, null, 2))}
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">{heroStats.hero_name || 'Hero Name'}</h1>
                <p className="text-gray-400 text-sm sm:text-base">Attack Type - {heroAttackType[heroId].attackType}</p>
                <p className="text-gray-400 text-sm sm:text-base">Primary Attribute - {heroAttackType[heroId].primaryAttribute}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 mt-4 sm:mt-0">
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">Total Matches</p>
                <p className="text-2xl sm:text-3xl font-bold text-white">{heroStats.total_matches_overall || 0}</p>
              </div>
              <div className="text-center">
                <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-wider">Overall Win Rate</p>
                <p className={`text-2xl sm:text-3xl font-bold ${heroStats.total_win_rate_overall >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatPercentage(heroStats.total_win_rate_overall)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */} 
        <div className="bg-gray-800/60 backdrop-blur-md rounded-xl p-2 shadow-xl sticky top-4 z-10 border border-gray-700/50">
          <div className="flex flex-wrap justify-center sm:justify-start gap-2">
            {['overview', 'items', 'matchups', 'recent'].map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`
                  flex-1 sm:flex-none px-4 py-2.5 rounded-lg font-medium text-sm sm:text-base transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/70
                  ${selectedTab === tab 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                    : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'
                  }
                `}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab Content */} 
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedTab} 
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="bg-gray-800/60 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-2xl border border-gray-700/50 min-h-[400px]"
          >
            {selectedTab === 'overview' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-semibold text-white mb-6 border-b-2 border-blue-500/50 pb-2">Performance Overview (Last {heroStats.analyzed_matches_count || 0} Matches)</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
                  {overviewStats.map(stat => <StatCard key={stat.title} {...stat} />)}
                </div>

                {/* Example of a more detailed section - adapt for other data like lane preference, etc. */}
                {(heroStats.lane_preference && Object.keys(heroStats.lane_preference).length > 0) && (
                  <div className="bg-gray-700/50 p-6 rounded-xl shadow-lg border border-gray-600/50">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                      <FaMapSigns className="mr-3 text-green-400" /> Lane Preferences
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(heroStats.lane_preference)
                        .sort(([,a],[,b]) => b.games - a.games) // Sort by number of games
                        .map(([lane, laneData]) => (
                        <div key={lane} className="flex justify-between items-center text-gray-300 py-1">
                          <span className="capitalize">{lane.replace('_', ' ')}</span>
                          <div>
                            <span className="font-semibold text-white bg-gray-600 px-2 py-0.5 rounded-md mr-2">{laneData.games} games</span>
                            <span className="font-semibold text-white bg-opacity-50 bg-blue-500 px-2 py-0.5 rounded-md">{formatPercentage(laneData.win_rate)} WR</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {selectedTab === 'items' && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6 border-b-2 border-blue-500/50 pb-2">Item Analysis</h2>
                {heroStats.item_usage && Object.keys(heroStats.item_usage).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(heroStats.item_usage).sort(([,a],[,b]) => b.count - a.count).slice(0, 12).map(([itemName, itemData]) => (
                      <motion.div 
                        key={itemName} 
                        className="bg-gray-700/50 p-4 rounded-xl shadow-lg border border-gray-600/50 flex items-center space-x-4 hover:bg-gray-700 transition-colors duration-200"
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.random() * 0.5 }}
                      >
                        {/* Placeholder for item image */}
                        <div className="w-12 h-12 bg-gray-600 rounded-md flex items-center justify-center text-gray-400 text-xs">
                          IMG
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white capitalize">{itemName.replace(/item_/g, '').replace(/_/g, ' ')}</h4>
                          <p className="text-sm text-gray-400">Picked: {itemData.count} times</p>
                          <p className={`text-sm ${itemData.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>Win Rate: {formatPercentage(itemData.win_rate)}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : <p className="text-gray-400">No item usage data available for the analyzed matches.</p>}
              </div>
            )}

            {selectedTab === 'matchups' && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6 border-b-2 border-blue-500/50 pb-2">Matchup Analysis</h2>
                {heroStats.matchups && (heroStats.matchups.with.length > 0 || heroStats.matchups.against.length > 0) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="text-xl font-semibold text-green-400 mb-4 flex items-center"><FaUsers className="mr-2" /> Strong With</h3>
                      {heroStats.matchups.with.length > 0 ? heroStats.matchups.with.slice(0,5).map(ally => {
                        const gamesPlayed = typeof ally.games_played === 'object' && ally.games_played !== null ? ally.games_played.games : ally.games_played;
                        const wins = ally.wins;
                        const winRate = (gamesPlayed > 0 && typeof wins === 'number') ? (wins / gamesPlayed) * 100 : 0;
                        return (
                          <div key={ally.hero_id} className="bg-gray-700/50 p-3 rounded-lg mb-3 shadow-md border border-gray-600/50">
                            <p className="font-medium text-white">{ally.hero_name || `Hero ID: ${ally.hero_id}`}</p>
                            <p className="text-sm text-gray-300">Games: {gamesPlayed !== undefined ? gamesPlayed : 'N/A'}, Wins: {wins !== undefined ? wins : 'N/A'}</p>
                            <p className={`text-sm font-semibold ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>Win Rate: {formatPercentage(winRate)}</p>
                          </div>
                        );
                      }) : <p className="text-gray-400">No significant ally data.</p>}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-red-400 mb-4 flex items-center"><FaShieldAlt className="mr-2" /> Strong Against</h3>
                      {heroStats.matchups.against.length > 0 ? heroStats.matchups.against.slice(0,5).map(enemy => {
                        const gamesPlayed = typeof enemy.games_played === 'object' && enemy.games_played !== null ? enemy.games_played.games : enemy.games_played;
                        // For enemies, 'wins' means games the player won against this enemy hero.
                        const winsAgainstEnemy = enemy.wins; 
                        const winRateAgainstEnemy = (gamesPlayed > 0 && typeof winsAgainstEnemy === 'number') ? (winsAgainstEnemy / gamesPlayed) * 100 : 0;
                        return (
                          <div key={enemy.hero_id} className="bg-gray-700/50 p-3 rounded-lg mb-3 shadow-md border border-gray-600/50">
                            <p className="font-medium text-white">{enemy.hero_name || `Hero ID: ${enemy.hero_id}`}</p>
                            <p className="text-sm text-gray-300">Games: {gamesPlayed !== undefined ? gamesPlayed : 'N/A'}, Wins (Player): {winsAgainstEnemy !== undefined ? winsAgainstEnemy : 'N/A'}</p>
                            <p className={`text-sm font-semibold ${winRateAgainstEnemy >= 50 ? 'text-green-400' : 'text-red-400'}`}>Player Win Rate: {formatPercentage(winRateAgainstEnemy)}</p>
                          </div>
                        );
                      }) : <p className="text-gray-400">No significant enemy data.</p>}
                    </div>
                  </div>
                ) : <p className="text-gray-400">No matchup data available for the analyzed matches.</p>}
              </div>
            )}

            {selectedTab === 'recent' && (
              <div>
                <h2 className="text-2xl font-semibold text-white mb-6 border-b-2 border-blue-500/50 pb-2">Recent Matches</h2>
                {heroStats.recent_matches && heroStats.recent_matches.length > 0 ? (
                  <div className="space-y-4">
                    {heroStats.recent_matches.map(match => (
                      <motion.div 
                        key={match.match_id} 
                        className={`p-4 rounded-lg shadow-lg border ${match.won ? 'border-green-500/50 bg-green-800/20' : 'border-red-500/50 bg-red-800/20'} hover:shadow-green-500/20 transition-all duration-200`}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.random() * 0.3 }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <div>
                            <p className={`text-lg font-semibold ${match.won ? 'text-green-300' : 'text-red-300'}`}>
                              {match.won ? 'Victory' : 'Defeat'}
                            </p>
                            <p className="text-xs text-gray-400">Match ID: {match.match_id} | Duration: {Math.floor(match.duration / 60)}m {match.duration % 60}s |
                        Date: {match.start_time 
                          ? new Date(match.start_time * 1000).toLocaleDateString() 
                          : 'Unknown date'}
                      </p>
                          </div>
                          <div className="mt-2 sm:mt-0 text-sm text-gray-300 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                            <span>K/D/A: {match.kills}/{match.deaths}/{match.assists}</span>
                            <span>GPM: {match.gpm}</span>
                            <span>XPM: {match.xpm}</span>
                            <span>Lane: {match.lane_role || 'N/A'}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : <p className="text-gray-400">No recent match details available for the analyzed set.</p>}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}