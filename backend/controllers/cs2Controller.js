import asyncHandler from '../middleware/asyncHandler.js';
import axios from 'axios';
import path from 'path';
import steamService from '../services/steamService.js';

// @desc    Get CS2 player stats
// @route   GET /api/cs2/player/:steamId
// @access  Public
export const getPlayerStats = asyncHandler(async (req, res) => {
  // This is a placeholder. In a real application, you would integrate with a CS2 API
  // like Steam Web API or a third-party CS2 stats API.
  // For now, we'll return mock data or an error.
  const { steamId } = req.params;

  // Example of mock data structure, replace with actual API calls
  const mockPlayerStats = {
  steamId: steamId,
  personaName: `CS2 Player ${steamId}`,
  kdRatio: +(Math.random() * 2 + 0.5).toFixed(2), // note the +
  winRate: +(Math.random() * 100).toFixed(2),
  headshotPercentage: +(Math.random() * 50 + 20).toFixed(2),
  totalKills: Math.floor(Math.random() * 100000),
  totalDeaths: Math.floor(Math.random() * 80000),
  totalMatches: Math.floor(Math.random() * 1000)
};

  if (steamId) {
    res.status(200).json(mockPlayerStats);
  } else {
    res.status(400).json({ message: 'Please provide a Steam ID' });
  }
});

// @desc    Get CS2 player matches
// @route   GET /api/cs2/player/:steamId/matches
// @access  Public
export const getPlayerMatches = asyncHandler(async (req, res) => {
  const { steamId } = req.params;
  const { limit = 20 } = req.query;

  const mockMatches = Array.from({ length: parseInt(limit) }).map((_, i) => ({
    matchId: `match_${steamId}_${i}`,
    mapName: ['Dust II', 'Mirage', 'Inferno', 'Nuke', 'Vertigo'][Math.floor(Math.random() * 5)],
    result: Math.random() > 0.5 ? 'Win' : 'Loss',
    kills: Math.floor(Math.random() * 40),
    deaths: Math.floor(Math.random() * 30),
    assists: Math.floor(Math.random() * 20),
  }));

  if (steamId) {
    res.status(200).json(mockMatches);
  } else {
    res.status(400).json({ message: 'Please provide a Steam ID' });
  }
});

// @desc    Get CS2 player weapon stats
// @route   GET /api/cs2/player/:steamId/weapons
// @access  Public
export const getPlayerWeapons = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  const mockWeapons = [
    { weaponName: 'AK-47', kills: Math.floor(Math.random() * 5000), headshotPercentage: (Math.random() * 60 + 20).toFixed(2) },
    { weaponName: 'M4A4', kills: Math.floor(Math.random() * 4500), headshotPercentage: (Math.random() * 55 + 20).toFixed(2) },
    { weaponName: 'AWP', kills: Math.floor(Math.random() * 3000), headshotPercentage: (Math.random() * 70 + 10).toFixed(2) },
    { weaponName: 'Glock-18', kills: Math.floor(Math.random() * 2000), headshotPercentage: (Math.random() * 40 + 30).toFixed(2) },
    { weaponName: 'USP-S', kills: Math.floor(Math.random() * 1800), headshotPercentage: (Math.random() * 45 + 30).toFixed(2) },
  ];

  if (steamId) {
    res.status(200).json(mockWeapons);
  } else {
    res.status(400).json({ message: 'Please provide a Steam ID' });
  }
});

// @desc    Get CS2 player map stats
// @route   GET /api/cs2/player/:steamId/maps
// @access  Public
export const getPlayerMaps = asyncHandler(async (req, res) => {
  const { steamId } = req.params;

  const mockMaps = [
    { mapName: 'Dust II', wins: Math.floor(Math.random() * 100), losses: Math.floor(Math.random() * 80), winRate: (Math.random() * 100).toFixed(2) },
    { mapName: 'Mirage', wins: Math.floor(Math.random() * 90), losses: Math.floor(Math.random() * 70), winRate: (Math.random() * 100).toFixed(2) },
    { mapName: 'Inferno', wins: Math.floor(Math.random() * 80), losses: Math.floor(Math.random() * 60), winRate: (Math.random() * 100).toFixed(2) },
    { mapName: 'Nuke', wins: Math.floor(Math.random() * 70), losses: Math.floor(Math.random() * 50), winRate: (Math.random() * 100).toFixed(2) },
    { mapName: 'Vertigo', wins: Math.floor(Math.random() * 60), losses: Math.floor(Math.random() * 40), winRate: (Math.random() * 100).toFixed(2) },
  ];

  if (steamId) {
    res.status(200).json(mockMaps);
  } else {
    res.status(400).json({ message: 'Please provide a Steam ID' });
  }
});

