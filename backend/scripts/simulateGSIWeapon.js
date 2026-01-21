// Simulate CS2 GSI ticks to attribute weapon kills and verify weaponStats updates
// Usage: node scripts/simulateGSIWeapon.js <steamId>
import 'dotenv/config';
import axios from 'axios';
import firebaseService from '../services/firebaseService.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const steamId = process.argv[2] || firebaseService.ADMIN_STEAM_ID;
  const baseUrl = process.env.BACKEND_URL || 'http://localhost:3000';
  const endpoint = `${baseUrl}/api/cs2/gsi/${steamId}`;

  const startTs = Math.floor(Date.now() / 1000);
  const mkTick = (overrides = {}) => ({
    provider: { name: 'SteamVault-GSI', appid: 730, version: 1, timestamp: overrides.timestamp ?? Math.floor(Date.now() / 1000) },
    map: {
      mode: 'competitive',
      name: 'de_mirage',
      phase: overrides.phase || 'live',
      team_ct: { score: overrides.ctScore ?? 0 },
      team_t: { score: overrides.tScore ?? 0 }
    },
    round: { phase: overrides.roundPhase || 'live', number: overrides.roundNumber ?? 1 },
    player: {
      steamid: steamId,
      team: overrides.team || 'CT',
      state: { kills: overrides.kills ?? 0, deaths: overrides.deaths ?? 0, assists: overrides.assists ?? 0, mvps: overrides.mvps ?? 0 },
      match_stats: { kills: overrides.kills ?? 0, deaths: overrides.deaths ?? 0, assists: overrides.assists ?? 0, mvps: overrides.mvps ?? 0 },
      weapons: {
        weapon_0: { name: 'weapon_m4a1', state: overrides.active ? 'active' : 'holstered' },
        weapon_1: { name: 'weapon_ak47', state: 'holstered' }
      }
    }
  });

  console.log(`Posting GSI ticks to ${endpoint} for steamId=${steamId} ...`);
  // baseline, no kills
  console.log('POST baseline (0 kills)');
  console.log((await axios.post(endpoint, mkTick({ timestamp: startTs, active: true }))).data);
  await sleep(200);
  // +1 kill on m4a1
  console.log('POST +1 kill');
  console.log((await axios.post(endpoint, mkTick({ timestamp: startTs + 1, kills: 1, active: true }))).data);
  await sleep(200);
  // +2 kills total
  console.log('POST +2 kills');
  console.log((await axios.post(endpoint, mkTick({ timestamp: startTs + 2, kills: 2, active: true }))).data);
  await sleep(200);
  // end the match with final stats and gameover phase so reconciliation can run
  console.log('POST gameover');
  console.log((await axios.post(endpoint, mkTick({ timestamp: startTs + 120, kills: 2, phase: 'gameover', roundPhase: 'over', ctScore: 13, tScore: 7, active: false }))).data);

  // Give backend a moment to write
  await sleep(1000);

  // Read weapon stats directly via admin SDK
  const weapons = await firebaseService.getPlayerWeapons(steamId);
  const m4 = weapons.find(w => (w.weaponName || '').toLowerCase() === 'm4a1' || (w.weaponName || '').toLowerCase() === 'm4a1-s');
  console.log('Current weapon stats (top 10):');
  console.log(weapons.slice(0, 10));
  console.log('m4a1 summary:', m4);
}

main().catch(e => {
  console.error('Simulation failed:', e?.message || e);
  process.exit(1);
});
