import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchHeroStats } from '../../features/stats/statsSlice';
import { heroNameMap } from '../../config/heroConfig';

const HeroPerformance = React.memo(({ steamId }) => {
  const dispatch = useDispatch();
  const { data: heroStats, status, error } = useSelector((state) => state.stats.heroStats);

  useEffect(() => {
    if (steamId) {
      dispatch(fetchHeroStats(steamId));
    }
  }, [dispatch, steamId]);

  if (status === 'loading') {
    return (
      <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Hero Performance</h3>
        <p className="text-red-400">Error loading hero statistics</p>
      </div>
    );
  }

  const topHeroes = heroStats.slice(0, 6);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Hero Performance</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topHeroes.map((hero) => {
          const winRate = hero.games > 0 ? Math.round((hero.win / hero.games) * 100) : 0;
          const heroName = heroNameMap[hero.hero_id] || `Hero ${hero.hero_id}`;
          
          return (
            <div key={hero.hero_id} className="bg-gray-700 rounded-lg p-4 flex items-center space-x-4">
              <img
                src={`/api/dota2/heroes/image/${hero.hero_id}`}
                alt={heroName}
                className="w-20 h-16 rounded"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://steamcdn-a.akamaihd.net/apps/dota2/images/blog/play/dota_hero_default.jpg';
                }}
              />
              <div>
                <h4 className="font-medium">{heroName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</h4>
                <p className="text-sm text-gray-400">Games: {hero.games}</p>
                <p className={`text-sm ${winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  Win Rate: {winRate}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.steamId === nextProps.steamId);

HeroPerformance.displayName = 'HeroPerformance';

export default HeroPerformance;