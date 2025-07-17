import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  updateProfile,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs 
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';

class FirebaseAuthService {
  constructor() {
    this.currentUser = null;
    this.authStateListeners = [];
    
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      this.authStateListeners.forEach(listener => listener(user));
    });
  }

  // Authentication methods
  async signUp(email, password, displayName, steamId) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update profile with display name
      await updateProfile(user, {
        displayName: displayName
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        steamId: steamId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return { success: true, user };
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: error.message };
    }
  }

  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  }

  // User data methods
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  async updateUserData(uid, data) {
    try {
      await setDoc(doc(db, 'users', uid), {
        ...data,
        updatedAt: new Date()
      }, { merge: true });
      return { success: true };
    } catch (error) {
      console.error('Error updating user data:', error);
      return { success: false, error: error.message };
    }
  }

  // CS2 Data methods
  async getUserMatches(uid, limitCount = 20) {
    try {
      const matchesQuery = query(
        collection(db, 'matches'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(matchesQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting user matches:', error);
      return [];
    }
  }

  async getUserStats(uid) {
    try {
      const statsDoc = await getDoc(doc(db, 'playerStats', uid));
      if (statsDoc.exists()) {
        return statsDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  async getUserWeaponStats(uid) {
    try {
      const weaponsQuery = query(
        collection(db, 'weaponStats'),
        where('userId', '==', uid),
        orderBy('kills', 'desc')
      );
      
      const snapshot = await getDocs(weaponsQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting weapon stats:', error);
      return [];
    }
  }

  async getUserMapStats(uid) {
    try {
      const mapsQuery = query(
        collection(db, 'mapStats'),
        where('userId', '==', uid),
        orderBy('matches', 'desc')
      );
      
      const snapshot = await getDocs(mapsQuery);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting map stats:', error);
      return [];
    }
  }

  // Real-time listeners
  subscribeToUserStats(uid, callback) {
    return onSnapshot(doc(db, 'playerStats', uid), callback);
  }

  subscribeToUserMatches(uid, callback, limitCount = 20) {
    const matchesQuery = query(
      collection(db, 'matches'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    return onSnapshot(matchesQuery, callback);
  }

  // Auth state listener
  onAuthStateChange(callback) {
    this.authStateListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.authStateListeners = this.authStateListeners.filter(
        listener => listener !== callback
      );
    };
  }

  // Current user getter
  getCurrentUser() {
    return this.currentUser;
  }

  isAuthenticated() {
    return !!this.currentUser;
  }
}

export const firebaseAuthService = new FirebaseAuthService();
export default firebaseAuthService;
