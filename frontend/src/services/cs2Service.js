import api from './api';

// const API_BASE_URL = 'https://csstats.gg/api';

export const cs2Service = {
  getPlayerStats: async (steamId) => {
    try {
      const response = await api.get(`/api/cs2/player/${steamId}/stats`);
      return response;
    } catch (error) {
      console.error('Error fetching CS2 player stats:', error);
      throw error;
    }
  },
  
  getPlayerMatches: async (steamId, limit = 20) => {
    try {
      const response = await api.get(`/api/cs2/player/${steamId}/matches?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching CS2 player matches:', error);
      throw error;
    }
  },
  
  getPlayerWeapons: async (steamId) => {
    try {
      const response = await api.get(`/api/cs2/player/${steamId}/weapons`);
      return response;
    } catch (error) {
      console.error('Error fetching CS2 player weapons:', error);
      throw error;
    }
  },
  
  getPlayerMaps: async (steamId) => {
    try {
      const response = await api.get(`/api/cs2/player/${steamId}/maps`);
      return response;
    } catch (error) {
      console.error('Error fetching CS2 player maps:', error);
      throw error;
    }
  },
};