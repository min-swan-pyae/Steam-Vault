import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dotaService } from '../../services/dotaService';

// Async thunk for fetching hero performance statistics
export const fetchHeroStats = createAsyncThunk(
  'stats/fetchHeroStats',
  async (steamId) => {
    const response = await dotaService.getHeroPerformance(steamId);
    return response || [];
  }
);

// Async thunk for fetching playtime trends
export const fetchPlaytimeTrends = createAsyncThunk(
  'stats/fetchPlaytimeTrends',
  async (steamId) => {
    const response = await dotaService.getPlaytimeTrends(steamId);
    return response || [];
  }
);

// Async thunk for fetching player behavior metrics
export const fetchBehaviorMetrics = createAsyncThunk(
  'stats/fetchBehaviorMetrics',
  async (steamId) => {
    const response = await dotaService.getBehaviorMetrics(steamId);
    return response || {
      behavior_score: 0,
      commends: 0,
      reports: 0,
      abandons: 0
    };
  }
);

// Async thunk for fetching Steam profile data
export const fetchSteamProfile = createAsyncThunk(
  'stats/fetchSteamProfile',
  async (steamId) => {
    const response = await dotaService.getPlayerStats(steamId);
    return response || {};
  }
);

// Async thunk for fetching player performance summary
export const fetchPlayerPerformanceSummary = createAsyncThunk(
  'stats/fetchPlayerPerformanceSummary',
  async (steamId) => {
    const response = await dotaService.getPlayerPerformanceSummary(steamId);
    return response || {
      player_info: { steamId, personaname: 'Unknown Player' },
      overall_stats: {},
      recent_performance: [],
      hero_performance: [],
      match_impact: {},
      progression: {}
    };
  }
);

// Async thunk for fetching detailed hero stats
export const fetchDetailedHeroStats = createAsyncThunk(
  'stats/fetchDetailedHeroStats',
  async ({ steamId, heroId }) => {
    const response = await dotaService.getDetailedHeroStats(steamId, heroId);
    return response || {
      hero_id: heroId,
      total_matches: 0,
      wins: 0,
      losses: 0,
      win_rate: '0%',
      averages: {},
      item_usage: [],
      lane_preference: [],
      matchups: [],
      recent_matches: []
    };
  }
);

// Async thunk for fetching enhanced meta analysis
export const fetchEnhancedMetaAnalysis = createAsyncThunk(
  'stats/fetchEnhancedMetaAnalysis',
  async () => {
    const response = await dotaService.getEnhancedMetaAnalysis();
    return response || {
      heroes: [],
      meta_trends: {},
      last_updated: new Date().toISOString()
    };
  }
);

const initialState = {
  heroStats: {
    data: [],
    status: 'idle',
    error: null
  },
  playtimeTrends: {
    data: [],
    status: 'idle',
    error: null
  },
  behaviorMetrics: {
    data: null,
    status: 'idle',
    error: null
  },
  steamProfile: {
    data: null,
    status: 'idle',
    error: null
  },
  performanceSummary: {
    data: null,
    status: 'idle',
    error: null
  },
  detailedHeroStats: {
    data: null,
    status: 'idle',
    error: null,
    currentHeroId: null
  },
  enhancedMetaAnalysis: {
    data: null,
    status: 'idle',
    error: null
  }
};

export const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Hero Stats
      .addCase(fetchHeroStats.pending, (state) => {
        state.heroStats.status = 'loading';
      })
      .addCase(fetchHeroStats.fulfilled, (state, action) => {
        state.heroStats.status = 'succeeded';
        state.heroStats.data = action.payload;
        state.heroStats.error = null;
      })
      .addCase(fetchHeroStats.rejected, (state, action) => {
        state.heroStats.status = 'failed';
        state.heroStats.error = action.error.message;
      })
      // Playtime Trends
      .addCase(fetchPlaytimeTrends.pending, (state) => {
        state.playtimeTrends.status = 'loading';
      })
      .addCase(fetchPlaytimeTrends.fulfilled, (state, action) => {
        state.playtimeTrends.status = 'succeeded';
        state.playtimeTrends.data = action.payload;
        state.playtimeTrends.error = null;
      })
      .addCase(fetchPlaytimeTrends.rejected, (state, action) => {
        state.playtimeTrends.status = 'failed';
        state.playtimeTrends.error = action.error.message;
      })
      // Behavior Metrics
      .addCase(fetchBehaviorMetrics.pending, (state) => {
        state.behaviorMetrics.status = 'loading';
      })
      .addCase(fetchBehaviorMetrics.fulfilled, (state, action) => {
        state.behaviorMetrics.status = 'succeeded';
        state.behaviorMetrics.data = action.payload;
        state.behaviorMetrics.error = null;
      })
      .addCase(fetchBehaviorMetrics.rejected, (state, action) => {
        state.behaviorMetrics.status = 'failed';
        state.behaviorMetrics.error = action.error.message;
      })
      // Steam Profile
      .addCase(fetchSteamProfile.pending, (state) => {
        state.steamProfile.status = 'loading';
      })
      .addCase(fetchSteamProfile.fulfilled, (state, action) => {
        state.steamProfile.status = 'succeeded';
        state.steamProfile.data = action.payload;
        state.steamProfile.error = null;
      })
      .addCase(fetchSteamProfile.rejected, (state, action) => {
        state.steamProfile.status = 'failed';
        state.steamProfile.error = action.error.message;
      })
      // Performance Summary
      .addCase(fetchPlayerPerformanceSummary.pending, (state) => {
        state.performanceSummary.status = 'loading';
      })
      .addCase(fetchPlayerPerformanceSummary.fulfilled, (state, action) => {
        state.performanceSummary.status = 'succeeded';
        state.performanceSummary.data = action.payload;
        state.performanceSummary.error = null;
      })
      .addCase(fetchPlayerPerformanceSummary.rejected, (state, action) => {
        state.performanceSummary.status = 'failed';
        state.performanceSummary.error = action.error.message;
      })
      // Detailed Hero Stats
      .addCase(fetchDetailedHeroStats.pending, (state, action) => {
        state.detailedHeroStats.status = 'loading';
        // Store the hero ID we're currently loading
        if (action.meta.arg.heroId) {
          state.detailedHeroStats.currentHeroId = action.meta.arg.heroId;
        }
      })
      .addCase(fetchDetailedHeroStats.fulfilled, (state, action) => {
        state.detailedHeroStats.status = 'succeeded';
        state.detailedHeroStats.data = action.payload;
        state.detailedHeroStats.error = null;
      })
      .addCase(fetchDetailedHeroStats.rejected, (state, action) => {
        state.detailedHeroStats.status = 'failed';
        state.detailedHeroStats.error = action.error.message;
      })
      // Enhanced Meta Analysis
      .addCase(fetchEnhancedMetaAnalysis.pending, (state) => {
        state.enhancedMetaAnalysis.status = 'loading';
      })
      .addCase(fetchEnhancedMetaAnalysis.fulfilled, (state, action) => {
        state.enhancedMetaAnalysis.status = 'succeeded';
        state.enhancedMetaAnalysis.data = action.payload;
        state.enhancedMetaAnalysis.error = null;
      })
      .addCase(fetchEnhancedMetaAnalysis.rejected, (state, action) => {
        state.enhancedMetaAnalysis.status = 'failed';
        state.enhancedMetaAnalysis.error = action.error.message;
      });
  }
});

export default statsSlice.reducer;