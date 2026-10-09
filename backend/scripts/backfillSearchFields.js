#!/usr/bin/env node
/**
 * Backfill lowercase searchable fields for prefix search.
 * Adds: titleLower (forumPosts), contentLower (forumComments), displayNameLower (users), titleLower (notifications)
 * Safe to re-run; skips documents already containing lowered fields.
 */
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import path from 'path';

dotenv.config();

// Attempt to initialize Firebase Admin using service account env variables first; fallback to ADC.
function initAdmin() {
  if (admin.apps.length) return;
  const {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY
  } = process.env;

  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    try {
      const serviceAccount = {
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
      });
      console.log('[BACKFILL] Initialized Firebase Admin with service account env vars');
      return;
    } catch (e) {
      console.warn('[BACKFILL] Service account initialization failed, attempting application default credentials.', e.message);
    }
  } else {
    console.warn('[BACKFILL] Service account env vars missing, attempting application default credentials (GOOGLE_APPLICATION_CREDENTIALS)');
  }
  // Fallback: ADC (requires GOOGLE_APPLICATION_CREDENTIALS or local gcloud auth application-default login)
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: FIREBASE_PROJECT_ID || undefined
  });
  console.log('[BACKFILL] Initialized Firebase Admin with application default credentials');
}

initAdmin();

const db = admin.firestore();

async function backfillCollection(col, fieldMap) {
  const snap = await db.collection(col).limit(5000).get(); // adjust or paginate if needed later
  let updated = 0;
  const batchSize = 400;
  let batch = db.batch();
  let ops = 0;
  for (const doc of snap.docs) {
    const data = doc.data();
    const updates = {};
    for (const [original, lowerField] of fieldMap) {
      if (data[original] && typeof data[original] === 'string' && !data[lowerField]) {
        updates[lowerField] = data[original].toLowerCase();
      }
    }
    if (Object.keys(updates).length) {
      batch.update(doc.ref, updates);
      ops++; updated++;
      if (ops >= batchSize) { await batch.commit(); batch = db.batch(); ops = 0; }
    }
  }
  if (ops) await batch.commit();
  console.log(`[BACKFILL] ${col}: updated ${updated} docs`);
}

async function run() {
  console.log('[BACKFILL] Starting lowercase field population');
  await backfillCollection('forumPosts', [ ['title','titleLower'], ['authorDisplayName','authorDisplayNameLower'] ]);
  await backfillCollection('forumComments', [ ['content','contentLower'], ['authorDisplayName','authorDisplayNameLower'] ]);
  await backfillCollection('users', [ ['displayName','displayNameLower'] ]);
  await backfillCollection('notifications', [ ['title','titleLower'] ]);
  // Reports enrichment (reporterDisplayNameLower / targetDisplayNameLower) if added later
  await backfillCollection('forumReports', [
    ['reporterDisplayName','reporterDisplayNameLower'],
    ['targetDisplayName','targetDisplayNameLower'],
    ['reason','reasonLower'],
    ['contentSnippet','contentSnippetLower']
  ]);
  console.log('[BACKFILL] Complete');
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
