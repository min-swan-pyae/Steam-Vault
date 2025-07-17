# SteamVault

A comprehensive analytics platform for Dota 2 and CS2 players with marketplace monitoring and community features.

## Features

- **Dota 2 Analytics Dashboard**
  - Match history analysis
  - Hero performance statistics
  - Playtime trends
  - Player behavior metrics

- **CS2 Analytics Dashboard**
  - Map performance analysis
  - Weapon statistics
  - Playstyle evaluation
  - Match history tracking

- **Marketplace Monitoring**
  - Real-time price tracking
  - Price alerts
  - Market trend analysis
  - Item watchlist

- **Community Forum**
  - Game discussions
  - Market insights sharing
  - User profiles
  - Moderation tools

## Tech Stack

- **Frontend**: React.js with Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: Firebase
- **Authentication**: Steam OpenID + Firebase Auth
- **API**: Steam Web API, OpenDota API

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Firebase account
- Steam Web API key

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/min-swan-pyae/Steam-Vault.git
cd Steam-Vault
```

2. Install dependencies:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Configure environment variables:
- Create `.env` files in backend directory
  - Backend '.env'
    - PORT=3000
    - STEAM_API_KEY=
    - SESSION_SECRET=
    - BASE_URL=http://localhost:3000
    
- Add necessary API keys and configuration values

4. Start development servers:
```bash
# Start frontend (from frontend directory)
npm run dev

# Start backend (from backend directory)
npm start
```

## Project Structure

```
steamvault/
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API service calls & caching (apiCache.js, imageCache.js, backgroundRefresh.js, cacheManager.js)
│   │   ├── hooks/       # React hooks (useCache.js for cache management)
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
├── backend/              # Node.js/Express backend
│   ├── src/
│   │   ├── routes/      # API routes
│   │   ├── controllers/ # Route controllers
│   │   ├── services/    # Business logic
│   │   └── utils/       # Utility functions
│   └── config/          # Configuration files
└── docs/                # Documentation 
```

## Frontend Caching System

SteamVault features a comprehensive, multi-layered frontend caching system for maximum performance and offline resilience:

- **API Response Caching**: All API responses are cached in memory and localStorage/sessionStorage with LRU eviction and quota management (`src/services/apiCache.js`).
- **Redux/RTK Query Integration**: RTK Query is used for advanced data caching, invalidation, and prefetching (`src/features/api/steamVaultApi.js`, `src/app/store.js`).
- **Image Preloading & Caching**: Images are preloaded, optimized, and cached with lazy loading and smart batching (`src/services/imageCache.js`).
- **Background Data Refreshing**: Data is kept fresh in the background with configurable intervals and smart refresh logic (`src/services/backgroundRefresh.js`).
- **Cache-first Request Strategy**: All requests check cache first, then network, with automatic background refresh (`src/services/api.js`).
- **Central Cache Manager**: Coordinates all cache systems, provides performance metrics, and supports export/import (`src/services/cacheManager.js`).
- **React Hooks**: Easy-to-use hooks for cache management, API/image caching, and smart prefetching (`src/hooks/useCache.js`).
- **Cache Status Dashboard**: Real-time dashboard for monitoring cache health and performance (`src/components/CacheStatusDashboard.jsx`).

**Benefits:**
- 90%+ reduction in redundant API calls
- Instant loading for frequently accessed data and images
- Seamless offline experience with cache fallbacks
- Real-time cache monitoring and management

See the code in `src/services/`, `src/hooks/`, and `src/components/CacheStatusDashboard.jsx` for details.
