import asyncHandler from '../middleware/asyncHandler.js';
import steamService from "../services/steamService.js"
import { players } from '../data/notablePlayers.js';
import { heroCache } from './playerController.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';

// Cache configuration moved to centralized cache service

// Add response interceptor for error handling
steamService.steamApi.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      console.error('Steam API Error:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    return Promise.reject(error);
  }
);




// Get pro players currently in game
export const getProPlayersLive = asyncHandler(async (req, res) => {
  // Check cache first
  const cacheKey = 'pro_players_live';
  const cached = cacheService.get(CACHE_TYPES.META_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {

    const notablePlayers = players;

    // Get live league games from Steam API
    const liveGamesRes = await steamService.openDotaApi.get('/live');
    
    
    const liveGames = liveGamesRes.data || [];
    console.log('DEBUG - Found', liveGames.length, 'live games');

    // Find pro players in live games
    const proPlayersLive = [];
    const processedMatchIds = new Set();
    const processedPlayerIds = new Set();
    const processedTeamNames = new Set();

    for (const game of liveGames) {
      if (processedMatchIds.size >= 6) break; // Limit to 6 unique matches
      if (processedMatchIds.has(game.match_id)) continue; // Skip if match already processed

      let selectedPlayerForMatch = null;

      // Try to find a pro player first for this match
      for (const player of game.players || []) {
        if (processedPlayerIds.has(player.account_id)) continue; // Skip if player already processed globally
        const proInfo = notablePlayers.find(pro => pro.account_id === player.account_id);
        if (proInfo) {
          // Check if this team has already been processed globally
          if (processedTeamNames.has(proInfo.team_name)) continue;

          selectedPlayerForMatch = {
            account_id: player.account_id,
            name: proInfo.name,
            team_name: proInfo.team_name,
            match_id: game.match_id,
            hero_id: player.hero_id,
            team: player.team === 0 ? 'Radiant' : 'Dire',
            kills: player.kills || 0,
            deaths: player.deaths || 0,
            assists: player.assists || 0,
            last_hits: player.last_hits || 0,
            denies: player.denies || 0,
            gold_per_min: player.gold_per_min || 0,
            xp_per_min: player.xp_per_min || 0,
            level: player.level || 0,
            net_worth: player.net_worth || 0,
            team_name_radiant: game.team_name_radiant,
            team_name_dire: game.team_name_dire,
            radiant_score: game.radiant_score,
            dire_score: game.dire_score
          };
          break; // Found a pro player, use this one for the match and move to next game
        }
      }

      if (selectedPlayerForMatch) {
        proPlayersLive.push(selectedPlayerForMatch);
        processedMatchIds.add(game.match_id);
        processedPlayerIds.add(selectedPlayerForMatch.account_id);
        processedTeamNames.add(selectedPlayerForMatch.team_name); // Add team name to global processed set
      }
    }
    

    // Fallback to public matches if no pro players found
    const publicData = [];
    
    if (proPlayersLive.length === 0 && liveGames.length > 0) {
      console.log('DEBUG - Using regular players from live games as fallback');
      const processedPublicMatchIds = new Set();
      const processedPublicPlayerIds = new Set();

      for (const game of liveGames) {
        if (processedPublicMatchIds.size >= 6) break; // Limit to 6 unique matches
        if (processedPublicMatchIds.has(game.match_id)) continue; // Skip if match already processed

        let selectedPlayerForMatch = null;

        // Find the first available player for this match
        for (const player of game.players || []) {
          if (processedPublicPlayerIds.has(player.account_id)) continue; // Skip if player already processed globally

          try {
            // Get player name from Steam API
            const steamId64 = steamService.getSteamId64(player.account_id);
            const playerName = await steamService.getSteamPersonaName(steamId64);

            selectedPlayerForMatch = {
              account_id: player.account_id || 0,
              name: playerName || `Player ${player.account_id}`,
              team_name: player.team === 0 ? (game.team_name_radiant || 'Radiant') : (game.team_name_dire || 'Dire'),
              match_id: game.match_id,
              hero_id: player.hero_id || 1,
              team: player.team === 0 ? 'Radiant' : 'Dire',
              kills: player.kills || 0,
              deaths: player.deaths || 0,
              assists: player.assists || 0,
              last_hits: player.last_hits || 0,
              denies: player.denies || 0,
              gold_per_min: player.gold_per_min || 0,
              xp_per_min: player.xp_per_min || 0,
              level: player.level || 0,
              net_worth: player.net_worth || 0,
              team_name_radiant: game.team_name_radiant,
              team_name_dire: game.team_name_dire,
              radiant_score: game.radiant_score,
              dire_score: game.dire_score
            };
            break; // Found a player, use this one for the match and move to next game
          } catch (error) {
            console.error('Error fetching player name:', error);
            continue; // Try next player
          }
        }

        if (selectedPlayerForMatch) {
          publicData.push(selectedPlayerForMatch);
          processedPublicMatchIds.add(game.match_id);
          processedPublicPlayerIds.add(selectedPlayerForMatch.account_id);
        }
      }
    }

    // Only use mock data if absolutely no real data is available
    const result = proPlayersLive.length > 0 ? proPlayersLive : 
                 publicData.length > 0 ? publicData : [
      {
        account_id: 73562326,
        name: "Arteezy (Sample)",
        team_name: "Evil Geniuses",
        match_id: 123456789,
        hero_id: 89,
        team: "Radiant",
        kills: 5,
        deaths: 2,
        assists: 8,
        last_hits: 150,
        denies: 10,
        gold_per_min: 450,
        xp_per_min: 520,
        level: 18,
        net_worth: 15000,
        team_name_radiant: "Evil Geniuses",
        team_name_dire: "Team Secret",
        radiant_score: 15,
        dire_score: 8
      },
      {
        account_id: 86745912,
        name: "Miracle- (Sample)",
        team_name: "Nigma Galaxy",
        match_id: 123456790,
        hero_id: 74,
        team: "Dire",
        kills: 8,
        deaths: 1,
        assists: 12,
        last_hits: 200,
        denies: 15,
        gold_per_min: 550,
        xp_per_min: 650,
        level: 20,
        net_worth: 18000,
        team_name_radiant: "OG",
        team_name_dire: "Nigma Galaxy",
        radiant_score: 10,
        dire_score: 20
      }
    ];

    const responseData = {
      data: result,
      isPublicMatchData: proPlayersLive.length === 0 && publicData.length > 0,
      isMockData: proPlayersLive.length === 0 && publicData.length === 0
    };
    
    // Cache with shorter TTL for live data
    cacheService.set(CACHE_TYPES.META_DATA, cacheKey, responseData, 60); // 1 minute cache
    return res.json(responseData);
  } catch (error) {
    console.error('DEBUG - Error fetching pro players from OpenDota API:', error.message);
    if (error.response) {
      console.error('DEBUG - Error response status:', error.response.status);
      console.error('DEBUG - Error response data:', error.response.data);
    }
    
    // Return sample data on error
    const sampleData = [
      {
        account_id: 73562326,
        name: "Arteezy (Sample Data)",
        team_name: "Evil Geniuses",
        match_id: 123456789,
        hero_id: 89,
        team: "Radiant"
      },
      {
        account_id: 86745912,
        name: "Miracle- (Sample Data)",
        team_name: "Team Liquid",
        match_id: 123456789,
        hero_id: 74,
        team: "Dire"
      },
      {
        account_id: 94054712,
        name: "N0tail (Sample Data)",
        team_name: "OG",
        match_id: 123456790,
        hero_id: 66,
        team: "Radiant"
      }
    ];
    
    cacheService.set(CACHE_TYPES.META_DATA, cacheKey, sampleData);
    return res.json(sampleData);
  }
});

// Get current meta statistics
export const getMetaStats = asyncHandler(async (req, res) => {
  // Check cache first
  const cacheKey = 'meta_stats';
  const cached = cacheService.get(CACHE_TYPES.META_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    // OpenDota provides more comprehensive meta statistics
    const heroStatsRes = await steamService.openDotaApi.get('/heroStats');
    const heroStats = heroStatsRes.data || [];

    const metaStats = heroStats.map(hero => ({
      hero_id: hero.id,
      name: hero.localized_name,
      pick_count: hero.pro_pick, // Add pick_count
      ban_count:hero.pro_ban,
      pick_rate: ((hero.pro_pick / (hero.pro_pick + hero.pro_ban)) * 100).toFixed(2),
      win_rate: ((hero.pro_win / hero.pro_pick) * 100).toFixed(2) // Calculate win rate
    }));

    // Determine sorting criteria from query parameter, default to pick_count
    const sortBy = req.query.sortBy;
    if (sortBy === 'winRate') {
      metaStats.sort((a, b) => parseFloat(b.win_rate) - parseFloat(a.win_rate));
    } else { // Default to pick_count
      metaStats.sort((a, b) => b.pick_count - a.pick_count);
    }
    
    cacheService.set(CACHE_TYPES.META_DATA, cacheKey, metaStats);
    res.json(metaStats);
  } catch (error) {
    console.error('Error fetching meta stats:', error.message);
    
    // Return sample data on error
    const sampleHeroes = [
      { hero_id: 74, name: "Invoker", pick_rate: "11.24", win_rate: "49.82" },
      { hero_id: 14, name: "Pudge", pick_rate: "10.36", win_rate: "48.56" },
      { hero_id: 8, name: "Juggernaut", pick_rate: "9.78", win_rate: "51.32" },
      { hero_id: 93, name: "Slark", pick_rate: "8.92", win_rate: "53.17" },
      { hero_id: 44, name: "Phantom Assassin", pick_rate: "8.56", win_rate: "50.23" },
      { hero_id: 11, name: "Shadow Fiend", pick_rate: "7.84", win_rate: "48.76" }
    ];
    
    cacheService.set(CACHE_TYPES.META_DATA, cacheKey, sampleHeroes);
    res.json(sampleHeroes);
  }
});

// Get hero statistics
export const getHeroStats = asyncHandler(async (req, res) => {
  // Check cache first
  const cacheKey = 'hero_stats';
  const cached = cacheService.get(CACHE_TYPES.HERO_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {

    
    // Get hero list from Steam API
    const heroesRes = await steamService.steamApi.get('/IEconDOTA2_570/GetHeroes/v1/', {
      params: { key: apiKey, language: 'english' }
    });
    
    const heroes = heroesRes.data.result?.heroes || [];
    
    // Create hero stats with simulated data
    const heroStats = heroes.map(hero => {
      // Generate random but realistic stats
      const pickRate = (Math.random() * 15 + 1).toFixed(2);
      const winRate = (Math.random() * 25 + 40).toFixed(2);
      const banRate = (Math.random() * 10 + 1).toFixed(2);
      
      return {
        id: hero.id,
        name: hero.localized_name,
        pick_rate: pickRate,
        win_rate: winRate,
        ban_rate: banRate,
         roles: determineHeroRoles(hero),
      };
    });
    
    cacheService.set(CACHE_TYPES.HERO_DATA, cacheKey, heroStats);
    res.json(heroStats);
  } catch (error) {
    console.error('Error fetching hero stats:', error.message);
    
    // Return sample data on error
    const sampleHeroStats = [
      { id: 1, name: "Anti-Mage", pick_rate: "6.78", win_rate: "48.32", ban_rate: "4.21", roles: ["Carry"] },
      { id: 2, name: "Axe", pick_rate: "5.43", win_rate: "52.11", ban_rate: "2.87", roles: ["Offlane", "Initiator"] },
      { id: 3, name: "Bane", pick_rate: "3.21", win_rate: "51.89", ban_rate: "1.12", roles: ["Support", "Disabler"] }
    ];
    
    cacheService.set(CACHE_TYPES.HERO_DATA, cacheKey, sampleHeroStats);
    res.json(sampleHeroStats);
  }
});

/**
 * Get enhanced meta analysis with more detailed statistics
 */
export const getEnhancedMetaAnalysis = asyncHandler(async (req, res) => {
  const cacheKey = 'enhanced_meta_analysis';
  
  // Check cache first
  const cached = heroCache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    // Get hero data for mapping hero IDs to names
    let heroMap = heroCache.get('heroes');
    if (!heroMap) {
      heroMap = await steamService.getHeroes();
      heroCache.set('heroes', heroMap);
    }
    
    // Get current meta stats from OpenDota
    const heroStats = await steamService.openDotaApi.get('/heroStats')
      .then(res => res.data);
    console.log('Fetched heroStats:', heroStats ? `Count: ${heroStats.length}` : 'No data');
    
    // Get pro match data for additional insights
    const proMatches = await steamService.openDotaApi.get('/proMatches', {
      params: { limit: 100 } // Get last 100 pro matches
    }).then(res => res.data);
    console.log('Pro Matches Data:', JSON.stringify(proMatches, null, 2));
    console.log('Fetched proMatches:', proMatches ? `Count: ${proMatches.length}` : 'No data');
    
    // Process hero stats with additional metrics
    const processedStats = heroStats.map(hero => {
      // Find pro match data for this hero
      const proMatchesWithHero = proMatches.filter(match => {
        // Check if hero was picked in this match
        return match.radiant_team?.includes(hero.id) || match.dire_team?.includes(hero.id);
      });
      
      // Calculate pro pick rate
      const proPickRate = proMatchesWithHero.length / proMatches.length * 100;
      
      // Calculate pro win rate
      const proWins = proMatchesWithHero.filter(match => {
        const isRadiant = match.radiant_team?.includes(hero.id);
        return (isRadiant && match.radiant_win) || (!isRadiant && !match.radiant_win);
      }).length;
      
      const proWinRate = proMatchesWithHero.length > 0 ? 
        (proWins / proMatchesWithHero.length * 100) : 0;
      
      // Calculate versatility score (how many different roles/lanes)
      const versatilityScore = calculateVersatilityScore(hero);
      
      // Calculate synergy and counter scores
      const { synergies, counters } = analyzeSynergiesAndCounters(hero, heroStats);
      
      return {
        hero_id: hero.id,
        hero_name: heroMap[hero.id]?.localized_name || 'Unknown Hero',
        public_stats: {
          pick_rate: parseFloat((hero['1_pick'] / hero['1_pick_total'] * 100).toFixed(2)),
          win_rate: parseFloat((hero['1_win'] / hero['1_pick'] * 100).toFixed(2)),
          picks_per_bracket: {
            herald: parseFloat((hero['1_pick'] / hero['1_pick_total'] * 100).toFixed(2)),
            guardian: parseFloat((hero['2_pick'] / hero['2_pick_total'] * 100).toFixed(2)),
            crusader: parseFloat((hero['3_pick'] / hero['3_pick_total'] * 100).toFixed(2)),
            archon: parseFloat((hero['4_pick'] / hero['4_pick_total'] * 100).toFixed(2)),
            legend: parseFloat((hero['5_pick'] / hero['5_pick_total'] * 100).toFixed(2)),
            ancient: parseFloat((hero['6_pick'] / hero['6_pick_total'] * 100).toFixed(2)),
            divine: parseFloat((hero['7_pick'] / hero['7_pick_total'] * 100).toFixed(2)),
            immortal: parseFloat((hero['8_pick'] / hero['8_pick_total'] * 100).toFixed(2))
          },
          wins_per_bracket: {
            herald: parseFloat((hero['1_win'] / hero['1_pick'] * 100).toFixed(2)),
            guardian: parseFloat((hero['2_win'] / hero['2_pick'] * 100).toFixed(2)),
            crusader: parseFloat((hero['3_win'] / hero['3_pick'] * 100).toFixed(2)),
            archon: parseFloat((hero['4_win'] / hero['4_pick'] * 100).toFixed(2)),
            legend: parseFloat((hero['5_win'] / hero['5_pick'] * 100).toFixed(2)),
            ancient: parseFloat((hero['6_win'] / hero['6_pick'] * 100).toFixed(2)),
            divine: parseFloat((hero['7_win'] / hero['7_pick'] * 100).toFixed(2)),
            immortal: parseFloat((hero['8_win'] / hero['8_pick'] * 100).toFixed(2))
          }
        },
        pro_stats: {
          pick_rate: parseFloat(proPickRate.toFixed(2)),
          win_rate: parseFloat(proWinRate.toFixed(2)),
          ban_rate: parseFloat((hero.pro_ban || 0).toFixed(2)),
          recent_performance: proMatchesWithHero.length > 0 ? 'trending' : 'stable'
        },
        versatility: versatilityScore,
        best_synergies: synergies.slice(0, 5),
        best_counters: counters.slice(0, 5),
        roles: determineHeroRoles(hero),
        meta_position: determineMetaPosition(hero, heroStats)
      };
    });
    
    // Calculate overall meta trends
    const metaTrends = analyzeMetaTrends(processedStats, proMatches);
    
    // Build enhanced meta analysis
    const enhancedMeta = {
      heroes: processedStats,
      meta_trends: metaTrends,
      last_updated: new Date().toISOString()
    };
    
    // Cache the result (longer TTL for meta analysis - 6 hours)
    heroCache.set(cacheKey, enhancedMeta, 21600);
    
    console.log('Sending enhancedMeta:', enhancedMeta);
    res.json(enhancedMeta);
  } catch (error) {
    console.error('Error fetching enhanced meta analysis:', error.message);
    if (error.response) {
      console.error('OpenDota API Error Response:', error.response.data);
      console.error('OpenDota API Status:', error.response.status);
    } else if (error.request) {
      console.error('OpenDota API No Response Received:', error.request);
    } else {
      console.error('Error in setting up request:', error.message);
    }
    res.status(500).json({ message: 'Failed to fetch enhanced meta analysis', details: error.message });
  }
});

// Helper functions for enhanced meta analysis
const calculateVersatilityScore = (hero) => {
  // Calculate versatility based on lane presence
  const lanePresence = {
    safe: hero.safe_lane || 0,
    mid: hero.mid_lane || 0,
    off: hero.off_lane || 0,
    jungle: hero.jungle || 0
  };
  
  // Count lanes where hero has significant presence (>10%)
  const significantLanes = Object.values(lanePresence).filter(presence => presence > 0.1).length;
  
  // Scale from 1-5
  return Math.min(5, Math.max(1, significantLanes + 1));
};

const analyzeSynergiesAndCounters = (hero, allHeroes) => {
  // This would ideally use real synergy/counter data from OpenDota or another source
  // For now, we'll use a simplified approach based on win rates and attributes
  
  const synergies = allHeroes
    .filter(otherHero => otherHero.id !== hero.id)
    .map(otherHero => {
      // Calculate synergy score based on complementary attributes
      // This is a simplified example - real synergy would be based on actual match data
      const synergyScore = Math.random() * 10; // Placeholder for actual calculation
      
      return {
        hero_id: otherHero.id,
        synergy_score: parseFloat(synergyScore.toFixed(2))
      };
    })
    .sort((a, b) => b.synergy_score - a.synergy_score);
  
  const counters = allHeroes
    .filter(otherHero => otherHero.id !== hero.id)
    .map(otherHero => {
      // Calculate counter score based on hero advantages
      // This is a simplified example - real counter data would be based on matchup statistics
      const counterScore = Math.random() * 10; // Placeholder for actual calculation
      
      return {
        hero_id: otherHero.id,
        counter_score: parseFloat(counterScore.toFixed(2))
      };
    })
    .sort((a, b) => b.counter_score - a.counter_score);
  
  return { synergies, counters };
};

const determineHeroRoles = (hero) => {
  // Determine roles based on hero attributes and stats
  const roles = [];
  
  // These thresholds are simplified examples
  if ((hero.base_attack_max + hero.base_str_gain) > 100) roles.push('Carry');
  if (hero.base_int > 20) roles.push('Support');
  if (hero.base_armor > 2) roles.push('Offlane');
  if (hero.move_speed > 310) roles.push('Roamer');
  if (hero.base_int > 25 && hero.base_attack_time < 1.8) roles.push('Mid');
  
  // Ensure at least one role
  if (roles.length === 0) roles.push('Flexible');
  
  return roles;
};

const determineMetaPosition = (hero, allHeroes) => {
  // Calculate meta position based on pick rate and win rate
  const pickRate = hero['1_pick'] / hero['1_pick_total'] * 100;
  const winRate = hero['1_win'] / hero['1_pick'] * 100;
  
  // Calculate average pick and win rates
  const avgPickRate = allHeroes.reduce((sum, h) => sum + (h['1_pick'] / h['1_pick_total'] * 100), 0) / allHeroes.length;
  const avgWinRate = allHeroes.reduce((sum, h) => sum + (h['1_win'] / h['1_pick'] * 100), 0) / allHeroes.length;
  
  // Determine meta position
  if (pickRate > avgPickRate * 1.5 && winRate > avgWinRate * 1.1) {
    return 'S-Tier (Meta Defining)';
  } else if (pickRate > avgPickRate * 1.2 && winRate > avgWinRate) {
    return 'A-Tier (Strong)';
  } else if (pickRate > avgPickRate * 0.8 && winRate > avgWinRate * 0.9) {
    return 'B-Tier (Viable)';
  } else if (pickRate < avgPickRate * 0.5 || winRate < avgWinRate * 0.8) {
    return 'D-Tier (Weak)';
  } else {
    return 'C-Tier (Balanced)';
  }
};

const analyzeMetaTrends = (heroStats, proMatches) => {
  // Analyze overall meta trends
  
  // Calculate most picked and banned heroes in pro matches
  const proPicks = {};
  const proBans = {};
  
  proMatches.forEach(match => {
    // Process picks
    if (match.radiant_team) {
      match.radiant_team.split(',').map(Number).forEach(heroId => {
        if (heroId) proPicks[heroId] = (proPicks[heroId] || 0) + 1;
      });
    }
    if (match.dire_team) {
      match.dire_team.split(',').map(Number).forEach(heroId => {
        if (heroId) proPicks[heroId] = (proPicks[heroId] || 0) + 1;
      });
    }

    // Process bans
    if (match.radiant_bans) {
      match.radiant_bans.split(',').map(Number).forEach(heroId => {
        if (heroId) proBans[heroId] = (proBans[heroId] || 0) + 1;
      });
    }
    if (match.dire_bans) {
      match.dire_bans.split(',').map(Number).forEach(heroId => {
        if (heroId) proBans[heroId] = (proBans[heroId] || 0) + 1;
      });
    }
  });
  
  // Calculate role distribution in meta
  const roleDistribution = heroStats.reduce((acc, hero) => {
    hero.roles.forEach(role => {
      acc[role] = (acc[role] || 0) + 1;
    });
    return acc;
  }, {});
  
  // Calculate meta diversity (how many heroes are viable)
  const viableHeroes = heroStats.filter(hero => 
    hero.meta_position === 'S-Tier (Meta Defining)' || 
    hero.meta_position === 'A-Tier (Strong)' || 
    hero.meta_position === 'B-Tier (Viable)'
  ).length;
  
  const metaDiversity = (viableHeroes / heroStats.length) * 100;
  
  return {
    top_picked_heroes: Object.entries(proPicks)
      .map(([heroId, count]) => ({
        hero_id: parseInt(heroId),
        pick_count: count
      }))
      .sort((a, b) => b.pick_count - a.pick_count)
      .slice(0, 10),
    top_banned_heroes: Object.entries(proBans)
      .map(([heroId, count]) => ({
        hero_id: parseInt(heroId),
        ban_count: count
      }))
      .sort((a, b) => b.ban_count - a.ban_count)
      .slice(0, 10),
    role_distribution: Object.entries(roleDistribution)
      .map(([role, count]) => ({
        role,
        hero_count: count,
        percentage: parseFloat(((count / heroStats.length) * 100).toFixed(2))
      })),
    meta_diversity: parseFloat(metaDiversity.toFixed(2)),
    meta_speed: determineMataSpeed(proMatches),
    current_meta_description: generateMetaDescription(heroStats, proMatches)
  };
};

const determineMataSpeed = (proMatches) => {
  // Calculate average game duration
  const totalDuration = proMatches.reduce((sum, match) => sum + (match.duration || 0), 0);
  const avgDuration = totalDuration / proMatches.length / 60; // in minutes
  
  if (avgDuration < 25) return 'Very Fast';
  if (avgDuration < 30) return 'Fast';
  if (avgDuration < 40) return 'Medium';
  if (avgDuration < 50) return 'Slow';
  return 'Very Slow';
};

const generateMetaDescription = (heroStats, proMatches) => {
  // Generate a description of the current meta
  const topTierHeroes = heroStats
    .filter(hero => hero.meta_position === 'S-Tier (Meta Defining)')
    .length;
  
  const avgDuration = proMatches.reduce((sum, match) => sum + (match.duration || 0), 0) / proMatches.length / 60;
  
  let description = 'The current meta ';
  
  if (topTierHeroes < 10) {
    description += 'is dominated by a small pool of heroes. ';
  } else if (topTierHeroes < 20) {
    description += 'features a moderate variety of strong heroes. ';
  } else {
    description += 'is quite diverse with many viable options. ';
  }
  
  if (avgDuration < 30) {
    description += 'Games tend to be fast-paced with early aggression.';
  } else if (avgDuration < 40) {
    description += 'Games have a balanced pace with mid-game focus.';
  } else {
    description += 'Games often extend to late-game with emphasis on scaling heroes.';
  }
  
  return description;
}