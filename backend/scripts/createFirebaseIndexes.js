/**
 * Firebase Index Creation Script for Steam Vault
 * 
 * This script creates all necessary Firestore indexes by making queries that require them.
 * Run this script to automatically generate the required indexes for the entire application.
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

async function createIndex(description, queryFn, manualInstructions) {
  console.log(`${description}...`);
  try {
    await queryFn();
    console.log('   ✅ Index created successfully');
  } catch (error) {
    console.log('   ❌ Index creation failed:', error.message);
    console.log('   📋 Create this index manually:');
    manualInstructions.forEach(instruction => {
      console.log(`      ${instruction}`);
    });
    console.log('');
  }
}

async function createAllIndexes() {
  console.log('🔥 Creating Firebase indexes for Steam Vault...\n');
  
  const testSteamId = '76561198918283411';
  const testPostId = 'test_post_id';
  
  // 1. CS2 MATCHES INDEXES
  await createIndex(
    '1. Creating matches index (steamId + date)',
    () => db.collection('matches')
      .where('steamId', '==', testSteamId)
      .orderBy('date', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: matches',
      'Fields: steamId (Ascending), date (Descending), __name__ (Ascending)'
    ]
  );

  // 2. WEAPON STATS INDEXES
  await createIndex(
    '2. Creating weaponStats index (steamId + kills)',
    () => db.collection('weaponStats')
      .where('steamId', '==', testSteamId)
      .orderBy('kills', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: weaponStats',
      'Fields: steamId (Ascending), kills (Descending), __name__ (Ascending)'
    ]
  );

  // 3. MAP STATS INDEXES
  await createIndex(
    '3. Creating mapStats index (steamId + totalMatches)',
    () => db.collection('mapStats')
      .where('steamId', '==', testSteamId)
      .orderBy('totalMatches', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: mapStats',
      'Fields: steamId (Ascending), totalMatches (Descending), __name__ (Ascending)'
    ]
  );

  // 4. FORUM POSTS INDEXES
  await createIndex(
    '4. Creating forumPosts index (categoryId + createdAt)',
    () => db.collection('forumPosts')
      .where('categoryId', '==', 'general')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: forumPosts',
      'Fields: categoryId (Ascending), createdAt (Descending), __name__ (Ascending)'
    ]
  );

  await createIndex(
    '5. Creating forumPosts index (categoryId + isPinned + lastActivity)',
    () => db.collection('forumPosts')
      .where('categoryId', '==', 'general')
      .where('isPinned', '==', true)
      .orderBy('lastActivity', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: forumPosts',
      'Fields: categoryId (Ascending), isPinned (Descending), lastActivity (Descending), __name__ (Ascending)'
    ]
  );

  // 5. FORUM COMMENTS INDEXES
  await createIndex(
    '6. Creating forumComments index (postId + createdAt)',
    () => db.collection('forumComments')
      .where('postId', '==', testPostId)
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get(),
    [
      'Collection: forumComments',
      'Fields: postId (Ascending), createdAt (Ascending), __name__ (Ascending)'
    ]
  );

  // 6. NOTIFICATIONS INDEXES
  await createIndex(
    '7. Creating notifications index (steamId + isRead + createdAt)',
    () => db.collection('notifications')
      .where('steamId', '==', testSteamId)
      .where('isRead', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: notifications',
      'Fields: steamId (Ascending), isRead (Ascending), createdAt (Descending), __name__ (Ascending)'
    ]
  );

  // 7. USER ACTIVITY INDEXES
  await createIndex(
    '8. Creating userActivity index (steamId + createdAt)',
    () => db.collection('userActivity')
      .where('steamId', '==', testSteamId)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: userActivity',
      'Fields: steamId (Ascending), createdAt (Descending), __name__ (Ascending)'
    ]
  );

  // 8. MARKET WATCHLISTS INDEXES
  await createIndex(
    '9. Creating marketWatchlists index (steamId + updatedAt)',
    () => db.collection('marketWatchlists')
      .where('steamId', '==', testSteamId)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: marketWatchlists',
      'Fields: steamId (Ascending), updatedAt (Descending), __name__ (Ascending)'
    ]
  );

  // 9. FORUM REPORTS INDEXES
  await createIndex(
    '10. Creating forumReports index (status + createdAt)',
    () => db.collection('forumReports')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: forumReports',
      'Fields: status (Ascending), createdAt (Descending), __name__ (Ascending)'
    ]
  );

  // 10. LEADERBOARD INDEXES (Single field indexes)
  await createIndex(
    '11. Creating playerStats index (kdRatio)',
    () => db.collection('playerStats')
      .orderBy('kdRatio', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: playerStats',
      'Fields: kdRatio (Descending), __name__ (Ascending)'
    ]
  );

  await createIndex(
    '12. Creating playerStats index (totalKills)',
    () => db.collection('playerStats')
      .orderBy('totalKills', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: playerStats',
      'Fields: totalKills (Descending), __name__ (Ascending)'
    ]
  );

  await createIndex(
    '13. Creating playerStats index (winRate)',
    () => db.collection('playerStats')
      .orderBy('winRate', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: playerStats',
      'Fields: winRate (Descending), __name__ (Ascending)'
    ]
  );

  // 11. USERS INDEXES
  await createIndex(
    '14. Creating users index (lastSeen)',
    () => db.collection('users')
      .orderBy('lastSeen', 'desc')
      .limit(1)
      .get(),
    [
      'Collection: users',
      'Fields: lastSeen (Descending), __name__ (Ascending)'
    ]
  );

  // 12. EMAIL CONNECTIONS INDEXES
  await createIndex(
    '15. Creating emailConnections index (email)',
    () => db.collection('emailConnections')
      .where('email', '==', 'test@example.com')
      .limit(1)
      .get(),
    [
      'Collection: emailConnections',
      'Fields: email (Ascending), __name__ (Ascending)'
    ]
  );

  // 13. NOTIFICATIONS TYPE INDEX
  await createIndex(
    '16. Creating notifications index (type)',
    () => db.collection('notifications')
      .where('type', '==', 'price_drop')
      .limit(1)
      .get(),
    [
      'Collection: notifications',
      'Fields: type (Ascending), __name__ (Ascending)'
    ]
  );

  // 14. FORUM POSTS TAGS INDEX (Array field)
  await createIndex(
    '17. Creating forumPosts index (tags array)',
    () => db.collection('forumPosts')
      .where('tags', 'array-contains', 'cs2')
      .limit(1)
      .get(),
    [
      'Collection: forumPosts',
      'Fields: tags (Arrays), __name__ (Ascending)'
    ]
  );

  // 15. USER PROFILES PRIVACY INDEX
  await createIndex(
    '18. Creating userProfiles index (privacy settings)',
    () => db.collection('userProfiles')
      .where('privacy.showStatsPublicly', '==', true)
      .limit(1)
      .get(),
    [
      'Collection: userProfiles',
      'Fields: privacy.showStatsPublicly (Ascending), __name__ (Ascending)'
    ]
  );

  console.log('\n🎉 Index creation process completed!');
  console.log('📌 If any indexes failed, create them manually in the Firebase Console:');
  console.log(`   https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/indexes`);
  console.log('\n📋 Additional Setup Required:');
  console.log('   1. Deploy security rules: firebase deploy --only firestore:rules');
  console.log('   2. Set up Firebase Authentication with Steam provider');
  console.log('   3. Configure Gmail API for email notifications');
  console.log('   4. Set up Cloud Functions for background tasks (price alerts, notifications)');
  
  process.exit(0);
}
createAllIndexes();
