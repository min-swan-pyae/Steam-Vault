import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchPlaytimeTrends, fetchSteamProfile } from '../../features/stats/statsSlice';
import { FaLock } from 'react-icons/fa';

const PlaytimeTrends = React.memo(({ steamId }) => {
  const dispatch = useDispatch();
  const { data: trends, status, error } = useSelector((state) => state.stats.playtimeTrends);
  const { data: steamData } = useSelector((state) => state.stats.steamProfile);
  const [lastPlaytime, setLastPlaytime] = useState('Not available');

  useEffect(() => {
    if (steamId) {
      dispatch(fetchPlaytimeTrends(steamId));
      dispatch(fetchSteamProfile(steamId));
    }
  }, [dispatch, steamId]);

  // Format the last played time when steamData changes
  useEffect(() => {
    if (steamData && steamData.last_played_time) {
      // Convert Unix timestamp to readable date
      const lastPlayedDate = new Date(steamData.last_played_time * 1000);
      setLastPlaytime(lastPlayedDate.toLocaleString());
    } else {
      setLastPlaytime('Not available');
    }
  }, [steamData]);

  if (status === 'loading') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="h-48 bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Playtime Trends</h3>
        <p className="text-red-400 flex items-center">
          <FaLock className="mr-2" /> Error loading playtime trends
        </p>
      </div>
    );
  }

  // Process playtime data
  const processPlaytimeData = () => {
    if (!trends || !Array.isArray(trends)) return [];
    
    // Find the time of day data
    const timeOfDayData = trends.find(category => category.category === 'Time of Day');
    if (!timeOfDayData || !timeOfDayData.data) return [];

    // Calculate total games and wins
    const totalGames = timeOfDayData.data.reduce((acc, curr) => acc + (curr.games || 0), 0);
    const totalWins = timeOfDayData.data.reduce((acc, curr) => acc + (curr.win || 0), 0);

    // Estimate average daily playtime (assuming average game duration of 40 minutes)
    const avgGameDuration = 40; // minutes
    const estimatedPlaytime = totalGames * avgGameDuration;
    
    return {
      dailyPlaytime: estimatedPlaytime / 30, // Divide by 30 days
      timeOfDayData: timeOfDayData.data
    };
  };

  const { dailyPlaytime, timeOfDayData } = processPlaytimeData();

  // Use these values for display
  const averagePlaytime = dailyPlaytime || 0;
  const playtimeData = timeOfDayData || [];

  // Format duration to hours and minutes
  const formatDuration = (minutes) => {
    if (!minutes || isNaN(minutes)) return '0h 0m';
    // Steam API returns playtime in minutes
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Playtime Trends</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Average Daily Playtime</p>
          <p className="text-2xl font-bold">{formatDuration(Math.round(averagePlaytime))}</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Last Played</p>
          <p className="text-2xl font-bold">{lastPlaytime}</p>
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Total Dota 2 Playtime</p>
          {steamData?.playtime_forever > 0 ? (
            <p className="text-2xl font-bold">{formatDuration(steamData?.playtime_forever)}</p>
          ) : (
            <div>
              <p className="text-2xl font-bold flex items-center">
                <FaLock className="mr-2 text-yellow-500" /> Not Available
              </p>
              <p className="text-xs text-gray-400">Profile may be private</p>
              <p className="text-xs text-gray-400 mt-1">
                <a 
                  href="https://steamcommunity.com/my/edit/settings" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center"
                >
                  <span className="mr-1">Update privacy settings</span>
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Graph using recharts */}
      <div className="h-64 mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={playtimeData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
            <XAxis 
              dataKey="time_frame" 
              tick={{ fontSize: 12, fill: '#9CA3AF' }} 
              axisLine={{ stroke: '#4B5563' }}
              tickLine={{ stroke: '#4B5563' }}
            />
            <YAxis 
              hide={true}
              domain={[0, 'dataMax']}
            />
            <Tooltip
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #4B5563', 
                  borderRadius: '0.375rem', 
                  color: 'white',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                  padding: '10px'
                }}
                itemStyle={{ color: 'white' }}
                labelStyle={{ color: '#9CA3AF', fontWeight: 'bold', marginBottom: '0.5rem' }}
                formatter={(value, name) => [value, name === 'games' ? 'Games' : 'Win Rate']}
                labelFormatter={(label) => `Time: ${label}`}
                cursor={{ fill: 'transparent' }}
              />
            <Bar 
              dataKey="games" 
              name="Games" 
              fill="#3B82F6" 
              radius={[4, 4, 0, 0]}
              animationDuration={1500}
              activeBar={{
                fill: 'url(#colorGradient)',
                stroke: '#60A5FA',
                strokeWidth: 2,
                filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.7))'
              }}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.steamId === nextProps.steamId);

PlaytimeTrends.displayName = 'PlaytimeTrends';

export default PlaytimeTrends;