import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "steam-vault-dev.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "steam-vault-dev",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "steam-vault-dev.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with settings to work in offline mode gracefully
// Note: Most operations go through backend API. Firestore is only for legacy subscription methods.
// Direct Firestore access from frontend is minimal - backend handles all database operations.
let db;
try {
  db = getFirestore(app);
  console.log('[Firebase] Firestore initialized (used minimally - most data via backend API)');
} catch (error) {
  console.warn('[Firebase] Firestore initialization warning (expected - app uses backend API):', error.message);
  db = null;
}

export { db };
export default app;
