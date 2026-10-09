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
      },
      // Connection timeout settings
      connectionTimeout: 30000, // 30 seconds to establish connection
      greetingTimeout: 20000,   // 20 seconds for greeting
      socketTimeout: 60000,     // 60 seconds for socket operations
      // DNS settings
      dnsTimeout: 15000,        // 15 seconds for DNS lookup
    });
  }

  // Single hard-coded admin Steam ID (provided by project owner)
  ADMIN_STEAM_ID = '76561198918283411';

  // Collections getters
  get users() { return this.db.collection('users'); }
  get userProfiles() { return this.db.collection('userProfiles'); }
  get notifications() { return this.db.collection('notifications'); }
  get emailConnections() { return this.db.collection('emailConnections'); }
  get marketWatchlists() { return this.db.collection('marketWatchlists'); }
  get forumCategories() { return this.db.collection('forumCategories'); }
  get forumPosts() { return this.db.collection('forumPosts'); }
  get forumComments() { return this.db.collection('forumComments'); }
  get forumReports() { return this.db.collection('forumReports'); }
  get userActivity() { return this.db.collection('userActivity'); }
  get matches() { return this.db.collection('matches'); }
  get playerStats() { return this.db.collection('playerStats'); }
  get weaponStats() { return this.db.collection('weaponStats'); }
  get mapStats() { return this.db.collection('mapStats'); }
  get gsiSessions() { return this.db.collection('gsiSessions'); }

  // User management
  async createOrUpdateUser(steamId, userData) {
    const userRef = this.users.doc(steamId);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    // Fetch existing to preserve enforced roles
    const existing = await userRef.get();
    const existingData = existing.exists ? existing.data() : {};

    // Always enforce the single admin role on the configured ID
    // Role is now a single string instead of array ("admin" or "user") simplifying search & filter.
    // Backward compatibility: if existingData.roles is array keep admin if present else downgrade to 'user'.
    let role = 'user';
    const priorRoles = existingData.roles || [];
    if (Array.isArray(priorRoles) && priorRoles.includes('admin')) role = 'admin';
    if (steamId === this.ADMIN_STEAM_ID) role = 'admin'; // enforce single admin

    // Accept explicit role override from userData ONLY if admin creating and target is admin id
    if (userData && typeof userData.role === 'string') {
      if (steamId === this.ADMIN_STEAM_ID) role = 'admin'; // ignore if mismatched
    }

    const basePayload = {
      steamId,
      ...userData,
      role, // new field
      lastSeen: timestamp,
      updatedAt: timestamp
    };
    if (!existing.exists) basePayload.createdAt = timestamp; // ensure createdAt exists for new docs (admin listing sort)
    await userRef.set(basePayload, { merge: true });
    
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

  // Demo parsing removed – all CS2 data sourced purely from GSI events.

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

  async addOrUpdateWatchItem(steamId, { appid, hashName, name = null, targetPrice = null, iconUrl = null, salePriceText = null, sellPriceText = null, currentPrice = null, alertsEnabled = true }) {
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
      alertsEnabled,
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

  async processGSIData(steamId, gsiData) {
    try {
      const { map, round, player } = gsiData;
      if (map?.team_ct || map?.team_t) {
      }

      // If we're clearly in main menu (no map data and activity=menu), just mark last seen and return
      if (!map && player?.activity === 'menu') {
        try {
          await this.playerStats.doc(steamId).set({ steamId, lastSeen: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        } catch (_) {}
        return;
      }

      // Accumulate running totals each tick
      if (player) await this._accumulateGSI?.(steamId, gsiData);

    // Determine if match likely ended (only treat map.phase === 'gameover' as a phase-based end)
  const ctScore = Number(map?.team_ct?.score || 0);
  const tScore = Number(map?.team_t?.score || 0);
  const mapPhase = map?.phase || gsiData?.phase_countdowns?.phase || null;
  const CS2_REG_WIN = 13; // MR12
  const CS2_OT_WIN = 16;  // Premier OT target
  const CASUAL_WIN = 8;   // Casual/other short modes heuristic
  const isGameOverPhase = (mapPhase === 'gameover');
  const isCompetitiveTie = (ctScore === 12 && tScore === 12);
  const isPremierTie = (ctScore === 15 && tScore === 15);
  const isPremierOTWin = Math.max(ctScore, tScore) >= CS2_OT_WIN;
  const reachedRegWin = Math.max(ctScore, tScore) >= CS2_REG_WIN;
  const reachedCasualWin = Math.max(ctScore, tScore) >= CASUAL_WIN;
  const isCasualName = (() => { const n=(map?.name||'').toLowerCase(); return /^kz_|^aim_|^fy_|^ar_|^training|^practice/.test(n); })();
  const allowedCompetitive = map?.mode === 'competitive';
  const allowedPremier = isPremierTie || isPremierOTWin; // infer premier by OT rules
  const allowedMode = allowedCompetitive || allowedPremier;
  // Finalize if: final phase, or clear scoreline finals
  const gameOver = isGameOverPhase || isCompetitiveTie || isPremierTie || isPremierOTWin || reachedRegWin;
  // Save match on clear final even if the final tick lacks player block; processMatchEnd will infer stats.
  const hasStatsContext = !!(player?.match_stats || player?.state);
  if (map && gameOver) await this.processMatchEnd(steamId, gsiData);

    } catch (error) {
      console.error('[FIREBASE] ❌ Error processing GSI data:', error);
      throw error;
    }
  }

  async processMatchEnd(steamId, gsiData) {
    try {
      const { map, player, allplayers, round } = gsiData;
      const nowTs = admin.firestore.FieldValue.serverTimestamp();
      const ctScore = Number(map?.team_ct?.score || 0);
      const tScore = Number(map?.team_t?.score || 0);
  const mapPhaseEnd = map?.phase || gsiData?.phase_countdowns?.phase || null;
  const isGameOverPhase = (mapPhaseEnd === 'gameover');
  const isCasualName = (() => { const n=(map?.name||'').toLowerCase(); return /^kz_|^aim_|^fy_|^ar_|^training|^practice/.test(n); })();
  const allowedCompetitive = map?.mode === 'competitive';
  const allowedPremier = (ctScore === 15 && tScore === 15) || Math.max(ctScore, tScore) >= 16;
  const allowedMode = allowedCompetitive || allowedPremier;
  if (!allowedMode) {
    return;
  }

      // Determine player team from allplayers if missing (never trust teammate top-level player block)
      const mySteamId = String(steamId);
      let team = null;
      // 1) Try allplayers[mySteamId]
      if (!team && allplayers && typeof allplayers === 'object') {
        try {
          const ap = Object.values(allplayers).find(p => String(p?.steamid) === mySteamId);
          if (ap?.team) team = ap.team;
        } catch (_) {}
      }
      // 2) If top-level player is actually ME, accept its team
      const playerIsMine = player && String(player.steamid || '') === mySteamId;
      if (!team && playerIsMine && (player?.team === 'CT' || player?.team === 'T')) {
        team = player.team;
      }
      // 3) Fallback to last snapshot from session
      if (!team) {
        try {
          const sessSnap = await this.gsiSessions.doc(steamId).get();
          if (sessSnap.exists) {
            const sd = sessSnap.data() || {};
            if (sd.lastMyTeam === 'CT' || sd.lastMyTeam === 'T') team = sd.lastMyTeam;
          }
        } catch (_) {}
      }
      if (team !== 'CT' && team !== 'T') team = 'T';

  const myScore = team === 'CT' ? ctScore : tScore;
  const oppScore = team === 'CT' ? tScore : ctScore;

      // Prefer match_stats at end of game; if missing, pull from allplayers[mySteamId].
      // IMPORTANT: Only use top-level player/previously.player if that block belongs to ME.
      const apMine = (() => {
        if (!allplayers || typeof allplayers !== 'object') return null;
        try { return Object.values(allplayers).find(p => String(p?.steamid) === mySteamId) || null; } catch(_) { return null; }
      })();
      // Guarded sources
      const prevPlayer = gsiData?.previously?.player || null;
      const prevIsMine = prevPlayer && String(prevPlayer?.steamid || '') === mySteamId;
      const prevMs = prevIsMine ? (prevPlayer.match_stats || null) : null;
      const prevState = prevIsMine ? (prevPlayer.state || null) : null;
      const msTop = playerIsMine ? (player?.match_stats || null) : null;
      const stateTop = playerIsMine ? (player?.state || null) : null;
      const ms = (apMine?.match_stats) || msTop || prevMs || {};
      const state = (apMine?.state) || stateTop || prevState || {};
      let sessData = {};
      try {
        const sessSnap = await this.gsiSessions.doc(steamId).get();
        if (sessSnap.exists) sessData = sessSnap.data() || {};
      } catch (_) {}

    const kills = Number(ms.kills ?? state.kills ?? sessData.lastMyStats?.kills ?? sessData.kills ?? 0);
    const deaths = Number(ms.deaths ?? state.deaths ?? sessData.lastMyStats?.deaths ?? sessData.deaths ?? 0);
    const assists = Number(ms.assists ?? state.assists ?? sessData.lastMyStats?.assists ?? sessData.assists ?? 0);
    const mvps = Number(ms.mvps ?? state.mvps ?? sessData.lastMyStats?.mvps ?? sessData.mvps ?? 0);

  const endTsSec = Number(gsiData?.provider?.timestamp || 0);
      const startTsSec = Number(sessData.matchStartedAtProviderTs || endTsSec || 0);
      const duration = endTsSec && startTsSec ? Math.max(0, (endTsSec - startTsSec)) : 0;

      // Guard: if we still have no meaningful numbers (menu payload), skip
  const phaseForGuard = round?.phase || gsiData?.phase_countdowns?.phase || map?.phase;
  const isMeaningful = (kills + deaths + assists + mvps) > 0 || (ctScore + tScore) > 0 || phaseForGuard === 'gameover';
      if (!isMeaningful) {
        return;
      }

      // Determine inferred mode from scoreline when map.mode is missing
      const inferredMode = (ctScore === 12 && tScore === 12)
        ? 'competitive'
        : ((ctScore === 15 && tScore === 15) || Math.max(ctScore, tScore) >= 16 ? 'premier' : null);

      // Determine if this looks like a surrender (phase is true gameover but score below expected threshold)
      const threshold = inferredMode === 'premier' ? 16 : 13;
      const casualLikely = (map?.mode === 'casual') || (!map?.mode && (map?.name?.includes('kz') || map?.name?.includes('aim') || map?.name?.includes('fy')));
      const casualThreshold = 8;
      const expectedThreshold = casualLikely ? casualThreshold : threshold;
      const isSurrender = isGameOverPhase && Math.max(ctScore, tScore) < expectedThreshold;

      const matchData = {
        steamId,
        matchId: `${steamId}_${Date.now()}`,
        mapName: map?.name || 'unknown',
        mode: map?.mode || null,
        inferredMode: inferredMode,
        result: (ctScore === tScore) ? 'Tie' : (myScore > oppScore ? 'Win' : (oppScore > myScore ? 'Loss' : 'Unknown')),
        resultReason: (ctScore === tScore) ? 'Tie' : (isSurrender ? 'Surrender' : 'Normal'),
        kills,
        deaths,
        assists,
        mvps,
        score: myScore,
        opponentScore: oppScore,
        duration,
        date: nowTs,
        createdAt: nowTs
      };

      // Skip duplicate save with same map/score combination
      try {
        const sessRef = this.gsiSessions.doc(steamId);
        const sessSnap = await sessRef.get();
        const lastKey = sessSnap.exists ? sessSnap.data()?.lastSavedMatchKey : null;
        const key = `${matchData.mapName}|${ctScore}-${tScore}`;
        if (lastKey === key) {
          return;
        }
        await sessRef.set({ lastSavedMatchKey: key }, { merge: true });
      } catch (_) {}

  await this.matches.add(matchData);

      // Recompute aggregate player totals from all matches (deduped) so historical counts are included
      try {
        const agg = await this._computeAggregatesFromMatches(steamId);
        const statsRef = this.playerStats.doc(steamId);
        const kd = agg.totalDeaths > 0 ? Number((agg.totalKills / agg.totalDeaths).toFixed(2)) : Number(agg.totalKills.toFixed?.(2) || agg.totalKills || 0);
        await statsRef.set({
          steamId,
          totalMatches: agg.totalMatches,
          totalWins: agg.totalWins,
          winRate: agg.totalMatches > 0 ? Math.round((agg.totalWins / agg.totalMatches) * 100) : 0,
          totalKills: agg.totalKills,
          totalDeaths: agg.totalDeaths,
          kdRatio: kd,
          lastUpdated: nowTs
        }, { merge: true });
      } catch (e) {
        console.warn('[FIREBASE] Failed recomputing aggregate match counters', e?.message || e);
      }

      // Update aggregate player stats for matches/wins to reflect in leaderboards/search
      try {
        const statsRef = this.playerStats.doc(steamId);
        await this.db.runTransaction(async (tx) => {
          const snap = await tx.get(statsRef);
          const cur = snap.exists ? (snap.data() || {}) : {};
          const totalMatches = Number(cur.totalMatches || 0) + 1;
          const totalWins = Number(cur.totalWins || 0) + (matchData.result === 'Win' ? 1 : 0);
          const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;
          tx.set(statsRef, {
            steamId,
            totalMatches,
            totalWins,
            winRate,
            lastUpdated: nowTs
          }, { merge: true });
        });
      } catch (e) {
        console.warn('[FIREBASE] Failed updating aggregate match counters', e?.message || e);
      }

      // Update map aggregates best-effort
      try {
        if (matchData.mapName) {
          const mapId = `${steamId}_${matchData.mapName}`;
          const ref = this.mapStats.doc(mapId);
          await ref.set({
            steamId,
            mapName: matchData.mapName,
            totalMatches: admin.firestore.FieldValue.increment(1),
            wins: admin.firestore.FieldValue.increment(matchData.result === 'Win' ? 1 : 0),
            losses: admin.firestore.FieldValue.increment(matchData.result === 'Loss' ? 1 : 0),
            totalKills: admin.firestore.FieldValue.increment(matchData.kills || 0),
            totalDeaths: admin.firestore.FieldValue.increment(matchData.deaths || 0),
            updatedAt: nowTs
          }, { merge: true });
        }
      } catch (e) {
        console.warn('[FIREBASE] map stats update failed', e?.message || e);
      }

  // Reconcile any un-attributed weapon kills at end of match
      try {
        const finalKills = Number(kills || 0);
        const alreadyAttr = Number(sessData?.attributedKills || 0);
        const remaining = Math.max(0, finalKills - alreadyAttr);
        
        // Try session's lastActiveWeaponKey first; if missing, fall back to previously.player.weapons (useful when current weapons={} at gameover)
        let lastKey = (sessData?.lastActiveWeaponKey || '').toString();
        if (!lastKey && gsiData?.previously?.player?.weapons) {
          try {
            const prevWeapons = Object.values(gsiData.previously.player.weapons);
            const activeInPrev = prevWeapons.find(w => w && w.state === 'active' && typeof w.name === 'string');
            if (activeInPrev) {
              const raw = (activeInPrev.name || '').toLowerCase();
              lastKey = raw.startsWith('weapon_') ? raw.slice(7) : raw;
            }
          } catch (_) {}
        }
        
        if (remaining > 0 && lastKey) {
          // Whitelist validation mirrors _accumulateGSI
          const whitelist = new Set([
            'ak47','m4a1','m4a1_silencer','m4a4','awp','famas','galilar','sg556','aug','ssg08',
            'm249','negev','ump45','p90','mp9','mp7','mac10','bizon',
            'mag7','xm1014','sawedoff','nova',
            'g3sg1','scar20',
            'glock','hkp2000','usp_silencer','p250','cz75a','deagle','revolver','tec9','elite','fiveseven',
            // lethal non-firearms
            'knife','bayonet','hegrenade','molotov','incgrenade','taser','zeus'
          ]);
          const friendly = ({ 'm4a1_silencer':'m4a1-s', 'hkp2000':'p2000', 'usp_silencer':'usp-s' })[lastKey] || lastKey;
          const base = lastKey.startsWith('weapon_') ? lastKey.slice(7) : lastKey;
          const keyOk = whitelist.has(base);
          if (keyOk) {
            const wref = this.weaponStats.doc(`${steamId}_${friendly}`);
            await wref.set({ steamId, weaponName: friendly, kills: admin.firestore.FieldValue.increment(remaining), updatedAt: nowTs }, { merge: true });
            await this.gsiSessions.doc(steamId).set({ attributedKills: finalKills, updatedAt: nowTs }, { merge: true });
          }
        }
      } catch (e) {
        console.warn('[FIREBASE] weapon reconciliation failed', e?.message || e);
      }

      // Clear session state so the next match starts fresh (important for weapon attribution watermark)
      // Note: we intentionally DO NOT clear lastSavedMatchKey here to avoid duplicate saves
      // from repeated 'gameover' payloads. It will be cleared at the start of the next match.
      try {
        await this.gsiSessions.doc(steamId).set({
          // counters + attribution baseline
          kills: 0,
          deaths: 0,
          assists: 0,
          mvps: 0,
          attributedKills: 0,
          // session pointers
          matchStartedAtProviderTs: null,
          lastActiveWeaponKey: null,
          lastRoundNumber: null,
          // remove snapshot-only fields from the prior match completely
          lastMyStats: admin.firestore.FieldValue.delete(),
          lastMyProviderTs: admin.firestore.FieldValue.delete(),
          lastMyTeam: admin.firestore.FieldValue.delete(),
          mapName: admin.firestore.FieldValue.delete(),
          // keep lastSavedMatchKey until a new match actually starts
          updatedAt: nowTs
        }, { merge: true });
      } catch (e) {
        console.warn('[FIREBASE] failed to clear session after match end', e?.message || e);
      }
    } catch (error) {
      console.error('[FIREBASE] Error saving match:', error);
      throw error;
    }
  }

  // Private: accumulate per-tick deltas for maps/weapons and totals
  async _accumulateGSI(steamId, gsiData) {
    try {
      const player = gsiData.player || {};
      const map = gsiData.map || {};
  const state = player.state || {};
      const nowTs = admin.firestore.FieldValue.serverTimestamp();
      const providerTs = Number(gsiData?.provider?.timestamp || 0);
      // Gate accumulation to competitive/premier only for map & weapon stats; still update lastSeen
      const name = (map?.name||'').toLowerCase();
      const isCasualName = /^kz_|^aim_|^fy_|^ar_|^training|^practice/.test(name);
      const allowedCompetitive = map?.mode === 'competitive';
      const allowedForStats = allowedCompetitive; // premier inferred only at end; avoid per-tick updates in unknown modes
  const sessRef = this.gsiSessions.doc(steamId);
      const sessSnap = await sessRef.get();
      const last = sessSnap.exists ? (sessSnap.data() || {}) : {};
  const prev = { kills:Number(last.kills||0), deaths:Number(last.deaths||0), assists:Number(last.assists||0), mvps:Number(last.mvps||0) };
      // IMPORTANT: use only state.kills for deltas; never round_kills to avoid source-switch inflation
      // Persist a best-effort snapshot of "my" stats for end-of-match fallback
      try {
        const apMine = (() => {
          const all = gsiData.allplayers;
          if (!all || typeof all !== 'object') return null;
          try { return Object.values(all).find(p => String(p?.steamid) === String(steamId)) || null; } catch (_) { return null; }
        })();
        // Only trust the top-level player block if it matches our steamId
        const isPlayerMine = player && String(player.steamid || '') === String(steamId);
        const src = apMine || (isPlayerMine ? player : null);
        const ms = src?.match_stats;
        const st = src?.state;
        const myTeam = (src?.team === 'CT' || src?.team === 'T') ? src.team : null;
        if (ms || st) {
          const snap = {
            kills: Number(ms?.kills ?? st?.kills ?? last?.kills ?? 0),
            deaths: Number(ms?.deaths ?? st?.deaths ?? last?.deaths ?? 0),
            assists: Number(ms?.assists ?? st?.assists ?? last?.assists ?? 0),
            mvps: Number(ms?.mvps ?? st?.mvps ?? last?.mvps ?? 0)
          };
          await this.gsiSessions.doc(steamId).set({ lastMyStats: snap, lastMyTeam: myTeam || last.lastMyTeam || null, lastMyProviderTs: providerTs || admin.firestore.Timestamp.now().seconds }, { merge: true });
        }
      } catch (_) {}

      // Compute current counters with fallback to match_stats when state doesn't include kills
      const isPlayerMine = player && String(player.steamid || '') === String(steamId);
      const msLocal = isPlayerMine ? (player.match_stats || null) : null;
      const curr = {
        kills: Number((state.kills ?? msLocal?.kills ?? last.kills) || 0),
        deaths: Number((state.deaths ?? msLocal?.deaths ?? last.deaths) || 0),
        assists: Number((state.assists ?? msLocal?.assists ?? last.assists) || 0),
        mvps: Number((state.mvps ?? msLocal?.mvps ?? last.mvps) || 0)
      };
      // If we still can't determine counters at all, just record session basics and exit
      const hasAnyCounter = [curr.kills, curr.deaths, curr.assists, curr.mvps].some(v => typeof v === 'number');
      if (!hasAnyCounter) {
    const needsStart = !last.matchStartedAtProviderTs && providerTs;
        await this.gsiSessions.doc(steamId).set({ 
          mapName: map?.name || null,
          matchStartedAtProviderTs: needsStart ? providerTs : (last.matchStartedAtProviderTs || null),
          updatedAt: nowTs 
        }, { merge: true });
        return;
      }
      const delta = { kills:Math.max(0,curr.kills-prev.kills), deaths:Math.max(0,curr.deaths-prev.deaths), assists:Math.max(0,curr.assists-prev.assists), mvps:Math.max(0,curr.mvps-prev.mvps) };

      // Track when a match started per provider timestamp (best-effort)
  const needsStart = !last.matchStartedAtProviderTs && providerTs;

      // Persist last counters and last active weapon key for end-of-match reconciliation
      // Capture currently active weapon key (normalized) if present
      let lastActiveWeaponKey = last.lastActiveWeaponKey || '';
      try {
        const vals = Object.values(player.weapons || {});
        const active = vals.find(w => w && w.state === 'active' && typeof w.name === 'string');
        const raw = (active?.name || '').toLowerCase();
        const key = raw.startsWith('weapon_') ? raw.slice(7) : raw;
        if (key) lastActiveWeaponKey = key;
      } catch (_) {}
      await sessRef.set({ 
        ...curr, 
        mapName: map?.name || null, 
        matchStartedAtProviderTs: needsStart ? providerTs : (last.matchStartedAtProviderTs || null),
        lastActiveWeaponKey,
        lastMyTeam: (player && String(player.steamid||'')===String(steamId) && (player.team==='CT'||player.team==='T')) ? player.team : (last.lastMyTeam || null),
        updatedAt: nowTs 
      }, { merge: true });

      // Initialize watermark at new match start to the current kills baseline (usually 0)
      // Also clear lastSavedMatchKey here so a new match can be saved even if the same map/score occurs later.
      if (needsStart) {
        try {
          await sessRef.set({
            attributedKills: Number(curr.kills || 0),
            lastSavedMatchKey: admin.firestore.FieldValue.delete(),
            // clear previous-match pointers
            lastRoundNumber: null,
            lastActiveWeaponKey: null
          }, { merge: true });
        } catch (_) {}
      }

      // Increment player totals using the deltas
      if (delta.kills || delta.deaths || delta.assists || delta.mvps) {
        const statsRef = this.playerStats.doc(steamId);
        await this.db.runTransaction(async (tx) => {
          const doc = await tx.get(statsRef);
          const data = doc.exists ? (doc.data() || {}) : {};
          const totalKills = Number(data.totalKills || 0) + (delta.kills || 0);
          const totalDeaths = Number(data.totalDeaths || 0) + (delta.deaths || 0);
          const totalAssists = Number(data.totalAssists || 0) + (delta.assists || 0);
          const totalMVPs = Number(data.totalMVPs || 0) + (delta.mvps || 0);
          const kdRatio = totalDeaths > 0 ? parseFloat((totalKills / totalDeaths).toFixed(2)) : totalKills;
          tx.set(statsRef, {
            steamId,
            totalKills,
            totalDeaths,
            totalAssists,
            totalMVPs,
            kdRatio,
            lastUpdated: nowTs,
            lastSeen: nowTs
          }, { merge: true });
        });
      }

  // Update weapon stats if we gained kills (only in allowed modes) with whitelist; accept weapon_* keys and normalize
  if (allowedForStats && player.weapons) {
        // Idempotent attribution: attribute only the kills we haven't attributed yet
        const alreadyAttr = Number(last.attributedKills || 0);
        const weaponDelta = Math.max(0, Number(curr.kills) - alreadyAttr);
        if (weaponDelta <= 0) {
          // Persist session counters even if no new attribution
          const sessRef = this.gsiSessions.doc(steamId);
          await sessRef.set({
            kills: curr.kills,
            deaths: curr.deaths,
            assists: curr.assists,
            mvps: curr.mvps,
            lastActiveWeaponKey: last.lastActiveWeaponKey || lastActiveWeaponKey || null,
            updatedAt: nowTs
          }, { merge: true });
        } else {
        // Determine current active weapon key, or fall back to last known active if none is active in this tick
        const vals = Object.values(player.weapons || {});
        const active = vals.find(w => w && w.state === 'active' && typeof w.name === 'string');
        const raw = (active?.name || '').toLowerCase();
        // whitelist common firearms; exclude clear non-firearms at save time
        const whitelist = new Set([
          'ak47','m4a1','m4a1_silencer','m4a4','awp','famas','galilar','sg556','aug','ssg08',
          'm249','negev','ump45','p90','mp9','mp7','mac10','bizon',
          'mag7','xm1014','sawedoff','nova',
          'g3sg1','scar20',
          'glock','hkp2000','usp_silencer','p250','cz75a','deagle','revolver','tec9','elite','fiveseven',
          // include lethal non-firearms for kill attribution
          'knife','bayonet','hegrenade','molotov','incgrenade','taser','zeus'
        ]);
        const currentKey = raw && raw.startsWith('weapon_') ? raw.slice(7) : raw; // normalize weapon_* to bare key
        // Fallback to last known active weapon if current is unavailable
        const lastKnown = last.lastActiveWeaponKey || lastActiveWeaponKey || '';
        const chosenBaseKey = (currentKey && whitelist.has(currentKey))
          ? currentKey
          : (lastKnown && whitelist.has(lastKnown) ? lastKnown : '');
        // Only write and advance watermark if we have a valid weapon key
        if (chosenBaseKey) {
          const friendly = ({
            'm4a1_silencer':'m4a1-s',
            'hkp2000':'p2000',
            'usp_silencer':'usp-s'
          })[chosenBaseKey] || chosenBaseKey;
          const wref = this.weaponStats.doc(`${steamId}_${friendly}`);
          await wref.set({ steamId, weaponName: friendly, kills: admin.firestore.FieldValue.increment(weaponDelta), updatedAt: nowTs }, { merge: true });
          // Persist session counters and the attribution watermark ONLY after successful write
          const sessRef = this.gsiSessions.doc(steamId);
          await sessRef.set({
            kills: curr.kills,
            deaths: curr.deaths,
            assists: curr.assists,
            mvps: curr.mvps,
            attributedKills: curr.kills,
            lastActiveWeaponKey: chosenBaseKey,
            updatedAt: nowTs
          }, { merge: true });
        } else {
          // No valid weapon to attribute to; update session counters but DO NOT advance watermark
          const sessRef = this.gsiSessions.doc(steamId);
          await sessRef.set({
            kills: curr.kills,
            deaths: curr.deaths,
            assists: curr.assists,
            mvps: curr.mvps,
            // keep attributedKills at alreadyAttr so reconciliation can handle at match end
            attributedKills: alreadyAttr,
            lastActiveWeaponKey: currentKey || lastKnown || null,
            updatedAt: nowTs
          }, { merge: true });
        }
        }
      }

  // Update map round counters best-effort – only in allowed modes
  const roundNumber = Number(map?.round ?? gsiData?.round?.number ?? NaN);
  const roundPhase = gsiData?.round?.phase;
  const shouldCountRound = allowedForStats && map?.name && !Number.isNaN(roundNumber) && last.lastRoundNumber !== roundNumber && (roundPhase === 'over' || roundPhase === 'freezetime');
  if (shouldCountRound) {
        const mref = this.mapStats.doc(`${steamId}_${map.name}`);
        await mref.set({ steamId, mapName: map.name, totalRounds: admin.firestore.FieldValue.increment(1), updatedAt: nowTs }, { merge: true });
        await sessRef.set({ lastRoundNumber: roundNumber }, { merge: true });
      }
    } catch (e) {
      console.warn('[FIREBASE] _accumulateGSI failed', e?.message || e);
    }
  }

  // Compute aggregate totals (matches, wins) from all saved matches with filtering and dedup similar to reads
  async _computeAggregatesFromMatches(steamId) {
    try {
      const snapshot = await this.matches.where('steamId', '==', steamId).get();
      const normalizeTs = (ts) => {
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts === 'object' && (ts._seconds || ts.seconds)) {
          const s = ts._seconds ?? ts.seconds; const ns = ts._nanoseconds ?? ts.nanoseconds ?? 0; return (s * 1000) + Math.floor(ns / 1e6);
        }
        const d = new Date(ts); return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data(), _ms: normalizeTs(d.data()?.createdAt || d.data()?.date) }));

      // Filter out casual/invalid and keep competitive/premier finals
      const filtered = raw.filter(m => {
        const hasMap = !!(m.mapName || m.map);
        const score = Number(m.score||0);
        const opp = Number(m.opponentScore||0);
        const name = (m.mapName || m.map || '').toLowerCase();
        const isCasualName = /^kz_|^aim_|^fy_|^ar_|^training|^practice/.test(name) || m.mode === 'casual';
        if (!hasMap || isCasualName) return false;
        const isCompetitiveFinal = (score === 12 && opp === 12) || (score >= 13 || opp >= 13);
        const isPremierFinal = (score === 15 && opp === 15) || (score >= 16 || opp >= 16);
        const isSurrender = (m.resultReason === 'Surrender');
        return isCompetitiveFinal || isPremierFinal || isSurrender;
      });

      // Deduplicate by map within 1-hour buckets, keeping the most final score
      const byKey = new Map();
      const finalScore = (row) => Math.max(Number(row.score||0), Number(row.opponentScore||0));
      for (const m of filtered) {
        const ms = m._ms || 0;
        const bucket = Math.floor(ms / 3600000);
        const key = `${(m.mapName||m.map||'unknown')}|${bucket}`;
        const prev = byKey.get(key);
        if (!prev) byKey.set(key, m);
        else {
          const prevScore = finalScore(prev);
          const curScore = finalScore(m);
          if (curScore > prevScore || (curScore === prevScore && ms > (prev._ms || 0))) byKey.set(key, m);
        }
      }
  const deduped = Array.from(byKey.values());
  const totalMatches = deduped.length;
  const totalWins = deduped.reduce((sum, m) => sum + (m.result === 'Win' ? 1 : 0), 0);
  const totalKills = deduped.reduce((sum, m) => sum + Number(m.kills || 0), 0);
  const totalDeaths = deduped.reduce((sum, m) => sum + Number(m.deaths || 0), 0);
  return { totalMatches, totalWins, totalKills, totalDeaths };
    } catch (e) {
      console.warn('[FIREBASE] _computeAggregatesFromMatches failed', e?.message || e);
      return { totalMatches: 0, totalWins: 0, totalKills: 0, totalDeaths: 0 };
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
      
      
      await statsRef.set(statsData, { merge: true });
      
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
      // Fetch all matches for this player (we'll sort in memory to avoid index issues)
      const snapshot = await this.matches.where('steamId', '==', steamId).get();

      const normalizeTs = (ts) => {
        if (!ts) return 0;
        // Firestore Timestamp instance
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        // Serialized Timestamp object
        if (typeof ts === 'object' && (ts._seconds || ts.seconds)) {
          const s = ts._seconds ?? ts.seconds;
          const ns = ts._nanoseconds ?? ts.nanoseconds ?? 0;
          return (s * 1000) + Math.floor(ns / 1e6);
        }
        // ISO string or number
        const d = new Date(ts);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };

      const allMatchesRaw = snapshot.docs.map(doc => {
        const data = doc.data() || {};
        return {
          id: doc.id,
          ...data,
          // Keep both raw fields; consumers can use either
          _createdAtMs: normalizeTs(data.createdAt || data.date),
          _dateMs: normalizeTs(data.date || data.createdAt)
        };
      });

      // Drop clearly invalid/early-round rows (likely from earlier bugs)
      const allMatches = allMatchesRaw.filter(m => {
        const hasMap = !!(m.mapName || m.map);
        const score = Number(m.score||0);
        const opp = Number(m.opponentScore||0);
        const name = (m.mapName || m.map || '').toLowerCase();
        const isCasualName = /^kz_|^aim_|^fy_|^ar_|^training|^practice/.test(name) || m.mode === 'casual';
        if (!hasMap || isCasualName) return false; // exclude casual-like entirely
        const isCompetitiveFinal = (score === 12 && opp === 12) || (score >= 13 || opp >= 13);
        const isPremierFinal = (score === 15 && opp === 15) || (score >= 16 || opp >= 16);
        const isSurrender = (m.resultReason === 'Surrender');
        return isCompetitiveFinal || isPremierFinal || isSurrender;
      });

      // Deduplicate by map within 1-hour buckets, keeping the most "final" score (handles Premier OT chains like 12:12 -> 13:12/16:x)
      const byKey = new Map();
      const finalScore = (row) => Math.max(Number(row.score||0), Number(row.opponentScore||0));
      for (const m of allMatches) {
        const ms = (m._createdAtMs || m._dateMs || 0);
        const bucket = Math.floor(ms / 3600000); // 1 hour buckets
        const key = `${(m.mapName||m.map||'unknown')}|${bucket}`;
        const prev = byKey.get(key);
        if (!prev) {
          byKey.set(key, m);
        } else {
          const prevScore = finalScore(prev);
          const curScore = finalScore(m);
          // Prefer higher max score (OT results beat regulation ties), fall back to latest timestamp
          if (curScore > prevScore || (curScore === prevScore && ms > (prev._createdAtMs || prev._dateMs || 0))) {
            byKey.set(key, m);
          }
        }
      }
      const deduped = Array.from(byKey.values());

      // Sort by createdAt/date desc
  const sortedMatches = deduped.sort((a, b) => (b._createdAtMs || b._dateMs) - (a._createdAtMs || a._dateMs));

      // Paginate in memory
      const startIndex = Math.max(0, offset|0);
      const endIndex = startIndex + (limit|0);
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
      const raw = snapshot.docs.map(doc => doc.data());
      // Filter out legacy/invalid weapon entries written before whitelist mapping
      const isValidWeapon = (w) => {
        const name = (w.weaponName || '').toString().toLowerCase();
        const type = (w.weaponType || '').toString().toLowerCase();
        if (!name) return false;
        // Exclude legacy prefixed names and non-lethal utilities
        if (name.startsWith('weapon_')) return false;
        if (name === 'c4') return false;
        // Exclude non-lethal grenades/utilities: flash, smoke, decoy
        if (name.includes('flash') || name.includes('smoke') || name.includes('decoy')) return false;
        // Allow knives and lethal grenades like HE, molotov/incendiary; exclude explicit type c4
        if (type === 'c4') return false;
        return true;
      };
      const weapons = raw.filter(isValidWeapon);
      
      // Sort in memory by kills (descending)
      return weapons.sort((a, b) => (b.kills || 0) - (a.kills || 0));
    } catch (error) {
      console.error('[FIREBASE] Error getting player weapons:', error);
      throw error;
    }
  }

  async getPlayerMaps(steamId) {
    try {
      // Recompute from matches to guarantee accuracy
      const snapshot = await this.matches.where('steamId', '==', steamId).get();
      const normalizeTs = (ts) => (typeof ts?.toMillis === 'function' ? ts.toMillis() : (typeof ts === 'object' && (ts._seconds||ts.seconds) ? ((ts._seconds ?? ts.seconds) * 1000) : (new Date(ts).getTime() || 0)));
      const rows = snapshot.docs.map(d => ({ id: d.id, ...d.data(), _ms: normalizeTs(d.data()?.createdAt || d.data()?.date) }));

      // Apply same stricter filter as getPlayerMatches (exclude casual entirely)
      const filtered = rows.filter(m => {
        const hasMap = !!(m.mapName || m.map);
        const score = Number(m.score||0);
        const opp = Number(m.opponentScore||0);
        const name = (m.mapName || m.map || '').toLowerCase();
        const isCasualName = /^kz_|^aim_|^fy_|^ar_|^training|^practice/.test(name) || m.mode === 'casual';
        if (!hasMap || isCasualName) return false;
        const isCompetitiveFinal = (score === 12 && opp === 12) || (score >= 13 || opp >= 13);
        const isPremierFinal = (score === 15 && opp === 15) || (score >= 16 || opp >= 16);
        const isSurrender = (m.resultReason === 'Surrender');
        return isCompetitiveFinal || isPremierFinal || isSurrender;
      });

      // Dedup by map per hour bucket; keep most final (highest max score)
      const dedupMap = new Map();
      const finalScore = (row) => Math.max(Number(row.score||0), Number(row.opponentScore||0));
      for (const m of filtered) {
        const ms = m._ms || 0;
        const bucket = Math.floor(ms / 3600000);
        const key = `${(m.mapName||m.map||'unknown')}|${bucket}`;
        const prev = dedupMap.get(key);
        if (!prev) dedupMap.set(key, m);
        else {
          const prevScore = finalScore(prev);
          const curScore = finalScore(m);
          if (curScore > prevScore || (curScore === prevScore && ms > (prev._ms || 0))) dedupMap.set(key, m);
        }
      }
      const deduped = Array.from(dedupMap.values());

      // Aggregate by map
      const byMap = new Map();
      for (const m of deduped) {
        const name = m.mapName || m.map || 'unknown';
        const cur = byMap.get(name) || { steamId, mapName: name, totalMatches: 0, wins: 0, losses: 0 };
        cur.totalMatches += 1;
        if (m.result === 'Win') cur.wins += 1; else if (m.result === 'Loss') cur.losses += 1;
        byMap.set(name, cur);
      }
      const maps = Array.from(byMap.values());
      return maps.sort((a, b) => (b.totalMatches || 0) - (a.totalMatches || 0));
    } catch (error) {
      console.error('[FIREBASE] Error getting player maps:', error);
      throw error;
    }
  }

  async getCS2Leaderboard(sortBy = 'kdRatio', limit = 100) {
    try {
      // Align with frontend: kdRatio | totalKills | winRate | headshotPercentage | totalMVPs
      const allowed = new Set(['kdRatio', 'totalKills', 'winRate', 'headshotPercentage', 'totalMVPs']);
      const field = allowed.has(sortBy) ? sortBy : 'kdRatio';

      const leaderboardQuery = this.playerStats
        .orderBy(field, 'desc')
        .limit(limit);

      const snapshot = await leaderboardQuery.get();
      return snapshot.docs.map(doc => ({ steamId: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[FIREBASE] Error getting CS2 leaderboard:', error);
      throw error;
    }
  }

  async searchCS2Players(query, limit = 20) {
    try {
      const results = [];
      const isNumeric = /^\d+$/.test(query);
      
      // Convert query to lowercase for case-insensitive search
      const queryLower = query.toLowerCase();

      // 1) Exact steamId match if numeric
      if (isNumeric) {
        try {
          const docSnap = await this.playerStats.doc(query).get();
          if (docSnap.exists) results.push({ steamId: docSnap.id, ...docSnap.data() });
        } catch (_) {}
      }

      // 2) Case-insensitive prefix search by personaName using searchNameLower field
      try {
        const snap = await this.playerStats
          .orderBy('searchNameLower')
          .startAt(queryLower)
          .endAt(queryLower + '\uf8ff')
          .limit(limit)
          .get();
        snap.docs.forEach(d => {
          const data = { steamId: d.id, ...d.data() };
          if (!results.find(r => r.steamId === data.steamId)) results.push(data);
        });
      } catch (e) {
        console.warn('[FIREBASE] searchNameLower search fallback, trying personaName:', e?.message || e);
        // Fallback to original personaName search if searchNameLower field doesn't exist
        try {
          const snap = await this.playerStats
            .orderBy('personaName')
            .startAt(query)
            .endAt(query + '\uf8ff')
            .limit(limit)
            .get();
          snap.docs.forEach(d => {
            const data = { steamId: d.id, ...d.data() };
            if (!results.find(r => r.steamId === data.steamId)) results.push(data);
          });
        } catch (e2) {
          console.warn('[FIREBASE] personaName search also failed:', e2?.message || e2);
        }
      }

      // 3) Also try users.displayName for registered users (case-insensitive)
      try {
        const userSnap = await this.users
          .orderBy('searchNameLower')
          .startAt(queryLower)
          .endAt(queryLower + '\uf8ff')
          .limit(limit)
          .get();
        for (const u of userSnap.docs) {
          const udata = u.data() || {};
          const sid = udata.steamId || u.id;
          if (!sid) continue;
          const statDoc = await this.playerStats.doc(String(sid)).get();
          const merged = statDoc.exists ? { steamId: String(sid), ...statDoc.data(), personaName: statDoc.data().personaName || udata.displayName } : { steamId: String(sid), personaName: udata.displayName };
          if (!results.find(r => r.steamId === merged.steamId)) results.push(merged);
        }
      } catch (e) {
        console.warn('[FIREBASE] users.searchNameLower search fallback, trying displayName:', e?.message || e);
        // Fallback to original displayName search
        try {
          const userSnap = await this.users
            .orderBy('displayName')
            .startAt(query)
            .endAt(query + '\uf8ff')
            .limit(limit)
            .get();
          for (const u of userSnap.docs) {
            const udata = u.data() || {};
            const sid = udata.steamId || u.id;
            if (!sid) continue;
            const statDoc = await this.playerStats.doc(String(sid)).get();
            const merged = statDoc.exists ? { steamId: String(sid), ...statDoc.data(), personaName: statDoc.data().personaName || udata.displayName } : { steamId: String(sid), personaName: udata.displayName };
            if (!results.find(r => r.steamId === merged.steamId)) results.push(merged);
          }
        } catch (e2) {
          console.warn('[FIREBASE] displayName search also failed:', e2?.message || e2);
        }
      }

      return results.slice(0, limit);
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
      // Preference filtering (silent skip if user disabled this type)
      if (notificationData?.type && !(await this._shouldNotify(steamId, notificationData.type))) {
        return null; // Do not create notification
      }
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
      
      // Send email notification asynchronously (non-blocking)
      // Don't await - let it run in background
      this.sendEmailNotification(steamId, { ...notification, id: notificationRef.id }).catch(err => {
        console.error('[FIREBASE] Background email send failed:', err);
      });
      
      return notificationRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating notification:', error);
      throw error;
    }
  }

  // Market trends & weekly digest helpers removed per scope reduction.

  async sendEmailNotification(steamId, notification) {
    try {
      const emailConnection = await this.getUserEmail(steamId);
      if (!emailConnection) {
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
      
    } catch (error) {
      console.error('[FIREBASE] Error sending email notification:', error);
      // Don't throw error - notification creation should succeed even if email fails
    }
  }

  async getUserNotifications(steamId, limit = 50, includeRead = false) {
    try {
      let query = this.notifications.where('steamId', '==', steamId);
      if (!includeRead) {
        query = query.where('isRead', '==', false);
      }
      query = query.orderBy('createdAt', 'desc').limit(limit);

      const snapshot = await query.get();
      const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const unreadTotal = await this._getUnreadNotificationsCount(steamId);

      return { notifications, unreadTotal };
    } catch (error) {
      console.error('[FIREBASE] Error getting user notifications:', error);
      throw error;
    }
  }

  async _getUnreadNotificationsCount(steamId) {
    const baseQuery = this.notifications
      .where('steamId', '==', steamId)
      .where('isRead', '==', false);
    try {
      if (typeof baseQuery.count === 'function') {
        const snap = await baseQuery.count().get();
        return snap.data().count || 0;
      }
    } catch (err) {
      console.warn('[FIREBASE] count() aggregate unavailable, falling back to snapshot scan', err?.message || err);
    }
    const unreadSnap = await baseQuery.get();
    return unreadSnap.size;
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

  // Internal: map notification type -> preference key
  _notificationPrefMap = {
    'price_drop': 'priceAlerts',
    'forum_comment': 'forumNotifications',
    'forum_activity': 'forumNotifications', // legacy/test alias
    // removed: market_trend, weekly_digest
  };

  PRICE_ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

  async _shouldNotify(steamId, type) {
    try {
      const profile = await this.getUserProfile(steamId);
      const prefs = profile?.preferences || {};
      // Global off switch
      if (prefs.enableNotifications === false) return false;
      const key = this._notificationPrefMap[type];
      if (!key) return true; // unknown types allowed
      if (prefs[key] === false) return false;
      return true;
    } catch (e) {
      return true; // fail-open so notifications still arrive if profile fetch fails
    }
  }

  // PRICE ALERT SYSTEM
  async checkPriceAlerts() {
    try {
      const watchlistQuery = await this.marketWatchlists
        .where('alertsEnabled', '==', true)
        .where('targetPrice', '>', 0)
        .get();
      const now = Date.now();
      
      for (const watchlistDoc of watchlistQuery.docs) {
        const watchlistItem = watchlistDoc.data();
        
        // Check if current price is below target price
        if (!watchlistItem.currentPrice || watchlistItem.currentPrice <= 0) continue;
        if (watchlistItem.currentPrice > watchlistItem.targetPrice) continue;

        const lastAlertAt = this._timestampToMillis(watchlistItem.lastAlertAt);
        if (lastAlertAt && (now - lastAlertAt) < this.PRICE_ALERT_COOLDOWN_MS) {
          continue; // prevent duplicate alerts within cooldown window
        }

        await this._triggerPriceAlert(watchlistDoc.ref, watchlistItem);
      }
    } catch (error) {
      console.error('[FIREBASE] Error checking price alerts:', error);
      throw error;
    }
  }

  async _triggerPriceAlert(watchlistRef, watchlistItem) {
    try {
      await watchlistRef.set({
        lastAlertAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAlertPrice: watchlistItem.currentPrice,
        lastAlertTarget: watchlistItem.targetPrice
      }, { merge: true });

      const currentPrice = Number(watchlistItem.currentPrice) || 0;
      const targetPrice = Number(watchlistItem.targetPrice) || 0;
      // Create notification
      await this.createNotification(watchlistItem.steamId, {
        type: 'price_drop',
        title: 'Price Drop Alert!',
        message: `${watchlistItem.name} price dropped to $${currentPrice.toFixed(2)} (Target: $${targetPrice.toFixed(2)})`,
        data: {
          itemId: watchlistItem.id,
          oldPrice: targetPrice,
          newPrice: currentPrice,
          url: `/marketplace?search=${encodeURIComponent(watchlistItem.hashName)}&appid=${watchlistItem.appid || 730}`
        }
      });
      
    } catch (error) {
      console.error('[FIREBASE] Error creating price alert:', error);
      throw error;
    }
  }

  _timestampToMillis(timestamp) {
    if (!timestamp) return null;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    const date = new Date(timestamp);
    const ms = date.getTime();
    return Number.isNaN(ms) ? null : ms;
  }

  // FORUM SYSTEM
  async createForumCategory(categoryData) {
    try {
      const categoryRef = this.forumCategories.doc(categoryData.id || categoryData.name.toLowerCase().replace(/\s+/g, '-'));
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const category = {
        ...categoryData,
        // Defaults for new categories
        isActive: categoryData.isActive ?? true,
        order: categoryData.order ?? 0,
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
      // Primary query (may require a composite index)
      let categoriesSnapshot = await this.forumCategories
        .where('isActive', '==', true)
        .orderBy('order')
        .get();

      if (categoriesSnapshot.empty) {
        // If empty, ensure defaults exist
        await this._ensureDefaultForumCategories();
        // Try query again (with order)
        try {
          categoriesSnapshot = await this.forumCategories
            .where('isActive', '==', true)
            .orderBy('order')
            .get();
        } catch (_) {
          // Fallback without order if index is missing
          categoriesSnapshot = await this.forumCategories
            .where('isActive', '==', true)
            .get();
        }
      }

      return categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('[FIREBASE] Error getting forum categories:', error);
      // Fallback path for index errors: try simple get without order/where
      try {
        // Try without order and where
        let snapshot = await this.forumCategories.get();
        if (snapshot.empty) {
          await this._ensureDefaultForumCategories();
          snapshot = await this.forumCategories.get();
        }
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (e2) {
        console.error('[FIREBASE] Fallback categories fetch failed:', e2);
        throw error;
      }
    }
  }

  // Ensure a sane set of default categories exist
  async _ensureDefaultForumCategories() {
    const defaults = [
      { id: 'general', name: 'General', description: 'General discussion about games and Steam Vault', order: 1, isActive: true },
      { id: 'cs2', name: 'CS2', description: 'Counter-Strike 2 strategies, stats and updates', order: 2, isActive: true },
      { id: 'dota2', name: 'Dota 2', description: 'Dota 2 meta, heroes and discussion', order: 3, isActive: true },
      { id: 'marketplace', name: 'Marketplace', description: 'Trading, watchlists and price alerts', order: 4, isActive: true },
      { id: 'announcements', name: 'Announcements', description: 'Steam Vault updates and news', order: 5, isActive: true }
    ];

    const existing = await this.forumCategories.limit(1).get();
    if (!existing.empty) return; // Already has categories

    await Promise.all(defaults.map(c => this.createForumCategory(c)));
  }

  async createForumPost(steamId, postData) {
    try {
      await this._assertNotSuspended(steamId);
      const postRef = this.forumPosts.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const user = await this.getUser(steamId);
      const post = {
        ...postData,
        authorSteamId: steamId,
        authorDisplayName: user?.displayName || 'Unknown User',
        authorAvatarUrl: user?.avatar || null,
        authorDisplayNameLower: (user?.displayName || 'Unknown User').toLowerCase(),
        titleLower: typeof postData.title === 'string' ? postData.title.toLowerCase() : '',
        isPinned: false,
        isLocked: false,
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
      
      // Primary query with ordering (needs composite indexes)
      try {
        let query = this.forumPosts
          .where('categoryId', '==', categoryId);

        if (sortBy === 'lastActivity') {
          query = query.orderBy('isPinned', 'desc').orderBy('lastActivity', sortOrder);
        } else {
          query = query.orderBy('isPinned', 'desc').orderBy(sortBy, sortOrder);
        }

        if (offset > 0) {
          const offsetSnapshot = await query.limit(offset).get();
          const lastDoc = offsetSnapshot.docs[offsetSnapshot.docs.length - 1];
          if (lastDoc) query = query.startAfter(lastDoc);
        }

        const snapshot = await query.limit(limit).get();
        // Also compute total (best effort) with a lightweight count query fallback
        let total = 0;
        try {
          const countSnap = await this.forumPosts
            .where('categoryId', '==', categoryId)
            .get();
          total = countSnap.size;
        } catch (_) {
          total = snapshot.size + (offset || 0); // approximation
        }
        return { items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), total };
      } catch (indexErr) {
        // Fallback path: avoid composite indexes by using a single where and in-memory ops
        console.warn('[FIREBASE] Falling back to simple posts query without composite index:', indexErr?.message);
        const snapshot = await this.forumPosts
          .where('categoryId', '==', categoryId)
          .limit(1000)
          .get();

        // In-memory filter/sort/paginate
        const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        console.warn(`[FIREBASE] Fallback fetched ${raw.length} posts for category ${categoryId}`);
  const filtered = raw; // hard delete model – no soft delete flag

        const getTs = (v) => {
          if (!v) return 0;
          if (typeof v === 'number') return v;
          if (v._seconds) return v._seconds * 1000 + (v._nanoseconds || 0) / 1e6;
          if (v.seconds) return v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
          const t = Date.parse(v);
          return Number.isNaN(t) ? 0 : t;
        };

        filtered.sort((a, b) => {
          // pinned first
          const pinA = a.isPinned ? 1 : 0;
          const pinB = b.isPinned ? 1 : 0;
          if (pinA !== pinB) return pinB - pinA;
          // then by chosen criterion
          if (sortBy === 'lastActivity') {
            const ta = getTs(a.lastActivity);
            const tb = getTs(b.lastActivity);
            return sortOrder === 'desc' ? (tb - ta) : (ta - tb);
          }
          // default fallback by createdAt
          const ta = getTs(a.createdAt);
          const tb = getTs(b.createdAt);
          return sortOrder === 'desc' ? (tb - ta) : (ta - tb);
        });

        const start = Math.max(0, offset);
        const end = Math.min(filtered.length, start + limit);
        const sliced = filtered.slice(start, end);
        console.warn(`[FIREBASE] Fallback returning ${sliced.length} posts (offset=${offset}, limit=${limit})`);
        return { items: sliced, total: filtered.length };
      }
    } catch (error) {
      console.error('[FIREBASE] Error getting forum posts (outer catch):', error?.message || error);
      // Last resort: ultra-simple scan without any where filters (small datasets only)
      try {
        const snapshot = await this.forumPosts.limit(1000).get();
        const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const filtered = raw.filter(p => p.categoryId === categoryId);

        const getTs = (v) => {
          if (!v) return 0;
          if (typeof v === 'number') return v;
          if (v._seconds) return v._seconds * 1000 + (v._nanoseconds || 0) / 1e6;
          if (v.seconds) return v.seconds * 1000 + (v.nanoseconds || 0) / 1e6;
          const t = Date.parse(v);
          return Number.isNaN(t) ? 0 : t;
        };

        filtered.sort((a, b) => {
          const pinA = a.isPinned ? 1 : 0;
          const pinB = b.isPinned ? 1 : 0;
          if (pinA !== pinB) return pinB - pinA;
          const ta = sortBy === 'lastActivity' ? getTs(a.lastActivity) : getTs(a.createdAt);
          const tb = sortBy === 'lastActivity' ? getTs(b.lastActivity) : getTs(b.createdAt);
          return sortOrder === 'desc' ? (tb - ta) : (ta - tb);
        });

        const start = Math.max(0, offset);
        const end = Math.min(filtered.length, start + limit);
        return { items: filtered.slice(start, end), total: filtered.length };
      } catch (e2) {
        console.error('[FIREBASE] Ultimate fallback failed for posts:', e2?.message || e2);
        return { items: [], total: 0 };
      }
    }
  }

  async createForumComment(steamId, commentData) {
    try {
      await this._assertNotSuspended(steamId);
      const commentRef = this.forumComments.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const user = await this.getUser(steamId);
      const comment = {
        ...commentData,
        authorSteamId: steamId,
        authorDisplayName: user?.displayName || 'Unknown User',
        authorAvatarUrl: user?.avatar || null,
        authorDisplayNameLower: (user?.displayName || 'Unknown User').toLowerCase(),
        contentLower: typeof commentData.content === 'string' ? commentData.content.toLowerCase() : '',
        level: commentData.parentCommentId ? 1 : 0, // Simple threading
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
      // Primary (indexed) query
      try {
        const snapshot = await this.forumComments
          .where('postId', '==', postId)
          .orderBy('createdAt', sortOrder)
          .limit(limit)
          .get();
        let total = 0;
        try {
          const countSnap = await this.forumComments
            .where('postId', '==', postId)
            .get();
          total = countSnap.size;
        } catch (_) {
          total = snapshot.size; // fallback
        }
        return { items: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })), total };
      } catch (indexErr) {
        // Fallback when composite index is missing: fetch by postId and sort/filter in memory
        console.warn('[FIREBASE] Falling back to simple comments query without composite index:', indexErr?.message);
        const snapshot = await this.forumComments
          .where('postId', '==', postId)
          .limit(1000)
          .get();

        const toMillis = (v) => v ? (v._seconds ? (v._seconds * 1000 + (v._nanoseconds || 0) / 1e6) : (v.seconds ? (v.seconds * 1000 + (v.nanoseconds || 0) / 1e6) : (Number.isNaN(Date.parse(v)) ? 0 : Date.parse(v)))) : 0;

        const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const filtered = raw; // no soft delete flag
        filtered.sort((a, b) => {
          const ta = toMillis(a.createdAt);
          const tb = toMillis(b.createdAt);
          return sortOrder === 'desc' ? (tb - ta) : (ta - tb);
        });

        return { items: filtered.slice(0, limit), total: filtered.length };
      }
    } catch (error) {
      console.error('[FIREBASE] Error getting forum comments:', error);
      // Last resort: try full scan (small datasets only)
      try {
        const snapshot = await this.forumComments.limit(1000).get();
        const toMillis = (v) => v ? (v._seconds ? (v._seconds * 1000 + (v._nanoseconds || 0) / 1e6) : (v.seconds ? (v.seconds * 1000 + (v.nanoseconds || 0) / 1e6) : (Number.isNaN(Date.parse(v)) ? 0 : Date.parse(v)))) : 0;
        const raw = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const filtered = raw.filter(c => c.postId === postId);
        filtered.sort((a, b) => {
          const ta = toMillis(a.createdAt);
          const tb = toMillis(b.createdAt);
          return (options.sortOrder || 'asc') === 'desc' ? (tb - ta) : (ta - tb);
        });
        return { items: filtered.slice(0, options.limit || 50), total: filtered.length };
      } catch (e2) {
        console.error('[FIREBASE] Ultimate fallback failed for comments:', e2?.message || e2);
        return { items: [], total: 0 };
      }
    }
  }

  // FORUM POST / COMMENT UPDATE & DELETE
  async _canModerate(steamId) {
    try {
      const user = await this.getUser(steamId);
      if (!user) return false;
      if (steamId === this.ADMIN_STEAM_ID) return true; // enforced admin
      if (user.role === 'admin') return true;
      // backward compatibility: legacy array field
      if (Array.isArray(user.roles) && user.roles.includes('admin')) return true;
      return false;
    } catch (_) {
      return false;
    }
  }

  async updateForumPost(steamId, postId, updates) {
    const postRef = this.forumPosts.doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) throw new Error('Post not found');
    const data = doc.data();
    const isAuthor = data.authorSteamId === steamId;
    const canModerate = await this._canModerate(steamId);
    if (!isAuthor && !canModerate) throw new Error('Forbidden');

    const allowed = {};
    if (typeof updates.title === 'string' && updates.title.trim()) {
      allowed.title = updates.title.trim();
      allowed.titleLower = updates.title.trim().toLowerCase();
    }
    if (typeof updates.content === 'string' && updates.content.trim()) {
      allowed.content = updates.content.trim();
    }
    if (Array.isArray(updates.tags)) allowed.tags = updates.tags.slice(0, 20);
  if (typeof updates.isPinned === 'boolean' && canModerate) allowed.isPinned = updates.isPinned; // admin only
    if (typeof updates.isLocked === 'boolean' && canModerate) allowed.isLocked = updates.isLocked;

    if (Object.keys(allowed).length === 0) return { id: postId, ...data }; // nothing to change

    // IMPORTANT: Firestore does not allow FieldValue.serverTimestamp() inside array elements.
    // Use a concrete Timestamp for editHistory while still using serverTimestamp() for top-level updatedAt fields.
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const editEntry = {
      editedAt: admin.firestore.Timestamp.now(),
      editedBy: steamId,
      prev: {
        title: data.title,
        content: data.content
      }
    };

    await postRef.update({
      ...allowed,
      updatedAt: serverTimestamp,
      lastActivity: serverTimestamp,
      editHistory: admin.firestore.FieldValue.arrayUnion(editEntry)
    });

    const updatedDoc = await postRef.get();
    return { id: postId, ...updatedDoc.data() };
  }

  async deleteForumPost(steamId, postId) {
    const postRef = this.forumPosts.doc(postId);
    const doc = await postRef.get();
    if (!doc.exists) throw new Error('Post not found');
    const data = doc.data();
    const isAuthor = data.authorSteamId === steamId;
    const canModerate = await this._canModerate(steamId);
    if (!isAuthor && !canModerate) throw new Error('Forbidden');
    // HARD DELETE: remove all comments & reports referencing this post
    try {
      const commentsSnap = await this.forumComments.where('postId', '==', postId).get();
      const batchLimit = 400; // keep well under Firestore 500 op limit
      let batch = this.db.batch();
      let ops = 0;
      commentsSnap.forEach(c => {
        batch.delete(this.forumComments.doc(c.id));
        ops++;
        if (ops >= batchLimit) { batch.commit(); batch = this.db.batch(); ops = 0; }
      });
      if (ops) await batch.commit();

      // Delete reports (post reports + comment reports found by contentId linking to removed comments or post)
      const reportSnap = await this.forumReports.where('contentType', 'in', ['post','comment']).where('postId','==', postId).get().catch(()=>null);
      if (reportSnap && !reportSnap.empty) {
        let rBatch = this.db.batch();
        let rOps = 0;
        reportSnap.forEach(r => {
          rBatch.delete(this.forumReports.doc(r.id));
          rOps++; if (rOps >= batchLimit) { rBatch.commit(); rBatch = this.db.batch(); rOps = 0; }
        });
        if (rOps) await rBatch.commit();
      }
    } catch (cascadeErr) {
      console.error('[FORUM] Cascade delete partial failure for post', postId, cascadeErr?.message || cascadeErr);
    }

    await postRef.delete();
    try {
      await this.updateCategoryStats(data.categoryId, { posts: -1, comments: -(data.stats?.comments || 0) });
    } catch (e) {
      console.warn('[FIREBASE] Failed adjusting category stats after hard delete', e?.message);
    }
    console.log('[FORUM] Hard-deleted post', postId);
    return {
      id: postId,
      deleted: true,
      hardDeleted: true,
      categoryId: data.categoryId || null,
      authorSteamId: data.authorSteamId || null,
      title: data.title || null
    };
  }

  async updateForumComment(steamId, commentId, updates) {
    const ref = this.forumComments.doc(commentId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Comment not found');
    const data = doc.data();
    const isAuthor = data.authorSteamId === steamId;
    const canModerate = await this._canModerate(steamId);
    if (!isAuthor && !canModerate) throw new Error('Forbidden');
  // Hard delete model – no soft delete guard needed

    const allowed = {};
    if (typeof updates.content === 'string' && updates.content.trim()) {
      allowed.content = updates.content.trim();
      allowed.contentLower = updates.content.trim().toLowerCase();
    }
    if (Object.keys(allowed).length === 0) return { id: commentId, ...data };

    // Firestore restriction: cannot place serverTimestamp sentinel inside array values.
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();
    const editEntry = {
      editedAt: admin.firestore.Timestamp.now(),
      editedBy: steamId,
      prev: { content: data.content }
    };

    await ref.update({
      ...allowed,
      updatedAt: serverTimestamp,
      editHistory: admin.firestore.FieldValue.arrayUnion(editEntry)
    });

    const updated = await ref.get();
    return { id: commentId, ...updated.data() };
  }

  async deleteForumComment(steamId, commentId) {
    const ref = this.forumComments.doc(commentId);
    const doc = await ref.get();
    if (!doc.exists) throw new Error('Comment not found');
    const data = doc.data();
    const isAuthor = data.authorSteamId === steamId;
    const canModerate = await this._canModerate(steamId);
    if (!isAuthor && !canModerate) throw new Error('Forbidden');
    await ref.delete();
    try {
      const postRef = this.forumPosts.doc(data.postId);
      await postRef.update({
        'stats.comments': admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastActivity: admin.firestore.FieldValue.serverTimestamp()
      });
      const post = (await postRef.get()).data();
      if (post?.categoryId) await this.updateCategoryStats(post.categoryId, { comments: -1 });
    } catch (e) {
      console.warn('[FORUM] Failed adjusting stats on hard comment delete', e?.message);
    }
    console.log('[FORUM] Hard-deleted comment', commentId);
    return {
      id: commentId,
      deleted: true,
      hardDeleted: true,
      postId: data.postId || null,
      parentCommentId: data.parentCommentId || null,
      authorSteamId: data.authorSteamId || null
    };
  }

  async createForumReport(reporterSteamId, reportData) {
    try {
      // Prevent duplicate report by same user on same content
      const existing = await this.forumReports
        .where('reporterSteamId', '==', reporterSteamId)
        .where('contentType', '==', reportData.contentType)
        .where('contentId', '==', reportData.contentId)
        .limit(1)
        .get();
      if (!existing.empty) {
        const err = new Error('Already reported');
        err.code = 'ALREADY_REPORTED';
        throw err;
      }

      // Identify target (author) of the reported content to support escalation
      let targetSteamId = null;
      let targetAuthorDisplayName = null;
      let contentSnippet = '';
      if (reportData.contentType === 'post') {
        const post = await this.forumPosts.doc(reportData.contentId).get();
        if (!post.exists) throw new Error('Target content not found');
        const pdata = post.data();
        targetSteamId = pdata.authorSteamId;
        targetAuthorDisplayName = pdata.authorDisplayName || null;
        const combined = `${pdata.title || ''} ${pdata.content || ''}`.trim();
        contentSnippet = combined.slice(0, 200);
      } else if (reportData.contentType === 'comment') {
        const comment = await this.forumComments.doc(reportData.contentId).get();
        if (!comment.exists) throw new Error('Target content not found');
        const cdata = comment.data();
        targetSteamId = cdata.authorSteamId;
        targetAuthorDisplayName = cdata.authorDisplayName || null;
        contentSnippet = (cdata.content || '').trim().slice(0, 200);
      }
      if (!targetSteamId) throw new Error('Target author unresolved');

      // Fetch reporter + target user display names (best effort)
      let reporterDisplayName = null;
      try {
        const reporterUser = await this.users.doc(reporterSteamId).get();
        reporterDisplayName = reporterUser.exists ? reporterUser.data().displayName || null : null;
      } catch (e) { console.warn('[FORUM] Could not fetch reporter displayName', e?.message); }
      let targetDisplayName = targetAuthorDisplayName;
      if (!targetDisplayName) {
        try {
          const targetUser = await this.users.doc(targetSteamId).get();
          targetDisplayName = targetUser.exists ? targetUser.data().displayName || null : null;
        } catch (e) { console.warn('[FORUM] Could not fetch target displayName', e?.message); }
      }

      const reportRef = this.forumReports.doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const report = {
        ...reportData,
        reporterSteamId,
        targetSteamId,
        reporterDisplayName: reporterDisplayName,
        targetDisplayName: targetDisplayName,
        reporterDisplayNameLower: reporterDisplayName ? reporterDisplayName.toLowerCase() : null,
        targetDisplayNameLower: targetDisplayName ? targetDisplayName.toLowerCase() : null,
        reasonLower: reportData.reason ? reportData.reason.toLowerCase() : null,
        contentSnippet: contentSnippet || null,
        contentSnippetLower: contentSnippet ? contentSnippet.toLowerCase() : null,
        status: 'pending',
        reviewedBy: null,
        reviewedAt: null,
        resolution: null,
        resolutionNotes: null,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      await reportRef.set(report);
      
  // Notify admin (future enhancement)

      // Trigger escalation checks (best-effort, non-blocking)
      this._checkAndApplyReportEscalation(targetSteamId).catch(e => {
        console.warn('[FIREBASE] Escalation check failed:', e?.message || e);
      });
      
      return reportRef;
    } catch (error) {
      console.error('[FIREBASE] Error creating forum report:', error);
      throw error;
    }
  }

  async hasUserReported(reporterSteamId, contentType, contentId) {
    try {
      const snap = await this.forumReports
        .where('reporterSteamId', '==', reporterSteamId)
        .where('contentType', '==', contentType)
        .where('contentId', '==', contentId)
        .limit(1)
        .get();
      return !snap.empty;
    } catch (e) {
      console.warn('[FIREBASE] hasUserReported check failed:', e?.message || e);
      return false;
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

  // =====================================================
  // TTL EMULATION (Fallback when Firestore TTL policy not available)
  // =====================================================
  // Soft-delete TTL purge removed – hard deletes are immediate.

  // =====================================================
  // MODERATION & SUSPENSION HELPERS
  // =====================================================
  async _assertNotSuspended(steamId) {
    // Absolute immunity for designated admin account
    if (steamId === this.ADMIN_STEAM_ID) return true;
    const user = await this.getUser(steamId);
    const suspension = user?.moderation?.suspension;
    if (!suspension?.active) return true;
    const now = Date.now();
    let expiresMillis = null;
    if (suspension.expiresAt) {
      const ex = suspension.expiresAt;
      expiresMillis = ex?.toMillis ? ex.toMillis() : (ex._seconds ? ex._seconds * 1000 : Date.parse(ex));
    }
    if (expiresMillis && expiresMillis < now) {
      // Auto-clear expired suspension and notify user (if not already cleared)
      await this.users.doc(steamId).update({
        'moderation.suspension.active': false,
        'moderation.suspension.clearedAt': admin.firestore.FieldValue.serverTimestamp(),
        'moderation.suspension.autoCleared': true
      });
      try {
        await this.createNotification(steamId, {
          type: 'moderation_suspension_expired',
          title: 'Suspension expired',
          body: 'Your temporary suspension has expired. You may post and comment again.',
          severity: 'info'
        });
      } catch (_) {}
      return true;
    }
    throw new Error('SUSPENDED');
  }

  async _applySuspension(steamId, { durationHours = null, level, reason }) {
    // Do not apply suspensions to admin account
    if (steamId === this.ADMIN_STEAM_ID) {
      console.log('[MODERATION] Attempted to suspend admin; ignoring');
      return { skipped: true, reason: 'admin_immune' };
    }
    const now = admin.firestore.Timestamp.now();
    let expiresAt = null;
    if (durationHours) {
      expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + durationHours * 3600 * 1000);
    }
    await this.users.doc(steamId).set({
      moderation: {
        suspension: {
          active: true,
          level,
          reason,
            appliedAt: now,
          expiresAt: expiresAt || null
        }
      }
    }, { merge: true });
    console.log(`[MODERATION] Suspension applied to ${steamId} level=${level} durationHours=${durationHours}`);
    try {
      await this.createNotification(steamId, {
        type: 'moderation_suspension_applied',
        title: 'Account Suspended',
        body: `${reason}${expiresAt ? ` (Expires ${new Date(expiresAt.toMillis()).toLocaleString()})` : ''}`,
        severity: 'warning'
      });
    } catch (e) {
      console.error('[MODERATION] Failed to create suspension notification', e?.message || e);
    }
  }

  async _checkAndApplyReportEscalation(targetSteamId) {
    if (targetSteamId === this.ADMIN_STEAM_ID) return; // never suspend the sole admin
    // Count ALL reports targeting this user (we delete instead of marking resolved)
    const allSnap = await this.forumReports
      .where('targetSteamId', '==', targetSteamId)
      .get();
    const count = allSnap.size;

    const user = await this.getUser(targetSteamId) || {};
    const currentLevel = user?.moderation?.suspension?.level || 'none';
    const alreadyActive = user?.moderation?.suspension?.active;
    // New threshold ladder (highest first) per owner specification:
    // 15 => 3 day suspension, 10 => 24h suspension, 5 => warning (no posting restriction)
    const ladder = [
      { threshold: 15, level: 'temp_severe', hours: 24 * 3, reason: 'High number of reports (3 day suspension)' },
      { threshold: 10, level: 'temp', hours: 24, reason: 'Multiple reports (24h suspension)' },
      { threshold: 5, level: 'warn', hours: 0, reason: 'Accumulated reports (warning issued)' }
    ];

    const rank = {
      none: 0,
      warn: 1,
      temp: 2,
      temp_severe: 3,
      // Keep legacy levels for backward compatibility (if stored previously)
      permanent: 4
    };

    for (const r of ladder) {
      if (count >= r.threshold) {
        if (rank[r.level] <= rank[currentLevel] && alreadyActive) return; // no downgrade
        if (r.level === 'warn') {
          await this.users.doc(targetSteamId).set({
            moderation: {
              warning: {
                level: 'warn',
                warnedAt: admin.firestore.FieldValue.serverTimestamp(),
                reason: r.reason,
                reportCount: count
              }
            }
          }, { merge: true });
          console.log(`[MODERATION] Warning recorded for ${targetSteamId}`);
          try {
            await this.createNotification(targetSteamId, {
              type: 'moderation_warning',
              title: 'Warning Issued',
              body: r.reason,
              severity: 'info'
            });
          } catch (e) {
            console.error('[MODERATION] Failed to create warning notification', e?.message || e);
          }
        } else {
          await this._applySuspension(targetSteamId, { durationHours: r.hours, level: r.level, reason: r.reason });
        }
        break; // apply highest matched rule only
      }
    }
  }

  async resolveReports(adminSteamId, reportIds = [], { status = 'resolved', notes = null, action = null } = {}) {
    const batch = this.db.batch();
    const applied = [];
    const affectedUsers = new Set();
    
    for (const id of reportIds) {
      const ref = this.forumReports.doc(id);
      const doc = await ref.get();
      if (!doc.exists) continue;
      const data = doc.data();
      if (data.status !== 'pending') continue; // only process pending
      
      // DELETE the report instead of marking as resolved
      batch.delete(ref);
      applied.push(id);
      
      // Track affected users for suspension re-evaluation
      if (data.targetSteamId) {
        affectedUsers.add(data.targetSteamId);
      }
    }
    
    if (applied.length) await batch.commit();
    
    
    // Re-evaluate suspension for each affected user
    for (const steamId of affectedUsers) {
      await this._reevaluateSuspension(steamId).catch(e => {
        console.warn(`[MODERATION] Failed to re-evaluate suspension for ${steamId}:`, e?.message);
      });
    }
    
    return { processed: applied.length, reportIds: applied };
  }
  
  async _reevaluateSuspension(targetSteamId) {
    if (targetSteamId === this.ADMIN_STEAM_ID) return;
    
    // Count ALL reports (no status filter since we're deleting instead of marking resolved)
    const allReportsSnap = await this.forumReports
      .where('targetSteamId', '==', targetSteamId)
      .get();
    const reportCount = allReportsSnap.size;
    
    console.log(`[MODERATION] Re-evaluating suspension for ${targetSteamId}: ${reportCount} total reports`);
    
    const user = await this.getUser(targetSteamId);
    const suspension = user?.moderation?.suspension;
    
    // If user is currently suspended due to reports
    if (suspension?.active && suspension?.level && ['temp', 'temp_severe'].includes(suspension.level)) {
      // Check if report count is now below suspension threshold
      if (reportCount < 10) {
        // Lift suspension
        await this.users.doc(targetSteamId).update({
          'moderation.suspension.active': false,
          'moderation.suspension.clearedAt': admin.firestore.FieldValue.serverTimestamp(),
          'moderation.suspension.clearedReason': 'Report count below threshold after admin review'
        });
        
        console.log(`[MODERATION] Suspension lifted for ${targetSteamId} (reports: ${reportCount})`);
        
        // DELETE ALL REMAINING REPORTS for this user (fresh start at 0)
        const batch = this.db.batch();
        allReportsSnap.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        
        // Notify user
        try {
          await this.createNotification(targetSteamId, {
            type: 'moderation_suspension_lifted',
            title: 'Suspension Lifted',
            body: 'Your suspension has been lifted after admin review. You may post and comment again.',
            severity: 'success'
          });
        } catch (e) {
          console.warn('[MODERATION] Failed to create suspension lifted notification:', e?.message);
        }
      }
    } else if (reportCount >= 10) {
      // User was not suspended but now has enough reports - apply escalation
      await this._checkAndApplyReportEscalation(targetSteamId);
    }
  }

  async bulkDeleteContent(adminSteamId, { postIds = [], commentIds = [] } = {}) {
    const results = { posts: 0, comments: 0 };
    for (const pid of postIds) {
  try { await this.deleteForumPost(adminSteamId, pid); results.posts++; } catch (_) {}
    }
    for (const cid of commentIds) {
  try { await this.deleteForumComment(adminSteamId, cid); results.comments++; } catch (_) {}
    }
    return results;
  }

  // Purge statistics removed – no soft-deleted documents to track.

  // =============================
  // ADMIN: CLEAR SUSPENSION EARLY
  // =============================
  async clearUserSuspension(adminSteamId, targetSteamId) {
    if (adminSteamId !== this.ADMIN_STEAM_ID) {
      throw new Error('Forbidden');
    }
    if (targetSteamId === this.ADMIN_STEAM_ID) return { cleared: false, reason: 'Admin cannot be suspended' };
    const user = await this.getUser(targetSteamId);
    if (!user?.moderation?.suspension?.active) {
      return { cleared: false, reason: 'No active suspension' };
    }
    await this.users.doc(targetSteamId).set({
      moderation: {
        ...user.moderation,
        suspension: {
          ...user.moderation.suspension,
          active: false,
          clearedEarly: true,
          clearedAt: admin.firestore.FieldValue.serverTimestamp(),
          clearedBy: adminSteamId
        }
      }
    }, { merge: true });
    
    // DELETE ALL REPORTS for this user (fresh start at 0)
    const allReports = await this.forumReports
      .where('targetSteamId', '==', targetSteamId)
      .get();
    if (!allReports.empty) {
      const batch = this.db.batch();
      allReports.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }
    
    // Notify user
    try {
      await this.createNotification(targetSteamId, {
        type: 'moderation_suspension_cleared',
        title: 'Suspension Cleared',
        body: 'An admin has lifted your forum suspension. All reports have been cleared.',
        severity: 'success'
      });
    } catch (_) {}
    return { cleared: true };
  }

  async getUserModerationStatus(adminSteamId, targetSteamId) {
    if (adminSteamId !== this.ADMIN_STEAM_ID) throw new Error('Forbidden');
    const user = await this.getUser(targetSteamId);
    if (!user) return { exists: false };
    return {
      exists: true,
      steamId: targetSteamId,
      moderation: user.moderation || null,
      role: user.role || (Array.isArray(user.roles) && user.roles.includes('admin') ? 'admin' : 'user'),
      roles: user.roles || [] // legacy exposure (will be deprecated)
    };
  }
}

export default new FirebaseService();
export { admin };
