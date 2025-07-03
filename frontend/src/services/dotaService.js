import api from './api';

export const dotaService = {
  // Match history
  getMatchHistory: async (accountId, startAtMatchId = null, limit = 100) => {
    // Convert Steam64 ID to Dota2 ID if needed
    let dota2Id = accountId;
    if (accountId.toString().length > 16) {
      try {
        const steamId64 = BigInt(accountId);
        const convertedId = (steamId64 - BigInt('76561197960265728')).toString();
        console.log(`Converting Steam64 ID ${accountId} to Dota2 ID ${convertedId}`);
        dota2Id = convertedId;
      } catch (err) {
        console.error('Error converting Steam ID:', err);
        // Keep original ID if conversion fails
      }
    }
    
    const params = { limit };
    if (startAtMatchId) {
      params.start_at_match_id = startAtMatchId;
    }
    
    try {
      console.log(`Fetching match history for account ${dota2Id}${startAtMatchId ? ' starting at match ' + startAtMatchId : ''} with limit ${limit}`);
      const response = await api.get(`/api/dota2/match-history/${dota2Id}`, { params });
      
      // Check if we got a valid array response
      if (!Array.isArray(response)) {
        console.warn('Match history API returned non-array response:', response);
        return [];
      }
      
      // Check if we got any matches
      if (response.length === 0) {
        console.log('No matches found in this batch');
      } else {
        console.log(`Received ${response.length} matches for account ${dota2Id}`);
      }
      
      return response;
    } catch (error) {
      console.error('Error in getMatchHistory:', error.response ? error.response.data : error.message);
      // Return empty array for pagination to work properly
      return []; 
    }
  },

  // Match details
  getMatchDetails: async (matchId) => {
    try {
      const response = await api.get(`/api/dota2/match/${matchId}`);
      return response;
    } catch (error) {
      console.error('Error in getMatchDetails:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Player statistics
  getPlayerStats: async (accountId) => {
    try {
      const response = await api.get(`/api/dota2/player/${accountId}/stats`);
      return response;
    } catch (error) {
      console.error('Error in getPlayerStats:', error.response ? error.response.data : error.message);
      // Create a fallback player object with minimal data
      const fallback = {
        steamId: accountId,
        personaname: 'Unknown Player',
        avatar: '',
        match_count: 0,
        win_count: 0,
        lose_count: 0,
        win_rate: '0%',
        average_kda: '0.00',
        most_played_role: 'Unknown',
        role_games: 0
      };
      
      // If there's error data from the server, use it
      if (error.response && error.response.data) {
        return { ...fallback, ...error.response.data };
      }
      
      throw error;
    }
  },

  // Pro players currently in game
  getProPlayersLive: async () => {
    console.log('Fetching pro players...');
    try {
      const response = await api.get('/api/dota2/pro-players/live');
      console.log('Pro players response:', response);
      return response;
    } catch (error) {
      console.error('Error in getProPlayersLive:', error.response || error);
      throw error;
    }
  },

  // Current meta statistics
  getMetaStats: async () => {
    console.log('Fetching meta stats...');
    try {
      const response = await api.get('/api/dota2/meta');
      console.log('Meta stats response:', response);
      return response;
    } catch (error) {
      console.error('Error in getMetaStats:', error.response || error);
      throw error;
    }
  },

  // Hero statistics
  getHeroStats: async () => {
    try {
      const response = await api.get('/api/dota2/heroes/stats');
      return response;
    } catch (error) {
      console.error('Error in getHeroStats:', error.response || error);
      throw error;
    }
  },

  // Search player by Steam ID, Dota 2 ID, or username
  searchPlayer: async (query) => {
    try {
      const response = await api.get(`/api/dota2/search/player`, {
        params: { query }
      });
      return response;
    } catch (error) {
      console.error('Error in searchPlayer:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Get player by either Steam ID or Dota 2 ID
  getPlayer: async (id) => {
    try {
      const response = await api.get(`/api/dota2/player/lookup/${id}`, {
        params: { include_matches: true }
      });
      return response;
    } catch (error) {
      console.error('Error in getPlayer:', error.response ? error.response.data : error.message);
      throw error;
    }
  },

  // Hero performance statistics
  getHeroPerformance: async (accountId) => {
    try {
      const response = await api.get(`/api/dota2/player/${accountId}/heroes`);
      return response;
    } catch (error) {
      console.error('Error in getHeroPerformance:', error.response ? error.response.data : error.message);
      return [];
    }
  },

  // Playtime trends
  getPlaytimeTrends: async (accountId) => {
    try {
      const response = await api.get(`/api/dota2/player/${accountId}/playtime`);
      return response;
    } catch (error) {
      console.error('Error in getPlaytimeTrends:', error.response ? error.response.data : error.message);
      return [];
    }
  },

  // Player behavior metrics
  getBehaviorMetrics: async (accountId) => {
    try {
      const response = await api.get(`/api/dota2/player/${accountId}/behavior`);
      return response;
    } catch (error) {
      console.error('Error in getBehaviorMetrics:', error.response ? error.response.data : error.message);
      return {
        behavior_score: 0,
        commends: 0,
        reports: 0,
        abandons: 0
      };
    }
  },
  
  // Player performance summary
  getPlayerPerformanceSummary: async (steamId) => {
    try {
      const response = await api.get(`/api/dota2/player/${steamId}/performance-summary`);
      return response;
    } catch (error) {
      console.error('Error in getPlayerPerformanceSummary:', error.response ? error.response.data : error.message);
      return {
        player_info: { steamId: steamId, personaname: 'Unknown Player' },
        overall_stats: {},
        recent_performance: [],
        hero_performance: [],
        match_impact: {},
        progression: {}
      };
    }
  },
  
  // Detailed hero statistics
  getDetailedHeroStats: async (accountId, heroId) => {
    try {
      const response = await api.get(`/api/dota2/player/${accountId}/hero/${heroId}/detailed-stats`);
      return response;
    } catch (error) {
      console.error('Error in getDetailedHeroStats:', error.response ? error.response.data : error.message);
      return {
        hero_id: heroId,
        total_matches: 0,
        wins: 0,
        losses: 0,
        win_rate: '0%',
        averages: {},
        item_usage: [],
        lane_preference: [],
        matchups: [],
        recent_matches: []
      };
    }
  },
  
  // Enhanced meta analysis
  getEnhancedMetaAnalysis: async () => {
    try {
      const response = await api.get('/api/dota2/meta/enhanced');
      return response;
    } catch (error) {
      console.error('Error in getEnhancedMetaAnalysis:', error.response ? error.response.data : error.message);
      return {
        heroes: [],
        meta_trends: {},
        last_updated: new Date().toISOString()
      };
    }
  },

};