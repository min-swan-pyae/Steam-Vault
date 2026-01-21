import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchEnhancedMetaAnalysis } from '../../features/stats/statsSlice';
import { formatPercent } from '../../utils/formatters';
import { FaChartLine, FaChartBar, FaUsers, FaGamepad, FaSearch, FaFilter } from 'react-icons/fa';

export default function EnhancedMetaAnalysis() {
  const dispatch = useDispatch();
  const { data: metaAnalysis, status, error } = useSelector((state) => state.stats.enhancedMetaAnalysis);
  const [selectedTab, setSelectedTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('pick_rate');

  useEffect(() => {
    dispatch(fetchEnhancedMetaAnalysis());
  }, [dispatch]);

  // Helper function to get hero name by ID
  const getHeroNameById = (heroId) => {
    if (!metaAnalysis || !metaAnalysis.heroes || !Array.isArray(metaAnalysis.heroes)) return `Hero ${heroId}`;
    
    const hero = metaAnalysis.heroes.find(h => h.hero_id === heroId);
    return hero ? hero.hero_name : `Hero ${heroId}`;
  };

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
        <h3 className="text-xl font-semibold mb-4">Enhanced Meta Analysis</h3>
        <p className="text-red-400">Error loading meta analysis</p>
      </div>
    );
  }

  if (!metaAnalysis) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold mb-4">Enhanced Meta Analysis</h3>
        <p className="text-gray-400">No meta analysis data available</p>
      </div>
    );
  }

  // Helper function to format percentage
  const formatPercentage = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return formatPercent(value * 100);
  };

  // Filter and sort heroes based on user selections
  const getFilteredHeroes = () => {
    if (!metaAnalysis.heroes || !Array.isArray(metaAnalysis.heroes)) return [];
    
    return metaAnalysis.heroes
      .filter(hero => {
        const matchesSearch = hero?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || (hero.roles && hero.roles.includes(roleFilter));
        return matchesSearch && matchesRole;
      })
      .sort((a, b) => {
        if (sortBy === 'pick_rate') return b.pick_rate - a.pick_rate;
        if (sortBy === 'win_rate') return b.win_rate - a.win_rate;
        if (sortBy === 'ban_rate') return b.ban_rate - a.ban_rate;
        if (sortBy === 'versatility') return b.versatility - a.versatility;
        return 0;
      });
  };

  const filteredHeroes = getFilteredHeroes();

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold mb-4">Enhanced Meta Analysis</h3>
      
      {/* Meta Overview */}
      <div className="bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center mb-4">
          <FaChartLine className="text-blue-400 mr-2" />
          <h4 className="text-lg font-medium">Current Meta Overview</h4>
        </div>
        <p className="text-gray-300 mb-4">{metaAnalysis.meta_description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Meta Speed</p>
            <p className="text-xl font-bold">{metaAnalysis.meta_speed}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Avg. Match Duration</p>
            <p className="text-xl font-bold">
              {Math.floor(metaAnalysis.avg_match_duration / 60)}:{(metaAnalysis.avg_match_duration % 60).toString().padStart(2, '0')}
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Most Picked Role</p>
            <p className="text-xl font-bold capitalize">{metaAnalysis.most_picked_role}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">Meta Diversity</p>
            <p className="text-xl font-bold">{metaAnalysis.meta_diversity}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-700 mb-6">
        <button
          className={`py-2 px-4 font-medium ${selectedTab === 'overview' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setSelectedTab('overview')}
        >
          Heroes Overview
        </button>
        <button
          className={`py-2 px-4 font-medium ${selectedTab === 'trends' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setSelectedTab('trends')}
        >
          Meta Trends
        </button>
        <button
          className={`py-2 px-4 font-medium ${selectedTab === 'synergies' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setSelectedTab('synergies')}
        >
          Synergies & Counters
        </button>
      </div>

      {/* Heroes Overview Tab */}
      {selectedTab === 'overview' && (
        <div>
          {/* Search and Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search heroes..."
                className="w-full bg-gray-700 rounded-lg py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select
                className="bg-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="carry">Carry</option>
                <option value="mid">Mid</option>
                <option value="offlane">Offlane</option>
                <option value="support">Support</option>
                <option value="hard_support">Hard Support</option>
              </select>
              <select
                className="bg-gray-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="pick_rate">Sort by Pick Rate</option>
                <option value="win_rate">Sort by Win Rate</option>
                <option value="ban_rate">Sort by Ban Rate</option>
                <option value="versatility">Sort by Versatility</option>
              </select>
            </div>
          </div>

          {/* Heroes Grid */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hero</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Roles</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Pick Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Win Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ban Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Versatility</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Meta Position</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredHeroes.map((hero, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 rounded overflow-hidden bg-gray-600">
                          {/* Hero image would go here */}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-white">{hero.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {hero.roles && hero.roles.map((role, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-600 text-gray-300">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {formatPercentage(hero.pick_rate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={hero.win_rate >= 0.5 ? 'text-green-400' : 'text-red-400'}>
                        {formatPercentage(hero.win_rate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {formatPercentage(hero.ban_rate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {hero.versatility?.toFixed(1) || 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${hero.meta_position === 'strong' ? 'bg-green-100 text-green-800' : 
                          hero.meta_position === 'weak' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'}`}>
                        {hero.meta_position}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Meta Trends Tab */}
      {selectedTab === 'trends' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Meta Trends */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <FaChartLine className="text-blue-400 mr-2" />
                <h4 className="text-lg font-medium">Meta Trends</h4>
              </div>
              <div className="space-y-4">
                {metaAnalysis.meta_trends && metaAnalysis.meta_trends.top_picked_heroes && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-1">Top Picked Heroes</h5>
                    <p className="text-gray-400 text-sm">Most popular heroes in the current meta</p>
                    <div className="mt-2 space-y-2">
                      {metaAnalysis.meta_trends.top_picked_heroes.slice(0, 5).map((hero, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-gray-300">#{idx + 1} {getHeroNameById(hero.hero_id)}</span>
                          <span className="text-blue-400">{hero.pick_count} picks</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {metaAnalysis.meta_trends && metaAnalysis.meta_trends.top_banned_heroes && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-1">Top Banned Heroes</h5>
                    <p className="text-gray-400 text-sm">Most banned heroes in the current meta</p>
                    <div className="mt-2 space-y-2">
                      {metaAnalysis.meta_trends.top_banned_heroes.slice(0, 5).map((hero, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-gray-300">#{idx + 1} {getHeroNameById(hero.hero_id)}</span>
                          <span className="text-red-400">{hero.ban_count} bans</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {metaAnalysis.meta_trends && metaAnalysis.meta_trends.role_distribution && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-1">Role Distribution</h5>
                    <p className="text-gray-400 text-sm">Current meta role popularity</p>
                    <div className="mt-2 space-y-2">
                      {metaAnalysis.meta_trends.role_distribution.map((role, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="text-gray-300">{role.role}</span>
                          <div className="flex items-center">
                            <div className="w-24 bg-gray-600 rounded-full h-2 mr-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full" 
                                style={{ width: `${role.percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-400">{role.percentage}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {metaAnalysis.meta_trends && metaAnalysis.meta_trends.meta_diversity && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-1">Meta Diversity</h5>
                    <p className="text-gray-400 text-sm">How diverse the current meta is</p>
                    <div className="mt-2 flex items-center">
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${metaAnalysis.meta_trends.meta_diversity}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-sm text-gray-400">{metaAnalysis.meta_trends.meta_diversity}%</span>
                    </div>
                  </div>
                )}
                
                {metaAnalysis.meta_trends && metaAnalysis.meta_trends.meta_speed && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-1">Meta Speed</h5>
                    <p className="text-gray-400 text-sm">{metaAnalysis.meta_trends.meta_speed} paced meta</p>
                  </div>
                )}
                
                {metaAnalysis.meta_trends && metaAnalysis.meta_trends.current_meta_description && (
                  <div className="bg-gray-800 rounded-lg p-3">
                    <h5 className="font-medium text-white mb-1">Meta Description</h5>
                    <p className="text-gray-400 text-sm">{metaAnalysis.meta_trends.current_meta_description}</p>
                  </div>
                )}
                
                {(!metaAnalysis.meta_trends || 
                  (!metaAnalysis.meta_trends.top_picked_heroes && 
                   !metaAnalysis.meta_trends.top_banned_heroes && 
                   !metaAnalysis.meta_trends.role_distribution && 
                   !metaAnalysis.meta_trends.meta_diversity && 
                   !metaAnalysis.meta_trends.meta_speed && 
                   !metaAnalysis.meta_trends.current_meta_description)) && (
                  <p className="text-gray-400">No meta trends data available</p>
                )}
              </div>
            </div>

            {/* Rising and Falling Heroes */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <FaChartBar className="text-green-400 mr-2" />
                <h4 className="text-lg font-medium">Rising & Falling Heroes</h4>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-white">Rising Stars</h5>
                <div className="space-y-2 mb-4">
                  {metaAnalysis.rising_heroes && metaAnalysis.rising_heroes.map((hero, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">{hero.name}</span>
                      <div className="flex items-center">
                        <span className="text-green-400 font-bold">+{formatPercentage(hero.change)}</span>
                      </div>
                    </div>
                  ))}
                  {(!metaAnalysis.rising_heroes || metaAnalysis.rising_heroes.length === 0) && (
                    <p className="text-gray-400">No rising heroes data available</p>
                  )}
                </div>

                <h5 className="font-medium text-white">Falling Stars</h5>
                <div className="space-y-2">
                  {metaAnalysis.falling_heroes && metaAnalysis.falling_heroes.map((hero, index) => (
                    <div key={index} className="flex justify-between items-center">
                      <span className="text-gray-300">{hero.name}</span>
                      <div className="flex items-center">
                        <span className="text-red-400 font-bold">{formatPercentage(hero.change)}</span>
                      </div>
                    </div>
                  ))}
                  {(!metaAnalysis.falling_heroes || metaAnalysis.falling_heroes.length === 0) && (
                    <p className="text-gray-400">No falling heroes data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Synergies & Counters Tab */}
      {selectedTab === 'synergies' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Synergies */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <FaUsers className="text-green-400 mr-2" />
                <h4 className="text-lg font-medium">Top Synergies</h4>
              </div>
              <div className="space-y-3">
                {metaAnalysis.top_synergies && metaAnalysis.top_synergies.map((synergy, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-gray-300">{synergy.hero1}</span>
                        <span className="mx-2 text-gray-500">+</span>
                        <span className="text-gray-300">{synergy.hero2}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-green-400 font-bold">{formatPercentage(synergy.win_rate)}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{synergy.games} games</p>
                  </div>
                ))}
                {(!metaAnalysis.top_synergies || metaAnalysis.top_synergies.length === 0) && (
                  <p className="text-gray-400">No synergies data available</p>
                )}
              </div>
            </div>

            {/* Top Counters */}
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <FaUsers className="text-red-400 mr-2" />
                <h4 className="text-lg font-medium">Top Counters</h4>
              </div>
              <div className="space-y-3">
                {metaAnalysis.top_counters && metaAnalysis.top_counters.map((counter, index) => (
                  <div key={index} className="bg-gray-800 rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <span className="text-gray-300">{counter.hero1}</span>
                        <span className="mx-2 text-gray-500">vs</span>
                        <span className="text-gray-300">{counter.hero2}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-red-400 font-bold">{formatPercentage(counter.win_rate)}</span>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{counter.games} games</p>
                  </div>
                ))}
                {(!metaAnalysis.top_counters || metaAnalysis.top_counters.length === 0) && (
                  <p className="text-gray-400">No counters data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}