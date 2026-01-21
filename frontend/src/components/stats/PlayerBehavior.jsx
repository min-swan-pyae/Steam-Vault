import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBehaviorMetrics } from '../../features/stats/statsSlice';

const PlayerBehavior = React.memo(({ steamId }) => {
  const dispatch = useDispatch();
  const { data: metrics, status, error } = useSelector((state) => state.stats.behaviorMetrics);

  useEffect(() => {
    if (steamId) {
      dispatch(fetchBehaviorMetrics(steamId));
    }
  }, [dispatch, steamId]);

  if (status === 'loading') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Player Behavior</h3>
        <p className="text-red-400">Error loading behavior metrics</p>
      </div>
    );
  }

  const getBehaviorScoreColor = (score) => {
    if (score >= 9000) return 'text-green-400';
    if (score >= 7500) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Player Behavior</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Behavior Score</p>
          <p className={`text-2xl font-bold ${getBehaviorScoreColor(metrics?.behavior_score)}`}>
            {console.log(`METRIC--- ${JSON.stringify(metrics)}`)}
            {metrics?.behavior_score?.toLocaleString() || 'N/A'}
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Commends</p>
          <p className="text-2xl font-bold text-green-400">
            {metrics?.commends?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Reports</p>
          <p className="text-2xl font-bold text-red-400">
            {metrics?.reports?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="bg-gray-700 rounded-lg p-4">
          <p className="text-gray-400 text-sm">Abandons</p>
          <p className="text-2xl font-bold text-yellow-400">
            {metrics?.abandons?.toLocaleString() || '0'}
          </p>
        </div>
      </div>

      {metrics?.behavior_score && (
        <div className="mt-6">
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-white bg-gray-700">
                  Behavior Score Status
                </span>
              </div>
            </div>
            <div className="flex h-2 mb-4 overflow-hidden bg-gray-700 rounded">
              <div
                style={{ width: `${(metrics.behavior_score / 10000) * 100}%` }}
                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                  metrics.behavior_score >= 9000 ? 'bg-green-500' : 
                  metrics.behavior_score >= 7500 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
              ></div>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            {metrics.behavior_score >= 9000 && 'Excellent behavior! Keep it up!'}
            {metrics.behavior_score >= 7500 && metrics.behavior_score < 9000 && 'Good standing, but room for improvement.'}
            {metrics.behavior_score < 7500 && 'Consider improving your behavior to avoid matchmaking restrictions.'}
          </p>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.steamId === nextProps.steamId);

PlayerBehavior.displayName = 'PlayerBehavior';

export default PlayerBehavior;