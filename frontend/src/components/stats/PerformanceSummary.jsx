import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlayerPerformanceSummary,fetchSteamProfile } from '../../features/stats/statsSlice';
import { formatPercent } from '../../utils/formatters';
import { FaArrowUp, FaArrowDown, FaEquals, FaChartLine, FaUsers, FaGamepad } from 'react-icons/fa';

const PerformanceSummary = React.memo(({ steamId }) => {
  const dispatch = useDispatch();
  const { data: summary, status, error } = useSelector((state) => state.stats.performanceSummary);
  const { data: steamData } = useSelector((state) => state.stats.steamProfile);
  

  useEffect(() => {
    if (steamId) {
      dispatch(fetchSteamProfile(steamId));
      dispatch(fetchPlayerPerformanceSummary(steamId));
      
    }
  }, [dispatch, steamId]);

  if (status === 'loading') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Performance Summary</h3>
        <p className="text-red-400">Error loading performance summary</p>
      </div>
    );
  }

  // Helper function to determine trend icon and color
  const getTrendDisplay = (trend) => {
    if (!trend) return { icon: <FaEquals />, color: 'text-gray-400' };
    
    if (trend > 0) {
      return { icon: <FaArrowUp />, color: 'text-green-400' };
    } else if (trend < 0) {
      return { icon: <FaArrowDown />, color: 'text-red-400' };
    } else {
      return { icon: <FaEquals />, color: 'text-gray-400' };
    }
  };

  // Helper function to format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return formatPercent(value * 100);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6">
      <h3 className="text-xl font-semibold mb-4">Performance Summary</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Overall Stats */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-2">
            <FaGamepad className="text-blue-400 mr-2 text-sm sm:text-base" />
            <h4 className="text-base sm:text-lg font-medium">Overall Stats</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Win Rate:</span>
              <span className="font-bold">{steamData?.win_rate || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Average KDA:</span>
              <span className="font-bold">
                {steamData?.average_kda+"%"|| 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Total Matches:</span>
              <span className="font-bold">{steamData?.match_count || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Recent Performance */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-2">
            <FaChartLine className="text-green-400 mr-2 text-sm sm:text-base" />
            <h4 className="text-base sm:text-lg font-medium">Recent 1000 games Performance</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm sm:text-base">
              <span className="text-gray-400">Recent Win Rate:</span>
              <span className="font-bold">
                {summary?.recent_performance?.recent_win_rate ? `${summary.recent_performance.recent_win_rate}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm sm:text-base">
              <span className="text-gray-400">Recent KDA:</span>
              <span className="font-bold">
                {summary?.recent_performance?.avg_kda+"%" || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm sm:text-base">
              <span className="text-gray-400">Impact:</span>
              <span className="font-bold text-right">
                {summary?.match_impact?.average_impact_score ? 
                  (() => {
                    const score = summary.match_impact.average_impact_score;
                    const rating = score < 0.5 ? 'Low' :
                                 score <= 1.5 ? 'Average' :
                                 score <= 2.5 ? 'High' : 'Very High';
                    return `${rating} (${score.toFixed(1)})`;
                  })() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Match Impact */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-2">
            <FaUsers className="text-purple-400 mr-2 text-sm sm:text-base" />
            <h4 className="text-base sm:text-lg font-medium">Match Impact</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Impact Score:</span>
              <span className="font-bold">
                {summary?.match_impact?.average_impact_score?.toFixed(1) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Team Contribution:</span>
              <span className="font-bold">
                {summary?.match_impact?.team_contribution ? 
                  `${summary.match_impact.team_contribution}%` : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Consistency:</span>
              <span className="font-bold truncate ml-2">
                {summary?.match_impact?.consistency_rating || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Performance */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-2">
            <FaGamepad className="text-yellow-400 mr-2 text-sm sm:text-base" />
            <h4 className="text-base sm:text-lg font-medium">Best Hero Performance</h4>
          </div>
          <div className="space-y-2">
            {summary?.hero_performance?.best_heroes?.length > 0 ? (
              <>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Best Hero:</span>
                  <span className="font-bold truncate ml-2">{summary.hero_performance.best_heroes[0].hero_name}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="font-bold">{summary.hero_performance.best_heroes[0].win_rate}%</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Games:</span>
                  <span className="font-bold">{summary.hero_performance.best_heroes[0].games}</span>
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm sm:text-base">No hero data available</div>
            )}
          </div>
        </div>
        {/* Worst Hero Performance */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-2">
            <FaGamepad className="text-yellow-400 mr-2 text-sm sm:text-base" />
            <h4 className="text-base sm:text-lg font-medium">Worst Hero Performance</h4>
          </div>
          <div className="space-y-2">
            {summary?.hero_performance?.best_heroes?.length > 0 ? (
              <>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Worst Hero:</span>
                  <span className="font-bold truncate ml-2">{summary.hero_performance.worst_heroes[0].hero_name}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Win Rate:</span>
                  <span className="font-bold">{summary.hero_performance.worst_heroes[0].win_rate}%</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Games:</span>
                  <span className="font-bold">{summary.hero_performance.worst_heroes[0].games}</span>
                </div>
              </>
            ) : (
              <div className="text-gray-400 text-sm sm:text-base">No hero data available</div>
            )}
          </div>
        </div>

        {/* Progression */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4">
          <div className="flex items-center mb-2">
            <FaChartLine className="text-red-400 mr-2 text-sm sm:text-base" />
            <h4 className="text-base sm:text-lg font-medium">Progression</h4>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">MMR Trend:</span>
              <span className="font-bold truncate ml-2">
                {summary?.progression?.mmr_trend || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Skill Development:</span>
              <span className="font-bold truncate ml-2">
                {summary?.progression?.skill_development || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm sm:text-base">
              <span className="text-gray-400">Performance:</span>
              <span className="font-bold truncate ml-2">
                {summary?.recent_performance?.performance_trend || 'N/A'}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.steamId === nextProps.steamId);

PerformanceSummary.displayName = 'PerformanceSummary';

export default PerformanceSummary;