import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import dotenv from 'dotenv';
import firebaseService from '../services/firebaseService.js';

dotenv.config();

const STEAM_API_KEY = process.env.STEAM_API_KEY;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

if (!STEAM_API_KEY) {
  console.error('STEAM_API_KEY is not set in environment variables');
  process.exit(1);
}

console.log('Base URL for auth callback:', BASE_URL);

passport.serializeUser((user, done) => {
  try {
    console.log('Serializing user:', user.id || 'unknown');
    done(null, user);
  } catch (error) {
    console.error('Error serializing user:', error);
    done(error, null);
  }
});

passport.deserializeUser((user, done) => {
  try {
    console.log('Deserializing user:', user.id || 'unknown');
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

const steamStrategy = new SteamStrategy({
    returnURL: `${BASE_URL}/auth/steam/return`,
    realm: BASE_URL,
    apiKey: STEAM_API_KEY,
    passReqToCallback: true
  },
  function(req, identifier, profile, done) {
    process.nextTick(async function () {
      try {
        console.log('Steam profile received:', profile.displayName || profile.id);

        // Normalize steamId
        profile.identifier = identifier;
        profile.steamId = profile.id;

        // Attempt to persist/update user record so displayName is always available
        try {
          const avatar = Array.isArray(profile.photos) && profile.photos.length ? profile.photos[profile.photos.length - 1].value : null;
          await firebaseService.createOrUpdateUser(profile.steamId, {
            displayName: profile.displayName || 'Unknown Player',
            avatar,
            profileUrl: profile._json?.profileurl || null
          });
        } catch (persistErr) {
          console.warn('[AUTH] Failed to upsert user profile during login:', persistErr?.message || persistErr);
        }

        return done(null, profile);
      } catch (error) {
        console.error('Error in Steam strategy callback:', error);
        return done(error);
      }
    });
  }
);

// Add error handling to the strategy
steamStrategy.error = function(err) {
  console.error('Steam Strategy Error:', err);
};

passport.use(steamStrategy);


export default passport; 