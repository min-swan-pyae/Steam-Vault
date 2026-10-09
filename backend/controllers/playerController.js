import asyncHandler from '../middleware/asyncHandler.js';
import path from 'path';
import fs from 'fs/promises';
import steamService from '../services/steamService.js';
import axios from 'axios';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';
import { getItemName, getItemInternalName, getItemImage, loadItemMap } from '../utils/dotaUtils.js';

const __dirname = path.resolve();
// Legacy export for compatibility with other modules
export const heroCache = { 
  get: (key) => cacheService.get(CACHE_TYPES.HERO_DATA, key),
  set: (key, value) => cacheService.set(CACHE_TYPES.HERO_DATA, key, value)
};

/**
 * Lookup player by either Steam ID or Dota 2 ID
 */
export const lookupPlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  try {
    // Determine if this is a Steam 64-bit ID or a Dota 2 ID
    let steamId = id;
    
    // Check if it's a 32-bit ID (Dota 2 ID)
    if (id.length < 16) {
      // If it's a small number, it's likely a 32-bit ID
      // Convert to 64-bit
      steamId = steamService.normalizeSteamId(id);
    } else {
      // If it's already a 64-bit ID, also get the 32-bit version
      const accountId = steamService.getAccountId(id);
      
      // If the input matches the accountId, then the user provided a 32-bit ID
      if (accountId === id) {
        steamId = steamService.normalizeSteamId(id);
      }
    }
    
    // Now we have a Steam 64-bit ID, redirect to the player stats endpoint
    res.redirect(`/api/dota2/player/${steamId}/stats`);
  } catch (error) {
    console.error('Error looking up player:', error.message);
    res.status(400).json({ message: 'Invalid player ID format' });
  }
});

export const getPlayerStats = asyncHandler(async (req, res) => {
  let { steamId } = req.params;
  
  // Check if this is the authenticated user's own profile
  const isOwnProfile = req.user && (req.user.steamId === steamId || req.user.id === steamId);
  
  try {
    // Get comprehensive player data using our improved service
    // Pass isOwnProfile flag to indicate if this is the authenticated user's own profile
    const playerData = await steamService.getPlayerProfile(steamId, isOwnProfile);
    
    // Get hero data for enriching match information
    let heroMap = heroCache.get('heroes');
    if (!heroMap) {
      heroMap = await steamService.getHeroes();
      heroCache.set('heroes', heroMap);
    }
    
    // Get additional stats from OpenDota
    const additionalStats = await getExtendedStats(playerData.steamId);
    
    // Enrich recent matches with hero data
    const enrichedMatches = playerData.recent_matches.map(match => {
      const hero = heroMap[match.hero_id] || { localized_name: 'Unknown Hero' };
      return {
        match_id: match.match_id,
        hero_id: match.hero_id,
        hero_name: hero.localized_name,
        hero_img: hero.img || null, // OpenDota image path
        start_time: match.start_time,
        duration: match.duration,
        player_slot: match.player_slot,
        radiant_win: match.radiant_win,
        player_won: match.player_slot < 128 ? match.radiant_win : !match.radiant_win,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
        lane_role: match.lane_role,
        gold_per_min: match.gold_per_min,
        xp_per_min: match.xp_per_min
      };
    });
    
    // Build the response object with extended stats
    const responseData = {
      ...playerData,
      ...additionalStats,
      matches: enrichedMatches,
      // Calculate more accurate role distribution
      most_played_role: getMostPlayedRole(playerData.recent_matches),
      // Add additional stats
      average_kda: calculateKDA(playerData.recent_matches),
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching player data:', error.message);
    const status = error.statusCode || error.response?.status;
    const errorCode = error.code || error.response?.data?.error;

    if (errorCode === 'NO_DOTA_DATA') {
      return res.status(404).json({ message: 'This player has no public Dota data available yet', error: 'NO_DOTA_DATA' });
    }

    if (status === 404 || errorCode === 'PLAYER_NOT_FOUND') {
      return res.status(404).json({ message: 'Player profile not found', error: 'PLAYER_NOT_FOUND' });
    }

    if (status === 403 || errorCode === 'PRIVATE_PROFILE') {
      return res.status(403).json({ message: 'This player profile is private', error: 'PRIVATE_PROFILE' });
    }

    return res.status(500).json({ message: 'Error fetching player data' });
  }
});

/**
 * Get extended stats from OpenDota for a player
 */
export const getExtendedStats = async (accountId) => {
  try {
    const extendedStats = {};
    
    // Get player records by analyzing match data instead of using /records endpoint
    try {
      // Fetch recent matches with necessary fields for record calculation
      const matchesRes = await steamService.openDotaApi.get(`/players/${accountId}/matches`, {
        params: {
          limit: 5000, // Increase this for more accurate records, but be mindful of API limits
          project: ['kills', 'deaths', 'assists', 'gold_per_min', 'xp_per_min', 
                   'last_hits', 'hero_damage', 'hero_healing', 'tower_damage', 'hero_id',
                   'lane', 'lane_role']
        }
      });
      const matches = matchesRes.data || [];
      
      // Initialize records object
      const records = {
        kills: { value: 0, match_id: null, hero_id: null },
        deaths: { value: 0, match_id: null, hero_id: null },
        assists: { value: 0, match_id: null, hero_id: null },
        gold_per_min: { value: 0, match_id: null, hero_id: null },
        xp_per_min: { value: 0, match_id: null, hero_id: null },
        last_hits: { value: 0, match_id: null, hero_id: null },
        hero_damage: { value: 0, match_id: null, hero_id: null },
        hero_healing: { value: 0, match_id: null, hero_id: null },
        tower_damage: { value: 0, match_id: null, hero_id: null }
      };
      
      // Calculate records from match data
      matches.forEach(match => {
        // Check and update each record type
        if (match.kills > records.kills.value) {
          records.kills = { value: match.kills, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.deaths > records.deaths.value) {
          records.deaths = { value: match.deaths, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.assists > records.assists.value) {
          records.assists = { value: match.assists, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.gold_per_min > records.gold_per_min.value) {
          records.gold_per_min = { value: match.gold_per_min, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.xp_per_min > records.xp_per_min.value) {
          records.xp_per_min = { value: match.xp_per_min, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.last_hits > records.last_hits.value) {
          records.last_hits = { value: match.last_hits, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.hero_damage > records.hero_damage.value) {
          records.hero_damage = { value: match.hero_damage, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.hero_healing > records.hero_healing.value) {
          records.hero_healing = { value: match.hero_healing, match_id: match.match_id, hero_id: match.hero_id };
        }
        if (match.tower_damage > records.tower_damage.value) {
          records.tower_damage = { value: match.tower_damage, match_id: match.match_id, hero_id: match.hero_id };
        }
      });
      
      // Format records for the response
      extendedStats.records = {
        max_kills: formatRecord([records.kills]),
        max_deaths: formatRecord([records.deaths]),
        max_assists: formatRecord([records.assists]),
        max_gpm: formatRecord([records.gold_per_min]),
        max_xpm: formatRecord([records.xp_per_min]),
        max_last_hits: formatRecord([records.last_hits]),
        max_hero_damage: formatRecord([records.hero_damage]),
        max_hero_healing: formatRecord([records.hero_healing]),
        max_tower_damage: formatRecord([records.tower_damage])
      };
    } catch (e) {
      console.error('Error calculating player records:', e.message);
    }
    
    // Get player rating history (MMR history) - this endpoint exists
    try {
      const ratingRes = await steamService.openDotaApi.get(`/players/${accountId}/ratings`);
      const ratings = ratingRes.data || [];
      if (ratings.length > 0) {
        const latestRating = ratings[ratings.length - 1];
        extendedStats.mmr_history = ratings;
        extendedStats.latest_mmr = latestRating.solo_competitive_rank || latestRating.competitive_rank;
      }
    } catch (e) {
      console.error('Error fetching player rating history:', e.message);
    }
    
    // Get player hero stats
    try {
      const heroStatsRes = await steamService.openDotaApi.get(`/players/${accountId}/heroes`);
      const heroStats = heroStatsRes.data || [];
      extendedStats.hero_stats = heroStats.slice(0, 10); // Top 10 heroes
    } catch (e) {
      console.error('Error fetching player hero stats:', e.message);
    }
    
    // Get player peer stats (players they've played with)
    try {
      const peersRes = await steamService.openDotaApi.get(`/players/${accountId}/peers`);
      const peers = peersRes.data || [];
      extendedStats.peers = peers.slice(0, 5); // Top 5 peers
    } catch (e) {
      console.error('Error fetching player peers:', e.message);
    }
    
    return extendedStats;
  } catch (error) {
    console.error('Error fetching extended stats:', error.message);
    return {};
  }
}

// Format an OpenDota record to a cleaner structure
function formatRecord(record) {
  if (!record || !record[0]) return { value: 0, match_id: null };
  return {
    value: record[0].value,
    match_id: record[0].match_id,
    hero_id: record[0].hero_id
  };
}

// Calculate average KDA from recent matches
function calculateKDA(matches) {
  if (!matches || matches.length === 0) return '0.00';
  
  let totalKills = 0;
  let totalDeaths = 0;
  let totalAssists = 0;
  
  matches.forEach(match => {
    totalKills += match.kills || 0;
    totalDeaths += match.deaths || 0;
    totalAssists += match.assists || 0;
  });
  
  return totalDeaths > 0 
    ? ((totalKills + totalAssists) / totalDeaths).toFixed(2) 
    : (totalKills + totalAssists) > 0 ? '∞' : '0.00';
}

// Helper function to get the most played role from match data
const getMostPlayedRole = (matches) => {
  const roleCounts = {
    'Carry': 0,
    'Mid': 0,
    'Offlane': 0,
    'Support': 0,
    'Hard Support': 0,
    'Unknown': 0
  };

  matches.forEach(match => {
    // Lane role: 1 = Safe, 2 = Mid, 3 = Off, 4 = Jungle
    // Combine with gold/xp to determine support vs core
    const laneRole = match.lane_role || 0;
    const gpm = match.gold_per_min || 0;
    const xpm = match.xp_per_min || 0;
    
    if (laneRole === 1) {
      if (gpm > 450 && xpm > 450) {
        roleCounts['Carry']++;
      } else {
        roleCounts['Hard Support']++;
      }
    } else if (laneRole === 2) {
      roleCounts['Mid']++;
    } else if (laneRole === 3) {
      if (gpm > 400 && xpm > 400) {
        roleCounts['Offlane']++;
      } else {
        roleCounts['Support']++;
      }
    } else {
      // Try to determine role from GPM/XPM if lane is unknown
      if (gpm > 500 && xpm > 550) {
        roleCounts['Carry']++;
      } else if (gpm > 450 && xpm > 500) {
        roleCounts['Mid']++;
      } else if (gpm > 350 && xpm > 400) {
        roleCounts['Offlane']++;
      } else if (gpm > 250 && xpm > 300) {
        roleCounts['Support']++;
      } else {
        roleCounts['Hard Support']++;
      }
    }
  });

  // Find the role with the highest count
  let mostPlayedRole = 'Unknown';
  let highestCount = 0;
  
  for (const [role, count] of Object.entries(roleCounts)) {
    if (count > highestCount) {
      mostPlayedRole = role;
      highestCount = count;
    }
  }
  
  return {
    role: mostPlayedRole,
    games: highestCount
  };
};

/**
 * Get hero performance statistics for a player
 */
export const getPlayerHeroStats = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const cacheKey = `hero_stats_${steamId}_v3`; // v3: removed highest_gpm/xpm due to API rate limiting
  
  // Check cache first
  const cached = cacheService.get(CACHE_TYPES.PLAYER_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  console.log('🔄 Fetching fresh hero stats from API');
  
  try {
    // Convert Steam ID to account ID for OpenDota API
    const accountId = steamService.getAccountId(steamId);
    console.log('🔍 Fetching hero stats for account ID:', accountId);
    
    const playerProfile = await steamService.getPlayerProfile(steamId);
    
    // Get hero data for mapping hero IDs to names
    let heroMap = heroCache.get('heroes');
    if (!heroMap) {
      heroMap = await steamService.getHeroes();
      heroCache.set('heroes', heroMap);
    }
    
    // Fetch hero stats from OpenDota API
    console.log('📊 Fetching hero stats from OpenDota...');
    const heroStatsResponse = await axios.get(`https://api.opendota.com/api/players/${accountId}/heroes`, {
      timeout: 15000
    });

    // Note: Highest GPM/XPM calculation removed due to OpenDota API rate limiting
    // The /matches endpoint with limit=1000 was timing out and causing performance issues
    // This data is not critical for the hero list view and can be seen in detailed stats

    // Process and enrich the hero stats data
    const heroStats = heroStatsResponse.data.map(hero => {
      const heroInfo = heroMap[hero.hero_id] || { localized_name: 'Unknown Hero' };

      return {
        hero_id: hero.hero_id,
        hero_name: heroInfo.localized_name,
        personaname: playerProfile.personaname || 'Unknown Player',
        games: hero.games,
        win: hero.win,
        win_rate: hero.games > 0 ? Math.round((hero.win / hero.games) * 100) : 0,
        last_played: hero.last_played,
        with_games: hero.with_games || 0,
        with_win: hero.with_win || 0,
        against_games: hero.against_games || 0,
        against_win: hero.against_win || 0
      };
    });
    
    // Sort by games played (descending)
    heroStats.sort((a, b) => b.games - a.games);
    
    console.log('📊 Hero stats processed:', heroStats.length, 'heroes for player', playerProfile.personaname);
    
    // Cache the result (v3 to invalidate old cache with highest_gpm/xpm fields)
    cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, heroStats);
    
    res.json(heroStats);
  } catch (error) {
    console.error('❌ Error fetching hero stats:', error.message);
    console.error('Error details:', error.response?.data || error.stack);
    res.status(500).json({ 
      message: 'Failed to fetch hero statistics',
      error: error.message 
    });
  }
});

/**
 * Get match history for a player
 */
/**
 * Get playtime trends for a player
 */
export const getPlayerPlaytimeTrends = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const cacheKey = `playtime_${steamId}`;
  
  // Check cache first
  const cached = cacheService.get(CACHE_TYPES.PLAYER_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    // Get player profile which includes playtime data
    const playerProfile = await steamService.getPlayerProfile(steamId);
    
    // Convert Steam ID to account ID for OpenDota API
    const accountId = steamService.getAccountId(steamId);
    
    // Fetch match data from OpenDota API
    const response = await axios.get(`https://api.opendota.com/api/players/${accountId}/matches`, {
      params: {
        limit: 100 // Get last 100 matches for better trend analysis
      }
    });
    
    // Process matches to extract time of day trends
    const timeOfDayData = response.data.reduce((acc, match) => {
      const hour = new Date(match.start_time * 1000).getHours();
      let timeFrame;
      
      if (hour >= 5 && hour < 12) timeFrame = 'Morning';
      else if (hour >= 12 && hour < 18) timeFrame = 'Afternoon';
      else timeFrame = 'Evening';
      
      if (!acc[timeFrame]) {
        acc[timeFrame] = { games: 0, win: 0 };
      }
      
      acc[timeFrame].games++;
      if ((match.player_slot < 128 && match.radiant_win) || 
          (match.player_slot >= 128 && !match.radiant_win)) {
        acc[timeFrame].win++;
      }
      
      return acc;
    }, {});
    
    // Convert to array format
    const timeOfDayTrends = Object.entries(timeOfDayData).map(([time_frame, data]) => ({
      time_frame,
      games: data.games,
      win: data.win,
      win_rate: Math.round((data.win / data.games) * 100)
    }));
    
    const trends = [
      {
        category: 'Time of Day',
        data: timeOfDayTrends
      }
    ];
    
    // Cache the result
    cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, trends);
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching playtime trends:', error.message);
    res.status(500).json({ message: 'Failed to fetch playtime trends' });
  }
});

/**
 * Get behavior metrics for a player
 */
// Helper functions for performance metrics
const calculatePerformanceMetrics = (matches) => {
  if (!matches || matches.length === 0) {
    return {
      recent_win_rate: 0,
      avg_kda: '0.00',
      avg_gpm: 0,
      avg_xpm: 0,
      avg_hero_damage: 0,
      performance_trend: 'stable'
    };
  }
  
  const wins = matches.filter(match => 
    (match.player_slot < 128 && match.radiant_win) || 
    (match.player_slot >= 128 && !match.radiant_win)
  ).length;
  
  const totalKills = matches.reduce((sum, match) => sum + (match.kills || 0), 0);
  const totalDeaths = matches.reduce((sum, match) => sum + (match.deaths || 0), 0);
  const totalAssists = matches.reduce((sum, match) => sum + (match.assists || 0), 0);
  const totalGpm = matches.reduce((sum, match) => sum + (match.gold_per_min || 0), 0);
  const totalXpm = matches.reduce((sum, match) => sum + (match.xp_per_min || 0), 0);
  const totalHeroDamage = matches.reduce((sum, match) => sum + (match.hero_damage || 0), 0);
  
  // Calculate performance trend based on win/loss pattern
  let trend = 'stable';
  let streakCount = 1;
  let isWinStreak = false;
  let isLossStreak = false;
  
  for (let i = 1; i < Math.min(10, matches.length); i++) {
    const prevWon = (matches[i-1].player_slot < 128 && matches[i-1].radiant_win) || 
                   (matches[i-1].player_slot >= 128 && !matches[i-1].radiant_win);
    const currWon = (matches[i].player_slot < 128 && matches[i].radiant_win) || 
                   (matches[i].player_slot >= 128 && !matches[i].radiant_win);
    
    if (prevWon === currWon) {
      streakCount++;
      if (streakCount >= 3) {
        trend = currWon ? 'improving' : 'declining';
        isWinStreak = currWon;
        isLossStreak = !currWon;
      }
    } else {
      streakCount = 1;
    }
  }
  
  return {
    recent_win_rate: Math.round((wins / matches.length) * 100),
    avg_kda: ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2),
    avg_gpm: Math.round(totalGpm / matches.length),
    avg_xpm: Math.round(totalXpm / matches.length),
    avg_hero_damage: Math.round(totalHeroDamage / matches.length),
    performance_trend: trend
  };
};

const calculateImpactScore = (matches) => {
  if (!matches || matches.length === 0) return 0;
  
  return matches.reduce((sum, match) => {
    // Calculate impact based on KDA, damage, healing, etc.
    // KDA impact: kills(0.3) - deaths(-0.3) + assists(0.2)
    // Good KDA impact would be > 1.5
    const kdaImpact = ((match.kills || 0) * 0.3 + (match.deaths || 0) * -0.3 + (match.assists || 0) * 0.2);
    
    // Farm impact: GPM/500 * 0.2
    // Good farm impact would be > 0.12 (300+ GPM)
    const farmImpact = ((match.gold_per_min || 0) / 500) * 0.2;
    
    // Damage impact: Hero damage/15000 * 0.3
    // Good damage impact would be > 0.3 (15000+ damage)
    const damageImpact = ((match.hero_damage || 0) / 15000) * 0.3;
    
    // Total impact score:
    // < 0.5: Low impact
    // 0.5-1.5: Average impact
    // 1.5-2.5: High impact
    // > 2.5: Very high impact
    return sum + kdaImpact + farmImpact + damageImpact;
  }, 0) / matches.length;
};

const calculateConsistencyRating = (matches) => {
  if (!matches || matches.length < 5) return 'insufficient data';
  
  // Calculate standard deviation of KDA
  const kdaValues = matches.map(match => {
    const deaths = Math.max(1, match.deaths || 1);
    return ((match.kills || 0) + (match.assists || 0)) / deaths;
  });
  
  const mean = kdaValues.reduce((sum, val) => sum + val, 0) / kdaValues.length;
  const variance = kdaValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / kdaValues.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower standard deviation means more consistency
  if (stdDev < 1) return 'very consistent';
  if (stdDev < 2) return 'consistent';
  if (stdDev < 3.5) return 'somewhat inconsistent';
  return 'very inconsistent';
};

const calculateTeamContribution = (matches) => {
  if (!matches || matches.length === 0) return 'average';
  
  // Calculate average contribution percentage
  const contributionScores = matches.map(match => {
    const teamPlayScore = (match.assists || 0) / Math.max(1, (match.kills || 0) + (match.assists || 0));
    const damageScore = (match.hero_damage || 0) / 20000;
    const supportScore = (match.hero_healing || 0) / 5000;
    
    return (teamPlayScore * 0.4) + (damageScore * 0.4) + (supportScore * 0.2);
  });
  
  const avgContribution = contributionScores.reduce((sum, score) => sum + score, 0) / contributionScores.length;
  
  if (avgContribution > 0.7) return 'exceptional';
  if (avgContribution > 0.5) return 'high';
  if (avgContribution > 0.3) return 'average';
  return 'low';
};

const calculateMMRTrend = (mmrHistory) => {
  if (!mmrHistory || mmrHistory.length < 2) return 'stable';
  
  // Sort by date
  const sortedHistory = [...mmrHistory].sort((a, b) => a.time - b.time);
  
  // Get first and last entries
  const first = sortedHistory[0];
  const last = sortedHistory[sortedHistory.length - 1];
  
  const mmrChange = last.solo_competitive_rank - first.solo_competitive_rank;
  
  if (mmrChange > 100) return 'rising';
  if (mmrChange < -100) return 'falling';
  return 'stable';
};

const assessSkillDevelopment = (matches) => {
  if (!matches || matches.length < 10) return 'insufficient data';
  
  // Compare first half of matches with second half
  const midpoint = Math.floor(matches.length / 2);
  const recentMatches = matches.slice(0, midpoint);
  const olderMatches = matches.slice(midpoint);
  
  const recentAvgKDA = recentMatches.reduce((sum, match) => {
    return sum + ((match.kills || 0) + (match.assists || 0)) / Math.max(1, (match.deaths || 1));
  }, 0) / recentMatches.length;
  
  const olderAvgKDA = olderMatches.reduce((sum, match) => {
    return sum + ((match.kills || 0) + (match.assists || 0)) / Math.max(1, (match.deaths || 1));
  }, 0) / olderMatches.length;
  
  const kdaImprovement = recentAvgKDA - olderAvgKDA;
  
  if (kdaImprovement > 1) return 'rapidly improving';
  if (kdaImprovement > 0.3) return 'improving';
  if (kdaImprovement < -0.3) return 'declining';
  return 'stable';
};

// Helper functions for detailed hero stats
const analyzeItemUsage = (matches) => {
  if (!matches || matches.length === 0) return {};
  
  // Track item usage with wins
  const itemStats = {};
  
  matches.forEach(match => {
    const playerWon = (match.player_slot < 128 && match.radiant_win) || 
                     (match.player_slot >= 128 && !match.radiant_win);
    
    // Check for items in slots 0-5 and item_neutral
    for (let i = 0; i <= 5; i++) {
      const itemKey = `item_${i}`;
      if (match[itemKey] && match[itemKey] !== 0) {
        const itemId = match[itemKey];
        if (!itemStats[itemId]) {
          itemStats[itemId] = { count: 0, wins: 0 };
        }
        itemStats[itemId].count += 1;
        if (playerWon) {
          itemStats[itemId].wins += 1;
        }
      }
    }
    // Check for neutral item
    if (match.item_neutral && match.item_neutral !== 0) {
      const itemId = match.item_neutral;
      if (!itemStats[itemId]) {
        itemStats[itemId] = { count: 0, wins: 0 };
      }
      itemStats[itemId].count += 1;
      if (playerWon) {
        itemStats[itemId].wins += 1;
      }
    }
  });
  
  // Convert to object with internal item names as keys and win rates
  const result = {};
  Object.entries(itemStats).forEach(([itemId, stats]) => {
    const itemInternalName = getItemInternalName(parseInt(itemId)); // Use internal name like "item_blink"
    
    // Skip items that can't be resolved
    if (!itemInternalName) {
      console.warn(`[ITEM USAGE] Skipping unresolved item ID: ${itemId}`);
      return;
    }
    
    const itemDisplayName = getItemName(parseInt(itemId));
    const itemImageUrl = getItemImage(parseInt(itemId));
    // Remove 'item_' prefix for frontend compatibility with CachedItemImage component
    const frontendItemName = itemInternalName.replace(/^item_/, '');
    result[frontendItemName] = {
      count: stats.count,
      win_rate: Math.round((stats.wins / stats.count) * 100),
      frequency: Math.round((stats.count / matches.length) * 100),
      display_name: itemDisplayName, // Add display name for frontend
      image: itemImageUrl // Add the image URL from backend
    };
  });
  
  return result;
};

const analyzeLanePreference = (matches) => {
  if (!matches || matches.length === 0) return {}; // Return empty object as per frontend expectation

  const laneData = {
    safe: { games: 0, wins: 0 },
    mid: { games: 0, wins: 0 },
    off: { games: 0, wins: 0 },
  };

  matches.forEach(match => {
    const lane = match.lane || 0; // OpenDota: 1-Top, 2-Mid, 3-Bot, 4-Jungle
    const role = match.lane_role || 0; // OpenDota: 1-Safe, 2-Mid, 3-Off, 4-Jungle, 5-Support
    const playerWon = (match.player_slot < 128 && match.radiant_win) || 
                     (match.player_slot >= 128 && !match.radiant_win);

    let determinedLane = '';


    // Determine if the player is Radiant or Dire
    const isRadiantPlayer = match.player_slot < 128;

    // Primary determination based on lane_role (position)
    if (role === 2) { // Mid Lane (Pos 2)
      determinedLane = 'mid';
    } else if (role === 1) { // Safe Lane Carry (Pos 1)
      determinedLane = 'safe';
    } else if (role === 3) { // Offlane (Pos 3)
      determinedLane = 'off';
    } else if (role === 4 || role === 5) { // Support roles
      // For supports, determine lane based on physical lane position
      if (lane === 1) { // Top lane
        determinedLane = isRadiantPlayer ? 'off' : 'safe';
      } else if (lane === 2) { // Mid lane
        determinedLane = 'mid';
      } else if (lane === 3) { // Bottom lane
        determinedLane = isRadiantPlayer ? 'safe' : 'off';
      } else {
        // If no clear lane, assume they roamed or supported the safe lane
        determinedLane = 'safe';
      }
    } else {
      // Fallback to lane-based determination if role is unclear
      if (lane === 1) { // Top lane
        determinedLane = isRadiantPlayer ? 'off' : 'safe';
      } else if (lane === 2) { // Mid lane
        determinedLane = 'mid';
      } else if (lane === 3) { // Bottom lane
        determinedLane = isRadiantPlayer ? 'safe' : 'off';
      } else {
        // If both lane and role are unclear, skip this match rather than defaulting
        console.warn(`Skipping match ${match.match_id} - unclear lane/role data`);
        return;
      }
    }

    if (laneData[determinedLane]) {
      laneData[determinedLane].games += 1;
      if (playerWon) {
        laneData[determinedLane].wins += 1;
      }
    }
  });

  // Calculate win rates and prepare the final object
  const result = {};
  for (const laneName in laneData) {
    if (laneData[laneName].games > 0) {
      result[laneName] = {
        games: laneData[laneName].games,
        win_rate: Math.round((laneData[laneName].wins / laneData[laneName].games) * 100)
      };
    }
  }
  return result;
};

const analyzeMatchups = (matches) => {
  // Matchups analysis is complex and requires full match data
  // For now, return empty matchups to avoid errors
  return {
    best_against: [],
    worst_against: []
  };
};

export const getPlayerBehaviorMetrics = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const cacheKey = `behavior_${steamId}`;
  
  // Check cache first
  const cached = cacheService.get(CACHE_TYPES.PLAYER_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    // Convert Steam ID to account ID for OpenDota API
    const accountId = steamService.getAccountId(steamId);
    
    // Fetch player data from OpenDota API
    const [playerData, wordcloud] = await Promise.all([
      axios.get(`https://api.opendota.com/api/players/${accountId}`).then(res => res.data),
      axios.get(`https://api.opendota.com/api/players/${accountId}/wordcloud`).then(res => res.data).catch(() => ({ my_word_counts: {} }))
    ]);
    
    // Calculate behavior score (this is an approximation since the actual score isn't public)
    // We'll use a combination of available metrics
    
    // Start with a base score
    let behaviorScore = 7500; // Default neutral score
    
    // Adjust based on available metrics
    if (playerData.leaver_status !== undefined) {
      // Leaver status affects behavior score significantly
      // 0 = never abandoned, higher values = more abandons
      behaviorScore -= playerData.leaver_status * 500;
    }
    
    // Estimate commends and reports from wordcloud data
    // This is very approximate and just for demonstration
    const wordCounts = wordcloud.my_word_counts || {};
    
    // Words that might indicate commends
    const positiveWords = ['gg', 'wp', 'thanks', 'ty', 'nice', 'well played', 'good job'];
    let commendEstimate = 0;
    
    // Words that might indicate reports
    const negativeWords = ['report', 'noob', 'ez', '?', 'ff', 'end', 'trash'];
    let reportEstimate = 0;
    
    // Count occurrences of positive and negative words
    Object.entries(wordCounts).forEach(([word, count]) => {
      if (positiveWords.includes(word.toLowerCase())) {
        commendEstimate += count;
      }
      if (negativeWords.includes(word.toLowerCase())) {
        reportEstimate += count;
      }
    });
    
    // Scale the estimates to reasonable numbers
    commendEstimate = Math.min(Math.floor(commendEstimate / 10), 40);
    reportEstimate = Math.min(Math.floor(reportEstimate / 20), 20);
    
    // Adjust behavior score based on commends/reports ratio
    if (commendEstimate > reportEstimate) {
      behaviorScore += (commendEstimate - reportEstimate) * 100;
    } else {
      behaviorScore -= (reportEstimate - commendEstimate) * 200;
    }
    
    // Cap the behavior score between 1 and 10000
    behaviorScore = Math.max(1, Math.min(10000, behaviorScore));
    
    // Estimate abandons
    const abandonEstimate = playerData.leaver_status || 0;
    
    // Prepare the response
    const behaviorMetrics = {
      behavior_score: behaviorScore,
      commends: commendEstimate,
      reports: reportEstimate,
      abandons: abandonEstimate
    };
    
    // Cache the result
    cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, behaviorMetrics);
    
    res.json(behaviorMetrics);
  } catch (error) {
    console.error('Error fetching behavior metrics:', error.message);
    res.status(500).json({ 
      message: 'Failed to fetch behavior metrics',
      // Provide fallback data
      behavior_score: 7500,
      commends: 0,
      reports: 0,
      abandons: 0
    });
  }
});

/**
 * Get comprehensive performance summary for a player
 */
export const  getPlayerPerformanceSummary = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const cacheKey = `performance_summary_${steamId}`;
  
  // Check cache first
  const cached = cacheService.get(CACHE_TYPES.PLAYER_DATA, cacheKey);
  if (cached) {
    return res.json(cached);
  }
  
  try {
    // Convert Steam ID to account ID for OpenDota API
    const accountId = steamService.getAccountId(steamId);
    if (!accountId) {
      console.error(`Failed to convert Steam ID ${steamId} to account ID`);
      return res.status(400).json({
        message: 'Invalid Steam ID format',
        fallback_data: getFallbackPerformanceData()
      });
    }
    
    // Get player profile data
    let playerProfile;
    try {
      playerProfile = await steamService.getPlayerProfile(steamId);
    } catch (error) {
      console.error(`Failed to fetch player profile for Steam ID ${steamId}:`, error.message);
      const status = error.statusCode || error.response?.status;
      const errorCode = error.code || error.response?.data?.error;
      if (errorCode === 'NO_DOTA_DATA') {
        return res.status(404).json({ message: 'This player has no public Dota data available yet', error: 'NO_DOTA_DATA' });
      }
      if (status === 404 || errorCode === 'PLAYER_NOT_FOUND') {
        return res.status(404).json({ message: 'Player profile not found', error: 'PLAYER_NOT_FOUND' });
      }
      if (status === 403 || errorCode === 'PRIVATE_PROFILE') {
        return res.status(403).json({ message: 'This player profile is private', error: 'PRIVATE_PROFILE' });
      }
      throw error;
    }
    
    // Get extended stats with error handling
    let extendedStats;
    try {
      extendedStats = await getExtendedStats(accountId);
    } catch (error) {
      console.error(`Failed to fetch extended stats for account ID ${accountId}:`, error.message);
      extendedStats = { mmr_history: null };
    }
    
    // Throttle OpenDota calls to avoid rate limiting and timeouts when multiple users access
    const throttleOpenDota = async () => {
      try {
        const lastTs = cacheService.get(CACHE_TYPES.RATE_LIMITING, 'opendota_last_ts') || 0;
        const now = Date.now();
        const minGap = 500; // 500ms minimum gap between OpenDota calls
        const wait = Math.max(0, minGap - (now - lastTs));
        if (wait > 0) {
          await new Promise(r => setTimeout(r, wait));
        }
        cacheService.set(CACHE_TYPES.RATE_LIMITING, 'opendota_last_ts', Date.now(), 60);
      } catch (e) {
        // non-blocking
      }
    };
    
    // Get recent matches with error handling
    let recentMatches = [];
    let recentMatchesFetchFailed = false;
    try {
      await throttleOpenDota();
      const response = await axios.get(`https://api.opendota.com/api/players/${accountId}/matches`, {
        params: { limit: 1000 },
        timeout: 20000 // Increased timeout to 20 seconds for large data fetch
      });
      recentMatches = response.data;
    } catch (error) {
      console.error(`Failed to fetch recent matches for account ID ${accountId}:`, error.message);
      recentMatchesFetchFailed = true; // Mark as failed to prevent caching incomplete data
    }
    
    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetrics(recentMatches);
    
    // Get hero data for mapping hero IDs to names
    let heroMap;
    try {
      heroMap = heroCache.get('heroes') || await steamService.getHeroes();
      if (!heroCache.get('heroes')) {
        heroCache.set('heroes', heroMap);
      }
    } catch (error) {
      console.error('Failed to fetch hero data:', error.message);
      heroMap = {};
    }
    
    // Get hero stats with error handling
    let heroStats = [];
    let heroStatsFetchFailed = false;
    try {
      await throttleOpenDota();
      const response = await axios.get(`https://api.opendota.com/api/players/${accountId}/heroes`, {
        timeout: 20000 // Increased timeout to 20 seconds
      });
      heroStats = response.data.map(hero => ({
        hero_id: hero.hero_id,
        hero_name: (heroMap[hero.hero_id] || { localized_name: 'Unknown Hero' }).localized_name,
        games: hero.games,
        win: hero.win,
        win_rate: hero.games > 0 ? Math.round((hero.win / hero.games) * 100) : 0
      }));
    } catch (error) {
      console.error(`Failed to fetch hero stats for account ID ${accountId}:`, error.message);
      heroStatsFetchFailed = true;
    }
    
    // Find best and worst heroes (min 5 games played)
    const bestHeroes = heroStats
      .filter(hero => hero.games >= 5)
      .sort((a, b) => b.win_rate - a.win_rate)
      .slice(0, 3);
      
    const worstHeroes = heroStats
      .filter(hero => hero.games >= 5)
      .sort((a, b) => a.win_rate - b.win_rate)
      .slice(0, 3);
    
    // Build performance summary
    const summary = {
      player_info: {
        steamId: playerProfile.steamId,
        personaname: playerProfile.personaname,
        avatar: playerProfile.avatar
      },
      overall_stats: {
        matches_played: playerProfile.match_count || 0,
        win_rate: playerProfile.win_rate || '0%',
        average_kda: playerProfile.average_kda || '0.00',
      },
      recent_performance: performanceMetrics,
      hero_performance: {
        best_heroes: bestHeroes,
        worst_heroes: worstHeroes
      },
      match_impact: {
        average_impact_score: calculateImpactScore(recentMatches),
        consistency_rating: calculateConsistencyRating(recentMatches),
        team_contribution: calculateTeamContribution(recentMatches)
      },
      progression: {
        mmr_trend: extendedStats.mmr_history ? calculateMMRTrend(extendedStats.mmr_history) : 'stable',
        skill_development: assessSkillDevelopment(recentMatches)
      },
      // Include fetch status for frontend to know if data is incomplete
      _dataStatus: {
        recentMatchesFetched: !recentMatchesFetchFailed,
        heroStatsFetched: !heroStatsFetchFailed
      }
    };
    
    // Only cache if critical data was fetched successfully
    // Don't cache incomplete data to allow retry on next request
    if (!recentMatchesFetchFailed && !heroStatsFetchFailed) {
      cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, summary);
    } else {
      console.warn(`Not caching performance summary for ${steamId} due to failed API calls (recentMatches: ${recentMatchesFetchFailed}, heroStats: ${heroStatsFetchFailed})`);
    }
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching performance summary:', error.message);
    const fallbackData = getFallbackPerformanceData();
    res.status(500).json({
      message: 'Failed to fetch performance summary',
      fallback_data: fallbackData
    });
  }
});

// Helper function to get fallback performance data
function getFallbackPerformanceData() {
  return {
    player_info: {
      steamId: '',
      personaname: 'Unknown Player',
      avatar: ''
    },
    overall_stats: {
      matches_played: 0,
      win_rate: '0%',
      average_kda: '0.00',
      most_played_role: 'Unknown'
    },
    recent_performance: {
      recent_win_rate: 0,
      avg_kda: '0.00',
      avg_gpm: 0,
      avg_xpm: 0,
      avg_hero_damage: 0,
      performance_trend: 'stable'
    },
    hero_performance: {
      best_heroes: [],
      worst_heroes: []
    },
    match_impact: {
      average_impact_score: 0,
      consistency_rating: 'insufficient data',
      team_contribution: 'average'
    },
    progression: {
      mmr_trend: 'stable',
      skill_development: 'insufficient data'
    }
  };
}

/**
 * Get detailed statistics for a specific hero played by a player
 */
export const getDetailedHeroStats = asyncHandler(async (req, res) => {
  const { steamId, heroId } = req.params;
  const cacheKey = `detailed_hero_${steamId}_${heroId}`;
  
  // Check cache first - but only serve cache if it has valid data (not a failed fetch marker)
  const cached = cacheService.get(CACHE_TYPES.PLAYER_DATA, cacheKey);
  if (cached && !cached._fetchFailed) {
    return res.json(cached);
  }
  
  try {
    // Ensure item map is loaded
    await loadItemMap();
    
    // Convert Steam ID to account ID for OpenDota API
    const accountId = steamService.getAccountId(steamId);
    if (!accountId) {
      throw new Error('Invalid Steam ID');
    }
    
    // Throttle OpenDota calls to avoid rate limiting
    const throttleOpenDota = async () => {
      try {
        const lastTs = cacheService.get(CACHE_TYPES.RATE_LIMITING, 'opendota_last_ts') || 0;
        const now = Date.now();
        const minGap = 500; // 500ms minimum gap between OpenDota calls
        const wait = Math.max(0, minGap - (now - lastTs));
        if (wait > 0) {
          await new Promise(r => setTimeout(r, wait));
        }
        cacheService.set(CACHE_TYPES.RATE_LIMITING, 'opendota_last_ts', Date.now(), 60);
      } catch (e) {
        // non-blocking
      }
    };
    
    // Get hero data for mapping hero IDs to names
    let heroMap = heroCache.get('heroes');
    if (!heroMap) {
      heroMap = await steamService.getHeroes();
      heroCache.set('heroes', heroMap);
    }
    
    const heroInfo = heroMap[heroId] || { localized_name: 'Unknown Hero' };
    
    // Get all matches played with this hero - with throttling and increased timeout
    await throttleOpenDota();
    const response = await axios.get(`https://api.opendota.com/api/players/${accountId}/matches`, {
      params: {
        hero_id: heroId // No limit, fetch all matches
      },
      timeout: 20000 // 20 second timeout
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error('Invalid response from OpenDota API');
    }

    const allHeroMatchSummaries = response.data;
    
    if (!Array.isArray(allHeroMatchSummaries)) {
      console.error(`OpenDota API for hero matches (accountId: ${accountId}, heroId: ${heroId}) did not return an array. Received:`, response.data);
      // If it's not an array, we can't proceed. Throw an error or return a default. 
      // For now, let's assume the existing check for allHeroMatchSummaries.length === 0 will handle it, 
      // but logging is important. Or, we could set it to [] here.
      // To be safe and align with existing logic for empty results:
      const defaultStats = {
        hero_id: parseInt(heroId),
        hero_name: heroInfo.localized_name,
        total_matches: 0, wins: 0, losses: 0, win_rate: 0,
        averages: { kills: '0.0', deaths: '0.0', assists: '0.0', kda: '0.00', gpm: 0, xpm: 0, last_hits: 0, hero_damage: 0, tower_damage: 0, hero_healing: 0 },
        item_usage: {},
        lane_preference: {},
        matchups: { best_against: [], worst_against: [] },
        recent_matches: []
      };
      cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, defaultStats);
      return res.json(defaultStats);
    }

    // If no matches found, return default structure
    if (allHeroMatchSummaries.length === 0) {
      const defaultStats = {
        hero_id: parseInt(heroId),
        hero_name: heroInfo.localized_name,
        total_matches: 0,
        wins: 0,
        losses: 0,
        win_rate: 0,
        averages: {
          kills: '0.0',
          deaths: '0.0',
          assists: '0.0',
          kda: '0.00',
          gpm: 0,
          xpm: 0,
          last_hits: 0,
          hero_damage: 0,
          tower_damage: 0,
          hero_healing: 0
        },
        item_usage: {},
        lane_preference: {},
        matchups: {
          best_against: [],
          worst_against: []
        },
        recent_matches: []
      };
      
      cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, defaultStats);
      return res.json(defaultStats);
    }

    // Take the last 30 matches for detailed analysis. 
    // OpenDota API for player matches usually returns most recent first.
    const recentHeroMatchSummaries = allHeroMatchSummaries.slice(0, 30);

    // If there are no recent matches to analyze (e.g. player played < 30 matches, or even 0 after slicing)
    // This check is important if allHeroMatchSummaries.length < 30
    if (recentHeroMatchSummaries.length === 0) {
        const defaultStatsWithTotal = {
            ...defaultStats, // from the no matches found block
            hero_id: parseInt(heroId),
            hero_name: heroInfo.localized_name,
            total_matches: allHeroMatchSummaries.length, // Still report total matches played
        };
        cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, defaultStatsWithTotal);
        return res.json(defaultStatsWithTotal);
    }

    // Fetch detailed data for these last 30 (or fewer) match summaries
    // Use controlled concurrency to avoid overwhelming OpenDota API
    const fetchMatchDetail = async (summary) => {
      try {
        await throttleOpenDota(); // Add delay between requests
        const matchDetailResponse = await axios.get(`https://api.opendota.com/api/matches/${summary.match_id}`, {
          timeout: 15000 // 15 second timeout per match
        });
        const matchData = matchDetailResponse.data;
        // Find the player's specific data within the match details
        const playerData = matchData.players.find(p => p.account_id == accountId && p.hero_id == heroId);
        if (playerData) {
          // Combine summary with detailed player data
            return {
              ...summary, // Keep summary data like radiant_win, player_slot, start_time, duration
              ...playerData, // Add detailed stats like gpm, xpm, last_hits, hero_damage etc.
              // Ensure crucial fields from summary are not overwritten if also present in playerData with different meaning
              player_slot: summary.player_slot,
              radiant_win: summary.radiant_win,
              is_radiant: matchData.players.find(p => p.account_id == accountId)?.isRadiant, // Get isRadiant from detailed match data
              lane: playerData.lane, // Explicitly add lane
              lane_role: playerData.lane_role // Explicitly add lane_role
            };
        }
        return null; // Player data not found in this match for this hero
      } catch (err) {
        if (err.response?.status === 429) {
          console.warn(`Rate limited fetching match ${summary.match_id}. Skipping.`);
        } else if (err.response?.status === 404) {
          console.warn(`Match ${summary.match_id} not found on OpenDota (404). Skipping.`);
        } else {
          console.error(`Failed to fetch details for match ${summary.match_id}:`, err.message);
        }
        return null;
      }
    };

    // Fetch matches with controlled concurrency (3 at a time instead of all 30 at once)
    const concurrencyLimit = 3;
    const detailedHeroMatches = [];
    for (let i = 0; i < recentHeroMatchSummaries.length; i += concurrencyLimit) {
      const batch = recentHeroMatchSummaries.slice(i, i + concurrencyLimit);
      const batchResults = await Promise.all(batch.map(fetchMatchDetail));
      detailedHeroMatches.push(...batchResults.filter(match => match !== null));
    }

    // Fallback if detailed fetches for the recent 30 matches fail or yield no valid data
    if (detailedHeroMatches.length === 0) {
        console.warn(`Could not fetch or process detailed data for any of the ${recentHeroMatchSummaries.length} recent matches. Using summary data for win/loss for these recent matches if available, or default.`);
        // Try to use recentHeroMatchSummaries if detailed fetch failed but summaries exist
        const summarySource = recentHeroMatchSummaries.length > 0 ? recentHeroMatchSummaries : allHeroMatchSummaries;
        const winsFromSummaries = summarySource.filter(match => (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win)).length;
        const totalRelevantSummaries = summarySource.length;
        const lossesFromSummaries = totalRelevantSummaries - winsFromSummaries;
        const winRateFromSummaries = totalRelevantSummaries > 0 ? Math.round((winsFromSummaries / totalRelevantSummaries) * 100) : 0;
        const fallbackAveragesData = recentHeroMatchSummaries.reduce((acc, match) => {
          acc.kills += match.kills || 0;
          acc.deaths += match.deaths || 0;
          acc.assists += match.assists || 0;
          acc.gpm += match.gold_per_min || 0;       
          acc.xpm += match.xp_per_min || 0;         
          acc.last_hits += match.last_hits || 0;     
          acc.hero_damage += match.hero_damage || 0; 
          acc.tower_damage += match.tower_damage || 0;
          acc.hero_healing += match.hero_healing || 0;
          return acc;
        }, {
          kills: 0, deaths: 0, assists: 0, gpm: 0, xpm: 0,
          last_hits: 0, hero_damage: 0, tower_damage: 0, hero_healing: 0
        });
        const fallbackItemUsage=analyzeItemUsage(allHeroMatchSummaries);
        const fallbackLanePreference=analyzeLanePreference(allHeroMatchSummaries);
        const fallbackMatchups=analyzeMatchups(allHeroMatchSummaries);


        const fallbackStats = {
            hero_id: parseInt(heroId),
            hero_name: heroInfo.localized_name,
            total_matches_overall: allHeroMatchSummaries.length,
            total_wins_overall: allHeroMatchSummaries.filter(match => 
              (match.player_slot < 128 && match.radiant_win) || 
              (match.player_slot >= 128 && !match.radiant_win)
            ).length,
            get total_win_rate_overall() {
              if (this.total_matches_overall > 0) {
                return Math.round((this.total_wins_overall / this.total_matches_overall) * 100);
              }
              return 0;
            },
            analyzed_matches_count: recentHeroMatchSummaries.length,
            wins_in_analyzed_set: recentHeroMatchSummaries.length > 0 ? winsFromSummaries : 0, // if recent summaries were targeted
            losses_in_analyzed_set: recentHeroMatchSummaries.length > 0 ? lossesFromSummaries : 0,
            win_rate_in_analyzed_set: recentHeroMatchSummaries.length > 0 ? winRateFromSummaries : 0,
            averages: {
              kills:  recentHeroMatchSummaries.length>0 ? (fallbackAveragesData.kills / recentHeroMatchSummaries.length).toFixed(1):0.0 ,
              deaths: recentHeroMatchSummaries.length>0 ? (fallbackAveragesData.deaths / recentHeroMatchSummaries.length).toFixed(1):0.0 ,
              assists:  recentHeroMatchSummaries.length>0 ? (fallbackAveragesData.assists / recentHeroMatchSummaries.length).toFixed(1):0.0,
              kda:  recentHeroMatchSummaries.length>0 ?((fallbackAveragesData.kills + fallbackAveragesData.assists) / Math.max(1, fallbackAveragesData.deaths)).toFixed(2) : 0.00 ,
              gpm: recentHeroMatchSummaries.length>0 ? Math.round(fallbackAveragesData.gpm / recentHeroMatchSummaries.length):0,
              xpm: recentHeroMatchSummaries.length>0 ? Math.round(fallbackAveragesData.xpm / recentHeroMatchSummaries.length):0,
              last_hits: recentHeroMatchSummaries.length>0 ? Math.round(fallbackAveragesData.last_hits / recentHeroMatchSummaries.length):0,
              hero_damage:recentHeroMatchSummaries.length>0 ? Math.round(fallbackAveragesData.hero_damage / recentHeroMatchSummaries.length):0,
              tower_damage:recentHeroMatchSummaries.length>0 ? Math.round(fallbackAveragesData.tower_damage / recentHeroMatchSummaries.length):0,
              hero_healing:recentHeroMatchSummaries.length>0 ? Math.round(fallbackAveragesData.hero_healing / recentHeroMatchSummaries.length):0
            },
            item_usage: fallbackItemUsage,
            lane_preference: fallbackLanePreference,
            matchups: fallbackMatchups,
            recent_matches: allHeroMatchSummaries.slice(0, 10).map(m => {
              // Convert lane_role to readable format
              const getLaneRoleName = (role) => {
                switch(role) {
                  case 1: return 'Carry (Safe)';
                  case 2: return 'Mid';
                  case 3: return 'Offlaner';
                  case 4: return 'Support';
                  case 5: return 'Hard Support';
                  default: return 'Unknown';
                }
              };

              return {
                match_id: m.match_id,
                start_time: m.start_time,
                duration: m.duration,
                won: (m.player_slot < 128 && m.radiant_win) || (m.player_slot >= 128 && !m.radiant_win),
                kills: m.kills,
                deaths: m.deaths,
                assists: m.assists,
                gpm: m.gold_per_min || "N/A",
                xpm: m.xp_per_min || "N/A",
                lane_role: getLaneRoleName(m.lane_role),
                lane: m.lane
              };
             }),
              
        };
        cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, fallbackStats);
        return res.json(fallbackStats);
    }

    // Calculate hero-specific metrics using detailedHeroMatches (the recent 30 or fewer)
    const totalMatchesInAnalyzedSet = detailedHeroMatches.length;
    const winsInAnalyzedSet = detailedHeroMatches.filter(match => 
      (match.player_slot < 128 && match.radiant_win) || 
      (match.player_slot >= 128 && !match.radiant_win)
    ).length;
    const lossesInAnalyzedSet = totalMatchesInAnalyzedSet - winsInAnalyzedSet;
    const winRateInAnalyzedSet = totalMatchesInAnalyzedSet > 0 ? Math.round((winsInAnalyzedSet / totalMatchesInAnalyzedSet) * 100) : 0;
    
    // Calculate averages using detailed stats from the analyzed set
    const averagesData = detailedHeroMatches.reduce((acc, match) => {
      acc.kills += match.kills || 0;
      acc.deaths += match.deaths || 0;
      acc.assists += match.assists || 0;
      acc.gpm += match.gold_per_min || 0;       
      acc.xpm += match.xp_per_min || 0;         
      acc.last_hits += match.last_hits || 0;     
      acc.hero_damage += match.hero_damage || 0; 
      acc.tower_damage += match.tower_damage || 0;
      acc.hero_healing += match.hero_healing || 0;
      return acc;
    }, {
      kills: 0, deaths: 0, assists: 0, gpm: 0, xpm: 0,
      last_hits: 0, hero_damage: 0, tower_damage: 0, hero_healing: 0
    });
    
    // Calculate item usage patterns using detailedHeroMatches
    // analyzeItemUsage might need adjustment if it expects item_0, item_1 etc. directly on match object
    // The current structure `...playerData` should bring these fields in.
    const itemUsage = analyzeItemUsage(detailedHeroMatches);
    
    
    // Calculate lane preference using detailedHeroMatches
    // analyzeLanePreference needs `lane`, `lane_role`, `is_radiant` which should be available now
    const lanePreference = analyzeLanePreference(detailedHeroMatches);
    
    // Calculate matchups (heroes played against) using detailedHeroMatches
    // analyzeMatchups might need adjustment if it relies on specific structure from summary
    const matchups = analyzeMatchups(detailedHeroMatches);

    
    // Build detailed hero stats
    const detailedStats = {
      hero_id: parseInt(heroId),
      hero_name: heroInfo.localized_name,
      total_matches_overall: allHeroMatchSummaries.length, 
      total_wins_overall: allHeroMatchSummaries.filter(match => 
        (match.player_slot < 128 && match.radiant_win) || 
        (match.player_slot >= 128 && !match.radiant_win)
      ).length,
      get total_win_rate_overall() {
        if (this.total_matches_overall > 0) {
          return Math.round((this.total_wins_overall / this.total_matches_overall) * 100);
        }
        return 0;
      },
      analyzed_matches_count: totalMatchesInAnalyzedSet, // Number of matches used for detailed stats
      wins_in_analyzed_set: winsInAnalyzedSet,
      losses_in_analyzed_set: lossesInAnalyzedSet,
      win_rate_in_analyzed_set: winRateInAnalyzedSet,
      averages: {
        kills: totalMatchesInAnalyzedSet > 0 ? (averagesData.kills / totalMatchesInAnalyzedSet).toFixed(1) : '0.0',
        deaths: totalMatchesInAnalyzedSet > 0 ? (averagesData.deaths / totalMatchesInAnalyzedSet).toFixed(1) : '0.0',
        assists: totalMatchesInAnalyzedSet > 0 ? (averagesData.assists / totalMatchesInAnalyzedSet).toFixed(1) : '0.0',
        kda: totalMatchesInAnalyzedSet > 0 ? ((averagesData.kills + averagesData.assists) / Math.max(1, averagesData.deaths)).toFixed(2) : '0.00',
        gpm: totalMatchesInAnalyzedSet > 0 ? Math.round(averagesData.gpm / totalMatchesInAnalyzedSet) : 0,
        xpm: totalMatchesInAnalyzedSet > 0 ? Math.round(averagesData.xpm / totalMatchesInAnalyzedSet) : 0,
        last_hits: totalMatchesInAnalyzedSet > 0 ? Math.round(averagesData.last_hits / totalMatchesInAnalyzedSet) : 0,
        hero_damage: totalMatchesInAnalyzedSet > 0 ? Math.round(averagesData.hero_damage / totalMatchesInAnalyzedSet) : 0,
        tower_damage: totalMatchesInAnalyzedSet > 0 ? Math.round(averagesData.tower_damage / totalMatchesInAnalyzedSet) : 0,
        hero_healing: totalMatchesInAnalyzedSet > 0 ? Math.round(averagesData.hero_healing / totalMatchesInAnalyzedSet) : 0
      },
      item_usage: itemUsage,
      lane_preference: lanePreference,
      matchups: matchups,
      recent_matches: detailedHeroMatches.map(match => {
        // Convert lane_role to readable format
        const getLaneRoleName = (role) => {
          switch(role) {
            case 1: return 'Carry (Safe)';
            case 2: return 'Mid';
            case 3: return 'Offlaner';
            case 4: return 'Support';
            case 5: return 'Hard Support';
            default: return 'Unknown';
          }
        };

        return {
          match_id: match.match_id,
          start_time: match.start_time,
          duration: match.duration,
          won: (match.player_slot < 128 && match.radiant_win) || (match.player_slot >= 128 && !match.radiant_win),
          kills: match.kills,
          deaths: match.deaths,
          assists: match.assists,
          gpm: match.gold_per_min,
          xpm: match.xp_per_min,
          lane_role: getLaneRoleName(match.lane_role),
          lane: match.lane // Keep raw lane data too
        };
      })
    };
    
    // Cache the result
    cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, detailedStats);
    
    res.json(detailedStats);
  } catch (error) {
    console.error('Error fetching detailed hero stats:', error.message);
    
    // Check if it's a rate limit error (429)
    const isRateLimited = error.response?.status === 429;
    const statusCode = isRateLimited ? 429 : 500;
    
    // Do NOT cache failed responses - this allows retry on next request
    // Only log that we're not caching
    console.warn(`Not caching detailed hero stats for ${steamId}/${heroId} due to API failure (rate limited: ${isRateLimited})`);
    
    res.status(statusCode).json({
      error: true,
      message: isRateLimited 
        ? 'Rate limited by OpenDota. Please wait a moment and try again.' 
        : 'Failed to fetch detailed hero statistics',
      isRateLimited,
      hero_id: parseInt(heroId),
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_rate: 0,
      averages: {},
      item_usage: [],
      lane_preference: [],
      matchups: [],
      recent_matches: []
    });
  }
});

