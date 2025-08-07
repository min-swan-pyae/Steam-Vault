# Steam Vault Backend

Professional gaming statistics backend API built with Node.js, Express, and Firebase.

## 🚀 Features

### API Architecture
- **RESTful Design**: Clean, intuitive API endpoints
- **Real-time Data**: Firebase integration for live updates
- **Intelligent Caching**: Multi-layer caching system for optimal performance
- **Rate Limiting**: Respects Steam API limits and optimizes calls
- **Error Handling**: Comprehensive error handling and logging

### CS2 Integration
- **Steam API**: Complete historical match data
- **Game State Integration**: Real-time match tracking
- **Statistics Processing**: Advanced statistics calculations
- **Community Features**: Leaderboards, search, and activity feeds
- **Weapon Analytics**: Detailed weapon performance data
- **Map Statistics**: Map-specific performance tracking

### Dota 2 Integration
- **OpenDota API**: Comprehensive match data
- **Hero Statistics**: Detailed hero performance tracking
- **Meta Analysis**: Current meta insights and trends
- **Player Behavior**: Toxicity and behavior analysis
- **Performance Trends**: Long-term performance analysis

### Authentication & Security
- **Steam OAuth**: Secure Steam authentication
- **Session Management**: Persistent user sessions
- **CORS Configuration**: Secure cross-origin requests
- **Input Validation**: Comprehensive input sanitization
- **Rate Limiting**: API abuse prevention

## 🛠️ Technology Stack

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **Firebase Admin SDK**: Database and authentication
- **Passport.js**: Authentication middleware
- **Steam Web API**: Official Steam API integration
- **Axios**: HTTP client for external APIs
- **Express Rate Limit**: API rate limiting
- **Helmet**: Security middleware

## 📁 Project Structure

```
backend/
├── config/                 # Configuration files
│   └── passport.js        # Passport authentication setup
├── controllers/           # Route controllers
│   ├── cs2Controller.js   # CS2 API endpoints
│   ├── dotaController.js  # Dota 2 API endpoints
│   ├── playerController.js # Player management
│   ├── imageController.js # Image processing
│   └── cacheController.js # Cache management
├── data/                  # Static data files
│   └── notablePlayers.js  # Notable players database
├── middleware/            # Custom middleware
│   ├── asyncHandler.js    # Async error handling
│   └── errorMiddleware.js # Error handling middleware
├── mock/                  # Mock data for testing
│   └── matchHistory.json  # Sample match data
├── routes/                # API routes
│   ├── cs2Routes.js       # CS2 endpoints
│   ├── dotaRoutes.js      # Dota 2 endpoints
│   ├── auth.js           # Authentication routes
│   └── cacheRoutes.js    # Cache management routes
├── scripts/               # Utility scripts
│   └── createFirebaseIndexes.js # Database index creation
├── services/              # Business logic services
│   ├── steamService.js    # Steam API integration
│   ├── firebaseService.js # Firebase operations
│   ├── cacheService.js    # Caching logic
│   └── demoParsingService.js # Demo file parsing
├── uploads/               # File uploads
│   └── demos/            # CS2 demo files
├── utils/                 # Utility functions
│   ├── dotaUtils.js      # Dota 2 helper functions
│   └── testApiKey.js     # API key testing
├── index.js               # Application entry point
└── package.json          # Dependencies and scripts
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Steam Web API key
- Firebase project with Firestore

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Environment setup**:
Create a `.env` file in the backend directory:
```env
# Steam API Configuration
STEAM_API_KEY=your_steam_api_key_here
STEAM_APP_ID=730

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_client_email%40your_project.iam.gserviceaccount.com

# Server Configuration
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# Session Configuration
SESSION_SECRET=your_session_secret_here
```

3. **Firebase setup**:
- Create Firebase project
- Enable Firestore Database
- Create service account
- Download service account key
- Extract credentials for `.env` file

4. **Start the server**:
```bash
npm start
```

The API will be available at `http://localhost:3000`

## 🏗️ Available Scripts

- **`npm start`**: Start production server
- **`npm run dev`**: Start development server with nodemon
- **`npm test`**: Run test suite
- **`npm run lint`**: Run ESLint for code quality
- **`npm run docs`**: Generate API documentation

## 📊 API Endpoints

### Authentication Endpoints
```
GET  /auth/steam           # Steam OAuth login
GET  /auth/steam/callback  # Steam OAuth callback
GET  /auth/logout          # User logout
GET  /auth/user           # Current user info
```

### CS2 Endpoints
```
# Player Statistics
GET  /api/cs2/player/:steamId/profile  # Complete player profile
GET  /api/cs2/player/:steamId/stats    # Detailed statistics
GET  /api/cs2/player/:steamId/matches  # Match history
GET  /api/cs2/player/:steamId/weapons  # Weapon statistics
GET  /api/cs2/player/:steamId/maps     # Map performance

# Community Features
GET  /api/cs2/leaderboard              # Player leaderboard
GET  /api/cs2/search                   # Player search
GET  /api/cs2/activity                 # Recent activity

# Game State Integration
POST /api/cs2/setup-gsi               # Setup GSI configuration
POST /api/cs2/gsi/:steamId            # Receive GSI data

# Utility
GET  /api/cs2/test                    # API health check
```

### Dota 2 Endpoints
```
# Player Statistics
GET  /api/dota/player/:steamId/profile  # Player profile
GET  /api/dota/player/:steamId/matches  # Match history
GET  /api/dota/player/:steamId/heroes   # Hero statistics

# Meta & Analytics
GET  /api/dota/meta                     # Meta analysis
GET  /api/dota/heroes                   # Hero data

# Utility
GET  /api/dota/test                     # API health check
```

### Cache Management
```
GET    /api/cache/status               # Cache status
DELETE /api/cache/clear                # Clear cache
POST   /api/cache/warm                 # Warm cache
```

## 🎯 Core Services

### Steam Service (`steamService.js`)
Handles all Steam API interactions:
```javascript
// Get player statistics
const stats = await steamService.getPlayerStats(steamId);

// Get match history
const matches = await steamService.getPlayerMatches(steamId);

// Get user summary
const profile = await steamService.getPlayerSummary(steamId);
```

### Firebase Service (`firebaseService.js`)
Manages Firebase operations:
```javascript
// Store player data
await firebaseService.storePlayerData(steamId, data);

// Get leaderboard
const leaderboard = await firebaseService.getCS2Leaderboard(limit, sortBy);

// Store GSI data
await firebaseService.storeGSIData(steamId, gsiData);
```

### Cache Service (`cacheService.js`)
Intelligent caching system:
```javascript
// Cache data
cacheService.set('CS2_DATA', key, data, ttl);

// Retrieve cached data
const cachedData = cacheService.get('CS2_DATA', key);

// Clear cache
cacheService.clear('CS2_DATA');
```

## 🔧 Configuration

### Caching Strategy
- **Steam API Data**: 30-60 minutes
- **User Statistics**: 10 minutes
- **Leaderboards**: 10 minutes
- **Recent Activity**: 2 minutes
- **Meta Data**: 24 hours

### Rate Limiting
- **Steam API**: Respects official rate limits
- **User requests**: 100 requests per 15 minutes
- **GSI endpoints**: Unlimited (internal)
- **Search endpoints**: 30 requests per minute

### Error Handling
Comprehensive error handling with:
- Custom error classes
- Async error wrapper
- Detailed error logging
- User-friendly error messages
- Proper HTTP status codes

## 🎮 Game State Integration

### CS2 GSI Setup
GSI configuration for real-time match tracking:
```cfg
"Steam Vault CS2 Integration"
{
    "uri"          "http://localhost:3000/api/cs2/gsi/YOUR_STEAM_ID"
    "timeout"      "5.0"
    "buffer"       "0.1"
    "throttle"     "0.1"
    "heartbeat"    "30.0"
    "data"
    {
        "provider"            "1"
        "map"                 "1"
        "round"               "1"
        "player_id"           "1"
        "player_state"        "1"
        "player_weapons"      "1"
        "player_match_stats"  "1"
        "allplayers"          "1"
    }
}
```

### GSI Data Processing
Real-time match data processing:
- Live round statistics
- Weapon performance tracking
- Map-specific metrics
- Team performance analysis
- Match outcome prediction

## 🔐 Security

### Authentication
- Steam OAuth 2.0 integration
- Secure session management
- CSRF protection
- Input validation and sanitization

### API Security
- Rate limiting per endpoint
- Request size limits
- CORS configuration
- Helmet security headers
- Environment variable protection

### Data Protection
- Sensitive data encryption
- Secure Firebase rules
- API key rotation
- Access logging
- User privacy compliance

## 📈 Performance Optimization

### Caching Layers
1. **Memory Cache**: Fast in-memory storage
2. **Redis Cache**: Distributed caching (optional)
3. **Database Cache**: Firebase caching rules
4. **API Cache**: External API response caching

### Database Optimization
- Efficient Firestore queries
- Proper indexing strategy
- Data denormalization for read performance
- Batch operations for writes
- Connection pooling

### API Optimization
- Response compression
- Efficient data serialization
- Parallel API calls where possible
- Smart data pagination
- Optimized query patterns

## 🧪 Testing

### Test Setup
```bash
npm test
```

### Testing Strategy
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **Service Tests**: External API integration testing
- **Performance Tests**: Load and stress testing

### Mock Data
Mock data provided for development:
- Sample match history
- Player statistics
- GSI data samples
- Error scenarios

## 🚀 Deployment

### Production Configuration
Environment variables for production:
```env
NODE_ENV=production
PORT=3000
# ... other production configs
```

### Database Setup
Firebase Firestore collections:
- `playerStats` - Player statistics
- `matches` - Match history
- `gsiData` - Real-time GSI data
- `users` - User profiles
- `cache` - Application cache

### Monitoring
- Application performance monitoring
- Error tracking and alerting
- API usage analytics
- Database performance metrics
- User activity tracking

## 🔄 Development Workflow

### Code Standards
- ESLint configuration for Node.js
- Prettier for code formatting
- Consistent error handling patterns
- Comprehensive logging
- Documentation standards

### Git Workflow
1. Feature branch creation
2. Development with tests
3. Code review process
4. Staging deployment
5. Production release

### Debugging
- Detailed logging with winston
- Debug mode configuration
- Request/response logging
- Error stack traces
- Performance profiling

## 📞 Support

### Common Issues
- **Steam API key errors**: Verify API key validity
- **Firebase connection issues**: Check credentials
- **Rate limiting**: Monitor API usage
- **GSI setup**: Verify configuration file
- **Authentication failures**: Check Steam OAuth setup

### Debugging Tips
1. Check server logs for detailed errors
2. Verify environment variables
3. Test API endpoints individually
4. Monitor cache performance
5. Validate external API responses

## 🔄 Recent Updates

- Enhanced caching system for better performance
- Improved error handling and logging
- Added comprehensive GSI data processing
- Optimized Steam API integration
- Enhanced security measures
- Updated dependencies for security patches

## 🤝 Contributing

### Development Setup
1. Fork the repository
2. Create feature branch
3. Install dependencies
4. Set up environment variables
5. Start development server
6. Write tests for new features
7. Submit pull request

### Code Guidelines
- Follow existing code patterns
- Write comprehensive tests
- Update documentation
- Use proper error handling
- Follow security best practices

---

**Backend maintained with ❤️ using Node.js best practices**
