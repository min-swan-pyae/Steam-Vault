import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from '../features/auth/authSlice';
import statsReducer from '../features/stats/statsSlice';
import { steamVaultApi } from '../features/api/steamVaultApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    stats: statsReducer,
    // Add the generated reducer as a specific top-level slice
    [steamVaultApi.reducerPath]: steamVaultApi.reducer,
  },
  // Adding the api middleware enables caching, invalidation, polling,
  // and other useful features of `rtk-query`.
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [steamVaultApi.util.resetApiState.type],
      },
    }).concat(steamVaultApi.middleware),
});

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
// See `setupListeners` docs - takes an optional callback as the 2nd arg for customization
setupListeners(store.dispatch);