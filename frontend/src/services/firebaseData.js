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
  // Upload demo data (uses existing Steam auth)
  async uploadDemoData(steamId, demoData) {
    const formData = new FormData();
    formData.append('demo', demoData.file);
    formData.append('steamId', steamId);

    try {
      const response = await fetch('/api/cs2/upload-demo', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Important for Steam session auth
      });

      if (!response.ok) {
        throw new Error('Demo upload failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading demo:', error);
      throw error;
    }
  }

  // Get player stats via API (which now uses Firebase backend)
  async getPlayerStats(steamId) {
    try {
      const response = await fetch(`/api/cs2/player/${steamId}/stats`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch player stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player stats:', error);
      throw error;
    }
  }

  // Get player matches via API
  async getPlayerMatches(steamId, limitCount = 20) {
    try {
      const response = await fetch(`/api/cs2/player/${steamId}/matches?limit=${limitCount}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch player matches');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching player matches:', error);
      throw error;
    }
  }

  // Get weapon stats via API
  async getPlayerWeapons(steamId) {
    try {
      const response = await fetch(`/api/cs2/player/${steamId}/weapons`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch weapon stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching weapon stats:', error);
      throw error;
    }
  }

  // Get map stats via API
  async getPlayerMaps(steamId) {
    try {
      const response = await fetch(`/api/cs2/player/${steamId}/maps`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch map stats');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching map stats:', error);
      throw error;
    }
  }

  // Real-time subscriptions (direct Firebase access for live updates)
  subscribeToPlayerStats(steamId, callback) {
    const statsRef = doc(db, 'playerStats', steamId);
    return onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data());
      } else {
        callback(null);
      }
    });
  }

  subscribeToPlayerMatches(steamId, callback, limitCount = 20) {
    const matchesQuery = query(
      collection(db, 'matches'),
      where('steamId', '==', steamId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(matchesQuery, (snapshot) => {
      const matches = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(matches);
    });
  }

  subscribeToWeaponStats(steamId, callback) {
    const weaponsQuery = query(
      collection(db, 'weaponStats'),
      where('steamId', '==', steamId),
      orderBy('kills', 'desc')
    );
    
    return onSnapshot(weaponsQuery, (snapshot) => {
      const weapons = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(weapons);
    });
  }

  subscribeToMapStats(steamId, callback) {
    const mapsQuery = query(
      collection(db, 'mapStats'),
      where('steamId', '==', steamId),
      orderBy('matches', 'desc')
    );
    
    return onSnapshot(mapsQuery, (snapshot) => {
      const maps = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(maps);
    });
  }

  // Search for players by Steam ID or display name
  async searchPlayers(searchTerm) {
    try {
      const response = await fetch(`/api/cs2/search?q=${encodeURIComponent(searchTerm)}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return await response.json();
    } catch (error) {
      console.error('Error searching players:', error);
      return [];
    }
  }

  // Get leaderboards
  async getLeaderboard(statType = 'kdRatio', limitCount = 50) {
    try {
      const response = await fetch(`/api/cs2/leaderboard?stat=${statType}&limit=${limitCount}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }
  }

  // Get recent global activity
  async getRecentActivity(limitCount = 10) {
    try {
      const response = await fetch(`/api/cs2/activity?limit=${limitCount}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch recent activity');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }
}

export const firebaseDataService = new FirebaseDataService();
export default firebaseDataService;
