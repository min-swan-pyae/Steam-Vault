import axios from 'axios';
import NodeCache from 'node-cache';
import dotenv from 'dotenv';

dotenv.config();

// Cache for different types of data
const playerSummaryCache = new NodeCache({ stdTTL: 3600 }); // 1 hour
const playerStatsCache = new NodeCache({ stdTTL: 1800 }); // 30 minutes
const matchDetailsCache = new NodeCache({ stdTTL: 7200 }); // 2 hours
const heroDataCache = new NodeCache({ stdTTL: 86400 * 7 }); // 7 days

// Steam API client
const steamApi = axios.create({
  baseURL: 'https://api.steampowered.com',
  timeout: 10000,
  headers: {
    'Accept': 'application/json'
  }
});

// OpenDota API client (free tier, rate limited)
const openDotaApi = axios.create({
  baseURL: 'https://api.opendota.com/api',
  timeout: 10000,
  headers: {
    'Accept': 'application/json'
  }
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
    const cached = playerSummaryCache.get(cacheKey);
    if (cached) {
      return cached;
    }
    
    // Get basic profile from Steam
    const apiKey = getSteamApiKey();
    const profileRes = await steamApi.get('/ISteamUser/GetPlayerSummaries/v2/', {
      params: {
        key: apiKey,
        steamids: steamId64,
        format: 'json'
      }
    });
    
    const profile = profileRes.data.response.players[0] || {};
    console.log(`[PLAYER PROFILE] Got player summary for ${profile.personaname}`);
    console.log(`[PLAYER PROFILE] Profile visibility state: ${profile.communityvisibilitystate} (1=private, 3=public)`);
    console.log(`[PLAYER PROFILE] Profile URL: ${profile.profileurl}`);
    console.log(`[PLAYER PROFILE] Is own profile: ${isOwnProfile}`);
    
    // Try to get extended profile from OpenDota
    let openDotaProfile = {};
    try {
      console.log(`[PLAYER PROFILE] Fetching player data from OpenDota: ${accountId}`);
      const openDotaRes = await openDotaApi.get(`/players/${accountId}`);
      openDotaProfile = openDotaRes.data || {};
      
      // Get win/loss count
      console.log(`[PLAYER PROFILE] Fetching win/loss data`);
      const wlRes = await openDotaApi.get(`/players/${accountId}/wl`);
      openDotaProfile.win_lose = wlRes.data || { win: 0, lose: 0 };
      
      // Get recent matches
      console.log(`[PLAYER PROFILE] Fetching recent matches`);
      const recentRes = await openDotaApi.get(`/players/${accountId}/recentMatches`);
      openDotaProfile.recent_matches = recentRes.data || [];
      
      // Get heroes played
      console.log(`[PLAYER PROFILE] Fetching hero stats`);
      const heroesRes = await openDotaApi.get(`/players/${accountId}/heroes`);
      openDotaProfile.heroes = heroesRes.data || [];
      
    } catch (error) {
      console.log('[PLAYER PROFILE] OpenDota API error:', error.message);
    }
    
    // Get player's official Dota 2 stats from Steam
    let dotaStats = {};
    let playtime = 0;
    let lastPlayedTime = null;
    try {
      console.log(`[PLAYER PROFILE] Fetching Steam stats`);
      
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
        console.log(`[PLAYER PROFILE] Stats API error (expected for Dota 2): ${statsError.message}`);
        // This is expected for Dota 2, so we just continue
      }

      if (gamesRes.data && gamesRes.data.response && gamesRes.data.response.games) {
        console.log(`[PLAYER PROFILE] Games response:`, JSON.stringify(gamesRes.data.response));
        const dota2 = gamesRes.data.response.games.find(game => game.appid === 570);
        if (dota2) {
          playtime = dota2.playtime_forever;
          // Store the last played time if available
          lastPlayedTime = dota2.rtime_last_played || null;
          console.log(`[PLAYER PROFILE] Found Dota 2 playtime: ${playtime} minutes, Last played: ${lastPlayedTime}`);
        } else {
          console.log(`[PLAYER PROFILE] Dota 2 not found in owned games`);
        }
      } else {
        console.log(`[PLAYER PROFILE] No games data in response - profile may be private:`, JSON.stringify(gamesRes.data));
        // Set default playtime for private profiles
        playtime = 0; // Reset to 0 as we'll handle this in the frontend
        
        // If this is the authenticated user's own profile, or if we suspect the profile might be public but the API call failed,
        // we should try to get the playtime from the Steam API using a different endpoint
        if (isOwnProfile || profile.communityvisibilitystate === 3) { // 3 means public profile
          console.log(`[PLAYER PROFILE] Trying alternative API endpoint for ${isOwnProfile ? 'authenticated user' : 'public profile'}`);
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
                console.log(`[PLAYER PROFILE] Found Dota 2 playtime from recently played: ${playtime} minutes`);
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
      console.log(`[PLAYER PROFILE] Rank tier found: ${openDotaProfile.rank_tier}`);
      rankMedal = convertRankTierToMedal(openDotaProfile.rank_tier);
      rankEstimate = estimateMMRFromRank(openDotaProfile.rank_tier);
    } else if (openDotaProfile.mmr_estimate && openDotaProfile.mmr_estimate.estimate) {
      console.log(`[PLAYER PROFILE] MMR estimate found: ${openDotaProfile.mmr_estimate.estimate}`);
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
      
      // Recent heroes and matches
      recent_matches: openDotaProfile.recent_matches || [],
      most_played_heroes: openDotaProfile.heroes || []
    };
    
    // Calculate derived stats
    const totalMatches = combinedProfile.win_count + combinedProfile.lose_count;
    combinedProfile.win_rate = totalMatches > 0 
      ? ((combinedProfile.win_count / totalMatches) * 100).toFixed(1) + '%' 
      : '0%';
    
    // Cache the result
    playerSummaryCache.set(cacheKey, combinedProfile);
    
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
    const cached = heroDataCache.get(cacheKey);
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
    heroDataCache.set(cacheKey, heroMap);
    
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