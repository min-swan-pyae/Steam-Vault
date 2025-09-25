import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

class FirebaseService {
  constructor() {
    
    if (!admin.apps.length) {
      // Initialize Firebase Admin with service account from environment variables
      const serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'steam-vault-dev'
      });
    }
    
    this.db = getFirestore();
    this.db.settings({ ignoreUndefinedProperties: true });
    console.log('Firebase Admin initialized with ignoreUndefinedProperties enabled');

    // Initialize email transporter with App Password (simpler than OAuth)
    this.emailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // Collections getters
  get users() { return this.db.collection('users'); }
  get userProfiles() { return this.db.collection('userProfiles'); }
  get sessions() { return this.db.collection('sessions'); }
  get notifications() { return this.db.collection('notifications'); }
  get emailConnections() { return this.db.collection('emailConnections'); }
  get marketWatchlists() { return this.db.collection('marketWatchlists'); }
  get priceAlerts() { return this.db.collection('priceAlerts'); }
  get forumCategories() { return this.db.collection('forumCategories'); }
  get forumPosts() { return this.db.collection('forumPosts'); }
  get forumComments() { return this.db.collection('forumComments'); }
  get forumReports() { return this.db.collection('forumReports'); }
  get userActivity() { return this.db.collection('userActivity'); }
  get matches() { return this.db.collection('matches'); }
  get playerStats() { return this.db.collection('playerStats'); }
  get weaponStats() { return this.db.collection('weaponStats'); }
  get mapStats() { return this.db.collection('mapStats'); }
  get gsiConfigs() { return this.db.collection('gsiConfigs'); }
  get leaderboards() { return this.db.collection('leaderboards'); }
  get marketCache() { return this.db.collection('marketCache'); }
  get systemSettings() { return this.db.collection('systemSettings'); }

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
    try {
      const mapsSnapshot = await this.mapStats
        .where('steamId', '==', steamId)
        .get();
      
      // Sort in memory instead of requiring a composite index
      const maps = mapsSnapshot.docs.map(doc => doc.data());
      return maps.sort((a, b) => (b.totalMatches || 0) - (a.totalMatches || 0));
    } catch (error) {
      console.error('[FIREBASE] Error fetching player maps:', error);
      return [];
    }
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

  // Marketplace watchlist helpers

  async getWatchlist(steamId) {
    const snapshot = await this.marketWatchlists.where('steamId', '==', steamId).get();
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async addOrUpdateWatchItem(steamId, { appid, hashName, name = null, targetPrice = null, iconUrl = null, salePriceText = null, sellPriceText = null, currentPrice = null }) {
    const id = `${steamId}_${appid}_${hashName}`;
    const ref = this.marketWatchlists.doc(id);
    await ref.set({
      id,
      steamId,
      appid,
      hashName,
      name,
      iconUrl,
      targetPrice,
      salePriceText,
      sellPriceText,
      currentPrice,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    return id;
  }

  async removeWatchItem(steamId, id) {
    // Allow either composite id or doc id
    const ref = this.marketWatchlists.doc(id.startsWith(steamId) ? id : `${steamId}_${id}`);
    await ref.delete();
  }

  // CS2 GSI Methods
  async saveGSIConfig(steamId, config) {
    try {
      const configRef = this.db.collection('gsiConfigs').doc(steamId);
      await configRef.set({
        steamId,
        config,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`[FIREBASE] GSI config saved for ${steamId}`);
    } catch (error) {
      console.error('[FIREBASE] Error saving GSI config:', error);
      throw error;
    }
  }

  async processGSIData(steamId, gsiData) {
    try {
      // Extract relevant data from GSI payload
      const { map, round, player, allplayers } = gsiData;
      
      console.log(`[FIREBASE] Processing GSI data for ${steamId}`);
      console.log(`[FIREBASE] Has player data: ${!!player}`);
      console.log(`[FIREBASE] Has map data: ${!!map}`);
      console.log(`[FIREBASE] Round phase: ${round?.phase || 'unknown'}`);
      
      // Always update player stats if we have player data, even if map is missing
      if (player && player.state) {
        console.log(`[FIREBASE] Updating player stats with state:`, player.state);
        await this.updatePlayerStats(steamId, player);
      }

      // Process match data only when round ends
      if (round && round.phase === 'over' && map && player) {
        console.log(`[FIREBASE] Processing match end`);
        await this.processMatchEnd(steamId, gsiData);
      }

      console.log(`[FIREBASE] ✅ GSI data processed successfully for ${steamId}`);
    } catch (error) {
      console.error('[FIREBASE] ❌ Error processing GSI data:', error);
      throw error;
    }
  }

  async processMatchEnd(steamId, gsiData) {
    try {
      const { map, round, player, allplayers } = gsiData;
      
      const matchData = {
        steamId,
        matchId: `${steamId}_${Date.now()}`,
        mapName: map.name,
        result: this.determineMatchResult(player, allplayers),
        kills: player.state.kills || 0,
        deaths: player.state.deaths || 0,
        assists: player.state.assists || 0,
        mvps: player.state.mvps || 0,
        score: player.state.score || 0,
        duration: round.phase_countdowns?.freezetime || 0,
        date: admin.firestore.FieldValue.serverTimestamp()
      };

      await this.matches.add(matchData);
      console.log(`[FIREBASE] Match saved for ${steamId}`);
    } catch (error) {
      console.error('[FIREBASE] Error saving match:', error);
      throw error;
    }
  }

  async updatePlayerStats(steamId, playerData) {
    try {
      const statsRef = this.playerStats.doc(steamId);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      // Safely extract values with defaults
      const kills = playerData.state?.kills || playerData.state?.round_kills || 0;
      const deaths = playerData.state?.deaths || 0;  
      const assists = playerData.state?.assists || 0;
      const mvps = playerData.state?.mvps || 0;
      
      // Calculate KD ratio safely
      let kdRatio = 0;
      if (deaths > 0) {
        kdRatio = parseFloat((kills / deaths).toFixed(2));
      } else if (kills > 0) {
        kdRatio = kills; // If no deaths but has kills, KD is just kills
      }
      
      // Make sure kdRatio is a valid number
      if (isNaN(kdRatio) || !isFinite(kdRatio)) {
        kdRatio = 0;
      }
      
      const statsData = {
        steamId: steamId || 'unknown',
        totalKills: Number(kills) || 0,
        totalDeaths: Number(deaths) || 0,
        totalAssists: Number(assists) || 0,
        totalMVPs: Number(mvps) || 0,
        kdRatio: Number(kdRatio) || 0,
        lastUpdated: timestamp,
        lastSeen: timestamp
      };
      
      // Final validation - remove any undefined values
      Object.keys(statsData).forEach(key => {
        if (statsData[key] === undefined || statsData[key] === null || isNaN(statsData[key])) {
          if (key === 'steamId') {
            statsData[key] = 'unknown';
          } else if (key === 'lastUpdated' || key === 'lastSeen') {
            // Keep timestamp as is
          } else {
            statsData[key] = 0;
          }
        }
      });
      
      console.log(`[FIREBASE] Final stats data for ${steamId}:`, JSON.stringify(statsData, null, 2));
      
      await statsRef.set(statsData, { merge: true });
      
      console.log(`[FIREBASE] ✅ Player stats updated for ${steamId}`);
    } catch (error) {
      console.error('[FIREBASE] Error updating player stats:', error);
      throw error;
    }
  }

  async getPlayerStats(steamId) {
    try {
      const statsDoc = await this.playerStats.doc(steamId).get();
      return statsDoc.exists ? statsDoc.data() : null;
    } catch (error) {
      console.error('[FIREBASE] Error getting player stats:', error);
      throw error;
    }
  }

  async getPlayerMatches(steamId, limit = 20, offset = 0) {
    try {
      // First, get all matches for the player without ordering
      const matchesQuery = this.matches
        .where('steamId', '==', steamId);
      
      const snapshot = await matchesQuery.get();
      const allMatches = snapshot.docs.map(doc => doc.data());
      
      // Sort in memory by date (newest first)
      const sortedMatches = allMatches.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
      });
      
      // Apply pagination in memory
      const startIndex = offset;
      const endIndex = startIndex + limit;
      
      return sortedMatches.slice(startIndex, endIndex);
    } catch (error) {
      console.error('[FIREBASE] Error getting player matches:', error);
      throw error;
    }
  }

  async getPlayerWeapons(steamId) {
    try {
      const weaponsQuery = this.weaponStats
        .where('steamId', '==', steamId);
      
      const snapshot = await weaponsQuery.get();
      const weapons = snapshot.docs.map(doc => doc.data());
      
      // Sort in memory by kills (descending)
      return weapons.sort((a, b) => (b.kills || 0) - (a.kills || 0));
    } catch (error) {
      console.error('[FIREBASE] Error getting player weapons:', error);
      throw error;
    }
  }

  async getPlayerMaps(steamId) {
    try {
      const mapsQuery = this.mapStats
        .where('steamId', '==', steamId);
      
      const snapshot = await mapsQuery.get();
      const maps = snapshot.docs.map(doc => doc.data());
      
      // Sort in memory by matches played (descending)
      return maps.sort((a, b) => (b.matchesPlayed || 0) - (a.matchesPlayed || 0));
    } catch (error) {
      console.error('[FIREBASE] Error getting player maps:', error);
      throw error;
    }
  }

  async getCS2Leaderboard(type = 'kills', limit = 100) {
    try {
      let field = 'totalKills';
      switch (type) {
        case 'kd': field = 'kdRatio'; break;
        case 'mvps': field = 'totalMVPs'; break;
        default: field = 'totalKills';
      }
      
      const leaderboardQuery = this.playerStats
        .orderBy(field, 'desc')
        .limit(limit);
      
      const snapshot = await leaderboardQuery.get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('[FIREBASE] Error getting CS2 leaderboard:', error);
      throw error;
    }
  }

  async searchCS2Players(query, limit = 20) {
    try {
      // Simple search by Steam ID (can be enhanced with player names)
      const searchQuery = this.playerStats
        .where('steamId', '>=', query)
        .where('steamId', '<=', query + '\uf8ff')
        .limit(limit);
      
      const snapshot = await searchQuery.get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('[FIREBASE] Error searching CS2 players:', error);
      throw error;
    }
  }

  async getCS2RecentActivity(limit = 50) {
    try {
      const activityQuery = this.matches
        .orderBy('date', 'desc')
        .limit(limit);
      
      const snapshot = await activityQuery.get();
      return snapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.error('[FIREBASE] Error getting CS2 recent activity:', error);
      throw error;
    }
  }

  determineMatchResult(player, allplayers) {
    // Simple win/loss determination logic
    // This can be enhanced based on actual game state data
    return player.state.score > 15 ? 'Win' : 'Loss';
  }

  // ===========================
  // NEW ENHANCED FEATURES
  // ===========================

  // USER PROFILE MANAGEMENT
  async createOrUpdateUserProfile(steamId, profileData) {
    try {
      const profileRef = this.userProfiles.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const profile = {
        steamId,
        ...profileData,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await profileRef.set(profile, { merge: true });
      return profileRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating user profile:', error);
      throw error;
    }
  }

  async getUserProfile(steamId) {
    try {
      const profileQuery = await this.userProfiles
        .where('steamId', '==', steamId)
        .limit(1)
        .get();
      
      return profileQuery.empty ? null : profileQuery.docs[0].data();
    } catch (error) {
      console.error('[FIREBASE] Error getting user profile:', error);
      throw error;
    }
  }

  // EMAIL CONNECTION MANAGEMENT
  async connectEmail(steamId, email, verificationToken = null) {
    try {
      const connectionRef = this.emailConnections.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const connection = {
        steamId,
        email,
        isVerified: false,
        verificationToken: verificationToken || crypto.randomUUID(),
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await connectionRef.set(connection);
      return connection;
    } catch (error) {
      console.error('[FIREBASE] Error connecting email:', error);
      throw error;
    }
  }

  async verifyEmail(steamId, verificationToken) {
    try {
      const connectionQuery = await this.emailConnections
        .where('steamId', '==', steamId)
        .where('verificationToken', '==', verificationToken)
        .limit(1)
        .get();
      
      if (connectionQuery.empty) {
        return { success: false, error: 'Invalid or expired verification token' };
      }
      
      const connectionDoc = connectionQuery.docs[0];
      await connectionDoc.ref.update({
        isVerified: true,
        verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: true, data: connectionDoc.data() };
    } catch (error) {
      console.error('[FIREBASE] Error verifying email:', error);
      return { success: false, error: error.message };
    }
  }

  async getUserEmail(steamId) {
    try {
      const connectionQuery = await this.emailConnections
        .where('steamId', '==', steamId)
        .where('isVerified', '==', true)
        .limit(1)
        .get();
      
      return connectionQuery.empty ? null : connectionQuery.docs[0].data();
    } catch (error) {
      console.error('[FIREBASE] Error getting user email:', error);
      throw error;
    }
  }

  // NOTIFICATION SYSTEM
  async createNotification(steamId, notificationData) {
    try {
      const notificationRef = this.notifications.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const notification = {
        steamId,
        ...notificationData,
        isRead: false,
        isSent: false,
        createdAt: timestamp
      };
      
      await notificationRef.set(notification);
      
      // Try to send email notification if user has email connected
      // Pass the notification with its ID
      await this.sendEmailNotification(steamId, { ...notification, id: notificationRef.id });
      
      return notificationRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating notification:', error);
      throw error;
    }
  }

  async sendEmailNotification(steamId, notification) {
    try {
      const emailConnection = await this.getUserEmail(steamId);
      if (!emailConnection) {
        console.log(`[FIREBASE] No verified email found for ${steamId}`);
        return;
      }
      
      const user = await this.getUser(steamId);
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: emailConnection.email,
        subject: `Steam Vault - ${notification.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1976d2;">Steam Vault Notification</h2>
            <h3>${notification.title}</h3>
            <p>${notification.message}</p>
            ${notification.data?.url ? `<a href="http://localhost:5173${notification.data.url}" style="background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a>` : ''}
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              This notification was sent to ${user?.displayName || 'you'} because you have notifications enabled in your Steam Vault account.
              <br>
              To unsubscribe, visit your <a href="http://localhost:5173/profile">profile settings</a>.
            </p>
          </div>
        `
      };
      
      await this.emailTransporter.sendMail(mailOptions);
      
      // Update notification as sent
      await this.notifications.doc(notification.id).update({
        isSent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`[FIREBASE] Email notification sent to ${emailConnection.email}`);
    } catch (error) {
      console.error('[FIREBASE] Error sending email notification:', error);
      // Don't throw error - notification creation should succeed even if email fails
    }
  }

  async getUserNotifications(steamId, limit = 50, includeRead = false) {
    try {
      let query = this.notifications
        .where('steamId', '==', steamId);
      
      if (!includeRead) {
        query = query.where('isRead', '==', false);
      }
      
      query = query.orderBy('createdAt', 'desc').limit(limit);
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[FIREBASE] Error getting user notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(steamId, notificationId) {
    try {
      const notificationRef = this.notifications.doc(notificationId);
      const notificationDoc = await notificationRef.get();
      
      if (!notificationDoc.exists || notificationDoc.data().steamId !== steamId) {
        throw new Error('Notification not found or access denied');
      }
      
      await notificationRef.update({
        isRead: true,
        readAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('[FIREBASE] Error marking notification as read:', error);
      throw error;
    }
  }

  // PRICE ALERT SYSTEM
  async checkPriceAlerts() {
    try {
      const watchlistQuery = await this.marketWatchlists
        .where('alertsEnabled', '==', true)
        .where('targetPrice', '>', 0)
        .get();
      
      for (const watchlistDoc of watchlistQuery.docs) {
        const watchlistItem = watchlistDoc.data();
        
        // Check if current price is below target price
        if (watchlistItem.currentPrice && watchlistItem.currentPrice <= watchlistItem.targetPrice) {
          await this.createPriceAlert(watchlistItem);
        }
      }
    } catch (error) {
      console.error('[FIREBASE] Error checking price alerts:', error);
      throw error;
    }
  }

  async createPriceAlert(watchlistItem) {
    try {
      // Check if alert already exists for this item
      const existingAlertQuery = await this.priceAlerts
        .where('watchlistItemId', '==', watchlistItem.id)
        .where('isActive', '==', true)
        .limit(1)
        .get();
      
      if (!existingAlertQuery.empty) {
        console.log(`[FIREBASE] Price alert already exists for ${watchlistItem.name}`);
        return;
      }
      
      const alertRef = this.priceAlerts.doc();
      const alert = {
        watchlistItemId: watchlistItem.id,
        steamId: watchlistItem.steamId,
        itemName: watchlistItem.name,
        targetPrice: watchlistItem.targetPrice,
        triggeredPrice: watchlistItem.currentPrice,
        triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true
      };
      
      await alertRef.set(alert);
      
      // Create notification
      await this.createNotification(watchlistItem.steamId, {
        type: 'price_drop',
        title: 'Price Drop Alert!',
        message: `${watchlistItem.name} price dropped to $${watchlistItem.currentPrice.toFixed(2)} (Target: $${watchlistItem.targetPrice.toFixed(2)})`,
        data: {
          itemId: watchlistItem.id,
          oldPrice: watchlistItem.targetPrice,
          newPrice: watchlistItem.currentPrice,
          url: `/marketplace?search=${encodeURIComponent(watchlistItem.hashName)}&appid=${watchlistItem.appid || 730}`
        }
      });
      
      // Deactivate the alert to prevent spam
      await alertRef.update({ isActive: false });
      
      console.log(`[FIREBASE] Price alert created for ${watchlistItem.name}`);
    } catch (error) {
      console.error('[FIREBASE] Error creating price alert:', error);
      throw error;
    }
  }

  // FORUM SYSTEM
  async createForumCategory(categoryData) {
    try {
      const categoryRef = this.forumCategories.doc(categoryData.id || categoryData.name.toLowerCase().replace(/\s+/g, '-'));
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const category = {
        ...categoryData,
        stats: {
          totalPosts: 0,
          totalComments: 0,
          lastActivity: timestamp
        },
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await categoryRef.set(category, { merge: true });
      return categoryRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating forum category:', error);
      throw error;
    }
  }

  async getForumCategories() {
    try {
      const categoriesSnapshot = await this.forumCategories
        .where('isActive', '==', true)
        .orderBy('order')
        .get();
      
      return categoriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[FIREBASE] Error getting forum categories:', error);
      throw error;
    }
  }

  async createForumPost(steamId, postData) {
    try {
      const postRef = this.forumPosts.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const user = await this.getUser(steamId);
      const post = {
        ...postData,
        authorSteamId: steamId,
        authorDisplayName: user?.displayName || 'Unknown User',
        isPinned: false,
        isLocked: false,
        isDeleted: false,
        stats: {
          views: 0,
          likes: 0,
          dislikes: 0,
          comments: 0
        },
        lastActivity: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
        editHistory: []
      };
      
      await postRef.set(post);
      
      // Update category stats
      await this.updateCategoryStats(postData.categoryId, { posts: 1 });
      
      // Log user activity
      await this.logUserActivity(steamId, 'post_created', {
        postId: postRef.id,
        postTitle: postData.title
      });
      
      return postRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating forum post:', error);
      throw error;
    }
  }

  async getForumPosts(categoryId, options = {}) {
    try {
      const { limit = 20, offset = 0, sortBy = 'lastActivity', sortOrder = 'desc' } = options;
      
      let query = this.forumPosts
        .where('categoryId', '==', categoryId)
        .where('isDeleted', '==', false);
      
      // Handle pinned posts first, then sort by specified criteria
      if (sortBy === 'lastActivity') {
        query = query.orderBy('isPinned', 'desc').orderBy('lastActivity', sortOrder);
      } else {
        query = query.orderBy('isPinned', 'desc').orderBy(sortBy, sortOrder);
      }
      
      if (offset > 0) {
        const offsetSnapshot = await query.limit(offset).get();
        const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
        query = query.startAfter(lastDoc);
      }
      
      query = query.limit(limit);
      
      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[FIREBASE] Error getting forum posts:', error);
      throw error;
    }
  }

  async createForumComment(steamId, commentData) {
    try {
      const commentRef = this.forumComments.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const user = await this.getUser(steamId);
      const comment = {
        ...commentData,
        authorSteamId: steamId,
        authorDisplayName: user?.displayName || 'Unknown User',
        level: commentData.parentCommentId ? 1 : 0, // Simple threading
        isDeleted: false,
        stats: {
          likes: 0,
          dislikes: 0
        },
        createdAt: timestamp,
        updatedAt: timestamp,
        editHistory: []
      };
      
      await commentRef.set(comment);
      
      // Update post stats and last activity
      const postRef = this.forumPosts.doc(commentData.postId);
      await postRef.update({
        'stats.comments': admin.firestore.FieldValue.increment(1),
        lastActivity: timestamp,
        lastCommentBy: steamId
      });
      
      // Update category stats
      const postDoc = await postRef.get();
      if (postDoc.exists) {
        await this.updateCategoryStats(postDoc.data().categoryId, { comments: 1 });
      }
      
      // Log user activity
      await this.logUserActivity(steamId, 'comment_added', {
        postId: commentData.postId,
        commentId: commentRef.id
      });
      
      return commentRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating forum comment:', error);
      throw error;
    }
  }

  async getForumComments(postId, options = {}) {
    try {
      const { limit = 50, sortOrder = 'asc' } = options;
      
      const snapshot = await this.forumComments
        .where('postId', '==', postId)
        .where('isDeleted', '==', false)
        .orderBy('createdAt', sortOrder)
        .limit(limit)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[FIREBASE] Error getting forum comments:', error);
      throw error;
    }
  }

  async createForumReport(reporterSteamId, reportData) {
    try {
      const reportRef = this.forumReports.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const report = {
        ...reportData,
        reporterSteamId,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        resolution: null,
        resolutionNotes: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await reportRef.set(report);
      
      // Notify moderators (you can implement this)
      console.log(`[FIREBASE] New report created by ${reporterSteamId}`);
      
      return reportRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating forum report:', error);
      throw error;
    }
  }

  async updateCategoryStats(categoryId, changes) {
    try {
      const categoryRef = this.forumCategories.doc(categoryId);
      const updates = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (changes.posts) {
        updates['stats.totalPosts'] = admin.firestore.FieldValue.increment(changes.posts);
      }
      
      if (changes.comments) {
        updates['stats.totalComments'] = admin.firestore.FieldValue.increment(changes.comments);
      }
      
      if (changes.posts || changes.comments) {
        updates['stats.lastActivity'] = admin.firestore.FieldValue.serverTimestamp();
      }
      
      await categoryRef.update(updates);
    } catch (error) {
      console.error('[FIREBASE] Error updating category stats:', error);
      // Don't throw - this is non-critical
    }
  }

  async logUserActivity(steamId, activityType, activityData) {
    try {
      const activityRef = this.userActivity.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const activity = {
        steamId,
        activityType,
        activityData,
        createdAt: timestamp,
        retentionUntil: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
      };
      
      await activityRef.set(activity);
    } catch (error) {
      console.error('[FIREBASE] Error logging user activity:', error);
      // Don't throw - this is non-critical
    }
  }

  // CONTENT MODERATION
  async detectToxicContent(content) {
    // Basic toxic word detection - you can enhance this with ML APIs
    const toxicWords = ['toxic', 'hate', 'spam', 'abuse']; // Add more words
    const lowerContent = content.toLowerCase();
    
    for (const word of toxicWords) {
      if (lowerContent.includes(word)) {
        return {
          isToxic: true,
          detectedWords: [word],
          confidence: 0.8
        };
      }
    }
    
    return {
      isToxic: false,
      detectedWords: [],
      confidence: 0
    };
  }

  // ENHANCED WATCHLIST WITH PRICE TRACKING
  async getWatchlist(steamId) {
    try {
      const snapshot = await this.marketWatchlists
        .where('steamId', '==', steamId)
        .orderBy('updatedAt', 'desc')
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('[FIREBASE] Error getting watchlist:', error);
      throw error;
    }
  }

  async addOrUpdateWatchItem(steamId, { appid, hashName, name = null, targetPrice = null, iconUrl = null, salePriceText = null, sellPriceText = null, currentPrice = null }) {
    try {
      const id = `${steamId}_${appid}_${hashName}`;
      const ref = this.marketWatchlists.doc(id);
      
      const watchItem = {
        id,
        steamId,
        appid,
        hashName,
        name,
        iconUrl,
        targetPrice: targetPrice || null,
        salePriceText: salePriceText || null,
        sellPriceText: sellPriceText || null,
        currentPrice: currentPrice || null,
        alertsEnabled: !!targetPrice,
        priceHistory: [],
        lastPriceCheck: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await ref.set(watchItem, { merge: true });
      return id;
    } catch (error) {
      console.error('[FIREBASE] Error adding/updating watch item:', error);
      throw error;
    }
  }

  async removeWatchItem(steamId, id) {
    try {
      // Allow either composite id or doc id
      const docId = id.startsWith(steamId) ? id : `${steamId}_${id}`;
      const ref = this.marketWatchlists.doc(docId);
      await ref.delete();
    } catch (error) {
      console.error('[FIREBASE] Error removing watch item:', error);
      throw error;
    }
  }

  async updateWatchItemPrice(steamId, itemId, newPrice) {
    try {
      const ref = this.marketWatchlists.doc(itemId);
      const doc = await ref.get();
      
      if (!doc.exists || doc.data().steamId !== steamId) {
        throw new Error('Watch item not found or access denied');
      }
      
      const currentData = doc.data();
      const priceHistory = currentData.priceHistory || [];
      
      // Add to price history (keep last 30 entries)
      priceHistory.push({
        price: newPrice,
        date: admin.firestore.FieldValue.serverTimestamp()
      });
      
      if (priceHistory.length > 30) {
        priceHistory.shift();
      }
      
      await ref.update({
        currentPrice: newPrice,
        priceHistory: priceHistory,
        lastPriceCheck: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Check if price alert should be triggered
      if (currentData.alertsEnabled && currentData.targetPrice && newPrice <= currentData.targetPrice) {
        await this.createPriceAlert({
          ...currentData,
          currentPrice: newPrice
        });
      }
    } catch (error) {
      console.error('[FIREBASE] Error updating watch item price:', error);
      throw error;
    }
  }
}

export default new FirebaseService();
export { admin };
