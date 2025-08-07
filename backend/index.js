import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import dotaRoutes from './routes/dotaRoutes.js';
import cs2Routes from './routes/cs2Routes.js';
import cacheRoutes from './routes/cacheRoutes.js';

console.log('Routes loaded:', {
  dotaRoutes: typeof dotaRoutes,
  cs2Routes: typeof cs2Routes,
  cacheRoutes: typeof cacheRoutes
});
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { loadHeroMap } from './utils/dotaUtils.js';
import session from 'express-session';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';

// Load environment variables from .env file
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  
  // Try to load from absolute path
  const envPath = path.resolve(process.cwd(), '.env');
  console.log('Trying to load .env from:', envPath);
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('Found .env file with content length:', envContent.length);
    
    // Manually parse and set environment variables
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (err) {
    console.error('Failed to read .env file:', err.message);
  }
}

// Display available environment variables for debugging
// console.log('Environment variables loaded:');
// console.log('PORT:', process.env.PORT);
// console.log('STEAM_API_KEY exists:', !!process.env.STEAM_API_KEY);
// console.log('STEAM_API_KEY length:', process.env.STEAM_API_KEY?.length);
// console.log('SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
// console.log('BASE_URL:', process.env.BASE_URL);

const app = express();
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await loadHeroMap();

//middleware
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // For images and static content with client-side caching
  app.use(express.static(path.join(process.cwd(), 'public'), {
    maxAge: '1d', // Cache for 1 day
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        // HTML files should not be cached as they may contain dynamic content
        res.setHeader('Cache-Control', 'no-store');
      } else {
        // Static assets can be cached aggressively
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      }
    }
  }));
app.use(express.json({ limit: '300mb' }));
app.use(express.urlencoded({ extended: true, limit: '300mb' }));

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      sameSite: 'lax'
    },
    name: 'steamvault.sid'
  }));

  // Initialize Passport but don't apply middleware globally
  app.use(passport.initialize());
  app.use(passport.session());

app.use('/api/dota2', dotaRoutes);
  app.use('/api/cs2', (req, res, next) => {
    console.log('CS2 route middleware hit:', req.method, req.originalUrl);
    next();
  }, cs2Routes);
  app.use('/api/cache', cacheRoutes);
  app.use('/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('SteamVault backend is running');
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);
});
};

startServer();