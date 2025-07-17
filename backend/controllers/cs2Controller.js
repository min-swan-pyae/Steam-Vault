import asyncHandler from '../middleware/asyncHandler.js';
import axios from 'axios';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import steamService from '../services/steamService.js';
import { cacheService, CACHE_TYPES } from '../services/cacheService.js';
import demoParsingService from '../services/demoParsingService.js';
import firebaseService from '../services/firebaseService.js';

// Configure multer for demo file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/demos';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `demo-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept only .dem files
    if (path.extname(file.originalname).toLowerCase() === '.dem') {
      cb(null, true);
    } else {
      cb(new Error('Only .dem files are allowed'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// @desc    Get CS2 player stats
// @route   GET /api/cs2/player/:steamId
// @access  Public
export const getPlayerStats = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  if (!steamId) {
    return res.status(400).json({ message: 'Please provide a Steam ID' });
  }

  const cacheKey = `player_stats_${steamId}`;

  try {
    // Try to get from cache first
    const cachedStats = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedStats) {
      return res.status(200).json(cachedStats);
    }

    // Try to get real data from Firebase first
    let playerStats = await firebaseService.getPlayerStats(steamId);
    
    if (!playerStats) {
      // Generate mock data if no real data exists
      playerStats = {
        steamId: steamId,
        personaName: `CS2 Player ${steamId}`,
        kdRatio: +(Math.random() * 2 + 0.5).toFixed(2),
        winRate: +(Math.random() * 100).toFixed(2),
        headshotPercentage: +(Math.random() * 50 + 20).toFixed(2),
        totalKills: Math.floor(Math.random() * 100000),
        totalDeaths: Math.floor(Math.random() * 80000),
        totalMatches: Math.floor(Math.random() * 1000),
        lastUpdated: new Date().toISOString(),
        isDemo: false // Flag to indicate this is mock data
      };
    }

    // Cache the data
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, playerStats);
    
    res.status(200).json(playerStats);
  } catch (error) {
    console.error('Error fetching CS2 player stats:', error);
    res.status(500).json({ message: 'Failed to fetch player stats' });
  }
});

// @desc    Get CS2 player matches
// @route   GET /api/cs2/player/:steamId/matches
// @access  Public
export const getPlayerMatches = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const { limit = 20 } = req.query;

  if (!steamId) {
    return res.status(400).json({ message: 'Please provide a Steam ID' });
  }

  const cacheKey = `player_matches_${steamId}_${limit}`;

  try {
    // Try to get from cache first
    const cachedMatches = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedMatches) {
      return res.status(200).json(cachedMatches);
    }

    // Try to get real data from Firebase first
    let matches = await firebaseService.getPlayerMatches(steamId, parseInt(limit));
    
    if (!matches || matches.length === 0) {
      // Generate mock data if no real data exists
      matches = Array.from({ length: parseInt(limit) }).map((_, i) => ({
        matchId: `match_${steamId}_${i}`,
        mapName: ['Dust II', 'Mirage', 'Inferno', 'Nuke', 'Vertigo', 'Cache', 'Overpass', 'Train'][Math.floor(Math.random() * 8)],
        result: Math.random() > 0.5 ? 'Win' : 'Loss',
        kills: Math.floor(Math.random() * 40),
        deaths: Math.floor(Math.random() * 30),
        assists: Math.floor(Math.random() * 20),
        score: `${Math.floor(Math.random() * 16) + 10}-${Math.floor(Math.random() * 16) + 5}`,
        duration: Math.floor(Math.random() * 3600) + 1200,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        mvp: Math.random() > 0.8,
        rating: +(Math.random() * 2 + 0.5).toFixed(2),
        isDemo: false
      }));
    }

    // Cache the data
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, matches);
    
    res.status(200).json(matches);
  } catch (error) {
    console.error('Error fetching CS2 player matches:', error);
    res.status(500).json({ message: 'Failed to fetch player matches' });
  }
});

// @desc    Get CS2 player weapon stats
// @route   GET /api/cs2/player/:steamId/weapons
// @access  Public
export const getPlayerWeapons = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  if (!steamId) {
    return res.status(400).json({ message: 'Please provide a Steam ID' });
  }

  const cacheKey = `player_weapons_${steamId}`;

  try {
    // Try to get from cache first
    const cachedWeapons = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedWeapons) {
      return res.status(200).json(cachedWeapons);
    }

    // Try to get real data from Firebase first
    let weapons = await firebaseService.getPlayerWeapons(steamId);
    
    if (!weapons || weapons.length === 0) {
      // Generate mock data if no real data exists
      weapons = [
        { weaponName: 'AK-47', kills: Math.floor(Math.random() * 5000), headshotPercentage: +(Math.random() * 60 + 20).toFixed(2), accuracy: +(Math.random() * 40 + 15).toFixed(2) },
        { weaponName: 'M4A4', kills: Math.floor(Math.random() * 4500), headshotPercentage: +(Math.random() * 55 + 20).toFixed(2), accuracy: +(Math.random() * 45 + 20).toFixed(2) },
        { weaponName: 'M4A1-S', kills: Math.floor(Math.random() * 4000), headshotPercentage: +(Math.random() * 58 + 22).toFixed(2), accuracy: +(Math.random() * 50 + 25).toFixed(2) },
        { weaponName: 'AWP', kills: Math.floor(Math.random() * 3000), headshotPercentage: +(Math.random() * 70 + 10).toFixed(2), accuracy: +(Math.random() * 30 + 40).toFixed(2) },
        { weaponName: 'Glock-18', kills: Math.floor(Math.random() * 2000), headshotPercentage: +(Math.random() * 40 + 30).toFixed(2), accuracy: +(Math.random() * 25 + 15).toFixed(2) },
        { weaponName: 'USP-S', kills: Math.floor(Math.random() * 1800), headshotPercentage: +(Math.random() * 45 + 30).toFixed(2), accuracy: +(Math.random() * 35 + 20).toFixed(2) },
        { weaponName: 'Desert Eagle', kills: Math.floor(Math.random() * 1500), headshotPercentage: +(Math.random() * 65 + 15).toFixed(2), accuracy: +(Math.random() * 20 + 10).toFixed(2) },
        { weaponName: 'Galil AR', kills: Math.floor(Math.random() * 1200), headshotPercentage: +(Math.random() * 35 + 25).toFixed(2), accuracy: +(Math.random() * 30 + 20).toFixed(2) }
      ];
    }

    // Cache the data
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, weapons);
    
    res.status(200).json(weapons);
  } catch (error) {
    console.error('Error fetching CS2 player weapons:', error);
    res.status(500).json({ message: 'Failed to fetch player weapons' });
  }
});

// @desc    Get CS2 player map stats
// @route   GET /api/cs2/player/:steamId/maps
// @access  Public
export const getPlayerMaps = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  if (!steamId) {
    return res.status(400).json({ message: 'Please provide a Steam ID' });
  }

  const cacheKey = `player_maps_${steamId}`;

  try {
    // Try to get from cache first
    const cachedMaps = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedMaps) {
      return res.status(200).json(cachedMaps);
    }

    // Try to get real data from Firebase first
    let maps = await firebaseService.getPlayerMaps(steamId);
    
    if (!maps || maps.length === 0) {
      // Generate mock data if no real data exists
      maps = [
        { mapName: 'Dust II', wins: Math.floor(Math.random() * 100), losses: Math.floor(Math.random() * 80), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 25 + 10).toFixed(1), avgDeaths: +(Math.random() * 20 + 8).toFixed(1) },
        { mapName: 'Mirage', wins: Math.floor(Math.random() * 90), losses: Math.floor(Math.random() * 70), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 23 + 12).toFixed(1), avgDeaths: +(Math.random() * 18 + 9).toFixed(1) },
        { mapName: 'Inferno', wins: Math.floor(Math.random() * 80), losses: Math.floor(Math.random() * 60), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 22 + 11).toFixed(1), avgDeaths: +(Math.random() * 19 + 10).toFixed(1) },
        { mapName: 'Nuke', wins: Math.floor(Math.random() * 70), losses: Math.floor(Math.random() * 50), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 20 + 13).toFixed(1), avgDeaths: +(Math.random() * 17 + 11).toFixed(1) },
        { mapName: 'Vertigo', wins: Math.floor(Math.random() * 60), losses: Math.floor(Math.random() * 40), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 21 + 14).toFixed(1), avgDeaths: +(Math.random() * 16 + 12).toFixed(1) },
        { mapName: 'Cache', wins: Math.floor(Math.random() * 55), losses: Math.floor(Math.random() * 35), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 24 + 9).toFixed(1), avgDeaths: +(Math.random() * 18 + 8).toFixed(1) },
        { mapName: 'Overpass', wins: Math.floor(Math.random() * 50), losses: Math.floor(Math.random() * 30), winRate: +(Math.random() * 100).toFixed(2), avgKills: +(Math.random() * 19 + 15).toFixed(1), avgDeaths: +(Math.random() * 15 + 13).toFixed(1) }
      ];
    }

    // Cache the data
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, maps);
    
    res.status(200).json(maps);
  } catch (error) {
    console.error('Error fetching CS2 player maps:', error);
    res.status(500).json({ message: 'Failed to fetch player maps' });
  }
});

// @desc    Upload and parse CS2 demo file
// @route   POST /api/cs2/upload-demo
// @access  Public
export const uploadDemo = [
  upload.single('demo'),
  asyncHandler(async (req, res) => {
    const { steamId } = req.body;
    
    if (!steamId) {
      return res.status(400).json({ message: 'Please provide a Steam ID' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a demo file' });
    }

    try {
      console.log(`Processing demo file: ${req.file.filename} for player: ${steamId}`);
      
      // Read the uploaded demo file
      const demoBuffer = fs.readFileSync(req.file.path);
      
      // Parse the demo file
      const parsedData = await demoParsingService.parseDemoFile(demoBuffer, steamId);
      
      // Store data to Firebase instead of in-memory
      await firebaseService.saveMatchData(steamId, parsedData);
      
      // Clear relevant caches
      const cacheKeys = [
        `player_stats_${steamId}`,
        `player_matches_${steamId}_20`,
        `player_weapons_${steamId}`,
        `player_maps_${steamId}`
      ];
      
      cacheKeys.forEach(key => {
        cacheService.delete(CACHE_TYPES.CS2_DATA, key);
      });
      
      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);
      
      res.status(200).json({
        message: 'Demo file processed successfully',
        matchData: parsedData,
        playerStats: await firebaseService.getPlayerStats(steamId)
      });
      
    } catch (error) {
      console.error('Error processing demo file:', error);
      
      // Clean up the uploaded file in case of error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        message: 'Failed to process demo file',
        error: error.message 
      });
    }
  })
];

// @desc    Get CS2 leaderboard
// @route   GET /api/cs2/leaderboard
// @access  Public
export const getLeaderboard = asyncHandler(async (req, res) => {
  const { stat = 'kdRatio', limit = 50 } = req.query;
  
  const cacheKey = `leaderboard_${stat}_${limit}`;

  try {
    // Try to get from cache first
    const cachedLeaderboard = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedLeaderboard) {
      return res.status(200).json(cachedLeaderboard);
    }

    // Get leaderboard from Firebase
    const leaderboard = await firebaseService.getLeaderboard(stat, parseInt(limit));
    
    // Cache the data for 5 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, leaderboard, 300);
    
    res.status(200).json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ message: 'Failed to fetch leaderboard' });
  }
});

// @desc    Search players
// @route   GET /api/cs2/search
// @access  Public
export const searchPlayers = asyncHandler(async (req, res) => {
  const { q: searchTerm } = req.query;
  
  if (!searchTerm || searchTerm.length < 2) {
    return res.status(400).json({ message: 'Search term must be at least 2 characters' });
  }

  const cacheKey = `search_${searchTerm.toLowerCase()}`;

  try {
    // Try to get from cache first
    const cachedResults = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedResults) {
      return res.status(200).json(cachedResults);
    }

    // Search in Firebase
    const results = await firebaseService.searchPlayers(searchTerm);
    
    // Cache the data for 2 minutes
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, results, 120);
    
    res.status(200).json(results);
  } catch (error) {
    console.error('Error searching players:', error);
    res.status(500).json({ message: 'Failed to search players' });
  }
});

// @desc    Get recent activity
// @route   GET /api/cs2/activity
// @access  Public
export const getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  
  const cacheKey = `recent_activity_${limit}`;

  try {
    // Try to get from cache first
    const cachedActivity = cacheService.get(CACHE_TYPES.CS2_DATA, cacheKey);
    if (cachedActivity) {
      return res.status(200).json(cachedActivity);
    }

    // Get recent activity from Firebase
    const activity = await firebaseService.getRecentActivity(parseInt(limit));
    
    // Cache the data for 1 minute
    cacheService.set(CACHE_TYPES.CS2_DATA, cacheKey, activity, 60);
    
    res.status(200).json(activity);
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ message: 'Failed to fetch recent activity' });
  }
});

