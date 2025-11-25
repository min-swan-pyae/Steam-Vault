import axios from 'axios';
import path from 'path';
import fs from 'fs/promises';
import steamService from '../services/steamService.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';
const __dirname = path.resolve();

// Hero mapping functionality
let heroMap = new Map();
let heroMapLoaded = false;

// Item mapping functionality
let itemMap = new Map();
let itemMapLoaded = false;

export const loadHeroMap = async () => {
  if (heroMapLoaded) return; // already cached

  try {
    // Try OpenDota first (more reliable, has image data)
    const openDotaRes = await axios.get('https://api.opendota.com/api/heroes', { 
      timeout: 20000 
    });
    
    if (openDotaRes.status === 200 && Array.isArray(openDotaRes.data)) {
      // Cache for imageController to use
      cacheService.set(CACHE_TYPES.HERO_DATA, 'all_heroes', openDotaRes.data, 86400 * 7); // Cache for 7 days
      
      // Also populate heroMap for getHeroName()
      openDotaRes.data.forEach(hero => {
        heroMap.set(hero.id, hero.localized_name);
      });
      
      heroMapLoaded = true;
      console.log(`✅ Hero map loaded from OpenDota: ${openDotaRes.data.length} heroes (cached for 7 days).`);
      return;
    }
  } catch (openDotaErr) {
    console.warn('⚠️ OpenDota heroes failed, trying Steam API...', openDotaErr.message);
    
    // Fallback to Steam API
    try {
      const { data } = await axios.get(
        'https://api.steampowered.com/IEconDOTA2_570/GetHeroes/v1/',
        {
          params: {
            key: process.env.STEAM_API_KEY,
            language: 'en_us'
          },
          timeout: 20000
        }
      );

      data.result.heroes.forEach(hero => {
        heroMap.set(hero.id, hero.localized_name);
      });

      heroMapLoaded = true;
      console.log(`✅ Hero map loaded from Steam API: ${data.result.heroes.length} heroes.`);
    } catch (steamErr) {
      console.error('❌ Failed to load hero map from both sources:', steamErr.message);
    }
  }
};

export const getHeroName = (id) => {
  return heroMap.get(id) || `Unknown Hero (${id})`;
};

export const loadItemMap = async () => {
  if (itemMapLoaded) {
    console.log(`✅ Item map already loaded with ${itemMap.size} items`);
    return; // already cached
  }

  try {
    const { data: allItemsData } = await steamService.openDotaApi.get('/constants/items');

    let loadedCount = 0;
    for (const key in allItemsData) {
      const item = allItemsData[key];
      if (item.id) {
        // Add the internal name to the item (derived from the key)
        item.name = `item_${key}`;
        itemMap.set(item.id, item);
        loadedCount++;
      }
    }
    itemMapLoaded = true;
    console.log(`✅ Item map loaded and cached with ${itemMap.size} items.`);

  } catch (err) {
    console.error('❌ Failed to load item map:', err.message);
  }
};

export const getItemName = (id) => {
  const item = itemMap.get(id);
  return item ? item.dname : `Unknown Item (${id})`;
};

export const getItemInternalName = (id) => {
  if (!id || id === 0) return null;
  const item = itemMap.get(id);
  return item && item.name ? item.name : `item_${id}`;
};

export const getItemImage = (id) => {
  const item = itemMap.get(id);
  return item ? `https://cdn.dota2.com${item.img}` : null;
};



// Cache configuration moved to centralized cache service
export const delayMs = 500; // Small delay to prevent being blocked

// Create axios instance for Steam API with improved configuration
export const steamApi = axios.create({
  baseURL: 'https://api.steampowered.com',
  timeout: 15000, // Increased timeout for potentially slow responses
  headers: {
    'Accept': 'application/json'
  }
});

// Add response interceptor for better error handling
steamApi.interceptors.response.use(
  response => response,
  error => {
    // Log detailed error information
    if (error.response) {
      console.error('Steam API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        url: error.config?.url,
        params: error.config?.params
      });
    } else if (error.request) {
      console.error('Steam API Request Error (No Response):', {
        url: error.config?.url,
        params: error.config?.params,
        message: error.message
      });
    } else {
      console.error('Steam API Error:', error.message);
    }
    return Promise.reject(error);
  }
);

// Add request interceptor to handle rate limiting
let lastRequestTime = 0;
const minRequestInterval = 250; // Minimum 250ms between requests

steamApi.interceptors.request.use(async config => {
  const now = Date.now();
  const timeElapsed = now - lastRequestTime;
  
  // If we're making requests too quickly, add a small delay
  if (timeElapsed < minRequestInterval) {
    const delay = minRequestInterval - timeElapsed;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  lastRequestTime = Date.now();
  return config;
});

// Helper to get Steam API key from environment
export const getSteamApiKey = () => {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) {
    throw new Error('STEAM_API_KEY is not defined in environment variables');
  }
  return apiKey;
};

// Convert Steam64 ID to account ID (32-bit)
export const convertSteamIdToAccountId = (steamId) => {
  if (steamId.length > 16) {
    try {
      // This is likely a Steam64 ID, convert to account ID
      const steamId64 = BigInt(steamId);
      const steamId32 = (steamId64 - BigInt('76561197960265728')).toString();
      return steamId32;
    } catch (err) {
      console.error(`Error converting Steam ID: ${err.message}`);
      // Return the original ID if conversion fails
      return steamId;
    }
  }
  return steamId;
};

// Format duration as string (MM:SS)
export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
};

// Helper function to get game mode name
export const getGameModeName = (gameModeId) => {
  const gameModes = {
    0: 'Unknown',
    1: 'All Pick',
    2: 'Captains Mode',
    3: 'Random Draft',
    4: 'Single Draft',
    5: 'All Random',
    6: 'Intro',
    7: 'Diretide',
    8: 'Reverse Captains Mode',
    9: 'Greeviling',
    10: 'Tutorial',
    11: 'Mid Only',
    12: 'Least Played',
    13: 'Limited Heroes',
    14: 'Compendium Matchmaking',
    15: 'Custom',
    16: 'Captains Draft',
    17: 'Balanced Draft',
    18: 'Ability Draft',
    19: 'Event',
    20: 'All Random Deathmatch',
    21: '1v1 Mid',
    22: 'Ranked Matchmaking',
    23: 'Turbo Mode'
  };
  
  return gameModes[gameModeId] || 'Unknown';
};

// Helper function to get region name
export const getRegionName = (clusterId) => {
  const regions = {
    111: 'US West',
    112: 'US West',
    113: 'US West',
    121: 'US East',
    122: 'US East',
    123: 'US East',
    131: 'Europe West',
    132: 'Europe West',
    133: 'Europe West',
    141: 'Europe East',
    142: 'Europe East',
    143: 'Europe East',
    151: 'Southeast Asia',
    152: 'Southeast Asia',
    153: 'Southeast Asia',
    161: 'China',
    163: 'China',
    171: 'Australia',
    181: 'Russia',
    182: 'Russia',
    183: 'Russia',
    191: 'South America',
    200: 'South America',
    202: 'South America',
    204: 'South America',
    211: 'South Africa',
    213: 'South Africa',
    221: 'China',
    222: 'China',
    223: 'China',
    224: 'China',
    225: 'China',
    231: 'Chile',
    241: 'Peru',
    242: 'Peru',
    251: 'India'
  };
  
  return regions[clusterId] || 'Unknown';
};

// Fetch match details with caching and retry mechanism
export const fetchMatchDetails = async (match_id) => {
  // Check cache first
  const cacheKey = `match_${match_id}`;
  const cachedDetail = cacheService.get(CACHE_TYPES.MATCH_DATA, cacheKey);
  if (cachedDetail) {
    return cachedDetail;
  }
  
  // Retry configuration
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second delay between retries
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const apiKey = getSteamApiKey();
      
      // Add a small random delay to avoid hitting rate limits
      if (attempt > 1) {
        const jitter = Math.floor(Math.random() * 500); // Random jitter up to 500ms
        await new Promise(resolve => setTimeout(resolve, retryDelay + jitter));
      }
      
      const detailRes = await steamApi.get('/IDOTA2Match_570/GetMatchDetails/V001/', {
        params: {
          key: apiKey,
          match_id
        },
        timeout: 8000 // Increase timeout for potentially slow responses
      });

      const matchDetail = detailRes.data.result;
      if (matchDetail) {
        // Enhance match data with hero names
        if (matchDetail.players && Array.isArray(matchDetail.players)) {
          for (const player of matchDetail.players) {
            player.hero_name = getHeroName(player.hero_id);
          }
        }
        
        // Cache the match details
        cacheService.set(CACHE_TYPES.MATCH_DATA, cacheKey, matchDetail);
        return matchDetail;
      } else {
        throw new Error('Match details not found in response');
      }
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for match ${match_id}: ${error.message}`);
      
      // If it's the last attempt, or if it's a 4xx error (client error), don't retry
      if (attempt === maxRetries || (error.response && error.response.status >= 400 && error.response.status < 500)) {
        break;
      }
    }
  }
  
  // All retries failed
  console.error(`Failed to fetch details for match ${match_id} after ${maxRetries} attempts:`, lastError?.message);
  
  // Return a minimal match object with basic info to avoid breaking the UI
  console.error(`Returning partial result for match ${match_id} due to repeated Steam API failures.`);
  return {
    match_id: match_id,
    duration: 0,
    radiant_win: false,
    players: [],
    error: 'Match details unavailable',
    _error_fetching: true
  };
};

// Parallel fetch with concurrency control and adaptive delay between batches
export const fetchMatchDetailsInParallel = async (matches, concurrency = 2) => {
  const results = [];
  let consecutiveErrors = 0;
  let currentDelay = 1000; // Start with 1 second delay
  const maxDelay = 5000; // Maximum delay of 5 seconds
  
  for (let i = 0; i < matches.length; i += concurrency) {
    // Adjust batch size based on error rate
    const effectiveConcurrency = consecutiveErrors > 3 ? 1 : concurrency;
    const batch = matches.slice(i, i + effectiveConcurrency);
    
    
    // Process each match in the batch with individual error handling
    const batchPromises = batch.map(match => fetchMatchDetails(match.match_id));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Count errors in this batch
    const batchErrors = batchResults.filter(result => result.status === 'rejected' || 
                                               (result.value && result.value._error_fetching)).length;
    
    // Adjust consecutive error count and delay
    if (batchErrors > 0) {
      consecutiveErrors += batchErrors;
      // Exponential backoff with a maximum
      currentDelay = Math.min(currentDelay * 1.5, maxDelay);
    } else {
      // Reset error count and gradually reduce delay on success
      consecutiveErrors = Math.max(0, consecutiveErrors - 1);
      currentDelay = Math.max(1000, currentDelay * 0.8);
    }
    
    // Extract values from settled promises
    const processedResults = batchResults.map(result => 
      result.status === 'fulfilled' ? result.value : {
        match_id: 'unknown',
        duration: 0,
        radiant_win: false,
        players: [],
        error: 'Failed to process match',
        _error_fetching: true
      }
    );
    
    results.push(...processedResults);
    
    // Add adaptive delay between batches to avoid rate limiting
    if (i + effectiveConcurrency < matches.length) {
      await new Promise(resolve => setTimeout(resolve, currentDelay));
    }
  }
  
  return results;
};

// Create a minimal match object when details are unavailable
export const createMinimalMatchData = (match, accountId) => {
  try {
    const player = match.players.find(p => p.account_id === Number(accountId));
    
    if (!player) {
      return null;
    }
    
    const hero_id = player?.hero_id;
    const hero_name = getHeroName(hero_id);
    const player_slot = player?.player_slot;
    
    // Return minimal match data when details are unavailable
    return {
      match_id: match.match_id,
      hero_id,
      hero_name,
      player_slot,
      duration: 0, // Unknown duration
      duration_formatted: '0:00',
      start_time: match.start_time ? Math.min(match.start_time, 2147483647) : null,
      radiant_win: null, // Unknown outcome
      player_won: null, // Unknown outcome
      kills: 0,
      deaths: 0,
      assists: 0,
      gold_per_min: 0,
      xp_per_min: 0,
      hero_damage: 0,
      tower_damage: 0,
      hero_healing: 0,
      last_hits: 0,
      game_mode: match.game_mode || 0,
      lobby_type: match.lobby_type || 0,
      details_available: false
    };
  } catch (err) {
    console.error(`Error creating minimal match data for ${match.match_id}:`, err.message);
    return null;
  }
};

// Process match with full details
export const processMatchWithDetails = (match, detail, accountId) => {
  try {
    const player = match.players.find(p => p.account_id === Number(accountId));
    
    if (!player) {
      return null;
    }
    
    const hero_id = player?.hero_id;
    const hero_name = getHeroName(hero_id);
    const player_slot = player?.player_slot;
    const isRadiant = player_slot < 128;
    
    // Find player in match details to get KDA
    const detailPlayer = detail.players?.find(p => p.player_slot === player_slot);
    
    // Calculate player_won based on player_slot and radiant_win
    let player_won = null;
    if (detail.radiant_win !== null && detail.radiant_win !== undefined) {
      player_won = isRadiant ? detail.radiant_win : !detail.radiant_win;
    }

    // Format start_time to prevent year overflow
    const start_time = match.start_time ? Math.min(match.start_time, 2147483647) : null;
    
    // Format duration as string for display
    const duration_formatted = formatDuration(detail.duration);
    
    return {
      match_id: match.match_id,
      hero_id,
      hero_name,
      player_slot,
      duration: detail.duration || 0,
      duration_formatted,
      start_time,
      radiant_win: detail.radiant_win,
      player_won,
      kills: detailPlayer?.kills || 0,
      deaths: detailPlayer?.deaths || 0,
      assists: detailPlayer?.assists || 0,
      gold_per_min: detailPlayer?.gold_per_min || 0,
      xp_per_min: detailPlayer?.xp_per_min || 0,
      hero_damage: detailPlayer?.hero_damage || 0,
      tower_damage: detailPlayer?.tower_damage || 0,
      hero_healing: detailPlayer?.hero_healing || 0,
      last_hits: detailPlayer?.last_hits || 0,
      game_mode: detail.game_mode || match.game_mode || 0,
      lobby_type: detail.lobby_type || match.lobby_type || 0,
      details_available: true
    };
  } catch (err) {
    console.error(`Error enriching match ${match.match_id}:`, err.message);
    return null;
  }
};

// Generate mock match data when API fails
export const generateMockMatchData = async (match_id) => {
  try {
    // Try to get the match id and load hero map for mock data enrichment
    const matchIdNum = parseInt(match_id);
    await loadHeroMap();
    
    // Create mock match data with plausible values
    const startTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const duration = 2400; // 40 minutes
    const radiantWin = Math.random() > 0.5;
    const radiantScore = Math.floor(Math.random() * 30) + 15;
    const direScore = Math.floor(Math.random() * 30) + 15;
    
    // Generate players with more detailed stats
    const mockPlayers = Array(10).fill().map((_, i) => {
      const isRadiant = i < 5;
      const heroId = Math.floor(Math.random() * 120) + 1;
      const kills = Math.floor(Math.random() * 15);
      const deaths = Math.floor(Math.random() * 10);
      const assists = Math.floor(Math.random() * 20);
      const gold = Math.floor(Math.random() * 10000) + 5000;
      const goldSpent = Math.floor(Math.random() * 15000) + 10000;
      const goldPerMin = Math.floor(Math.random() * 500) + 300;
      const xpPerMin = Math.floor(Math.random() * 600) + 400;
      const level = Math.floor(Math.random() * 10) + 15;
      const heroDamage = Math.floor(Math.random() * 30000) + 5000;
      const towerDamage = Math.floor(Math.random() * 5000);
      const heroHealing = Math.floor(Math.random() * 10000);
      const lastHits = Math.floor(Math.random() * 300) + 50;
      
      return {
        account_id: 1000000 + i,
        player_slot: isRadiant ? i : i + 123,
        hero_id: heroId,
        hero_name: getHeroName(heroId) || 'Unknown Hero',
        kills,
        deaths,
        assists,
        gold,
        gold_spent: goldSpent,
        gold_per_min: goldPerMin,
        xp_per_min: xpPerMin,
        level,
        hero_damage: heroDamage,
        tower_damage: towerDamage,
        hero_healing: heroHealing,
        last_hits: lastHits,
        net_worth: gold + goldSpent,
        kills_per_min: kills / (duration / 60),
        deaths_per_min: deaths / (duration / 60),
        assists_per_min: assists / (duration / 60),
        level_per_min: level / (duration / 60),
        personaname: `Player ${i + 1} (Sample)`,
        avatar: '',
        team: isRadiant ? 'Radiant' : 'Dire'
      };
    });
    
    // Calculate team statistics
    const radiantPlayers = mockPlayers.filter(p => p.team === 'Radiant');
    const direPlayers = mockPlayers.filter(p => p.team === 'Dire');
    
    const radiantTeamStats = {
      kills: radiantScore,
      deaths: radiantPlayers.reduce((sum, p) => sum + p.deaths, 0),
      assists: radiantPlayers.reduce((sum, p) => sum + p.assists, 0),
      net_worth: radiantPlayers.reduce((sum, p) => sum + p.net_worth, 0),
      hero_damage: radiantPlayers.reduce((sum, p) => sum + p.hero_damage, 0),
      tower_damage: radiantPlayers.reduce((sum, p) => sum + p.tower_damage, 0),
      hero_healing: radiantPlayers.reduce((sum, p) => sum + p.hero_healing, 0)
    };
    
    const direTeamStats = {
      kills: direScore,
      deaths: direPlayers.reduce((sum, p) => sum + p.deaths, 0),
      assists: direPlayers.reduce((sum, p) => sum + p.assists, 0),
      net_worth: direPlayers.reduce((sum, p) => sum + p.net_worth, 0),
      hero_damage: direPlayers.reduce((sum, p) => sum + p.hero_damage, 0),
      tower_damage: direPlayers.reduce((sum, p) => sum + p.tower_damage, 0),
      hero_healing: direPlayers.reduce((sum, p) => sum + p.hero_healing, 0)
    };
    
    const mockMatch = {
      match_id: matchIdNum,
      match_seq_num: matchIdNum + 1000000,
      start_time: startTime,
      duration,
      radiant_win: radiantWin,
      game_mode: 22, // Ranked Matchmaking
      lobby_type: 7, // Ranked
      players: mockPlayers,
      radiant_score: radiantScore,
      dire_score: direScore,
      duration_formatted: '40:00',
      game_mode_name: 'Ranked Matchmaking',
      region_name: 'US East',
      start_time_formatted: new Date(startTime * 1000).toLocaleString(),
      match_date: new Date(startTime * 1000).toLocaleDateString(),
      match_time: new Date(startTime * 1000).toLocaleTimeString(),
      radiant_gold_advantage: radiantTeamStats.net_worth - direTeamStats.net_worth,
      radiant_xp_advantage: radiantPlayers.reduce((sum, p) => sum + p.xp_per_min, 0) - direPlayers.reduce((sum, p) => sum + p.xp_per_min, 0),
      total_kills: radiantScore + direScore,
      total_deaths: radiantTeamStats.deaths + direTeamStats.deaths,
      total_assists: radiantTeamStats.assists + direTeamStats.assists,
      radiant_team_stats: radiantTeamStats,
      dire_team_stats: direTeamStats,
      is_mock_data: true,
      mock_notice: 'This match data is simulated because the Steam API for match details is currently unavailable.'
    };
    
    return mockMatch;
  } catch (mockError) {
    console.error('Error creating mock data:', mockError.message);
    throw mockError;
  }
};

// Load mock data from file
export const loadMockData = async (fileName) => {
  try {
    const mockPath = path.join(__dirname, 'mock', fileName);
    const data = await fs.readFile(mockPath, 'utf-8');
    return JSON.parse(data);
  } catch (mockError) {
    console.error(`Error loading mock data from ${fileName}:`, mockError.message);
    throw mockError;
  }
};

// Enrich player data with Steam profiles
export const enrichPlayersWithProfiles = async (matchData, apiKey) => {
  // Get player names from Steam API if account_id is available
  const playerIds = matchData.players
    .map(p => p.account_id)
    .filter(id => id !== 4294967295 && id) // Filter out anonymous players and null IDs
    .map(id => BigInt(id) + BigInt("76561197960265728")) // Convert to Steam64 ID
    .map(id => id.toString());
  
  let playerProfiles = {};

  if (playerIds.length > 0) {
    try {
      const profilesRes = await steamApi.get('/ISteamUser/GetPlayerSummaries/v2/', {
        params: {
          key: apiKey,
          steamids: playerIds.join(',')
        }
      });
      playerProfiles = profilesRes.data.response.players.reduce((acc, player) => {
        // Convert Steam64 ID back to account ID for matching
        const accountId = (BigInt(player.steamid) - BigInt("76561197960265728")).toString();
        acc[accountId] = player;
        return acc;
      }, {});
    } catch (profileError) {
      console.error('Error fetching player profiles:', profileError.message);
    }
  }

  // Enrich the player data
  return matchData.players.map(player => {
    const steamProfile = playerProfiles[player.account_id];
    
    const items = [];
    for (let i = 0; i < 6; i++) {
      const itemId = player[`item_${i}`];
      if (itemId && itemId !== 0) {
        const item = itemMap.get(itemId);
        // Use internal name from itemMap, or skip if not found
        if (item && item.name) {
          items.push({
            id: itemId,
            name: getItemName(itemId),
            itemName: item.name.replace(/^item_/, ''), // Remove 'item_' prefix for frontend
            image: getItemImage(itemId) // Keep for backward compatibility
          });
        }
      }
    }

    const backpack = [];
    for (let i = 0; i < 3; i++) {
      const backpackId = player[`backpack_${i}`];
      if (backpackId && backpackId !== 0) {
        const item = itemMap.get(backpackId);
        // Use internal name from itemMap, or skip if not found
        if (item && item.name) {
          backpack.push({
            id: backpackId,
            name: getItemName(backpackId),
            itemName: item.name.replace(/^item_/, ''), // Remove 'item_' prefix for frontend
            image: getItemImage(backpackId) // Keep for backward compatibility
          });
        }
      }
    }

    let neutralItem = null;
    if (player.item_neutral && player.item_neutral !== 0) {
      const neutralItemData = itemMap.get(player.item_neutral);
      if (neutralItemData && neutralItemData.name) {
        neutralItem = {
          id: player.item_neutral,
          name: getItemName(player.item_neutral),
          itemName: neutralItemData.name.replace(/^item_/, ''), // Remove 'item_' prefix for frontend
          image: getItemImage(player.item_neutral) // Keep for backward compatibility
        };
      }
    }

    return {
      ...player,
      hero_name: getHeroName(player.hero_id),
      personaname: steamProfile?.personaname || 'Anonymous',
      avatar: steamProfile?.avatar || '',
      team: player.player_slot < 128 ? 'Radiant' : 'Dire',
      // Add derived stats that OpenDota would have provided
      kills_per_min: player.kills / (matchData.duration / 60),
      deaths_per_min: player.deaths / (matchData.duration / 60),
      assists_per_min: player.assists / (matchData.duration / 60),
      net_worth: player.gold_spent + player.gold,
      level_per_min: player.level / (matchData.duration / 60),
      // Add new item data
      items: items,
      backpack: backpack,
      neutral_item: neutralItem,
      profile: steamProfile,
       team: player.isRadiant ? 'Radiant' : 'Dire'
     };
  });
};

// Calculate team statistics
export const calculateTeamStats = (enrichedPlayers) => {
  const radiantPlayers = enrichedPlayers.filter(p => p.team === 'Radiant');
  const direPlayers = enrichedPlayers.filter(p => p.team === 'Dire');
  
  const radiantScore = radiantPlayers.reduce((sum, p) => sum + p.kills, 0);
  const direScore = direPlayers.reduce((sum, p) => sum + p.kills, 0);
  
  const radiantTeamStats = {
    kills: radiantScore,
    deaths: radiantPlayers.reduce((sum, p) => sum + p.deaths, 0),
    assists: radiantPlayers.reduce((sum, p) => sum + p.assists, 0),
    net_worth: radiantPlayers.reduce((sum, p) => sum + p.net_worth, 0),
    hero_damage: radiantPlayers.reduce((sum, p) => sum + (p.hero_damage || 0), 0),
    tower_damage: radiantPlayers.reduce((sum, p) => sum + (p.tower_damage || 0), 0),
    hero_healing: radiantPlayers.reduce((sum, p) => sum + (p.hero_healing || 0), 0)
  };
  
  const direTeamStats = {
    kills: direScore,
    deaths: direPlayers.reduce((sum, p) => sum + p.deaths, 0),
    assists: direPlayers.reduce((sum, p) => sum + p.assists, 0),
    net_worth: direPlayers.reduce((sum, p) => sum + p.net_worth, 0),
    hero_damage: direPlayers.reduce((sum, p) => sum + (p.hero_damage || 0), 0),
    tower_damage: direPlayers.reduce((sum, p) => sum + (p.tower_damage || 0), 0),
    hero_healing: direPlayers.reduce((sum, p) => sum + (p.hero_healing || 0), 0)
  };
  
  return {
    radiantScore,
    direScore,
    radiantTeamStats,
    direTeamStats
  };
};