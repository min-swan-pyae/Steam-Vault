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
      console.log(`[CS2 API] Fetching player stats for: ${steamId}`);
      
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
      console.log(`[CS2 API] Stats fetched successfully for ${steamId}:`, stats);
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
      console.log(`[CS2 API] Fetching matches for: ${steamId}`);
      
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
      console.log(`[CS2 API] Matches fetched successfully for ${steamId}:`, matches);
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
      console.log(`[CS2 API] Fetching weapons for: ${steamId}`);
      
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
      console.log(`[CS2 API] Weapons fetched successfully for ${steamId}:`, weapons);
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
      console.log(`[CS2 API] Fetching maps for: ${steamId}`);
      
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
      console.log(`[CS2 API] Maps fetched successfully for ${steamId}:`, maps);
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
  async getCS2Leaderboard(limit = 10, sortBy = 'kdRatio') {
    try {
      console.log(`[CS2 API] Fetching leaderboard (${sortBy})`);
      
      const response = await fetch(`/api/cs2/leaderboard?limit=${limit}&sortBy=${sortBy}`, {
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
      console.log(`[CS2 API] Leaderboard fetched successfully:`, leaderboard);
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
  async searchCS2Players(query, limit = 10) {
    try {
      console.log(`[CS2 API] Searching players: ${query}`);
      
      const response = await fetch(`/api/cs2/search?query=${encodeURIComponent(query)}&limit=${limit}`, {
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
      console.log(`[CS2 API] Search results:`, results);
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
      console.log(`[CS2 API] Fetching recent activity`);
      
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
      console.log(`[CS2 API] Recent activity fetched successfully:`, activity);
      return activity;
    } catch (error) {
      console.error(`[CS2 API] Error in getCS2RecentActivity:`, error);
      throw error;
    }
  }

  // Legacy methods (keeping for backward compatibility)
  async uploadDemoData(steamId, demoData) {
    console.log('🚀 Starting demo upload for steamId:', steamId);
    console.log('📁 File details:', {
      name: demoData.file.name,
      size: demoData.file.size,
      type: demoData.file.type
    });
    
    const formData = new FormData();
    formData.append('demo', demoData.file);
    formData.append('steamId', steamId);

    try {
      console.log('📤 Sending upload request to /api/cs2/upload-demo');
      const response = await fetch('/api/cs2/upload-demo', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important for Steam session auth
      });

      console.log('📥 Upload response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Upload failed with response:', errorText);
        throw new Error(`Demo upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Upload successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Error uploading demo:', error);
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
