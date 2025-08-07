/**
 * Firebase Index Creation Script
 * 
 * This script creates the necessary Firestore indexes by making queries that require them.
 * Run this script to automatically generate the required indexes.
 */

import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: process.env.FIREBASE_PROJECT_ID || 'steamvault-c4b44'
  });
}

const db = getFirestore();

async function createIndexes() {
  console.log('Creating Firebase indexes...');
  
  try {
    // Test steamId to trigger index creation
    const testSteamId = '76561198918283411';
    
    console.log('1. Creating mapStats index (steamId + matchesPlayed)...');
    try {
      await db.collection('mapStats')
        .where('steamId', '==', testSteamId)
        .orderBy('matchesPlayed', 'desc')
        .limit(1)
        .get();
      console.log('   ✅ mapStats index created successfully');
    } catch (error) {
      console.log('   ❌ mapStats index creation failed:', error.message);
      console.log('   📋 Create this index manually:');
      console.log('      Collection: mapStats');
      console.log('      Fields: steamId (Ascending), matchesPlayed (Descending), __name__ (Ascending)');
    }

    console.log('2. Creating matches index (steamId + date)...');
    try {
      await db.collection('matches')
        .where('steamId', '==', testSteamId)
        .orderBy('date', 'desc')
        .limit(1)
        .get();
      console.log('   ✅ matches index created successfully');
    } catch (error) {
      console.log('   ❌ matches index creation failed:', error.message);
      console.log('   📋 Create this index manually:');
      console.log('      Collection: matches');
      console.log('      Fields: steamId (Ascending), date (Descending), __name__ (Ascending)');
    }

    console.log('3. Creating weaponStats index (steamId + kills)...');
    try {
      await db.collection('weaponStats')
        .where('steamId', '==', testSteamId)
        .orderBy('kills', 'desc')
        .limit(1)
        .get();
      console.log('   ✅ weaponStats index created successfully');
    } catch (error) {
      console.log('   ❌ weaponStats index creation failed:', error.message);
      console.log('   📋 Create this index manually:');
      console.log('      Collection: weaponStats');
      console.log('      Fields: steamId (Ascending), kills (Descending), __name__ (Ascending)');
    }

    console.log('\n🎉 Index creation process completed!');
    console.log('📌 If any indexes failed, create them manually in the Firebase Console:');
    console.log('   https://console.firebase.google.com/project/steamvault-c4b44/firestore/indexes');
    
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
}

createIndexes();
