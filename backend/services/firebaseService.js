import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      // Initialize Firebase Admin with service account
      // In production, use environment variables or service account key
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        // You can also use a service account key file:
        // credential: admin.credential.cert(serviceAccountKey),
        projectId: process.env.FIREBASE_PROJECT_ID || 'steam-vault-dev'
      });
    }
    
    this.db = getFirestore();
    console.log('Firebase Admin initialized');
  }

  // Collections
  get users() { return this.db.collection('users'); }
  get matches() { return this.db.collection('matches'); }
  get playerStats() { return this.db.collection('playerStats'); }
  get weaponStats() { return this.db.collection('weaponStats'); }
  get mapStats() { return this.db.collection('mapStats'); }

  // User management
  async createOrUpdateUser(steamId, userData) {
    const userRef = this.users.doc(steamId);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await userRef.set({
      steamId,
      ...userData,
      lastSeen: timestamp,
      updatedAt: timestamp
    }, { merge: true });
    
    return userRef;
  }

  async getUser(steamId) {
    const userDoc = await this.users.doc(steamId).get();
    return userDoc.exists ? userDoc.data() : null;
  }

  // Player stats management
  async savePlayerStats(steamId, stats) {
    const statsRef = this.playerStats.doc(steamId);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await statsRef.set({
      steamId,
      ...stats,
      updatedAt: timestamp
    }, { merge: true });
    
    return statsRef;
  }

  async getPlayerStats(steamId) {
    const statsDoc = await this.playerStats.doc(steamId).get();
    return statsDoc.exists ? statsDoc.data() : null;
  }

  // Match management
  async saveMatch(steamId, matchData) {
    const matchRef = this.matches.doc();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    await matchRef.set({
      ...matchData,
      steamId,
      createdAt: timestamp
    });
    
    return matchRef;
  }

  async getPlayerMatches(steamId, limit = 20) {
    const matchesSnapshot = await this.matches
      .where('steamId', '==', steamId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // Weapon stats management
  async saveWeaponStats(steamId, weaponStats) {
    const batch = this.db.batch();
    
    for (const weapon of weaponStats) {
      const weaponRef = this.weaponStats.doc(`${steamId}_${weapon.weaponName}`);
      batch.set(weaponRef, {
        steamId,
        ...weapon,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    await batch.commit();
  }

  async getPlayerWeapons(steamId) {
    const weaponsSnapshot = await this.weaponStats
      .where('steamId', '==', steamId)
      .orderBy('kills', 'desc')
      .get();
    
    return weaponsSnapshot.docs.map(doc => doc.data());
  }

  // Map stats management
  async saveMapStats(steamId, mapStats) {
    const batch = this.db.batch();
    
    for (const map of mapStats) {
      const mapRef = this.mapStats.doc(`${steamId}_${map.mapName}`);
      batch.set(mapRef, {
        steamId,
        ...map,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    
    await batch.commit();
  }

  async getPlayerMaps(steamId) {
    const mapsSnapshot = await this.mapStats
      .where('steamId', '==', steamId)
      .orderBy('totalMatches', 'desc')
      .get();
    
    return mapsSnapshot.docs.map(doc => doc.data());
  }

  // Aggregated statistics
  async updatePlayerAggregatedStats(steamId) {
    try {
      const [matches, weapons, maps] = await Promise.all([
        this.getPlayerMatches(steamId, 1000), // Get all matches for calculation
        this.getPlayerWeapons(steamId),
        this.getPlayerMaps(steamId)
      ]);

      // Calculate aggregated stats
      const totalKills = matches.reduce((sum, match) => sum + (match.kills || 0), 0);
      const totalDeaths = matches.reduce((sum, match) => sum + (match.deaths || 0), 0);
      const totalHeadshots = weapons.reduce((sum, weapon) => sum + (weapon.headshots || 0), 0);
      const totalMatches = matches.length;
      const wins = matches.filter(match => match.result === 'Win').length;
      
      const aggregatedStats = {
        steamId,
        totalKills,
        totalDeaths,
        totalMatches,
        totalHeadshots,
        kdRatio: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
        winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
        headshotPercentage: totalKills > 0 ? Math.round((totalHeadshots / totalKills) * 100) : 0,
        // Most played map
        mostPlayedMap: maps.length > 0 ? maps[0].mapName : null,
        // Most successful map (highest win rate with minimum 3 matches)
        mostSuccessfulMap: maps
          .filter(map => map.totalMatches >= 3)
          .sort((a, b) => b.winRate - a.winRate)[0]?.mapName || null,
        // Favorite weapon (most kills)
        favoriteWeapon: weapons.length > 0 ? weapons[0].weaponName : null,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.savePlayerStats(steamId, aggregatedStats);
      return aggregatedStats;
    } catch (error) {
      console.error('Error updating aggregated stats:', error);
      throw error;
    }
  }

  // Process demo data and save to Firestore
  async processDemoData(steamId, parsedDemoData) {
    try {
      // Save the match
      const matchData = {
        matchId: `demo_${Date.now()}`,
        mapName: parsedDemoData.matchInfo.mapName || 'Unknown',
        result: 'Analyzed', // We can't determine win/loss from single player perspective
        kills: parsedDemoData.kills,
        deaths: parsedDemoData.deaths,
        assists: parsedDemoData.assists,
        headshots: parsedDemoData.headshots,
        damage: parsedDemoData.damage,
        mvps: parsedDemoData.mvps,
        score: parsedDemoData.score,
        duration: parsedDemoData.matchInfo.duration || 0,
        date: parsedDemoData.matchInfo.date,
        kdRatio: parsedDemoData.kdRatio || 0,
        headshotPercentage: parsedDemoData.headshotPercentage || 0
      };

      await this.saveMatch(steamId, matchData);

      // Save weapon stats
      const weaponStats = Object.values(parsedDemoData.weaponStats || {});
      if (weaponStats.length > 0) {
        await this.saveWeaponStats(steamId, weaponStats);
      }

      // Calculate and save map stats
      const existingMaps = await this.getPlayerMaps(steamId);
      const mapName = parsedDemoData.matchInfo.mapName || 'Unknown';
      
      let mapStat = existingMaps.find(map => map.mapName === mapName);
      if (!mapStat) {
        mapStat = {
          mapName,
          totalMatches: 0,
          wins: 0,
          losses: 0,
          totalKills: 0,
          totalDeaths: 0,
          totalRounds: 0
        };
      }

      mapStat.totalMatches += 1;
      mapStat.totalKills += parsedDemoData.kills;
      mapStat.totalDeaths += parsedDemoData.deaths;
      mapStat.totalRounds += parsedDemoData.rounds?.length || 0;
      mapStat.avgKills = mapStat.totalMatches > 0 ? 
        Math.round((mapStat.totalKills / mapStat.totalMatches) * 10) / 10 : 0;
      mapStat.avgDeaths = mapStat.totalMatches > 0 ? 
        Math.round((mapStat.totalDeaths / mapStat.totalMatches) * 10) / 10 : 0;
      mapStat.winRate = mapStat.totalMatches > 0 ? 
        Math.round((mapStat.wins / mapStat.totalMatches) * 100) : 0;

      await this.saveMapStats(steamId, [mapStat]);

      // Update aggregated player stats
      await this.updatePlayerAggregatedStats(steamId);

      return {
        match: matchData,
        playerStats: await this.getPlayerStats(steamId)
      };
    } catch (error) {
      console.error('Error processing demo data:', error);
      throw error;
    }
  }

  // Get leaderboards
  async getLeaderboard(statField = 'kdRatio', limitCount = 50) {
    try {
      const statsQuery = query(
        collection(this.db, 'playerStats'),
        orderBy(statField, 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(statsQuery);
      return snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        steamId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  // Search players
  async searchPlayers(searchTerm) {
    try {
      // Search by display name
      const nameQuery = query(
        collection(this.db, 'playerStats'),
        where('personaName', '>=', searchTerm),
        where('personaName', '<=', searchTerm + '\uf8ff'),
        limit(10)
      );
      
      const nameSnapshot = await getDocs(nameQuery);
      const nameResults = nameSnapshot.docs.map(doc => ({
        steamId: doc.id,
        ...doc.data(),
        matchType: 'name'
      }));

      // If searchTerm looks like a Steam ID, search by Steam ID
      const steamIdResults = [];
      if (searchTerm.match(/^\d+$/)) {
        const statsDoc = await getDoc(doc(this.db, 'playerStats', searchTerm));
        if (statsDoc.exists()) {
          steamIdResults.push({
            steamId: statsDoc.id,
            ...statsDoc.data(),
            matchType: 'steamId'
          });
        }
      }

      // Combine and deduplicate results
      const allResults = [...steamIdResults, ...nameResults];
      const uniqueResults = allResults.filter((item, index, self) => 
        index === self.findIndex(t => t.steamId === item.steamId)
      );

      return uniqueResults.slice(0, 10);
    } catch (error) {
      console.error('Error searching players:', error);
      return [];
    }
  }

  // Get recent activity
  async getRecentActivity(limitCount = 10) {
    try {
      const activityQuery = query(
        collection(this.db, 'matches'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(activityQuery);
      const activities = [];
      
      for (const matchDoc of snapshot.docs) {
        const matchData = matchDoc.data();
        
        // Get player stats for this match
        const playerStatsDoc = await getDoc(doc(this.db, 'playerStats', matchData.steamId));
        const playerStats = playerStatsDoc.exists() ? playerStatsDoc.data() : {};
        
        activities.push({
          id: matchDoc.id,
          type: 'match_completed',
          steamId: matchData.steamId,
          playerName: playerStats.personaName || 'Unknown Player',
          mapName: matchData.mapName || 'Unknown Map',
          kills: matchData.kills || 0,
          deaths: matchData.deaths || 0,
          createdAt: matchData.createdAt,
          ...matchData
        });
      }
      
      return activities;
    } catch (error) {
      console.error('Error getting recent activity:', error);
      return [];
    }
  }
}

export default new FirebaseService();
