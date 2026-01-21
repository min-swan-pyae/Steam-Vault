# Steam Vault Backend

Professional gaming statistics backend API for CS2 and Dota 2, built with Node.js, Express, Firebase Firestore, and Steam Web API.

## 🚀 Features

### Core Functionality
- **RESTful API**: Comprehensive endpoints for CS2 and Dota 2 statistics
- **Steam Authentication**: Secure OAuth integration with Passport.js
- **Real-time GSI**: Counter-Strike 2 Game State Integration for live match data
- **Multi-layer Caching**: Intelligent caching with NodeCache and 9 specialized cache types (TTL: 1min - 30 days)
- **Request Queue**: Rate limiting and throttling with exponential backoff
- **Resilience Patterns**: Retry logic (3 attempts), conservative timeouts (5-10s), request deduplication

### CS2 Features
- Player profile and statistics
- Match history tracking
- Weapon and map performance analytics
- Community leaderboards
- Player search and recent activity
- Real-time GSI data processing

### Dota 2 Features
- Player statistics from OpenDota API
- Match history and detailed match analysis
- Hero performance metrics
- Behavior tracking and performance trends

### Marketplace
- Steam marketplace item search (standard and bulk)
- Real-time price data and historical charts
- Personal watchlist management (30 items per user limit)
- Price alert system with notifications (alertsEnabled field)
- Item category browsing

### Community & Forums
- Forum categories, posts, and comments
- Nested comment replies
- Content reporting system
- **Automatic Moderation**: Report-based escalation (5/10/15 reports)
- **Admin Tools**: Hard delete with cascade, bulk operations, user suspensions
- **Pagination Support**: Efficient data loading for large datasets

### Notification System
- In-app notifications (price alerts, forum activity, moderation)
- Gmail integration for email notifications
- Server-Sent Events (SSE) for real-time updates
- Customizable notification preferences
- Batch operations for marking notifications as read

### User Management
- User profiles with extended settings
- Privacy controls for statistics and watchlists
- Data export (GDPR compliance)
- Email connection management
- Notification preference configuration

## 🛠️ Technology Stack

- **Node.js** with **Express.js 5**
- **Firebase Admin SDK** for Firestore database
- **Passport.js** with Steam OAuth strategy
- **Axios** for external API requests (Steam, OpenDota)
- **NodeCache** for in-memory caching
- **Nodemailer** for email functionality
- **Google APIs** for Gmail integration
- **Express Session** for session management
- **CORS** for cross-origin resource sharing


## 🗄️ Database Schema

Firebase Firestore with **15 active collections**.

### Core Collections (15)
1. **users** - Steam OAuth user profiles with moderation status
2. **userProfiles** - Extended profiles (email, preferences, privacy)
3. **notifications** - User notification queue
4. **emailConnections** - Gmail OAuth connections
5. **marketWatchlists** - User marketplace watchlists
6. **forumCategories** - Forum category definitions
7. **forumPosts** - Community forum posts
8. **forumComments** - Post comments (supports nesting)
9. **forumReports** - Content moderation reports
10. **userActivity** - Forum participation tracking
11. **matches** - CS2 match data (from GSI)
12. **playerStats** - CS2 aggregated player statistics
13. **weaponStats** - CS2 weapon-specific statistics
14. **mapStats** - CS2 map-specific statistics
15. **gsiSessions** - CS2 GSI ephemeral session data

**Key Features**:
- Composite indexes for efficient queries
- Lowercase search fields for case-insensitive search
- Hard delete with cascading cleanup
- Automatic report escalation
- Count aggregation for admin dashboard


### 🔐 Authentication (`/auth`)
```
GET  /auth/steam              # Initiate Steam OAuth login
GET  /auth/steam/return       # OAuth callback URL
GET  /auth/user               # Get current authenticated user
GET  /auth/logout             # Logout and destroy session
```

### 🔫 CS2 Endpoints (`/api/cs2`)
```
# Player Data
GET  /player/:steamId/profile # Complete player profile
GET  /player/:steamId/stats   # Aggregated player statistics
GET  /player/:steamId/matches # Match history with pagination
GET  /player/:steamId/weapons # Weapon performance stats
GET  /player/:steamId/maps    # Map-specific statistics

# Community
GET  /leaderboard             # CS2 leaderboards (multiple categories)
GET  /search                  # Search players by name or Steam ID
GET  /activity                # Recent community activity feed

# Game State Integration
POST /gsi/:steamId            # Receive GSI data from CS2 client
GET  /gsi/:steamId            # Get current GSI session data
GET  /gsi-test/:steamId       # Test GSI configuration
```

### 🎯 Dota 2 Endpoints (`/api/dota2`)
```
# Player Data
GET  /player/:steamId/stats               # Player statistics and totals
GET  /player/:steamId/heroes              # Hero performance data
GET  /player/:steamId/playtime            # Playtime trends
GET  /player/:steamId/behavior            # Behavior score metrics
GET  /player/:steamId/performance-summary # Comprehensive performance
GET  /player/:steamId/hero/:heroId/detailed-stats  # Per-hero deep dive
GET  /player/lookup/:id                   # Lookup player by account ID

# Match Data
GET  /match-history/:accountId            # Match history (OpenDota)
GET  /match/:matchId                      # Detailed match information

# Meta & Heroes
GET  /meta                                # Current meta statistics
GET  /meta/enhanced                       # Enhanced meta analysis with recommendations
GET  /heroes/stats                        # All hero statistics
GET  /heroes/image/:heroId                # Hero image (cached)

# Pro Scene
GET  /pro-players/live                    # Live pro player matches
```

### 💰 Marketplace (`/api/market`)
```
# Item Search & Data
GET  /categories              # Available item categories
GET  /trending                # Trending marketplace items
GET  /search                  # Search items (query, filters)
GET  /search/bulk             # Bulk search multiple items
GET  /price                   # Current item price
GET  /price/history           # Historical price data
GET  /details                 # Detailed item information

# User Watchlist (Auth Required)
GET    /watchlist/:steamId          # Get user's watchlist
POST   /watchlist/:steamId          # Add/update watchlist item
DELETE /watchlist/:steamId/:id      # Remove from watchlist

# Admin
POST /admin/scan-price-alerts       # Trigger price alert scan
```

### 💬 Forum (`/api/forum`)
```
# Public Access
GET  /categories              # List forum categories
GET  /posts                   # List posts (pagination, filters)
GET  /posts/:postId           # Get specific post with details
GET  /posts/:postId/comments  # Get post comments (nested)

# Authenticated Users
GET  /my-posts                # Current user's posts
POST /posts                   # Create new post
PUT  /posts/:postId           # Edit own post
DELETE /posts/:postId         # Delete own post
POST /comments                # Add comment to post
POST /comments/:commentId/reply  # Reply to comment
PUT  /comments/:commentId     # Edit own comment
DELETE /comments/:commentId   # Delete own comment
POST /posts/:postId/like      # Like/unlike post
POST /comments/:commentId/like   # Like/unlike comment
POST /reports                 # Report content (post/comment/user)
POST /reports/check           # Check if already reported

# Admin Only
GET    /admin/summary                    # Aggregated statistics (count aggregation)
GET    /admin/list/:entity               # Paginated entity list (users/posts/comments/reports/notifications)
GET    /admin/moderation-status/:steamId # Get user moderation status
POST   /admin/reports/resolve            # Bulk resolve/dismiss reports
POST   /admin/apply-suspension           # Manually apply warning/suspension
POST   /admin/clear-suspension           # Clear active suspension early
DELETE /admin/delete/post/:postId        # Hard delete post (cascades)
DELETE /admin/delete/comment/:commentId  # Hard delete comment
DELETE /admin/delete-all/:entity         # Bulk delete all in entity
```

### 🔔 Notifications (`/api/notifications`)
```
GET  /                    # Get user notifications (auth required)
POST /:id/read            # Mark notification as read (auth)
POST /read-all/batch      # Mark all notifications as read (auth)
GET  /stream              # SSE stream for real-time updates (auth)
```

### 📧 Email Integration (`/api/email`)
```
POST   /connect-email     # Connect Gmail account (auth)
GET    /verify            # Verify email connection (OAuth callback)
GET    /status            # Get Gmail connection status (auth)
DELETE /disconnect        # Disconnect Gmail account (auth)
```

### 👤 User Account (`/api/users`)
```
GET  /export              # Export user data JSON (auth, GDPR)
POST /preferences         # Save notification preferences (auth)
GET  /preferences         # Get notification preferences (auth)
```

### 🗄️ Cache Management (`/api/cache`)
```
GET    /stats             # Cache statistics
DELETE /:cacheType        # Clear specific cache
DELETE /all               # Clear all caches
POST   /:cacheType/invalidate  # Invalidate by pattern
```

### 🧪 Testing & Development (Dev Mode Only)
```
# Test Routes (/api/test)
POST   /notifications/price-drop      # Test price drop notification
POST   /notifications/forum-activity  # Test forum notification
GET    /notifications                 # Test get notifications
POST   /notifications/:id/read        # Test mark as read
DELETE /notifications                 # Test clear notifications

# Dev Routes (/api/dev)
GET    /watchlist-items               # Debug watchlist items
POST   /simulate-price-drop           # Simulate price drop
POST   /create-mock-item              # Create mock watchlist item
DELETE /watchlist-item/:itemId        # Delete mock item
POST   /cs2/cleanup                   # Cleanup CS2 test data

# Moderation Test Routes (/api/test/moderation)
POST /simulate-suspension             # Simulate suspension
POST /simulate-expire                 # Simulate suspension expiry
POST /simulate-clear                  # Clear test suspension
```

### Query Parameters

**Pagination** (forum posts, admin lists):
- `page` (1-based) or `offset` (0-based)
- `limit` (default: 20, max: 100)
- Response includes: `{ total, limit, offset, data }`

**Filtering** (forum posts):
- `categoryId` - Filter by category
- `steamId` - Filter by author
- `q` - Search query (case-insensitive)
- `sortField` - Sort field (createdAt, likes, etc.)
- `sortDir` - Sort direction (asc/desc)

## ⚙️ Configuration

### Environment Variables

Create `.env` file in `backend/` directory:

```env
# Steam API
STEAM_API_KEY=your_steam_api_key

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@project.iam.gserviceaccount.com

# Server
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_secure_random_session_secret

# Gmail Integration (Optional)
GMAIL_USER=your_email@gmail.com
GMAIL_CLIENT_ID=your_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_APP_PASSWORD=your_app_password

# Production URLs (Production only)
FRONTEND_URL=https://your-frontend.vercel.app
BACKEND_PUBLIC_URL=https://your-backend.herokuapp.com
```

### Rate Limiting

Built-in rate limiting protects against abuse:
- Steam API: Respects Valve's rate limits
- User requests: Per-IP rate limiting
- Search endpoints: Stricter limits to prevent scraping
- GSI endpoints: Per-user throttling

### Error Handling

Comprehensive error handling:
- **Custom Error Classes**: Structured error responses
- **Async Wrapper**: Catches async errors automatically
- **Logging**: Detailed error logging for debugging
- **User-Friendly Messages**: Clear error messages to frontend

## 🔒 Security & Privacy

### Authentication & Authorization
- **Steam OAuth**: Secure Steam OpenID authentication via Passport.js
- **Session Management**: Express sessions with secure cookie settings
- **Protected Routes**: Middleware for authenticated and admin routes
- **Admin Protection**: Single enforced admin (SteamID: 76561198918283411)

### Content Moderation
**Automatic Escalation System**:
- 5 reports → Warning notification
- 10 reports → 24-hour suspension
- 15 reports → 3-day suspension
- Admin account immune to suspension
- Suspended users cannot create posts/comments until expiry

**Manual Admin Controls**:
- Apply warnings and temporary suspensions
- Clear active suspensions early
- Hard delete with cascading cleanup
- Bulk moderation operations

### Data Security
- Firebase security rules enforced
- Input validation on all endpoints
- Parameterized queries prevent injection
- API keys secured (never exposed to client)
- CORS configured for allowed origins
- HTTPS required in production

### Privacy Controls
Users can control:
- Public visibility of statistics
- Watchlist privacy
- Match history visibility
- Email notification preferences
- Gmail connection (optional, can disconnect)

## 🧪 Testing

### Run Tests
```bash
npm test
```

### Mock Data
Sample data available in `mock/` directory:
- `gsi-sample.json` - CS2 GSI sample data
- `matchHistory.json` - Dota 2 match samples

### Test Endpoints
Development and test routes available in dev mode:
- `/api/test/*` - Notification testing
- `/api/dev/*` - Development utilities
- `/api/test/moderation/*` - Moderation testing

Enable test routes by setting `NODE_ENV=development`.

## 🚀 Running the Server

### Development Mode
```bash
npm start
# or with watch mode (Node.js 18+)
npm run dev
```

Server runs on `http://localhost:3000` (or configured PORT).

### Production Mode
```bash
NODE_ENV=production npm start
```

### Database Migrations

#### Search Field Migration
Enable case-insensitive search:
```bash
node scripts/backfillSearchFields.js
```

#### User Metadata Migration
Backfill user creation dates and roles:
```bash
node scripts/backfillUserCreatedAtAndRole.js
```

#### Firebase Index Creation
Generate and deploy Firestore indexes:
```bash
node scripts/createFirebaseIndexes.js
firebase deploy --only firestore:indexes
```

## ☁️ Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production URLs (`FRONTEND_URL`, `BACKEND_PUBLIC_URL`)
3. Use secure `SESSION_SECRET`
4. Enable HTTPS
5. Configure CORS for production domains

### Firebase Deployment
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### Recommended Platforms
- **Heroku** ⭐ (Recommended) - Easy deployment
- **DigitalOcean App Platform** - Good performance
- **AWS Elastic Beanstalk** - Enterprise-grade
- **Google Cloud Run** - Serverless auto-scaling

### Health Check
```bash
curl http://your-backend-url/api/cs2/test
```

### Monitoring
Consider adding:
- Error tracking (Sentry, Rollbar)
- Performance monitoring (New Relic, Datadog)
- Logging service (Papertrail, Loggly)
- Uptime monitoring (UptimeRobot, Pingdom)


## 📝 Contributing

### Development Setup
1. Fork the repository
2. Clone your fork
3. Install dependencies: `npm install`
4. Create `.env` file with required variables
5. Run development server: `npm start`

### Code Standards
- Follow ESLint configuration
- Use async/await for asynchronous code
- Add error handling to all routes
- Document complex logic with comments
- Write descriptive commit messages

### Pull Request Process
1. Create feature branch
2. Make changes with clear commits
3. Test thoroughly
4. Update documentation
5. Submit PR with detailed description

## ⚡ Performance & Resilience

### Response Time Targets
- **Firestore queries**: <300ms (forum, user settings)
- **Cached data**: ≤1,200ms (leaderboards, aggregates)
- **External APIs**: ≤3s with progressive loading

### Cache Strategy (9 Types)
| Type | TTL | Use Case |
|------|-----|----------|
| heroData | 7 days | Static hero definitions |
| playerData | 1 hour | Steam/OpenDota profiles |
| matchData | 2 hours | Match details |
| matchHistory | 15 min | Recent matches |
| metaData | 1 hour | Meta analysis |
| imageData | 30 days | Hero images |
| cs2Data | 30 min | CS2 stats |
| marketData | 5 min | Market prices |
| rateLimiting | 1 min | Rate limit tracking |

### Resilience Patterns
- **Exponential Backoff**: 1s → 2s → 4s → 8s (max 10s) with jitter
- **Retry Policy**: 3 attempts on network/timeout/5xx errors
- **Timeouts**: Steam (5s), OpenDota (10s), Market (8s)
- **Request Deduplication**: Collapse identical concurrent requests
- **Queue System**: 2s min delay between Steam Market calls

## 📄 License

MIT License - See root LICENSE file for details.

---

**Backend maintained with ❤️ using Node.js and Express.js best practices**
