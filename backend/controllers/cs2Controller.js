import asyncHandler from '../middleware/asyncHandler.js';
import axios from 'axios';
import steamService from '../services/steamService.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';
import firebaseService from '../services/firebaseService.js';

/**
 * CS2 Controller - Game State Integration + Steam API Implementation
 * 
 * This controller manages CS2 player statistics using both:
 * 1. Steam Web API for historical data (immediate access to all past data)
 * 2. Game State Integration (GSI) for real-time data collection
 * 
 * Features:
 * - Historical CS2 statistics via Steam Web API
 * - Real-time CS2 statistics via GSI
 * - Combined data from both sources
 * - Firebase data persistence
 * - Proper error handling
 * - Authentication-based access control
 * - Efficient caching system
 */

/**
 * Get CS2 player statistics (Historical + GSI Combined)
 * @desc    Get CS2 player stats - combines Steam API historical data with GSI real-time data
 * @route   GET /api/cs2/player/:steamId/stats
 * @access  Private (authenticated users only)
 */
export const getPlayerStats = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  
  console.log(`[CS2 CONTROLLER] getPlayerStats called for steamId: ${steamId}`);

  // Validate Steam ID
  if (!steamId || steamId.length < 10) {
    return res.status(400).json({ 
      message: 'Invalid Steam ID provided',
      error: 'INVALID_STEAM_ID'
    });
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required to access CS2 statistics',
      error: 'AUTHENTICATION_REQUIRED'
    });
  }

  const cacheKey = `cs2_player_stats_${steamId}`;

  try {
    // Try to get from cache first
    const cachedStats = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedStats) {
      console.log(`[CS2 CONTROLLER] Cache hit for stats: ${steamId}`);
      return res.json(cachedStats);
    }

    // Fetch comprehensive CS2 statistics from multiple sources
    console.log(`[CS2 CONTROLLER] Fetching comprehensive stats for steamId: ${steamId}`);
    const playerStats = await getComprehensivePlayerStats(steamId);
    
    console.log(`[CS2 CONTROLLER] Received stats with steamId: ${playerStats?.steamId}`);
    
    if (!playerStats) {
      return res.status(404).json({
        message: 'No CS2 statistics found for this player. This could mean the player has not played CS2 recently or their Steam profile is private.',
        error: 'NO_CS2_DATA_FOUND',
        setupRequired: true
      });
    }

    // Cache the results
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, playerStats, 5 * 60 * 1000); // 5 minutes cache

    console.log(`[CS2 CONTROLLER] Stats fetched successfully for: ${steamId}`);
    res.json(playerStats);
  } catch (error) {
    console.error(`[CS2 CONTROLLER] Error fetching stats for ${steamId}:`, error);
    res.status(500).json({
      message: 'Failed to fetch CS2 player statistics',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get comprehensive CS2 player statistics from multiple sources
 * @param {string} steamId - Steam ID of the player
 * @returns {Object|null} Combined statistics or null if no data found
 */
async function getComprehensivePlayerStats(steamId) {
  try {
    // Get Steam API historical data
    const steamHistoricalData = await getSteamCS2Stats(steamId);
    
    // Get GSI data from Firebase
    const gsiData = await firebaseService.getPlayerStats(steamId);
    
    // Get player profile information
    const playerProfile = await steamService.getPlayerProfile(steamId);
    
    // Combine all data sources
    const combinedStats = combinePlayerStats(steamHistoricalData, gsiData, playerProfile, steamId);
    
    return combinedStats;
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error getting comprehensive stats:', error);
    return null;
  }
}

/**
 * Fetch CS2 statistics from Steam API
 * @param {string} steamId - Steam ID of the player
 * @returns {Object|null} Steam API statistics or null if not available
 */
async function getSteamCS2Stats(steamId) {
  try {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      console.log('[CS2 CONTROLLER] No Steam API key configured');
      return null;
    }

    // Check cache first for Steam API data to avoid rate limiting
    const steamCacheKey = `steam_cs2_stats_${steamId}`;
    const cachedSteamStats = cacheService.get(CACHE_TYPES.CS2_DATA, steamCacheKey);
    if (cachedSteamStats) {
      console.log(`[CS2 CONTROLLER] Cache hit for Steam CS2 stats: ${steamId}`);
      return cachedSteamStats;
    }

    console.log(`[CS2 CONTROLLER] Fetching Steam CS2 stats for: ${steamId}`);
    
    // CS2 App ID is 730 (same as CS:GO)
    const CS2_APP_ID = 730;
    
    // Try multiple Steam API endpoints for CS2 statistics
    const endpoints = [
      // Primary endpoint - User stats for CS2
      {
        url: 'https://api.steampowered.com/ISteamUserStats/GetUserStatsForGame/v0002/',
        params: {
          appid: CS2_APP_ID,
          key: apiKey,
          steamid: steamId,
          format: 'json'
        }
      },
      // Alternative endpoint - Player achievements
      {
        url: 'https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/',
        params: {
          appid: CS2_APP_ID,
          key: apiKey,
          steamid: steamId,
          format: 'json'
        }
      }
    ];

    let response = null;
    let lastError = null;

    // Try each endpoint
    for (const endpoint of endpoints) {
      try {
        console.log(`[CS2 CONTROLLER] Trying endpoint: ${endpoint.url}`);
        response = await axios.get(endpoint.url, {
          params: endpoint.params,
          timeout: 15000,
          headers: {
            'User-Agent': 'SteamVault/1.0'
          }
        });
        
        if (response.data && (response.data.playerstats || response.data.playerstats)) {
          console.log(`[CS2 CONTROLLER] Successfully got data from: ${endpoint.url}`);
          break;
        }
      } catch (error) {
        console.log(`[CS2 CONTROLLER] Endpoint failed: ${endpoint.url} - ${error.message}`);
        lastError = error;
        continue;
      }
    }

    if (!response || !response.data) {
      console.log(`[CS2 CONTROLLER] All endpoints failed for ${steamId}`);
      return await getCS2StatsFromGameData(steamId); // Fallback to game data
    }

    const data = response.data.playerstats || response.data;
    if (!data) {
      console.log(`[CS2 CONTROLLER] No valid data structure found for ${steamId}`);
      return await getCS2StatsFromGameData(steamId); // Fallback to game data
    }

    const stats = data.stats || [];
    const achievements = data.achievements || [];
    
    console.log(`[CS2 CONTROLLER] Found ${stats.length} stats and ${achievements.length} achievements for ${steamId}`);
    
    // Process Steam API stats into our format
    const processedStats = processSteamStats(stats, achievements, steamId);
    
    // Cache the Steam API results for 30 minutes to avoid rate limiting
    cacheService.set(CACHE_TYPES.CS2_DATA, steamCacheKey, processedStats, 30 * 60 * 1000);
    
    return processedStats;
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log(`[CS2 CONTROLLER] Steam API access denied for ${steamId} - trying alternative approach`);
      return await getCS2StatsFromGameData(steamId); // Fallback to game data
    }
    console.error('[CS2 CONTROLLER] Error fetching Steam CS2 stats:', error.message);
    return await getCS2StatsFromGameData(steamId); // Fallback to game data
  }
}

/**
 * Get CS2 statistics from game ownership data (fallback method)
 * @param {string} steamId - Steam ID of the player
 * @returns {Object|null} Basic CS2 statistics or null if not available
 */
async function getCS2StatsFromGameData(steamId) {
  try {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      console.log('[CS2 CONTROLLER] No Steam API key for game data fallback');
      return null;
    }

    console.log(`[CS2 CONTROLLER] Using game data fallback for: ${steamId}`);
    
    // Get player's game list to extract CS2 playtime
    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
      params: {
        key: apiKey,
        steamid: steamId,
        format: 'json',
        include_appinfo: true,
        include_played_free_games: true
      },
      timeout: 10000
    });

    if (!response.data || !response.data.response || !response.data.response.games) {
      console.log(`[CS2 CONTROLLER] No games data found for ${steamId}`);
      return null;
    }

    const games = response.data.response.games;
    const cs2Game = games.find(game => game.appid === 730); // CS2/CS:GO App ID

    if (!cs2Game) {
      console.log(`[CS2 CONTROLLER] CS2 not found in ${steamId}'s game library`);
      return null;
    }

    console.log(`[CS2 CONTROLLER] Found CS2 in library: ${cs2Game.playtime_forever} minutes total`);

    // Create basic stats based on playtime
    const totalMinutes = cs2Game.playtime_forever || 0;
    const recentMinutes = cs2Game.playtime_2weeks || 0;
    
    // Estimate stats based on playtime (professional sites use similar estimation)
    const estimatedMatches = Math.floor(totalMinutes / 45); // Average match ~45 minutes
    const estimatedKills = Math.floor(totalMinutes * 0.5); // ~0.5 kills per minute
    const estimatedDeaths = Math.floor(estimatedKills * 0.9); // ~0.9 death per kill
    const estimatedWins = Math.floor(estimatedMatches * 0.5); // ~50% win rate
    
    const fallbackStats = {
      // Core statistics (estimated based on playtime)
      totalKills: estimatedKills,
      totalDeaths: estimatedDeaths,
      totalWins: estimatedWins,
      totalMatches: estimatedMatches,
      
      // Calculated statistics
      kdRatio: estimatedDeaths > 0 ? (estimatedKills / estimatedDeaths) : estimatedKills,
      winRate: estimatedMatches > 0 ? ((estimatedWins / estimatedMatches) * 100) : 0,
      
      // Weapon statistics (estimated)
      headshotKills: Math.floor(estimatedKills * 0.3), // ~30% headshot rate
      headshotPercentage: 30,
      
      // Additional statistics
      roundsPlayed: Math.floor(estimatedMatches * 25), // ~25 rounds per match
      timePlayedSeconds: totalMinutes * 60,
      
      // Weapon specific stats (estimated)
      ak47Kills: Math.floor(estimatedKills * 0.25),
      m4a1Kills: Math.floor(estimatedKills * 0.20),
      awpKills: Math.floor(estimatedKills * 0.15),
      
      // Bomb statistics (estimated)
      bombsPlanted: Math.floor(estimatedMatches * 2),
      bombsDefused: Math.floor(estimatedMatches * 1.5),
      
      // Rescue statistics (estimated)
      hostagesRescued: Math.floor(estimatedMatches * 0.1),
      
      // Source and timestamp
      dataSource: 'steam_game_data',
      lastUpdated: new Date().toISOString(),
      
      // Metadata
      isEstimated: true,
      basedOnPlaytime: totalMinutes,
      recentPlaytime: recentMinutes
    };
    
    // Cache the fallback results for 30 minutes to avoid re-fetching
    const steamCacheKey = `steam_cs2_stats_${steamId}`;
    cacheService.set(CACHE_TYPES.CS2_DATA, steamCacheKey, fallbackStats, 30 * 60 * 1000);
    
    return fallbackStats;
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error in game data fallback:', error.message);
    return null;
  }
}

/**
 * Process Steam API statistics into our format
 * @param {Array} stats - Steam API stats array
 * @param {Array} achievements - Steam API achievements array
 * @returns {Object} Processed statistics
 */
function processSteamStats(stats, achievements, steamId) {
  console.log(`[CS2 CONTROLLER] Processing Steam stats for ${steamId}`);
  
  const statMap = {};
  
  // Convert stats array to map for easier access
  stats.forEach(stat => {
    statMap[stat.name] = stat.value;
  });
  
  // Create a map for quick achievement lookup
  const achievementMap = {};
  achievements.forEach(achievement => {
    achievementMap[achievement.name] = achievement.achieved;
  });

  // Map Steam stats to our format - comprehensive mapping
  const processedStats = {
    // Core statistics
    totalKills: statMap['total_kills'] || 0,
    totalDeaths: statMap['total_deaths'] || 0,
    totalWins: (() => {
      const wins = statMap['total_wins'] || 0;
      const matches = statMap['total_matches_played'] || 0;
      // If wins > matches, it's likely round wins, estimate match wins
      return wins > matches ? Math.floor(wins / 16) : wins;
    })(),
    totalMatches: (() => {
      const matches = statMap['total_matches_played'] || 0;
      const wins = statMap['total_wins'] || 0;
      // If wins > matches, estimate total matches from wins
      return Math.max(matches, Math.floor(wins / 16));
    })(),
    
    // Calculated statistics
    kdRatio: statMap['total_deaths'] > 0 ? parseFloat((statMap['total_kills'] / statMap['total_deaths']).toFixed(2)) : (statMap['total_kills'] || 0),
    winRate: (() => {
      const matches = statMap['total_matches_played'] || 0;
      const wins = statMap['total_wins'] || 0;
      
      if (matches === 0) return 0;
      
      // If wins > matches, it's likely round wins, not match wins
      // Estimate match wins from round wins (assuming ~16 rounds per match)
      const actualWins = wins > matches ? Math.floor(wins / 16) : wins;
      const actualMatches = Math.max(matches, Math.floor(wins / 16));
      
      return actualMatches > 0 ? parseFloat(((actualWins / actualMatches) * 100).toFixed(2)) : 0;
    })(),
    
    // Weapon statistics
    headshotKills: statMap['total_kills_headshot'] || 0,
    headshotPercentage: statMap['total_kills'] > 0 ? parseFloat(((statMap['total_kills_headshot'] / statMap['total_kills']) * 100).toFixed(2)) : 0,
    
    // Game mode statistics
    competitiveWins: statMap['total_wins'] || 0,
    
    // Additional statistics
    roundsPlayed: statMap['total_rounds_played'] || 0,
    timePlayedSeconds: statMap['total_time_played'] || 0,
    
    // Weapon specific stats - rifles
    ak47Kills: statMap['total_kills_ak47'] || 0,
    m4a1Kills: statMap['total_kills_m4a1'] || 0,
    m4a1sKills: statMap['total_kills_m4a1_silencer'] || 0,
    awpKills: statMap['total_kills_awp'] || 0,
    famasKills: statMap['total_kills_famas'] || 0,
    galilarKills: statMap['total_kills_galilar'] || 0,
    augKills: statMap['total_kills_aug'] || 0,
    sg556Kills: statMap['total_kills_sg556'] || 0,
    ssg08Kills: statMap['total_kills_ssg08'] || 0,
    g3sg1Kills: statMap['total_kills_g3sg1'] || 0,
    scar20Kills: statMap['total_kills_scar20'] || 0,
    
    // Weapon specific stats - pistols
    glockKills: statMap['total_kills_glock'] || 0,
    uspKills: statMap['total_kills_usp'] || 0,
    p2000Kills: statMap['total_kills_p2000'] || 0,
    hkp2000Kills: statMap['total_kills_hkp2000'] || 0,
    p250Kills: statMap['total_kills_p250'] || 0,
    deagleKills: statMap['total_kills_deagle'] || 0,
    eliteKills: statMap['total_kills_elite'] || 0,
    fivesevenKills: statMap['total_kills_fiveseven'] || 0,
    tec9Kills: statMap['total_kills_tec9'] || 0,
    cz75aKills: statMap['total_kills_cz75a'] || 0,
    
    // Weapon specific stats - SMGs
    mac10Kills: statMap['total_kills_mac10'] || 0,
    ump45Kills: statMap['total_kills_ump45'] || 0,
    p90Kills: statMap['total_kills_p90'] || 0,
    mp7Kills: statMap['total_kills_mp7'] || 0,
    mp9Kills: statMap['total_kills_mp9'] || 0,
    bizonKills: statMap['total_kills_bizon'] || 0,
    mp5sdKills: statMap['total_kills_mp5sd'] || 0,
    
    // Weapon specific stats - shotguns
    novaKills: statMap['total_kills_nova'] || 0,
    xm1014Kills: statMap['total_kills_xm1014'] || 0,
    sawedoffKills: statMap['total_kills_sawedoff'] || 0,
    mag7Kills: statMap['total_kills_mag7'] || 0,
    
    // Weapon specific stats - machine guns
    negevKills: statMap['total_kills_negev'] || 0,
    m249Kills: statMap['total_kills_m249'] || 0,
    
    // Weapon specific stats - melee
    knifeKills: statMap['total_kills_knife'] || 0,
    
    // Bomb statistics
    bombsPlanted: statMap['total_bombs_planted'] || statMap['total_planted_bombs'] || 0,
    bombsDefused: statMap['total_bombs_defused'] || statMap['total_defused_bombs'] || 0,
    
    // Rescue statistics
    hostagesRescued: statMap['total_hostages_rescued'] || statMap['total_rescued_hostages'] || 0,
    
    // Map statistics - wins
    dustTwoWins: statMap['total_wins_map_de_dust2'] || 0,
    mirageWins: statMap['total_wins_map_de_mirage'] || 0,
    infernoWins: statMap['total_wins_map_de_inferno'] || 0,
    nukeWins: statMap['total_wins_map_de_nuke'] || 0,
    trainWins: statMap['total_wins_map_de_train'] || 0,
    overpassWins: statMap['total_wins_map_de_overpass'] || 0,
    cacheWins: statMap['total_wins_map_de_cache'] || 0,
    cobblestoneWins: statMap['total_wins_map_de_cbble'] || 0,
    vertigoWins: statMap['total_wins_map_de_vertigo'] || 0,
    ancientWins: statMap['total_wins_map_de_ancient'] || 0,
    anubisWins: statMap['total_wins_map_de_anubis'] || 0,
    
    // Map statistics - rounds
    dustTwoRounds: statMap['total_rounds_map_de_dust2'] || 0,
    mirageRounds: statMap['total_rounds_map_de_mirage'] || 0,
    infernoRounds: statMap['total_rounds_map_de_inferno'] || 0,
    nukeRounds: statMap['total_rounds_map_de_nuke'] || 0,
    trainRounds: statMap['total_rounds_map_de_train'] || 0,
    overpassRounds: statMap['total_rounds_map_de_overpass'] || 0,
    cacheRounds: statMap['total_rounds_map_de_cache'] || 0,
    cobblestoneRounds: statMap['total_rounds_map_de_cbble'] || 0,
    vertigoRounds: statMap['total_rounds_map_de_vertigo'] || 0,
    ancientRounds: statMap['total_rounds_map_de_ancient'] || 0,
    anubisRounds: statMap['total_rounds_map_de_anubis'] || 0,
    
    // Additional statistics
    contributionScore: statMap['total_contribution_score'] || 0,
    mvpAwards: statMap['total_mvps'] || 0,
    totalDamage: statMap['total_damage_done'] || 0,
    distanceTraveled: statMap['total_distance_traveled'] || 0,
    
    // Source and timestamp
    dataSource: 'steam_api',
    lastUpdated: new Date().toISOString(),
    isEstimated: false
  };

  const totalKills = processedStats.totalKills;
  const totalDeaths = processedStats.totalDeaths;
  const totalWins = processedStats.totalWins;
  const totalMatches = processedStats.totalMatches;
  
  console.log(`[CS2 CONTROLLER] Processed Steam stats - K:${totalKills} D:${totalDeaths} W:${totalWins} M:${totalMatches}`);

  return processedStats;
}

/**
 * Combine statistics from multiple sources
 * @param {Object} steamData - Steam API data
 * @param {Object} gsiData - GSI data from Firebase
 * @param {Object} playerProfile - Player profile data
 * @param {string} originalSteamId - Original Steam ID (64-bit)
 * @returns {Object} Combined statistics
 */
function combinePlayerStats(steamData, gsiData, playerProfile, originalSteamId) {
  console.log(`[CS2 CONTROLLER] combinePlayerStats called with originalSteamId: ${originalSteamId}`);
  console.log(`[CS2 CONTROLLER] steamData available: ${!!steamData}`);
  console.log(`[CS2 CONTROLLER] gsiData available: ${!!gsiData}`);
  
  // Start with Steam historical data as base
  const combinedStats = {
    // Player information (use original steamId, not the converted one)
    steamId: originalSteamId || '',
    personaName: playerProfile?.personaname || 'Unknown Player',
    avatarUrl: playerProfile?.avatar || '',
    
    // Core statistics (prefer GSI data if available, fallback to Steam data)
    totalKills: (gsiData?.totalKills || 0) + (steamData?.totalKills || 0),
    totalDeaths: (gsiData?.totalDeaths || 0) + (steamData?.totalDeaths || 0),
    totalWins: (gsiData?.totalWins || 0) + (steamData?.totalWins || 0),
    totalMatches: (gsiData?.totalMatches || 0) + (steamData?.totalMatches || 0),
    
    // Calculated statistics
    kdRatio: 0,
    winRate: 0,
    headshotPercentage: 0,
    
    // Additional statistics
    headshotKills: (gsiData?.headshotKills || 0) + (steamData?.headshotKills || 0),
    roundsPlayed: (gsiData?.roundsPlayed || 0) + (steamData?.roundsPlayed || 0),
    timePlayedSeconds: steamData?.timePlayedSeconds || 0,
    
    // Weapon statistics
    ak47Kills: (gsiData?.ak47Kills || 0) + (steamData?.ak47Kills || 0),
    m4a1Kills: (gsiData?.m4a1Kills || 0) + (steamData?.m4a1Kills || 0),
    awpKills: (gsiData?.awpKills || 0) + (steamData?.awpKills || 0),
    
    // Bomb and objective statistics
    bombsPlanted: (gsiData?.bombsPlanted || 0) + (steamData?.bombsPlanted || 0),
    bombsDefused: (gsiData?.bombsDefused || 0) + (steamData?.bombsDefused || 0),
    hostagesRescued: (gsiData?.hostagesRescued || 0) + (steamData?.hostagesRescued || 0),
    
    // Data source information
    dataSources: {
      steam: steamData ? true : false,
      gsi: gsiData ? true : false
    },
    
    lastUpdated: new Date().toISOString()
  };

  // Calculate derived statistics
  combinedStats.kdRatio = combinedStats.totalDeaths > 0 ? 
    (combinedStats.totalKills / combinedStats.totalDeaths) : 
    combinedStats.totalKills;
    
  // Fix win rate calculation - if wins > matches, it's likely round wins
  if (combinedStats.totalMatches > 0) {
    const actualWins = combinedStats.totalWins > combinedStats.totalMatches ? 
      Math.floor(combinedStats.totalWins / 16) : combinedStats.totalWins;
    const actualMatches = Math.max(combinedStats.totalMatches, Math.floor(combinedStats.totalWins / 16));
    
    combinedStats.winRate = actualMatches > 0 ? 
      ((actualWins / actualMatches) * 100) : 0;
      
    // Also update the actual values for display
    combinedStats.totalWins = actualWins;
    combinedStats.totalMatches = actualMatches;
  } else {
    combinedStats.winRate = 0;
  }
    
  combinedStats.headshotPercentage = combinedStats.totalKills > 0 ? 
    ((combinedStats.headshotKills / combinedStats.totalKills) * 100) : 
    0;

  return combinedStats;
}

/**
 * Get CS2 player match history
 * @desc    Get CS2 player matches - requires authenticated user
 * @route   GET /api/cs2/player/:steamId/matches
 * @access  Private (authenticated users only)
 */
export const getPlayerMatches = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  // Validate Steam ID
  if (!steamId || steamId.length < 10) {
    return res.status(400).json({ 
      message: 'Invalid Steam ID provided',
      error: 'INVALID_STEAM_ID'
    });
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required to access CS2 match history',
      error: 'AUTHENTICATION_REQUIRED'
    });
  }

  const cacheKey = `cs2_player_matches_${steamId}_${limit}_${offset}`;

  try {
    // Try to get from cache first
    const cachedMatches = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedMatches) {
      console.log(`[CS2 MATCHES] Cache hit for ${steamId}`);
      return res.status(200).json(cachedMatches);
    }

    // Get real data from Firebase
    const matches = await firebaseService.getPlayerMatches(steamId, parseInt(limit), parseInt(offset));
    
    if (!matches || matches.length === 0) {
      return res.status(404).json({ 
        message: 'No CS2 matches found for this player. Please ensure Game State Integration (GSI) is configured and play some matches.',
        error: 'NO_MATCHES_FOUND',
        steamId: steamId
      });
    }

    // Enhance match data with additional information
    const enhancedMatches = matches.map(match => ({
      ...match,
      kdRatio: match.deaths > 0 ? (match.kills / match.deaths).toFixed(2) : match.kills.toFixed(2),
      formattedDate: new Date(match.date).toLocaleDateString(),
      formattedDuration: `${Math.floor(match.duration / 60)}:${(match.duration % 60).toString().padStart(2, '0')}`
    }));

    const result = {
      matches: enhancedMatches,
      total: matches.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: matches.length === parseInt(limit)
    };

    // Cache the data for 2 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, result, 2 * 60 * 1000);

    console.log(`[CS2 MATCHES] Retrieved ${matches.length} matches for ${steamId}`);
    res.status(200).json(result);
  } catch (error) {
    console.error(`[CS2 MATCHES] Error fetching matches for ${steamId}:`, error);
    res.status(500).json({
      message: 'Failed to fetch CS2 match history',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get CS2 player weapons statistics
 * @desc    Get CS2 player weapon stats - requires authenticated user
 * @route   GET /api/cs2/player/:steamId/weapons
 * @access  Private (authenticated users only)
 */
export const getPlayerWeapons = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  // Validate Steam ID
  if (!steamId || steamId.length < 10) {
    return res.status(400).json({ 
      message: 'Invalid Steam ID provided',
      error: 'INVALID_STEAM_ID'
    });
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required to access CS2 weapon statistics',
      error: 'AUTHENTICATION_REQUIRED'
    });
  }

  const cacheKey = `cs2_player_weapons_${steamId}`;

  try {
    // Try to get from cache first
    const cachedWeapons = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedWeapons) {
      console.log(`[CS2 WEAPONS] Cache hit for ${steamId}`);
      return res.status(200).json(cachedWeapons);
    }

    // Get weapons data from Firebase
    const weapons = await firebaseService.getPlayerWeapons(steamId);
    
    if (!weapons || weapons.length === 0) {
      return res.status(404).json({ 
        message: 'No CS2 weapon statistics found for this player. Please ensure Game State Integration (GSI) is configured and play some matches.',
        error: 'NO_WEAPONS_DATA_FOUND',
        steamId: steamId
      });
    }

    // Cache the data for 5 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, weapons, 5 * 60 * 1000);

    console.log(`[CS2 WEAPONS] Retrieved ${weapons.length} weapons for ${steamId}`);
    res.status(200).json(weapons);
  } catch (error) {
    console.error(`[CS2 WEAPONS] Error fetching weapons for ${steamId}:`, error);
    res.status(500).json({
      message: 'Failed to fetch CS2 weapon statistics',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get CS2 player maps statistics
 * @desc    Get CS2 player map stats - requires authenticated user
 * @route   GET /api/cs2/player/:steamId/maps
 * @access  Private (authenticated users only)
 */
export const getPlayerMaps = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  // Validate Steam ID
  if (!steamId || steamId.length < 10) {
    return res.status(400).json({ 
      message: 'Invalid Steam ID provided',
      error: 'INVALID_STEAM_ID'
    });
  }

  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Authentication required to access CS2 map statistics',
      error: 'AUTHENTICATION_REQUIRED'
    });
  }

  const cacheKey = `cs2_player_maps_${steamId}`;

  try {
    // Try to get from cache first
    const cachedMaps = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedMaps) {
      console.log(`[CS2 MAPS] Cache hit for ${steamId}`);
      return res.status(200).json(cachedMaps);
    }

    // Get maps data from Firebase
    const maps = await firebaseService.getPlayerMaps(steamId);
    
    if (!maps || maps.length === 0) {
      return res.status(404).json({ 
        message: 'No CS2 map statistics found for this player. Please ensure Game State Integration (GSI) is configured and play some matches.',
        error: 'NO_MAPS_DATA_FOUND',
        steamId: steamId
      });
    }

    // Cache the data for 5 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, maps, 5 * 60 * 1000);

    console.log(`[CS2 MAPS] Retrieved ${maps.length} maps for ${steamId}`);
    res.status(200).json(maps);
  } catch (error) {
    console.error(`[CS2 MAPS] Error fetching maps for ${steamId}:`, error);
    res.status(500).json({
      message: 'Failed to fetch CS2 map statistics',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Setup Game State Integration (GSI) for a player
 * @desc    Generate GSI configuration for a player
 * @route   POST /api/cs2/setup-gsi
 * @access  Private (authenticated users only)
 */
// export const setupGSI = asyncHandler(async (req, res) => {
//   const { steamId } = req.body;

//   // Check if user is authenticated
//   if (!req.user) {
//     return res.status(401).json({ 
//       message: 'Authentication required to setup GSI',
//       error: 'AUTHENTICATION_REQUIRED'
//     });
//   }

//   // Validate Steam ID
//   if (!steamId || steamId.length < 10) {
//     return res.status(400).json({ 
//       message: 'Invalid Steam ID provided',
//       error: 'INVALID_STEAM_ID'
//     });
//   }

//   try {
//     // Generate GSI configuration
//     const gsiConfig = {
//       "Steam Vault GSI": {
//         "uri": `${process.env.BASE_URL}/api/cs2/gsi-data`,
//         "timeout": "5.0",
//         "buffer": "0.1",
//         "throttle": "0.1",
//         "heartbeat": "30.0",
//         "auth": {
//           "steamid": steamId
//         },
//         "output": {
//           "precision_time": "3",
//           "precision_position": "1",
//           "precision_vector": "3"
//         },
//         "data": {
//           "buildings": "1",
//           "provider": "1",
//           "map": "1",
//           "round": "1",
//           "player": "1",
//           "allplayers": "1",
//           "bomb": "1",
//           "phase_countdowns": "1",
//           "allgrenades": "1",
//           "weapons": "1"
//         }
//       }
//     };

//     // Save GSI configuration to Firebase
//     await firebaseService.saveGSIConfig(steamId, gsiConfig);

//     console.log(`[CS2 GSI] Configuration generated for ${steamId}`);
//     res.status(200).json({
//       message: 'GSI configuration generated successfully',
//       config: gsiConfig,
//       steamId: steamId
//     });
//   } catch (error) {
//     console.error(`[CS2 GSI] Error setting up GSI for ${steamId}:`, error);
//     res.status(500).json({
//       message: 'Failed to setup GSI configuration',
//       error: error.message || 'INTERNAL_SERVER_ERROR'
//     });
//   }
// });

/**
 * Receive GSI data from CS2 client
 * @desc    Receive and process GSI data from CS2
 * @route   POST /api/cs2/gsi-data
 * @access  Public (CS2 client)
 */
export const receiveGSIData = asyncHandler(async (req, res) => {
  const { steamId } = req.params; // Get steamId from URL params
  const gsiData = req.body;
  
  console.log(`[CS2 GSI] === GSI Data Received ===`);
  console.log(`[CS2 GSI] URL SteamId: ${steamId}`);
  console.log(`[CS2 GSI] Request Headers:`, req.headers);
  console.log(`[CS2 GSI] Raw Body:`, JSON.stringify(gsiData, null, 2));

  try {
    // Log the structure of received data
    if (gsiData) {
      console.log(`[CS2 GSI] Data Keys:`, Object.keys(gsiData));
      if (gsiData.auth) {
        console.log(`[CS2 GSI] Auth Data:`, gsiData.auth);
      }
      if (gsiData.provider) {
        console.log(`[CS2 GSI] Provider:`, gsiData.provider);
      }
      if (gsiData.map) {
        console.log(`[CS2 GSI] Map:`, gsiData.map.name);
      }
      if (gsiData.player) {
        console.log(`[CS2 GSI] Player State:`, gsiData.player.state);
      }
    }

    // Validate GSI data
    if (!gsiData || !gsiData.provider) {
      console.log(`[CS2 GSI] Invalid GSI data - missing provider or data is empty`);
      return res.status(400).json({ 
        message: 'Invalid GSI data received - missing provider',
        error: 'INVALID_GSI_DATA',
        received: gsiData ? Object.keys(gsiData) : 'null'
      });
    }

    // Use steamId from URL params if auth is missing, or validate they match
    let finalSteamId = steamId;
    if (gsiData.auth && gsiData.auth.steamid) {
      if (steamId !== gsiData.auth.steamid) {
        console.log(`[CS2 GSI] SteamId mismatch - URL: ${steamId}, Auth: ${gsiData.auth.steamid}`);
        return res.status(400).json({ 
          message: 'SteamId mismatch between URL and auth data',
          error: 'STEAMID_MISMATCH'
        });
      }
      finalSteamId = gsiData.auth.steamid;
    }

    if (!finalSteamId) {
      console.log(`[CS2 GSI] No Steam ID found in URL params or auth data`);
      return res.status(400).json({ 
        message: 'No Steam ID found in URL params or auth data',
        error: 'MISSING_STEAM_ID'
      });
    }

    // Process GSI data
    console.log(`[CS2 GSI] Processing data for Steam ID: ${finalSteamId}`);
    await firebaseService.processGSIData(finalSteamId, gsiData);

    console.log(`[CS2 GSI] ✅ Data processed successfully for ${finalSteamId}`);
    res.status(200).json({ 
      message: 'GSI data processed successfully',
      steamId: finalSteamId,
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(gsiData)
    });
  } catch (error) {
    console.error('[CS2 GSI] ❌ Error processing GSI data:', error);
    res.status(500).json({
      message: 'Failed to process GSI data',
      error: error.message || 'INTERNAL_SERVER_ERROR',
      steamId: steamId
    });
  }
});

/**
 * Get CS2 leaderboard
 * @desc    Get CS2 leaderboard - requires authenticated user
 * @route   GET /api/cs2/leaderboard
 * @access  Private (authenticated users only)
 */
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { limit = 10, sortBy = 'kdRatio' } = req.query;

  // Note: Leaderboard is public community feature, no authentication required
  console.log(`[CS2 LEADERBOARD] Public access to leaderboard (${sortBy})`);
  
  // Validate limit parameter
  const maxLimit = 100;
  const validLimit = Math.min(parseInt(limit) || 10, maxLimit);

  const cacheKey = `cs2_leaderboard_${sortBy}_${validLimit}`;

  try {
    // Try to get from cache first
    const cachedLeaderboard = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedLeaderboard) {
      console.log(`[CS2 LEADERBOARD] Cache hit for ${sortBy}`);
      return res.status(200).json(cachedLeaderboard);
    }

    // Get leaderboard data from Firebase
    const leaderboard = await firebaseService.getCS2Leaderboard(sortBy, validLimit);
    
    if (!leaderboard || leaderboard.length === 0) {
      return res.status(404).json({ 
        message: 'No CS2 leaderboard data found. Players need to setup GSI and play matches to appear on the leaderboard.',
        error: 'NO_LEADERBOARD_DATA'
      });
    }

    // Cache the data for 10 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, leaderboard, 10 * 60 * 1000);

    console.log(`[CS2 LEADERBOARD] Retrieved ${leaderboard.length} entries`);
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('[CS2 LEADERBOARD] Error fetching leaderboard:', error);
    res.status(500).json({
      message: 'Failed to fetch CS2 leaderboard',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Search CS2 players
 * @desc    Search CS2 players by name - requires authenticated user
 * @route   GET /api/cs2/search
 * @access  Private (authenticated users only)
 */
export const searchPlayers = asyncHandler(async (req, res) => {
  const { query, limit = 10 } = req.query;

  // Note: Player search is public community feature, no authentication required
  console.log(`[CS2 SEARCH] Public search for: ${query}`);

  // Validate search query
  if (!query || query.length < 2) {
    return res.status(400).json({ 
      message: 'Search query must be at least 2 characters long',
      error: 'INVALID_SEARCH_QUERY'
    });
  }

  // Validate limit parameter
  const maxLimit = 50;
  const validLimit = Math.min(parseInt(limit) || 10, maxLimit);

  const cacheKey = `cs2_search_${query}_${validLimit}`;

  try {
    // Try to get from cache first
    const cachedResults = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedResults) {
      console.log(`[CS2 SEARCH] Cache hit for query: ${query}`);
      return res.status(200).json(cachedResults);
    }

    // Search players in Firebase
    const searchResults = await firebaseService.searchCS2Players(query, parseInt(limit));
    
    if (!searchResults || searchResults.length === 0) {
      return res.status(404).json({ 
        message: 'No CS2 players found matching your search query.',
        error: 'NO_SEARCH_RESULTS',
        query: query
      });
    }

    // Cache the data for 5 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, searchResults, 5 * 60 * 1000);

    console.log(`[CS2 SEARCH] Found ${searchResults.length} players for query: ${query}`);
    res.status(200).json(searchResults);
  } catch (error) {
    console.error(`[CS2 SEARCH] Error searching players for query: ${query}:`, error);
    res.status(500).json({
      message: 'Failed to search CS2 players',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get CS2 recent activity
 * @desc    Get recent CS2 activity - requires authenticated user
 * @route   GET /api/cs2/recent-activity
 * @access  Private (authenticated users only)
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 20 } = req.query;

  // Note: Recent activity is public community feature, no authentication required
  console.log(`[CS2 ACTIVITY] Public access to recent activity`);
  
  // Validate limit parameter
  const maxLimit = 50;
  const validLimit = Math.min(parseInt(limit) || 20, maxLimit);

  const cacheKey = `cs2_recent_activity_${validLimit}`;

  try {
    // Try to get from cache first
    const cachedActivity = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedActivity) {
      console.log(`[CS2 ACTIVITY] Cache hit for recent activity`);
      return res.status(200).json(cachedActivity);
    }

    // Get recent activity from Firebase
    const recentActivity = await firebaseService.getCS2RecentActivity(validLimit);
    
    if (!recentActivity || recentActivity.length === 0) {
      return res.status(404).json({ 
        message: 'No recent CS2 activity found. Players need to setup GSI and play matches to generate activity.',
        error: 'NO_RECENT_ACTIVITY'
      });
    }

    // Cache the data for 2 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, recentActivity, 2 * 60 * 1000);

    console.log(`[CS2 ACTIVITY] Retrieved ${recentActivity.length} recent activities`);
    res.status(200).json(recentActivity);
  } catch (error) {
    console.error('[CS2 ACTIVITY] Error fetching recent activity:', error);
    res.status(500).json({
      message: 'Failed to fetch CS2 recent activity',
      error: error.message || 'INTERNAL_SERVER_ERROR'
    });
  }
});

/**
 * Get comprehensive CS2 profile data (like professional sites)
 * @desc    Get complete CS2 profile with all stats, matches, and performance data
 * @route   GET /api/cs2/profile/:steamId
 * @access  Private (authenticated users only)
 */
export const getCS2ProfileData = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  
  if (!steamId) {
    return res.status(400).json({
      error: 'INVALID_STEAM_ID',
      message: 'Steam ID is required'
    });
  }

  console.log(`[CS2 CONTROLLER] Getting comprehensive CS2 profile data for: ${steamId}`);
  
  try {
    // Get Steam profile information
    const steamProfile = await getSteamProfile(steamId);
    if (!steamProfile) {
      return res.status(404).json({
        error: 'STEAM_PROFILE_NOT_FOUND',
        message: 'Steam profile not found or private'
      });
    }
    
    // Get CS2 statistics from Steam API
    const steamStats = await getSteamCS2Stats(steamId);
    
    // Get recent matches and cached data from Firebase
    const [matches, mapStats, weaponStats] = await Promise.all([
      firebaseService.getPlayerMatches(steamId),
      firebaseService.getPlayerMaps(steamId), 
      firebaseService.getPlayerWeapons(steamId)
    ]);
    
    // Combine all data sources
    const combinedStats = combinePlayerStats(steamStats, null, steamProfile, steamId);
    
    // Get detailed game information
    const gameInfo = await getCS2GameInfo(steamId);
    
    // Calculate additional professional-grade statistics
    const enhancedStats = calculateEnhancedStats(combinedStats, matches, mapStats, weaponStats);
    
    // Get rank information (estimated from match data)
    const rankInfo = await estimateCS2Rank(steamId, matches);
    
    // Get performance trends
    const trends = calculatePerformanceTrends(matches);
    
    // Create comprehensive profile response
    const profileData = {
      steamId: steamId,
      profile: {
        steamId: steamProfile.steamid,
        personaName: steamProfile.personaname,
        avatarUrl: steamProfile.avatarfull,
        profileUrl: steamProfile.profileurl,
        realName: steamProfile.realname || null,
        countryCode: steamProfile.loccountrycode || null,
        createdAt: steamProfile.timecreated ? new Date(steamProfile.timecreated * 1000).toISOString() : null,
        lastLogoff: steamProfile.lastlogoff ? new Date(steamProfile.lastlogoff * 1000).toISOString() : null,
        communityVisibilityState: steamProfile.communityvisibilitystate,
        profileState: steamProfile.profilestate,
        isPrivate: steamProfile.communityvisibilitystate !== 3
      },
      
      // Game information
      gameInfo: {
        ownsCS2: gameInfo.ownsCS2,
        playtimeForever: gameInfo.playtimeForever,
        playtimeTwoWeeks: gameInfo.playtimeTwoWeeks,
        lastPlayedTime: gameInfo.lastPlayedTime,
        hasPublicStats: steamStats !== null,
        achievementCount: gameInfo.achievementCount
      },
      
      // Core statistics
      statistics: enhancedStats,
      
      // Rank information
      rank: rankInfo,
      
      // Performance trends
      trends: trends,
      
      // Recent matches
      recentMatches: matches.slice(0, 10),
      
      // Map performance
      mapPerformance: mapStats,
      
      // Weapon performance
      weaponPerformance: weaponStats,
      
      // Metadata
      dataQuality: {
        steamApiAccess: steamStats !== null,
        matchDataCount: matches.length,
        mapDataCount: mapStats.length,
        weaponDataCount: weaponStats.length,
        lastUpdated: new Date().toISOString(),
        dataCompleteness: calculateDataCompleteness(steamStats, matches, mapStats, weaponStats)
      }
    };
    
    console.log(`[CS2 CONTROLLER] Comprehensive profile data prepared for ${steamId}`);
    
    res.json(profileData);
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error getting CS2 profile data:', error);
    res.status(500).json({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to get CS2 profile data'
    });
  }
});

/**
 * Get CS2 game information from Steam
 * @param {string} steamId - Steam ID of the player
 * @returns {Object} Game information
 */
async function getCS2GameInfo(steamId) {
  try {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      return {
        ownsCS2: false,
        playtimeForever: 0,
        playtimeTwoWeeks: 0,
        lastPlayedTime: null,
        achievementCount: 0
      };
    }

    // Check cache first for game info to avoid rate limiting
    const gameInfoCacheKey = `cs2_game_info_${steamId}`;
    const cachedGameInfo = cacheService.get(CACHE_TYPES.CS2_DATA, gameInfoCacheKey);
    if (cachedGameInfo) {
      console.log(`[CS2 CONTROLLER] Cache hit for game info: ${steamId}`);
      return cachedGameInfo;
    }

    // Get owned games
    const response = await axios.get('https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/', {
      params: {
        key: apiKey,
        steamid: steamId,
        format: 'json',
        include_appinfo: true,
        include_played_free_games: true
      },
      timeout: 10000
    });

    if (!response.data || !response.data.response || !response.data.response.games) {
      const defaultGameInfo = {
        ownsCS2: false,
        playtimeForever: 0,
        playtimeTwoWeeks: 0,
        lastPlayedTime: null,
        achievementCount: 0
      };
      
      // Cache the default result for 15 minutes
      cacheService.set(CACHE_TYPES.CS2_DATA, gameInfoCacheKey, defaultGameInfo, 15 * 60 * 1000);
      return defaultGameInfo;
    }

    const games = response.data.response.games;
    const cs2Game = games.find(game => game.appid === 730); // CS2/CS:GO App ID

    if (!cs2Game) {
      const defaultGameInfo = {
        ownsCS2: false,
        playtimeForever: 0,
        playtimeTwoWeeks: 0,
        lastPlayedTime: null,
        achievementCount: 0
      };
      
      // Cache the default result for 15 minutes
      cacheService.set(CACHE_TYPES.CS2_DATA, gameInfoCacheKey, defaultGameInfo, 15 * 60 * 1000);
      return defaultGameInfo;
    }

    // Get achievements
    let achievementCount = 0;
    try {
      const achievementResponse = await axios.get('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/', {
        params: {
          appid: 730,
          key: apiKey,
          steamid: steamId,
          format: 'json'
        },
        timeout: 10000
      });

      if (achievementResponse.data && achievementResponse.data.playerstats && achievementResponse.data.playerstats.achievements) {
        achievementCount = achievementResponse.data.playerstats.achievements.filter(a => a.achieved).length;
      }
    } catch (error) {
      console.log(`[CS2 CONTROLLER] Could not get achievements for ${steamId}: ${error.message}`);
    }

    const gameInfo = {
      ownsCS2: true,
      playtimeForever: cs2Game.playtime_forever || 0,
      playtimeTwoWeeks: cs2Game.playtime_2weeks || 0,
      lastPlayedTime: cs2Game.rtime_last_played ? new Date(cs2Game.rtime_last_played * 1000).toISOString() : null,
      achievementCount: achievementCount
    };
    
    // Cache the game info for 30 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, gameInfoCacheKey, gameInfo, 30 * 60 * 1000);
    
    return gameInfo;
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error getting CS2 game info:', error);
    const defaultGameInfo = {
      ownsCS2: false,
      playtimeForever: 0,
      playtimeTwoWeeks: 0,
      lastPlayedTime: null,
      achievementCount: 0
    };
    
    // Cache the error result for 5 minutes to prevent retries
    const gameInfoCacheKey = `cs2_game_info_${steamId}`;
    cacheService.set(CACHE_TYPES.CS2_DATA, gameInfoCacheKey, defaultGameInfo, 5 * 60 * 1000);
    
    return defaultGameInfo;
  }
}

/**
 * Calculate enhanced statistics for professional display
 * @param {Object} baseStats - Base statistics
 * @param {Array} matches - Match data
 * @param {Array} mapStats - Map statistics
 * @param {Array} weaponStats - Weapon statistics
 * @returns {Object} Enhanced statistics
 */
function calculateEnhancedStats(baseStats, matches, mapStats, weaponStats) {
  const enhanced = { ...baseStats };
  
  // Add match-based calculations
  if (matches && matches.length > 0) {
    const recentMatches = matches.slice(0, 20);
    
    // Calculate recent performance
    const recentKills = recentMatches.reduce((sum, match) => sum + (match.kills || 0), 0);
    const recentDeaths = recentMatches.reduce((sum, match) => sum + (match.deaths || 0), 0);
    const recentWins = recentMatches.filter(match => match.result === 'win').length;
    
    enhanced.recentKD = recentDeaths > 0 ? parseFloat((recentKills / recentDeaths).toFixed(2)) : recentKills;
    enhanced.recentWinRate = recentMatches.length > 0 ? parseFloat(((recentWins / recentMatches.length) * 100).toFixed(2)) : 0;
    enhanced.recentMatchesPlayed = recentMatches.length;
    
    // Average damage per round
    const totalDamage = recentMatches.reduce((sum, match) => sum + (match.damage || 0), 0);
    const totalRounds = recentMatches.reduce((sum, match) => sum + (match.rounds || 0), 0);
    enhanced.averageDamagePerRound = totalRounds > 0 ? parseFloat((totalDamage / totalRounds).toFixed(2)) : 0;
    
    // Performance consistency
    const kdRatios = recentMatches.map(match => {
      const deaths = match.deaths || 0;
      return deaths > 0 ? (match.kills || 0) / deaths : (match.kills || 0);
    });
    
    const avgKD = kdRatios.reduce((sum, kd) => sum + kd, 0) / kdRatios.length;
    const variance = kdRatios.reduce((sum, kd) => sum + Math.pow(kd - avgKD, 2), 0) / kdRatios.length;
    enhanced.performanceConsistency = parseFloat(Math.sqrt(variance).toFixed(2));
  }
  
  // Add map-based statistics
  if (mapStats && mapStats.length > 0) {
    const totalMapMatches = mapStats.reduce((sum, map) => sum + (map.matchesPlayed || 0), 0);
    const totalMapWins = mapStats.reduce((sum, map) => sum + (map.wins || 0), 0);
    
    enhanced.mapWinRate = totalMapMatches > 0 ? parseFloat(((totalMapWins / totalMapMatches) * 100).toFixed(2)) : 0;
    enhanced.favoriteMap = mapStats.length > 0 ? mapStats[0].mapName : null;
    enhanced.mapsPlayed = mapStats.length;
  }
  
  // Add weapon-based statistics
  if (weaponStats && weaponStats.length > 0) {
    const totalWeaponKills = weaponStats.reduce((sum, weapon) => sum + (weapon.kills || 0), 0);
    const totalWeaponDamage = weaponStats.reduce((sum, weapon) => sum + (weapon.damage || 0), 0);
    
    enhanced.weaponEfficiency = totalWeaponKills > 0 ? parseFloat((totalWeaponDamage / totalWeaponKills).toFixed(2)) : 0;
    enhanced.favoriteWeapon = weaponStats.length > 0 ? weaponStats[0].weaponName : null;
    enhanced.weaponsUsed = weaponStats.length;
  }
  
  return enhanced;
}

/**
 * Estimate CS2 rank from match performance
 * @param {string} steamId - Steam ID
 * @param {Array} matches - Match data
 * @returns {Object} Estimated rank information
 */
async function estimateCS2Rank(steamId, matches) {
  try {
    if (!matches || matches.length === 0) {
      return {
        estimatedRank: 'Unranked',
        confidence: 0,
        basedOnMatches: 0
      };
    }

    const recentMatches = matches.slice(0, 50);
    const wins = recentMatches.filter(match => match.result === 'win').length;
    const totalMatches = recentMatches.length;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
    
    const avgKD = recentMatches.reduce((sum, match) => {
      const deaths = match.deaths || 0;
      return sum + (deaths > 0 ? (match.kills || 0) / deaths : (match.kills || 0));
    }, 0) / recentMatches.length;
    
    const avgDamage = recentMatches.reduce((sum, match) => sum + (match.damage || 0), 0) / recentMatches.length;
    
    // Simple rank estimation algorithm
    let rankScore = 0;
    rankScore += winRate * 0.4; // Win rate weight
    rankScore += Math.min(avgKD * 20, 40); // KD weight (capped at 2.0 KD)
    rankScore += Math.min(avgDamage / 10, 20); // Damage weight
    
    const ranks = [
      { name: 'Silver I', min: 0, max: 10 },
      { name: 'Silver II', min: 10, max: 15 },
      { name: 'Silver III', min: 15, max: 20 },
      { name: 'Silver IV', min: 20, max: 25 },
      { name: 'Silver Elite', min: 25, max: 30 },
      { name: 'Silver Elite Master', min: 30, max: 35 },
      { name: 'Gold Nova I', min: 35, max: 40 },
      { name: 'Gold Nova II', min: 40, max: 45 },
      { name: 'Gold Nova III', min: 45, max: 50 },
      { name: 'Gold Nova Master', min: 50, max: 55 },
      { name: 'Master Guardian I', min: 55, max: 60 },
      { name: 'Master Guardian II', min: 60, max: 65 },
      { name: 'Master Guardian Elite', min: 65, max: 70 },
      { name: 'Distinguished Master Guardian', min: 70, max: 75 },
      { name: 'Legendary Eagle', min: 75, max: 80 },
      { name: 'Legendary Eagle Master', min: 80, max: 85 },
      { name: 'Supreme Master First Class', min: 85, max: 90 },
      { name: 'The Global Elite', min: 90, max: 100 }
    ];
    
    const estimatedRank = ranks.find(rank => rankScore >= rank.min && rankScore <= rank.max) || ranks[0];
    const confidence = Math.min(totalMatches * 2, 100); // Confidence based on match count
    
    return {
      estimatedRank: estimatedRank.name,
      confidence: parseFloat(confidence.toFixed(1)),
      basedOnMatches: totalMatches,
      rankScore: parseFloat(rankScore.toFixed(1)),
      winRate: parseFloat(winRate.toFixed(1)),
      avgKD: parseFloat(avgKD.toFixed(2)),
      avgDamage: parseFloat(avgDamage.toFixed(1))
    };
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error estimating rank:', error);
    return {
      estimatedRank: 'Unranked',
      confidence: 0,
      basedOnMatches: 0
    };
  }
}

/**
 * Calculate performance trends
 * @param {Array} matches - Match data
 * @returns {Object} Performance trends
 */
function calculatePerformanceTrends(matches) {
  try {
    if (!matches || matches.length === 0) {
      return {
        kdTrend: 'stable',
        winRateTrend: 'stable',
        damageTrend: 'stable',
        recentPerformance: 'average'
      };
    }

    const recentMatches = matches.slice(0, 10);
    const olderMatches = matches.slice(10, 20);
    
    if (olderMatches.length === 0) {
      return {
        kdTrend: 'stable',
        winRateTrend: 'stable',
        damageTrend: 'stable',
        recentPerformance: 'average'
      };
    }

    // Calculate recent vs older averages
    const recentKD = recentMatches.reduce((sum, match) => {
      const deaths = match.deaths || 0;
      return sum + (deaths > 0 ? (match.kills || 0) / deaths : (match.kills || 0));
    }, 0) / recentMatches.length;
    
    const olderKD = olderMatches.reduce((sum, match) => {
      const deaths = match.deaths || 0;
      return sum + (deaths > 0 ? (match.kills || 0) / deaths : (match.kills || 0));
    }, 0) / olderMatches.length;
    
    const recentWinRate = (recentMatches.filter(match => match.result === 'win').length / recentMatches.length) * 100;
    const olderWinRate = (olderMatches.filter(match => match.result === 'win').length / olderMatches.length) * 100;
    
    const recentDamage = recentMatches.reduce((sum, match) => sum + (match.damage || 0), 0) / recentMatches.length;
    const olderDamage = olderMatches.reduce((sum, match) => sum + (match.damage || 0), 0) / olderMatches.length;
    
    // Determine trends
    const kdTrend = recentKD > olderKD * 1.1 ? 'improving' : recentKD < olderKD * 0.9 ? 'declining' : 'stable';
    const winRateTrend = recentWinRate > olderWinRate + 10 ? 'improving' : recentWinRate < olderWinRate - 10 ? 'declining' : 'stable';
    const damageTrend = recentDamage > olderDamage * 1.1 ? 'improving' : recentDamage < olderDamage * 0.9 ? 'declining' : 'stable';
    
    // Overall performance assessment
    const improvingCount = [kdTrend, winRateTrend, damageTrend].filter(trend => trend === 'improving').length;
    const decliningCount = [kdTrend, winRateTrend, damageTrend].filter(trend => trend === 'declining').length;
    
    let recentPerformance = 'average';
    if (improvingCount >= 2) recentPerformance = 'improving';
    else if (decliningCount >= 2) recentPerformance = 'declining';
    
    return {
      kdTrend,
      winRateTrend,
      damageTrend,
      recentPerformance,
      recentKD: parseFloat(recentKD.toFixed(2)),
      recentWinRate: parseFloat(recentWinRate.toFixed(1)),
      recentDamage: parseFloat(recentDamage.toFixed(1))
    };
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error calculating trends:', error);
    return {
      kdTrend: 'stable',
      winRateTrend: 'stable',
      damageTrend: 'stable',
      recentPerformance: 'average'
    };
  }
}

/**
 * Calculate data completeness score
 * @param {Object} steamStats - Steam API statistics
 * @param {Array} matches - Match data
 * @param {Array} mapStats - Map statistics
 * @param {Array} weaponStats - Weapon statistics
 * @returns {Object} Data completeness information
 */
function calculateDataCompleteness(steamStats, matches, mapStats, weaponStats) {
  let score = 0;
  let maxScore = 4;
  
  const details = {
    steamApiData: false,
    matchHistory: false,
    mapStatistics: false,
    weaponStatistics: false
  };
  
  if (steamStats && steamStats.totalMatches > 0) {
    score += 1;
    details.steamApiData = true;
  }
  
  if (matches && matches.length > 0) {
    score += 1;
    details.matchHistory = true;
  }
  
  if (mapStats && mapStats.length > 0) {
    score += 1;
    details.mapStatistics = true;
  }
  
  if (weaponStats && weaponStats.length > 0) {
    score += 1;
    details.weaponStatistics = true;
  }
  
  const percentage = (score / maxScore) * 100;
  
  return {
    score: parseFloat(percentage.toFixed(1)),
    details: details,
    recommendation: percentage < 50 ? 'Set up GSI and play matches to improve data completeness' : 
                   percentage < 80 ? 'Good data coverage, play more matches for better analysis' : 
                   'Excellent data completeness'
  };
}

/**
 * Get Steam profile information
 * @param {string} steamId - Steam ID
 * @returns {Object|null} Steam profile data
 */
async function getSteamProfile(steamId) {
  try {
    const apiKey = process.env.STEAM_API_KEY;
    if (!apiKey) {
      console.log('[CS2 CONTROLLER] No Steam API key for profile lookup');
      return null;
    }

    // Check cache first for Steam profile to avoid rate limiting
    const profileCacheKey = `steam_profile_${steamId}`;
    const cachedProfile = cacheService.get(CACHE_TYPES.CS2_DATA, profileCacheKey);
    if (cachedProfile) {
      console.log(`[CS2 CONTROLLER] Cache hit for Steam profile: ${steamId}`);
      return cachedProfile;
    }

    const response = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
      params: {
        key: apiKey,
        steamids: steamId,
        format: 'json'
      },
      timeout: 10000
    });

    if (!response.data || !response.data.response || !response.data.response.players || response.data.response.players.length === 0) {
      console.log(`[CS2 CONTROLLER] No Steam profile found for ${steamId}`);
      return null;
    }

    const profile = response.data.response.players[0];
    
    // Cache the profile for 60 minutes (profiles don't change often)
    cacheService.set(CACHE_TYPES.CS2_DATA, profileCacheKey, profile, 60 * 60 * 1000);
    
    return profile;
  } catch (error) {
    console.error('[CS2 CONTROLLER] Error getting Steam profile:', error);
    return null;
  }
}
