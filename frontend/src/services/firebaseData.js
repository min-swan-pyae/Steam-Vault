import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirebaseDataService {
  // CS2 Statistics API Methods (Steam API + GSI Combined)
  
  /**
   * Get CS2 player statistics (combines Steam API historical data with GSI)
   * @param {string} steamId - Steam ID of the player
   * @returns {Promise<Object>} Combined player statistics
   */
  async getCS2PlayerStats(steamId) {
    try {
      
      const response = await fetch(`/api/cs2/player/${steamId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error fetching stats:`, errorData);
        throw new Error(errorData.message || 'Failed to fetch CS2 player statistics');
      }

      const stats = await response.json();
      return stats;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2PlayerStats:`, error);
      throw error;
    }
  }

  /**
   * Get CS2 player match history
   * @param {string} steamId - Steam ID of the player
   * @param {number} limit - Number of matches to retrieve
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} Match history data
   */
  async getCS2PlayerMatches(steamId, limit = 20, offset = 0) {
    try {
      
      const response = await fetch(`/api/cs2/player/${steamId}/matches?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error fetching matches:`, errorData);
        throw new Error(errorData.message || 'Failed to fetch CS2 match history');
      }

      const matches = await response.json();
      return matches;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2PlayerMatches:`, error);
      throw error;
    }
  }

  /**
   * Get CS2 player weapon statistics
   * @param {string} steamId - Steam ID of the player
   * @returns {Promise<Array>} Weapon statistics
   */
  async getCS2PlayerWeapons(steamId) {
    try {
      
      const response = await fetch(`/api/cs2/player/${steamId}/weapons`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error fetching weapons:`, errorData);
        throw new Error(errorData.message || 'Failed to fetch CS2 weapon statistics');
      }

      const weapons = await response.json();
      return weapons;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2PlayerWeapons:`, error);
      throw error;
    }
  }

  /**
   * Get CS2 player map statistics
   * @param {string} steamId - Steam ID of the player
   * @returns {Promise<Array>} Map statistics
   */
  async getCS2PlayerMaps(steamId) {
    try {
      
      const response = await fetch(`/api/cs2/player/${steamId}/maps`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error fetching maps:`, errorData);
        throw new Error(errorData.message || 'Failed to fetch CS2 map statistics');
      }

      const maps = await response.json();
      return maps;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2PlayerMaps:`, error);
      throw error;
    }
  }

  /**
   * Get CS2 leaderboard
   * @param {number} limit - Number of players to retrieve
   * @param {string} sortBy - Sort criteria
   * @returns {Promise<Array>} Leaderboard data
   */
  async getCS2Leaderboard(limit = 10, sortBy = 'kdRatio', options = {}) {
    try {
      const refresh = options.refresh ? '&refresh=1' : '';
      const response = await fetch(`/api/cs2/leaderboard?limit=${limit}&sortBy=${sortBy}${refresh}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error fetching leaderboard:`, errorData);
        throw new Error(errorData.message || 'Failed to fetch CS2 leaderboard');
      }

      const leaderboard = await response.json();
      return leaderboard;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2Leaderboard:`, error);
      throw error;
    }
  }

  /**
   * Search CS2 players
   * @param {string} query - Search query
   * @param {number} limit - Number of results to return
   * @returns {Promise<Array>} Search results
   */
  async searchCS2Players(query, limit = 10, options = {}) {
    try {
      const refresh = options.refresh ? '&refresh=1' : '';
      const response = await fetch(`/api/cs2/search?query=${encodeURIComponent(query)}&limit=${limit}${refresh}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error searching players:`, errorData);
        throw new Error(errorData.message || 'Failed to search CS2 players');
      }

      const results = await response.json();
      return results;
    } catch (error) {
      console.error(`[CS2 API] Error in searchCS2Players:`, error);
      throw error;
    }
  }

  /**
   * Get CS2 recent activity
   * @param {number} limit - Number of activities to retrieve
   * @returns {Promise<Array>} Recent activity data
   */
  async getCS2RecentActivity(limit = 20) {
    try {
      
      const response = await fetch(`/api/cs2/activity?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`[CS2 API] Error fetching recent activity:`, errorData);
        throw new Error(errorData.message || 'Failed to fetch CS2 recent activity');
      }

      const activity = await response.json();
      return activity;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2RecentActivity:`, error);
      throw error;
    }
  }


  // Get player stats via API (backward compatibility - redirects to new CS2 API)
  async getPlayerStats(steamId) {
    return this.getCS2PlayerStats(steamId);
  }

  // Get player matches via API (backward compatibility - redirects to new CS2 API)
  async getPlayerMatches(steamId, limitCount = 20) {
    const result = await this.getCS2PlayerMatches(steamId, limitCount);
    return result.matches || [];
  }

  // Get player weapons via API (backward compatibility - redirects to new CS2 API)
  async getPlayerWeapons(steamId) {
    return this.getCS2PlayerWeapons(steamId);
  }

  // Get player maps via API (backward compatibility - redirects to new CS2 API)
  async getPlayerMaps(steamId) {
    return this.getCS2PlayerMaps(steamId);
  }

  // Legacy Firebase methods (keeping for potential future use)
  subscribeToPlayerStats(steamId, callback) {
    const statsRef = doc(db, 'cs2_players', steamId);
    
    return onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('Error subscribing to player stats:', error);
      callback(null);
    });
  }

  subscribeToPlayerMatches(steamId, callback, limitCount = 20) {
    const matchesRef = collection(db, 'cs2_players', steamId, 'matches');
    const matchesQuery = query(
      matchesRef,
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(matchesQuery, (snapshot) => {
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(matches);
    }, (error) => {
      console.error('Error subscribing to player matches:', error);
      callback([]);
    });
  }

  subscribeToWeaponStats(steamId, callback) {
    const weaponsRef = collection(db, 'cs2_players', steamId, 'weapons');
    const weaponsQuery = query(
      weaponsRef,
      orderBy('kills', 'desc'),
      limit(50)
    );
    
    return onSnapshot(weaponsQuery, (snapshot) => {
      const weapons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(weapons);
    }, (error) => {
      console.error('Error subscribing to weapon stats:', error);
      callback([]);
    });
  }

  subscribeToMapStats(steamId, callback) {
    const mapsRef = collection(db, 'cs2_players', steamId, 'maps');
    const mapsQuery = query(
      mapsRef,
      orderBy('matchesPlayed', 'desc'),
      limit(50)
    );
    
    return onSnapshot(mapsQuery, (snapshot) => {
      const maps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(maps);
    }, (error) => {
      console.error('Error subscribing to map stats:', error);
      callback([]);
    });
  }

  async searchPlayers(searchTerm) {
    return this.searchCS2Players(searchTerm);
  }

  async getLeaderboard(statType = 'kdRatio', limitCount = 50) {
    return this.getCS2Leaderboard(limitCount, statType);
  }

  async getRecentActivity(limitCount = 10) {
    return this.getCS2RecentActivity(limitCount);
  }

  // Dota2 methods (existing functionality)
  async getDotaPlayerStats(steamId) {
    try {
      const response = await fetch(`/api/dota/player/${steamId}/stats`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch player stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Dota player stats:', error);
      throw error;
    }
  }

  async getDotaPlayerMatches(steamId, limitCount = 20) {
    try {
      const response = await fetch(`/api/dota/player/${steamId}/matches?limit=${limitCount}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch player matches');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Dota player matches:', error);
      throw error;
    }
  }

  async getDotaPlayerHeroes(steamId, limitCount = 20) {
    try {
      const response = await fetch(`/api/dota/player/${steamId}/heroes?limit=${limitCount}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch player heroes');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching Dota player heroes:', error);
      throw error;
    }
  }

  async getDotaMetaAnalysis() {
    try {
      const response = await fetch('/api/dota/meta/analysis', {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch meta analysis');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching meta analysis:', error);
      throw error;
    }
  }

  async getDotaHeroPerformance(heroId) {
    try {
      const response = await fetch(`/api/dota/meta/hero/${heroId}/performance`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch hero performance');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching hero performance:', error);
      throw error;
    }
  }

  async getDotaPlaytimeTrends(steamId) {
    try {
      const response = await fetch(`/api/dota/player/${steamId}/playtime-trends`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch playtime trends');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching playtime trends:', error);
      throw error;
    }
  }

  async getDotaPlayerBehavior(steamId) {
    try {
      const response = await fetch(`/api/dota/player/${steamId}/behavior`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch player behavior');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player behavior:', error);
      throw error;
    }
  }

  async getDotaPerformanceSummary(steamId) {
    try {
      const response = await fetch(`/api/dota/player/${steamId}/performance-summary`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch performance summary');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance summary:', error);
      throw error;
    }
  }
}

export const firebaseDataService = new FirebaseDataService();
