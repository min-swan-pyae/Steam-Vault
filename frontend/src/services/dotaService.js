import api from './api';

const normalizeItemName = (itemName) => {
  if (!itemName) return '';
  return itemName.toLowerCase()
    .replace(/^item_/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
};

export const dotaService = {
  // Match history
  getMatchHistory: async (accountId, startAtMatchId = null, limit = 100) => {
    // Convert Steam64 ID to Dota2 ID if needed
    let dota2Id = accountId;
    if (accountId.toString().length > 16) {
      try {
        const steamId64 = BigInt(accountId);
        const convertedId = (steamId64 - BigInt('76561197960265728')).toString();
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
      let attempts = 0;
      let response;
      while (attempts < 3) {
        try {
          response = await api.get(`/api/dota2/match-history/${dota2Id}`, { params, cacheType: 'MATCH_HISTORY' });
          break;
        } catch (err) {
          const status = err?.response?.status;
          if (status === 429) {
            const retryAfter = parseInt(err?.response?.data?.retryAfter || err?.response?.headers?.['retry-after'] || '1', 10);
            const waitMs = (isNaN(retryAfter) ? 1 : retryAfter) * 1000;
            console.warn(`Rate limited (429). Waiting ${waitMs}ms before retry...`);
            await new Promise(r => setTimeout(r, waitMs));
            attempts++;
            continue;
          }
          throw err;
        }
      }
      
      // Check if we got a valid array response
      if (!Array.isArray(response)) {
        console.warn('Match history API returned non-array response:', response);
        return [];
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
      const status = error?.response?.status;
      if (status === 404 || status === 403) {
        throw error;
      }
      // Create a fallback player object with minimal data for transient failures
      return {
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
    }
  },

  // Pro players currently in game
  getProPlayersLive: async () => {
    try {
      const response = await api.get('/api/dota2/pro-players/live');
      return response;
    } catch (error) {
      console.error('Error in getProPlayersLive:', error.response || error);
      throw error;
    }
  },

  // Current meta statistics
  getMetaStats: async () => {
    try {
      const response = await api.get('/api/dota2/meta');
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
      return response; // api.get() now returns data directly, not the full axios response
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
      const status = error?.response?.status;
      if (status === 404 || status === 403) {
        throw error;
      }
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
      return response; // api.get() now returns data directly, not the full axios response
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

  // Item utilities
  getItemImageUrl: (itemName) => {
    const cleanName = normalizeItemName(itemName);
    if (!cleanName) return null;
    return `/api/dota2/items/image/${cleanName}`;
  },

  getItemImageFallbackUrl: (itemName) => {
    const cleanName = normalizeItemName(itemName);
    if (!cleanName) return null;
    // Use CloudFlare CDN instead of cdn.dota2.com to avoid SSL cert issues
    return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${cleanName}.png`;
  },

};