import asyncHandler from '../middleware/asyncHandler.js';
import axios from 'axios';
import path from 'path';
// Hero mapping is now part of dotaUtils
import {
  getSteamApiKey,
  getHeroName,
  steamApi,
  fetchMatchDetails,
  fetchMatchDetailsInParallel,
  convertSteamIdToAccountId,
  createMinimalMatchData,
  processMatchWithDetails,
  generateMockMatchData,
  loadMockData,
  enrichPlayersWithProfiles,
  calculateTeamStats,
  formatDuration,
  getGameModeName,
  getRegionName,
  loadHeroMap,
  loadItemMap
} from '../utils/dotaUtils.js';
import steamService from '../services/steamService.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';

const __dirname = path.resolve();

export const getMatchHistory = asyncHandler(async (req, res) => {
  let { accountId } = req.params;
  const requestedLimit = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));
  
  // Convert Steam64 ID to account ID if needed
  accountId = convertSteamIdToAccountId(accountId);

  // Check cache first
  const cacheKey = `history_${accountId}_${requestedLimit}`;
  const cachedHistory = cacheService.get(CACHE_TYPES.MATCH_HISTORY, cacheKey);
  if (cachedHistory) {
    return res.json(cachedHistory);
  }

  try {
    // Throttle OpenDota calls to avoid 429
    try {
      const lastTs = cacheService.get(CACHE_TYPES.RATE_LIMITING, 'opendota_last_ts') || 0;
      const now = Date.now();
      const minGap = 350; // ms
      const wait = Math.max(0, minGap - (now - lastTs));
      if (wait > 0) {
        await new Promise(r => setTimeout(r, wait));
      }
      cacheService.set(CACHE_TYPES.RATE_LIMITING, 'opendota_last_ts', Date.now(), 60);
    } catch (e) {
      // non-blocking
    }

    // Helper: polite retry with exponential backoff and Retry-After support
    const fetchWithRetry = async (url, params, retries = 3, baseDelay = 500) => {
      let attempt = 0;
      while (attempt <= retries) {
        try {
          return await axios.get(url, { params, timeout: 15000 });
        } catch (err) {
          const status = err?.response?.status;
          const retryAfter = parseInt(err?.response?.headers?.['retry-after'] || '0', 10);
          const shouldRetry = status === 429 || (status >= 500 && status < 600) || err.code === 'ECONNABORTED' || err.message?.includes('timeout');
          if (!shouldRetry || attempt === retries) {
            throw Object.assign(err, { _rateLimited: status === 429, _retryAfter: retryAfter });
          }
          const delay = retryAfter > 0 ? retryAfter * 1000 : baseDelay * Math.pow(2, attempt);
          await new Promise(r => setTimeout(r, delay));
          attempt++;
        }
      }
    };

    // Use OpenDota API with retry/backoff
    const matchesResponse = await fetchWithRetry(`https://api.opendota.com/api/players/${accountId}/matches`, {
      limit: requestedLimit
    });

    const matches = matchesResponse.data.map(match => ({
      match_id: match.match_id,
      hero_id: match.hero_id,
      hero_name: getHeroName(match.hero_id),
      hero_img: `/heroes/${match.hero_id}.png`, 
      player_won: match.player_slot < 128 ? match.radiant_win : !match.radiant_win,
      deaths: match.deaths,
      assists: match.assists,
      kills: match.kills,
      start_time: match.start_time,
      duration: match.duration,
      player_slot: match.player_slot,
      radiant_win: match.radiant_win,
      game_mode: getGameModeName(match.game_mode),
      lobby_type: match.lobby_type,
    }));

    // Cache the match history
    cacheService.set(CACHE_TYPES.MATCH_HISTORY, cacheKey, matches, 5 * 60); // 5 minutes
    
    res.json(matches);
  } catch (error) {
    const status = error?._rateLimited ? 429 : 500;
    const retryAfter = error?._retryAfter || undefined;
    console.error('Error fetching match history:', error.message);
    return res.status(status).json({ 
      message: status === 429 ? 'Rate limited by OpenDota. Please retry shortly.' : 'Failed to fetch match history',
      error: status === 429 ? 'RATE_LIMITED' : 'INTERNAL_ERROR',
      retryAfter
    });
  }
});

export const getMatchDetail = asyncHandler(async (req, res) => {
  const { match_id } = req.params;

  // Check cache first
  const cacheKey = `match_${match_id}`;
  const cachedDetail = cacheService.get(CACHE_TYPES.MATCH_DATA, cacheKey);
  if (cachedDetail) {
    return res.json(cachedDetail);
  }

  try {
    
    const apiKey = getSteamApiKey();
    // console.log('DEBUG - Attempting to fetch match details for match_id:', match_id);
    try {
      const matchRes = await steamService.openDotaApi.get(`/matches/${match_id}`, { timeout: 16000 });

      const matchData = matchRes.data;
      // console.log('DEBUG - Match Data', matchData);
      if (!matchData) {
        throw new Error('No match data found');
      }

      // Load hero and item maps
      await loadHeroMap();
      await loadItemMap();

      // Enrich player data with Steam profiles
      const enrichedPlayers = await enrichPlayersWithProfiles(matchData, apiKey);

      // Calculate team statistics
      const { radiantScore, direScore, radiantTeamStats, direTeamStats } = calculateTeamStats(enrichedPlayers);

      // Create an enriched match object with additional statistics
      const enrichedMatch = {
        ...matchData,
        players: enrichedPlayers,
        radiant_score: radiantScore,
        dire_score: direScore,
        duration_formatted: formatDuration(matchData.duration),
        game_mode_name: getGameModeName(matchData.game_mode),
        region_name: getRegionName(matchData.cluster),
        start_time_formatted: new Date(matchData.start_time * 1000).toLocaleString(),
        match_date: new Date(matchData.start_time * 1000).toLocaleDateString(),
        match_time: new Date(matchData.start_time * 1000).toLocaleTimeString(),
        radiant_gold_advantage: radiantTeamStats.net_worth - direTeamStats.net_worth,
        radiant_xp_advantage: enrichedPlayers
          .filter(p => p.team === 'Radiant')
          .reduce((sum, p) => sum + p.xp_per_min, 0) - 
          enrichedPlayers
          .filter(p => p.team === 'Dire')
          .reduce((sum, p) => sum + p.xp_per_min, 0),
        total_kills: enrichedPlayers.reduce((sum, p) => sum + p.kills, 0),
        total_deaths: enrichedPlayers.reduce((sum, p) => sum + p.deaths, 0),
        total_assists: enrichedPlayers.reduce((sum, p) => sum + p.assists, 0),
        is_mock_data: false,
        radiant_team_stats: radiantTeamStats,
        dire_team_stats: direTeamStats
      };

      // Cache the enriched match
      cacheService.set(CACHE_TYPES.MATCH_DATA, cacheKey, enrichedMatch);
      return res.json(enrichedMatch);
    } catch (matchError) {
      console.error('Error fetching match details from OpenDota API:', matchError.message);
      throw matchError; // Propagate to outer catch block
    }
  } catch (error) {
    console.error('Error processing match details:', error.message);
    
    // Generate mock data on error
    try {
      const mockMatch = await generateMockMatchData(match_id);
      cacheService.set(CACHE_TYPES.MATCH_DATA, cacheKey, mockMatch);
      return res.json(mockMatch);
    } catch (mockError) {
      console.error('Error creating mock data:', mockError.message);
      return res.status(500).json({ 
        message: 'Failed to fetch match details',
        is_mock_data: true 
      });
    }
  }
});