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
  
  // Convert Steam64 ID to account ID if needed
  accountId = convertSteamIdToAccountId(accountId);

  // Check cache first
  const cacheKey = `history_${accountId}`;
  const cachedHistory = cacheService.get(CACHE_TYPES.MATCH_HISTORY, cacheKey);
  if (cachedHistory) {
    return res.json(cachedHistory);
  }

  try {
    // Use OpenDota API instead of Steam API
    const matchesResponse = await axios.get(`https://api.opendota.com/api/players/${accountId}/matches`, {
      params: {
        limit: 100
      }
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
    cacheService.set(CACHE_TYPES.MATCH_HISTORY, cacheKey, matches);
    
    res.json(matches);
  } catch (error) {
    console.error('Error fetching match history:', error.message);
    return res.status(500).json({ message: 'Failed to fetch match history' });
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
    console.log('DEBUG - Attempting to fetch match details for match_id:', match_id);
    try {
      const matchRes = await steamService.openDotaApi.get(`/matches/${match_id}`, { timeout: 16000 });

      const matchData = matchRes.data;
      console.log('DEBUG - Match Data', matchData);
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