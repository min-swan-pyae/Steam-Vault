#!/usr/bin/env node
/**
 * Helper script that prints the required composite index JSON for the price alert watchlist query
 * and (optionally) verifies existence if using Firestore Admin APIs in future.
 * For now it just echoes instructions based on firestore.indexes.json.
 */
import fs from 'fs';
import path from 'path';

function main() {
  const idxPath = path.resolve(process.cwd(), '..', 'firestore.indexes.json');
  const content = fs.readFileSync(idxPath, 'utf8');
  const json = JSON.parse(content);
  const wanted = json.indexes.find(i => i.collectionGroup === 'marketWatchlists' && i.fields.some(f=>f.fieldPath==='alertsEnabled'));
  console.log('[INDEX CHECK] Composite index for marketWatchlists (alertsEnabled + targetPrice) present:', !!wanted);
  console.log('If not deployed yet, run:');
  console.log('  firebase deploy --only firestore:indexes');
  console.log('\nIndex definition snippet (already in firestore.indexes.json):');
  console.log(JSON.stringify(wanted, null, 2));
}

main();
