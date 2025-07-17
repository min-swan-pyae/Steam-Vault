import { DemoFile } from 'demofile';
import fs from 'fs';
import path from 'path';

class DemoParsingService {
  constructor() {
    this.parsedData = new Map(); // In-memory storage for parsed demos
  }

  /**
   * Parse a CS2 demo file and extract comprehensive statistics
   * @param {Buffer} demoBuffer - The demo file buffer
   * @param {string} steamId - Steam ID of the player to analyze
   * @returns {Promise<Object>} Parsed statistics
   */
  async parseDemoFile(demoBuffer, steamId) {
    return new Promise((resolve, reject) => {
      const demoFile = new DemoFile();
      const playerStats = {
        steamId: steamId,
        personaName: '',
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        damage: 0,
        weaponStats: {},
        rounds: [],
        matchInfo: {},
        mvps: 0,
        score: 0
      };

      let targetPlayer = null;
      let currentRound = {
        roundNum: 0,
        kills: 0,
        deaths: 0,
        damage: 0
      };

      // Parse player info when available
      demoFile.on('start', () => {
        console.log('Demo parsing started...');
      });

      // Handle player info
      demoFile.on('tickend', (tick) => {
        if (!targetPlayer && demoFile.players) {
          // Find the target player by Steam ID
          for (const player of demoFile.players.values()) {
            if (player.steamId === steamId) {
              targetPlayer = player;
              playerStats.personaName = player.name || `Player ${steamId}`;
              break;
            }
          }
        }
      });

      // Handle player kills
      demoFile.on('playerkill', (e) => {
        if (!targetPlayer) return;

        // If target player got a kill
        if (e.killer && e.killer.steamId === steamId) {
          playerStats.kills++;
          currentRound.kills++;
          
          // Track headshots
          if (e.headshot) {
            playerStats.headshots++;
          }

          // Track weapon stats
          const weapon = e.weapon;
          if (weapon) {
            if (!playerStats.weaponStats[weapon]) {
              playerStats.weaponStats[weapon] = {
                weaponName: weapon,
                kills: 0,
                headshots: 0,
                headshotPercentage: 0
              };
            }
            playerStats.weaponStats[weapon].kills++;
            if (e.headshot) {
              playerStats.weaponStats[weapon].headshots++;
            }
          }
        }

        // If target player was killed
        if (e.victim && e.victim.steamId === steamId) {
          playerStats.deaths++;
          currentRound.deaths++;
        }

        // If target player got an assist
        if (e.assister && e.assister.steamId === steamId) {
          playerStats.assists++;
        }
      });

      // Handle player hurt events for damage tracking
      demoFile.on('playerhurt', (e) => {
        if (e.attacker && e.attacker.steamId === steamId) {
          playerStats.damage += e.dmgHealth;
          currentRound.damage += e.dmgHealth;
        }
      });

      // Handle round end
      demoFile.on('roundend', (e) => {
        if (targetPlayer) {
          currentRound.roundNum++;
          playerStats.rounds.push({ ...currentRound });
          
          // Check for MVP
          if (e.player && e.player.steamId === steamId) {
            playerStats.mvps++;
          }

          // Reset round stats
          currentRound = {
            roundNum: currentRound.roundNum + 1,
            kills: 0,
            deaths: 0,
            damage: 0
          };
        }
      });

      // Handle match info
      demoFile.on('gameend', () => {
        if (targetPlayer) {
          playerStats.matchInfo = {
            mapName: demoFile.header.mapName || 'Unknown',
            duration: demoFile.tickRate ? Math.floor(demoFile.currentTick / demoFile.tickRate) : 0,
            score: targetPlayer.score || 0,
            date: new Date().toISOString()
          };
          playerStats.score = targetPlayer.score || 0;
        }
      });

      // Handle parsing completion
      demoFile.on('end', () => {
        console.log('Demo parsing completed');
        
        // Calculate weapon headshot percentages
        Object.values(playerStats.weaponStats).forEach(weapon => {
          if (weapon.kills > 0) {
            weapon.headshotPercentage = Math.round((weapon.headshots / weapon.kills) * 100);
          }
        });

        // Calculate overall stats
        const kdRatio = playerStats.deaths > 0 ? (playerStats.kills / playerStats.deaths) : playerStats.kills;
        const headshotPercentage = playerStats.kills > 0 ? (playerStats.headshots / playerStats.kills) * 100 : 0;
        
        const finalStats = {
          ...playerStats,
          kdRatio: Math.round(kdRatio * 100) / 100,
          headshotPercentage: Math.round(headshotPercentage * 100) / 100,
          totalRounds: playerStats.rounds.length,
          averageDamagePerRound: playerStats.rounds.length > 0 ? 
            Math.round(playerStats.damage / playerStats.rounds.length) : 0
        };

        resolve(finalStats);
      });

      // Handle parsing errors
      demoFile.on('error', (error) => {
        console.error('Demo parsing error:', error);
        reject(new Error(`Failed to parse demo: ${error.message}`));
      });

      try {
        // Start parsing
        demoFile.parse(demoBuffer);
      } catch (error) {
        reject(new Error(`Failed to start parsing: ${error.message}`));
      }
    });
  }

  /**
   * Convert parsed demo data to match format expected by frontend
   * @param {Object} parsedData - Parsed demo statistics
   * @returns {Object} Formatted match data
   */
  formatAsMatchData(parsedData) {
    return {
      matchId: `demo_${Date.now()}`,
      mapName: parsedData.matchInfo.mapName || 'Unknown',
      result: 'Analyzed', // We can't determine win/loss from single player perspective
      kills: parsedData.kills,
      deaths: parsedData.deaths,
      assists: parsedData.assists,
      score: `${parsedData.score}-0`, // Simplified score format
      duration: parsedData.matchInfo.duration || 0,
      date: parsedData.matchInfo.date,
      mvp: parsedData.mvps > 0,
      rating: parsedData.kdRatio,
      damage: parsedData.damage,
      headshots: parsedData.headshots,
      headshotPercentage: parsedData.headshotPercentage
    };
  }

  /**
   * Aggregate multiple demo files into comprehensive player statistics
   * @param {string} steamId - Steam ID of the player
   * @param {Array} parsedDemos - Array of parsed demo data
   * @returns {Object} Aggregated player statistics
   */
  aggregatePlayerStats(steamId, parsedDemos) {
    if (!parsedDemos || parsedDemos.length === 0) {
      return null;
    }

    const totalKills = parsedDemos.reduce((sum, demo) => sum + demo.kills, 0);
    const totalDeaths = parsedDemos.reduce((sum, demo) => sum + demo.deaths, 0);
    const totalHeadshots = parsedDemos.reduce((sum, demo) => sum + demo.headshots, 0);
    const totalDamage = parsedDemos.reduce((sum, demo) => sum + demo.damage, 0);
    const totalMvps = parsedDemos.reduce((sum, demo) => sum + demo.mvps, 0);
    const totalMatches = parsedDemos.length;

    // Aggregate weapon stats
    const weaponStats = {};
    parsedDemos.forEach(demo => {
      Object.values(demo.weaponStats).forEach(weapon => {
        if (!weaponStats[weapon.weaponName]) {
          weaponStats[weapon.weaponName] = {
            weaponName: weapon.weaponName,
            kills: 0,
            headshots: 0,
            headshotPercentage: 0
          };
        }
        weaponStats[weapon.weaponName].kills += weapon.kills;
        weaponStats[weapon.weaponName].headshots += weapon.headshots;
      });
    });

    // Calculate weapon headshot percentages
    Object.values(weaponStats).forEach(weapon => {
      if (weapon.kills > 0) {
        weapon.headshotPercentage = Math.round((weapon.headshots / weapon.kills) * 100);
      }
    });

    // Get player name from most recent demo
    const playerName = parsedDemos[parsedDemos.length - 1].personaName || `Player ${steamId}`;

    return {
      steamId: steamId,
      personaName: playerName,
      kdRatio: totalDeaths > 0 ? Math.round((totalKills / totalDeaths) * 100) / 100 : totalKills,
      winRate: 50, // We can't calculate actual win rate from single player demos
      headshotPercentage: totalKills > 0 ? Math.round((totalHeadshots / totalKills) * 100) : 0,
      totalKills: totalKills,
      totalDeaths: totalDeaths,
      totalMatches: totalMatches,
      totalDamage: totalDamage,
      totalMvps: totalMvps,
      weaponStats: Object.values(weaponStats),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Store parsed demo data for a player
   * @param {string} steamId - Steam ID of the player
   * @param {Object} parsedData - Parsed demo data
   */
  storeParsedData(steamId, parsedData) {
    if (!this.parsedData.has(steamId)) {
      this.parsedData.set(steamId, []);
    }
    this.parsedData.get(steamId).push(parsedData);
  }

  /**
   * Get all parsed demos for a player
   * @param {string} steamId - Steam ID of the player
   * @returns {Array} Array of parsed demo data
   */
  getPlayerDemos(steamId) {
    return this.parsedData.get(steamId) || [];
  }

  /**
   * Get aggregated stats for a player
   * @param {string} steamId - Steam ID of the player
   * @returns {Object} Aggregated player statistics
   */
  getPlayerStats(steamId) {
    const demos = this.getPlayerDemos(steamId);
    return this.aggregatePlayerStats(steamId, demos);
  }
}

export default new DemoParsingService();
