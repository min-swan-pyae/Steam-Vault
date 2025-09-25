# Steam Vault Backend

Professional gaming statistics backend API built with Node.js, Express, Firebase, and Steam Web API.

## 🚀 Features
- RESTful API for CS2 and Dota 2 stats
- Real-time Game State Integration (GSI)
- Marketplace endpoints (search, trending, price, watchlist, alerts)
- Community forums (categories, posts, comments, moderation)
- Notification system (in-app and email)
- Gmail integration for advanced notifications
 - Gmail integration for advanced notifications
 - Data export and notification preferences endpoints
- Intelligent multi-layer caching
- Authentication via Steam OAuth

## 🛠️ Technology Stack
- Node.js, Express.js
- Firebase Admin SDK
- Passport.js
- Steam Web API
- Axios, Express Rate Limit, Helmet

## 📁 Project Structure
```
backend/
  config/           # Passport, feature flags
  controllers/      # Route controllers (CS2, Dota, Market, Player, Forum, etc.)
  data/             # Static data
  middleware/       # Async/error handling
  mock/             # Sample data
  routes/           # API routes
  scripts/          # Utility scripts (Firebase indexes)
  services/         # Business logic (Steam, Firebase, Cache, Demo Parsing)
  uploads/          # Demo files
  utils/            # Helper functions
  index.js          # App entry point
  package.json      # Dependencies
```

## 🗄️ Database Schema (Summary)
See [`docs/DATABASE_SCHEMA.md`](../docs/DATABASE_SCHEMA.md) for full details.
- users, userProfiles, sessions, notifications, emailConnections
- marketWatchlists, priceAlerts
- forumCategories, forumPosts, forumComments, forumReports, userActivity
- matches, playerStats, weaponStats, mapStats, gsiConfigs, leaderboards, marketCache, systemSettings

## 🔗 API Endpoints (Key)
### Authentication
- `GET /auth/steam` - Steam OAuth login
- `GET /auth/steam/callback` - OAuth callback
- `GET /auth/logout` - Logout
- `GET /auth/user` - Current user info

### CS2
- `GET /api/cs2/player/:steamId/profile` - Player profile
- `GET /api/cs2/player/:steamId/stats` - Player stats
- `GET /api/cs2/player/:steamId/matches` - Match history
- `GET /api/cs2/player/:steamId/weapons` - Weapon stats
- `GET /api/cs2/player/:steamId/maps` - Map stats
- `GET /api/cs2/leaderboard` - Leaderboard
- `GET /api/cs2/search` - Player search
- `GET /api/cs2/activity` - Recent activity
- `POST /api/cs2/gsi/:steamId` - GSI endpoint

### Dota 2
- `GET /api/dota/player/:steamId/profile` - Player profile
- `GET /api/dota/player/:steamId/matches` - Match history
- `GET /api/dota/player/:steamId/heroes` - Hero stats
- `GET /api/dota/meta` - Meta analysis

### Marketplace
- `GET /api/market/categories` - Item categories
- `GET /api/market/trending` - Trending items
- `GET /api/market/search` - Search items
- `GET /api/market/search/bulk` - Bulk search
- `GET /api/market/price` - Item price
- `GET /api/market/price/history` - Price history
- `GET /api/market/details` - Item details
- `GET /api/market/watchlist/:steamId` - Get watchlist
- `POST /api/market/watchlist/:steamId` - Upsert watchlist item
- `DELETE /api/market/watchlist/:steamId/:id` - Delete watchlist item

### Notifications & Gmail
- `GET /api/notifications/:steamId` - Get notifications
- `POST /api/notifications/:steamId` - Create notification
- `POST /api/email/connect` - Connect Gmail
- `POST /api/email/verify` - Verify Gmail
 - `GET /api/users/export` - Export current user's data (auth)
 - `POST /api/users/preferences` - Save notification preferences (auth)

### Forums
- `GET /api/forum/categories` - Get categories
- `GET /api/forum/posts` - Get posts
- `POST /api/forum/posts` - Create post
- `POST /api/forum/comments` - Add comment
- `POST /api/forum/reports` - Report content

## ⚙️ Configuration
- Caching: Steam API (30-60min), User stats (10min), Leaderboards (10min), Activity (2min)
- Rate limiting: Steam API, user requests, search endpoints
- Error handling: Custom error classes, async wrapper, logging

## 🔒 Security & Privacy
- Steam OAuth authentication
- Gmail integration (optional)
- User privacy controls
- Content moderation
- Secure Firebase rules

## 🧪 Testing
- `npm test` for backend tests
- Mock data for development

## ☁️ Deployment
- Production config: `NODE_ENV=production`, `PORT=3000`, etc.
 - Public URLs: `BACKEND_PUBLIC_URL` for email links, `FRONTEND_URL` for return link
- Firebase Firestore collections and indexes (see docs)
- Monitoring: performance, error tracking, API analytics

## 📝 Contributing
- Fork, branch, install, set env, develop, test, PR
- Follow code style, write tests, update docs

---

**Backend maintained with ❤️ using Node.js best practices**
