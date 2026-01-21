import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import dotenv from 'dotenv';
import dns from 'dns';
import fs from 'fs';
import path from 'path';

// Configure DNS to use Google DNS servers (fixes router DNS timeout issues)
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

import dotaRoutes from './routes/dotaRoutes.js';
import cs2Routes from './routes/cs2Routes.js';
import marketRoutes from './routes/marketRoutes.js';
import cacheRoutes from './routes/cacheRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import userRoutes from './routes/userRoutes.js';
import forumRoutes from './routes/forumRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import firebaseService from './services/firebaseService.js';
// Market trends & weekly digest removed
import sseRoutes from './routes/sseRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import { setCacheHeaders } from './middleware/cacheHeaders.js';
import { loadHeroMap, loadItemMap } from './utils/dotaUtils.js';
import { preWarmHeroImageCache } from './controllers/imageController.js';
import session from 'express-session';
import passport from './config/passport.js';
import authRoutes from './routes/auth.js';

// Load environment variables from .env file
const result = dotenv.config();
if (result.error) {
  console.error('Error loading .env file:', result.error.message);
  
  // Try to load from absolute path
  const envPath = path.resolve(process.cwd(), '.env');
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    
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

const app = express();
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await loadHeroMap();
  await loadItemMap();
  console.log('✅ Hero and Item maps loaded successfully');
  
  // Pre-warm hero image cache for instant first load
  preWarmHeroImageCache().catch(err => {
    console.error('⚠️ Image cache pre-warming failed (non-critical):', err.message);
  });

//middleware
  // Security headers (helmet) - relaxed for development
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for dev (frontend on different port)
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow cross-origin images
  }));

  // Gzip compression for all responses (reduces payload size by ~70%)
  app.use(compression({
    level: 6, // Industry standard default - good balance of speed and compression
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
      // Don't compress SSE streams
      if (req.path.includes('/stream')) return false;
      return compression.filter(req, res);
    }
  }));

  const localOriginPatterns = [
    /^http:\/\/localhost:517[0-9]$/,
    /^http:\/\/127\.0\.0\.1:517[0-9]$/
  ];
  const extraOrigins = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  const allowedOriginSet = new Set(extraOrigins);
  const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';

  const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (localOriginPatterns.some(re => re.test(origin))) return true;
    if (allowedOriginSet.has(origin)) return true;
    if (allowVercelPreviews) {
      try {
        const hostname = new URL(origin).hostname;
        if (hostname.endsWith('.vercel.app')) return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  app.use(cors({
    origin: (origin, callback) => callback(null, isAllowedOrigin(origin)),
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

  // HTTP cache headers for API responses
  app.use('/api', setCacheHeaders);

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
    next();
  }, cs2Routes);
  app.use('/api/market', marketRoutes);
  app.use('/api/cache', cacheRoutes);
  app.use('/api/email', emailRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/forum', (req, res, next) => {
    next();
  }, forumRoutes);
  app.get('/api/forum/_ping', (req, res) => res.json({ ok: true }));
  app.use('/api/notifications', notificationRoutes);
  // removed analyticsRoutes mount
  app.use('/api/notifications', sseRoutes); // /api/notifications/stream
  app.use('/auth', authRoutes);
  
  // Test and dev routes for development
  if (process.env.NODE_ENV !== 'production') {
    const testRoutes = await import('./routes/testRoutes.js');
    const devRoutes = await import('./routes/devRoutes.js');
    const moderationTestRoutes = await import('./routes/moderationTestRoutes.js');
    app.use('/api/test', testRoutes.default);
    app.use('/api/dev', devRoutes.default);
    app.use('/api/test/moderation', moderationTestRoutes.default);
  }

app.get('/', (req, res) => {
  res.send('SteamVault backend is running');
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Backend running at http://localhost:${PORT}`);

  // Start price alert scheduler (fetches prices + checks alerts)
  if (process.env.ENABLE_JOBS !== 'false') {
    import('./services/priceAlertScheduler.js').then(module => {
      const scheduler = module.default;
      scheduler.start();
    }).catch(e => console.error('[SCHEDULER] Failed to start:', e));
  }
});
};

startServer();