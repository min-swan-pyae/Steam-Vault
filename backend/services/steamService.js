import axios from 'axios';
import http from 'http';
import https from 'https';
import dotenv from 'dotenv';
import { cacheService, CACHE_TYPES } from './cacheService.js';
import { resilientFetch, TIMEOUTS } from '../utils/retryUtils.js';
import { getHeroName } from '../utils/dotaUtils.js';

dotenv.config();

// HTTP/HTTPS agents with connection pooling (keep-alive)
// This reuses TCP connections instead of creating new ones for each request
const httpAgent = new http.Agent({ 
  keepAlive: true, 
  maxSockets: 10,
  keepAliveMsecs: 30000 
});
const httpsAgent = new https.Agent({ 
  keepAlive: true, 
  maxSockets: 10,
  keepAliveMsecs: 30000 
});

// Steam API client
const steamApi = axios.create({
  baseURL: 'https://api.steampowered.com',
  timeout: TIMEOUTS.STEAM_API,
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate'
  },
  httpAgent,
  httpsAgent
});

// OpenDota API client (free tier, rate limited)
const openDotaApi = axios.create({
  baseURL: 'https://api.opendota.com/api',
  timeout: TIMEOUTS.OPENDOTA,
  headers: {
    'Accept': 'application/json',
    'Accept-Encoding': 'gzip, deflate'
  },
  httpAgent,
  httpsAgent
});

// Get Steam API key from environment
const getSteamApiKey = () => {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error('STEAM_API_KEY is not defined');
  }
  return apiKey;
};

// Convert 32-bit Steam ID to 64-bit if needed
const normalizeSteamId = (steamId) => {
  if (steamId.length < 16) {
    // Convert from 32-bit to 64-bit
    return (BigInt(steamId) + BigInt("76561197960265728")).toString();
  }
  return steamId;
};

// Convert 64-bit Steam ID to 32-bit account ID
const getAccountId = (steamId64) => {
  try {
    // Check if input is valid
    if (!steamId64) {
      console.error(`Invalid Steam ID format: ${steamId64}`);
      return null;
    }
    
    // Convert to string if it's a number
    const idString = steamId64.toString();
    
    // Try to convert the ID
    return (BigInt(idString) - BigInt("76561197960265728")).toString();
  } catch (error) {
    console.error(`Error converting Steam ID ${steamId64} to account ID:`, error.message);
    return null;
  }
};

const getSteamPersonaName = async (steamId64) => {
  try {
    const apiKey = getSteamApiKey();
    const profileRes = await steamApi.get('/ISteamUser/GetPlayerSummaries/v2/', {
      params: {
        key: apiKey,
        steamids: steamId64,
        format: 'json'
      }
    });
    return profileRes.data.response.players[0]?.personaname || "Anonymous";
  } catch (error) {
    console.error(`Error fetching persona name for Steam ID ${steamId64}:`, error.message);
    return null;
  }
};

/**
 * Get player's complete profile combining Steam and OpenDota data
 * @param {string} steamId - The Steam ID to look up
 * @param {boolean} isOwnProfile - Whether this is the authenticated user's own profile
 */
const getPlayerProfile = async (steamId, isOwnProfile = false) => {
  try {
    // Normalize IDs
    const steamId64 = normalizeSteamId(steamId);
    const accountId = getAccountId(steamId64);
    
    // Check cache first
    const cacheKey = `player_complete_${accountId}`;
    const cached = cacheService.get(CACHE_TYPES.PLAYER_DATA, cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get basic profile from Steam
    const apiKey = getSteamApiKey();
    const profileRes = await resilientFetch(
      () => steamApi.get('/ISteamUser/GetPlayerSummaries/v2/', {
        params: {
          key: apiKey,
          steamids: steamId64,
          format: 'json'
        }
      }),
      { 
        timeout: TIMEOUTS.STEAM_API,
        maxRetries: 1,  // Reduced from 3 - fail faster, cache will handle subsequent requests
        context: 'Steam GetPlayerSummaries'
      }
    );
    
    const profile = profileRes.data.response.players[0] || {};

    if (!profile.steamid) {
      const notFoundError = new Error('Player profile not found');
      notFoundError.statusCode = 404;
      notFoundError.code = 'PLAYER_NOT_FOUND';
      throw notFoundError;
    }

    const visibilityState = profile.communityvisibilitystate ?? 1;
    if (!isOwnProfile && visibilityState !== 3) {
      const privateError = new Error('This player profile is private');
      privateError.statusCode = 403;
      privateError.code = 'PRIVATE_PROFILE';
      throw privateError;
    }

    
    // Try to get extended profile from OpenDota - Run all calls in parallel for speed
    let openDotaProfile = {};
    try {
      // Execute all OpenDota calls in parallel - much faster!
      const [openDotaRes, wlRes, recentRes, heroesRes] = await Promise.allSettled([
        resilientFetch(
          () => openDotaApi.get(`/players/${accountId}`),
          { timeout: TIMEOUTS.OPENDOTA, maxRetries: 1, context: 'OpenDota GetPlayer' }
        ),
        resilientFetch(
          () => openDotaApi.get(`/players/${accountId}/wl`),
          { timeout: TIMEOUTS.OPENDOTA, maxRetries: 1, context: 'OpenDota GetWinLoss' }
        ),
        resilientFetch(
          () => openDotaApi.get(`/players/${accountId}/recentMatches`),
          { timeout: TIMEOUTS.OPENDOTA, maxRetries: 1, context: 'OpenDota RecentMatches' }
        ),
        resilientFetch(
          () => openDotaApi.get(`/players/${accountId}/heroes`),
          { timeout: TIMEOUTS.OPENDOTA, maxRetries: 1, context: 'OpenDota GetHeroes' }
        )
      ]);
      
      // Extract data from successful promises, use defaults for failures
      openDotaProfile = openDotaRes.status === 'fulfilled' ? openDotaRes.value.data || {} : {};
      openDotaProfile.win_lose = wlRes.status === 'fulfilled' ? wlRes.value.data || { win: 0, lose: 0 } : { win: 0, lose: 0 };
      openDotaProfile.recent_matches = recentRes.status === 'fulfilled' ? recentRes.value.data || [] : [];
      openDotaProfile.heroes = heroesRes.status === 'fulfilled' ? heroesRes.value.data || [] : [];
      
    } catch (error) {
      console.log('[PLAYER PROFILE] OpenDota API error:', error.message);
    }

    if (!openDotaProfile || !openDotaProfile.profile) {
      const noDataError = new Error('No public Dota data found for this player');
      noDataError.statusCode = 404;
      noDataError.code = 'NO_DOTA_DATA';
      throw noDataError;
    }
    
    // Get player's official Dota 2 stats from Steam
    let dotaStats = {};
    let playtime = 0;
    let lastPlayedTime = null;
    try {
      
      // Get owned games first - this is more reliable
      const gamesRes = await steamApi.get('/IPlayerService/GetOwnedGames/v1/', {
        params: {
          key: apiKey,
          steamid: steamId64,
          format: 'json',
          include_played_free_games: 1,
          include_appinfo: 1
        }
      });
      
      // Try to get player stats, but don't fail if this returns 404
      // Note: Valve doesn't expose detailed Dota 2 stats through this endpoint
      // so a 404 is expected and shouldn't cause the whole request to fail
      try {
        const statsRes = await steamApi.get('/ISteamUserStats/GetUserStatsForGame/v0002/', {
          params: {
            key: apiKey,
            steamid: steamId64,
            appid: 570 // Dota 2 app ID
          }
        });
        
        if (statsRes.data && statsRes.data.playerstats) {
          dotaStats = statsRes.data.playerstats;
        }
      } catch (statsError) {
        // This is expected for Dota 2, so we just continue
      }

      if (gamesRes.data && gamesRes.data.response && gamesRes.data.response.games) {
        const dota2 = gamesRes.data.response.games.find(game => game.appid === 570);
        if (dota2) {
          playtime = dota2.playtime_forever;
          // Store the last played time if available
          lastPlayedTime = dota2.rtime_last_played || null;
        } else {
        }
      } else {
        // Set default playtime for private profiles
        playtime = 0; // Reset to 0 as we'll handle this in the frontend
        
        // If this is the authenticated user's own profile, or if we suspect the profile might be public but the API call failed,
        // we should try to get the playtime from the Steam API using a different endpoint
        if (isOwnProfile || profile.communityvisibilitystate === 3) { // 3 means public profile
          try {
            // Try to get the playtime using the IPlayerService/GetRecentlyPlayedGames endpoint
            // This endpoint works for authenticated users even with private profiles
            const recentlyPlayedRes = await steamApi.get('/IPlayerService/GetRecentlyPlayedGames/v1/', {
              params: {
                key: apiKey,
                steamid: steamId64,
                format: 'json'
              }
            });
            
            if (recentlyPlayedRes.data && recentlyPlayedRes.data.response && recentlyPlayedRes.data.response.games) {
              const dota2 = recentlyPlayedRes.data.response.games.find(game => game.appid === 570);
              if (dota2) {
                playtime = dota2.playtime_forever;
              }
            }
          } catch (error) {
            console.log('[PLAYER PROFILE] Error fetching recently played games:', error.message);
          }
        }
      }
    } catch (error) {
      console.log('[PLAYER PROFILE] Steam stats API error:', error.message);
    }
    
    // Process the rank_tier to get medal information
    let rankMedal = 'TBD';
    let rankEstimate = 'TBD';
    
    if (openDotaProfile.rank_tier) {
      rankMedal = convertRankTierToMedal(openDotaProfile.rank_tier);
      rankEstimate = estimateMMRFromRank(openDotaProfile.rank_tier);
    } else if (openDotaProfile.mmr_estimate && openDotaProfile.mmr_estimate.estimate) {
      rankEstimate = openDotaProfile.mmr_estimate.estimate;
      rankMedal = estimateMedalFromMMR(rankEstimate);
    }
    
    // Combine all the data
    const combinedProfile = {
      steamId: accountId,
      steamId64: steamId64,
      personaname: profile.personaname || 'Unknown Player',
      avatar: profile.avatarfull || '',
      profile_url: profile.profileurl || '',
      communityvisibilitystate: visibilityState,
      is_private: visibilityState !== 3,
      last_login: profile.lastlogoff || null,
      country_code: profile.loccountrycode || '',
      rank_tier: openDotaProfile.rank_tier || null,
      leaderboard_rank: openDotaProfile.leaderboard_rank || null,
      mmr_estimate: rankEstimate,
      rank_medal: rankMedal,
      
      // Match statistics
      match_count: (openDotaProfile.win_lose?.win || 0) + (openDotaProfile.win_lose?.lose || 0),
      win_count: openDotaProfile.win_lose?.win || 0,
      lose_count: openDotaProfile.win_lose?.lose || 0,
      
      // Additional stats from Steam official API
      total_matches: extractSteamStat(dotaStats, 'total_matches_played'),
      total_wins: extractSteamStat(dotaStats, 'total_wins'),
      mvps: extractSteamStat(dotaStats, 'mvps'),
      playtime_forever: playtime, // Keep as minutes for frontend formatting
      last_played_time: lastPlayedTime, // Unix timestamp of when the game was last played
      
      // Recent heroes and matches - Add hero names to recent matches
      recent_matches: (openDotaProfile.recent_matches || []).map(match => ({
        ...match,
        hero_name: getHeroName(match.hero_id)
      })),
      most_played_heroes: openDotaProfile.heroes || []
    };
    
    // Calculate derived stats
    const totalMatches = combinedProfile.win_count + combinedProfile.lose_count;
    if (totalMatches === 0) {
      const noDataError = new Error('This player has no public Dota match data');
      noDataError.statusCode = 404;
      noDataError.code = 'NO_DOTA_DATA';
      throw noDataError;
    }
    combinedProfile.win_rate = ((combinedProfile.win_count / totalMatches) * 100).toFixed(1) + '%';
    
    // Cache the result
    cacheService.set(CACHE_TYPES.PLAYER_DATA, cacheKey, combinedProfile);
    
    return combinedProfile;
  } catch (error) {
    console.error('[PLAYER PROFILE] Error fetching player profile:', error.message);
    throw error;
  }
};

/**
 * Get hero data from OpenDota
 */
const getHeroes = async () => {
  try {
    // Check cache first
    const cacheKey = 'all_heroes';
    const cached = cacheService.get(CACHE_TYPES.HERO_DATA, cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get hero data from OpenDota
    const response = await openDotaApi.get('/heroes');
    const heroes = response.data || [];
    
    // Create a map by hero ID
    const heroMap = heroes.reduce((map, hero) => {
      map[hero.id] = hero;
      return map;
    }, {});
    
    // Cache the result
    cacheService.set(CACHE_TYPES.HERO_DATA, cacheKey, heroMap);
    
    return heroMap;
  } catch (error) {
    console.error('Error fetching hero data:', error.message);
    return {};
  }
};

/**
 * Helper to extract stats from Steam Stats API
 */
function extractSteamStat(statsData, statName) {
  if (!statsData || !statsData.stats) return null;
  
  const stat = statsData.stats.find(s => s.name === statName);
  return stat ? stat.value : null;
}

/**
 * Convert rank tier integer to medal name
 * Rank tiers are encoded as:
 * The first digit is the medal (1-8)
 * The second digit is the stars (0-7)
 * Example: 71 = Divine [7] with 1 star
 */
function convertRankTierToMedal(rankTier) {
  if (!rankTier) return 'TBD';
  
  const medals = [
    'Herald',
    'Guardian',
    'Crusader',
    'Archon',
    'Legend',
    'Ancient',
    'Divine',
    'Immortal'
  ];
  
  const tier = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  
  if (tier < 1 || tier > 8) return 'TBD';
  
  const medal = medals[tier - 1];
  
  // Immortal ranks don't have stars
  if (tier === 8) {
    return medal;
  }
  
  return `${medal} ${stars}`;
}

/**
 * Estimate MMR from rank tier
 */
function estimateMMRFromRank(rankTier) {
  if (!rankTier) return 'TBD';
  
  const tier = Math.floor(rankTier / 10);
  const stars = rankTier % 10;
  
  // Rough MMR estimates based on medals
  const baseMMR = {
    1: 0,    // Herald
    2: 770,  // Guardian
    3: 1540, // Crusader
    4: 2310, // Archon
    5: 3080, // Legend
    6: 3850, // Ancient
    7: 4620, // Divine
    8: 5420  // Immortal
  };
  
  if (!baseMMR[tier]) return 'TBD';
  
  // Each star is worth about 130-140 MMR
  const starValue = 140;
  const estimatedMMR = baseMMR[tier] + (stars * starValue);
  
  return estimatedMMR.toString();
}

/**
 * Estimate medal from MMR
 */
function estimateMedalFromMMR(mmr) {
  if (!mmr || isNaN(Number(mmr))) return 'TBD';
  
  const mmrValue = Number(mmr);
  
  if (mmrValue < 770) return 'Herald';
  if (mmrValue < 1540) return 'Guardian';
  if (mmrValue < 2310) return 'Crusader';
  if (mmrValue < 3080) return 'Archon';
  if (mmrValue < 3850) return 'Legend';
  if (mmrValue < 4620) return 'Ancient';
  if (mmrValue < 5420) return 'Divine';
  return 'Immortal';
}

// Convert 32-bit account ID to 64-bit Steam ID
const getSteamId64 = (accountId) => {
  try {
    if (!accountId) {
      console.error(`Invalid account ID format: ${accountId}`);
      return null;
    }
    // Steam ID 64 = account ID + 76561197960265728
    return (BigInt(accountId) + BigInt("76561197960265728")).toString();
  } catch (error) {
    console.error(`Error converting account ID ${accountId} to Steam ID 64:`, error.message);
    return null;
  }
};

export default {
  getPlayerProfile,
  getHeroes,  
  getSteamApiKey,
  normalizeSteamId,
  getAccountId,
  getSteamId64,
  getSteamPersonaName,
  convertRankTierToMedal,
  estimateMMRFromRank,
  estimateMedalFromMMR,
  steamApi,
  openDotaApi
};