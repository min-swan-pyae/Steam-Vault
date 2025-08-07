# API Documentation

Complete API reference for Steam Vault backend services.

## 📋 Table of Contents

- [Authentication](#authentication)
- [CS2 Endpoints](#cs2-endpoints)
- [Dota 2 Endpoints](#dota-2-endpoints)
- [Cache Management](#cache-management)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## 🔐 Authentication

Steam Vault uses Steam OAuth for user authentication.

### Login with Steam
```http
GET /auth/steam
```

Redirects to Steam OAuth login page.

### OAuth Callback
```http
GET /auth/steam/callback
```

Handles Steam OAuth callback and creates user session.

### Get Current User
```http
GET /auth/user
```

Returns current authenticated user information.

**Response:**
```json
{
  "steamId": "76561198008243030",
  "displayName": "PlayerName",
  "avatar": "https://avatars.akamai.steamstatic.com/...",
  "profileUrl": "https://steamcommunity.com/profiles/..."
}
```

### Logout
```http
GET /auth/logout
```

Destroys user session and logs out.

## 🔫 CS2 Endpoints

### Player Profile
```http
GET /api/cs2/player/:steamId/profile
```

Returns comprehensive player profile with statistics, match history, and performance metrics.

**Parameters:**
- `steamId` (string): Player's Steam ID

**Response:**
```json
{
  "profile": {
    "steamId": "76561198008243030",
    "displayName": "PlayerName",
    "avatar": "https://avatars.akamai.steamstatic.com/..."
  },
  "statistics": {
    "totalKills": 5433,
    "totalDeaths": 4235,
    "kdRatio": 1.28,
    "totalMatches": 345,
    "wins": 227,
    "winRate": 65.8,
    "headshotPercentage": 52.3,
    "totalPlaytime": 234567
  },
  "weapons": [
    {
      "name": "AK-47",
      "kills": 1205,
      "shots": 15432,
      "hits": 8234,
      "accuracy": 53.4,
      "headshotPercentage": 48.2
    }
  ],
  "maps": [
    {
      "name": "de_dust2",
      "matches": 45,
      "wins": 28,
      "winRate": 62.2,
      "averageKD": 1.34
    }
  ]
}
```

### Player Statistics
```http
GET /api/cs2/player/:steamId/stats
```

Returns detailed player statistics.

**Query Parameters:**
- `period` (string, optional): Time period (7d, 30d, all)

### Match History
```http
GET /api/cs2/player/:steamId/matches
```

Returns player's match history.

**Query Parameters:**
- `limit` (number, optional): Number of matches to return (default: 20, max: 100)
- `offset` (number, optional): Pagination offset

**Response:**
```json
{
  "matches": [
    {
      "matchId": "match_123456",
      "date": "2025-07-18T10:30:00Z",
      "map": "de_dust2",
      "gameMode": "competitive",
      "result": "win",
      "score": {
        "team1": 16,
        "team2": 14
      },
      "playerStats": {
        "kills": 23,
        "deaths": 18,
        "assists": 7,
        "mvps": 3,
        "score": 45
      }
    }
  ],
  "pagination": {
    "total": 345,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

### Weapon Statistics
```http
GET /api/cs2/player/:steamId/weapons
```

Returns detailed weapon performance statistics.

### Map Performance
```http
GET /api/cs2/player/:steamId/maps
```

Returns map-specific performance data.

### Community Leaderboard
```http
GET /api/cs2/leaderboard
```

Returns player leaderboard rankings.

**Query Parameters:**
- `limit` (number, optional): Number of players (default: 10, max: 100)
- `sortBy` (string, optional): Sort criteria (kdRatio, totalKills, winRate, headshotPercentage)

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "steamId": "76561198008243030",
      "displayName": "PlayerName",
      "avatar": "https://avatars.akamai.steamstatic.com/...",
      "kdRatio": 1.85,
      "totalKills": 8234,
      "winRate": 72.4,
      "totalMatches": 456
    }
  ],
  "lastUpdated": "2025-07-18T10:30:00Z"
}
```

### Player Search
```http
GET /api/cs2/search
```

Search for players by name or Steam ID.

**Query Parameters:**
- `query` (string, required): Search term (minimum 2 characters)
- `limit` (number, optional): Number of results (default: 10, max: 50)

### Recent Activity
```http
GET /api/cs2/activity
```

Returns recent community activity.

**Query Parameters:**
- `limit` (number, optional): Number of activities (default: 20, max: 50)

### Game State Integration Setup
```http
POST /api/cs2/setup-gsi
```

Provides GSI configuration for player setup.

**Request Body:**
```json
{
  "steamId": "76561198008243030"
}
```

**Response:**
```json
{
  "config": "\"Steam Vault CS2 Integration\"\n{\n    \"uri\" \"http://localhost:3000/api/cs2/gsi/76561198008243030\"\n    ...\n}",
  "instructions": "1. Create gamestate_integration_steamvault.cfg in your CS2 cfg folder...",
  "endpoint": "http://localhost:3000/api/cs2/gsi/76561198008243030"
}
```

### GSI Data Receiver
```http
POST /api/cs2/gsi/:steamId
```

Receives real-time match data from CS2 Game State Integration.

**Parameters:**
- `steamId` (string): Player's Steam ID

**Request Body:** CS2 GSI JSON data

### Test Endpoint
```http
GET /api/cs2/test
```

API health check endpoint.

## 🏆 Dota 2 Endpoints

### Player Profile
```http
GET /api/dota/player/:steamId/profile
```

Returns Dota 2 player profile and statistics.

### Match History
```http
GET /api/dota/player/:steamId/matches
```

Returns Dota 2 match history.

**Query Parameters:**
- `limit` (number, optional): Number of matches (default: 20, max: 100)
- `hero_id` (number, optional): Filter by specific hero
- `game_mode` (number, optional): Filter by game mode

### Hero Statistics
```http
GET /api/dota/player/:steamId/heroes
```

Returns hero performance statistics.

### Meta Analysis
```http
GET /api/dota/meta
```

Returns current meta analysis and hero trends.

**Response:**
```json
{
  "topHeroes": [
    {
      "heroId": 1,
      "name": "Anti-Mage",
      "winRate": 54.2,
      "pickRate": 12.8,
      "banRate": 8.4,
      "averageKDA": 2.1
    }
  ],
  "metaTrends": {
    "farmingMeta": true,
    "fightingMeta": false,
    "averageGameLength": 2850
  },
  "lastUpdated": "2025-07-18T10:30:00Z"
}
```

### Heroes Data
```http
GET /api/dota/heroes
```

Returns complete hero database.

### Test Endpoint
```http
GET /api/dota/test
```

API health check endpoint.

## 🔄 Cache Management

### Cache Status
```http
GET /api/cache/status
```

Returns current cache status and statistics.

**Response:**
```json
{
  "cacheTypes": {
    "CS2_DATA": {
      "entries": 1234,
      "hitRate": 85.2,
      "memoryUsage": "45.2 MB"
    },
    "DOTA_DATA": {
      "entries": 567,
      "hitRate": 78.9,
      "memoryUsage": "23.1 MB"
    }
  },
  "totalMemoryUsage": "68.3 MB",
  "uptime": 3600
}
```

### Clear Cache
```http
DELETE /api/cache/clear
```

Clears all cached data.

**Query Parameters:**
- `type` (string, optional): Specific cache type to clear

### Warm Cache
```http
POST /api/cache/warm
```

Pre-loads frequently accessed data into cache.

## ❌ Error Handling

### Error Response Format
All API errors follow a consistent format:

```json
{
  "message": "Human-readable error message",
  "error": "ERROR_CODE",
  "details": "Additional error details",
  "timestamp": "2025-07-18T10:30:00Z",
  "path": "/api/cs2/player/invalid/profile"
}
```

### Common Error Codes

#### Authentication Errors
- `AUTHENTICATION_REQUIRED`: User must be logged in
- `INVALID_SESSION`: Session expired or invalid
- `STEAM_AUTH_FAILED`: Steam authentication failed

#### Validation Errors
- `INVALID_STEAM_ID`: Steam ID format is invalid
- `INVALID_PARAMETERS`: Request parameters are invalid
- `MISSING_REQUIRED_FIELD`: Required field is missing

#### Data Errors
- `PLAYER_NOT_FOUND`: Player data not available
- `NO_MATCH_DATA`: No match data found
- `INSUFFICIENT_DATA`: Not enough data for analysis

#### External API Errors
- `STEAM_API_ERROR`: Steam API returned an error
- `STEAM_API_UNAVAILABLE`: Steam API is temporarily unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests

#### System Errors
- `INTERNAL_SERVER_ERROR`: Unexpected server error
- `DATABASE_ERROR`: Database connection or query error
- `CACHE_ERROR`: Cache operation failed

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `502 Bad Gateway`: External API error
- `503 Service Unavailable`: Service temporarily unavailable

## ⏱️ Rate Limiting

### Rate Limit Headers
All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642694400
X-RateLimit-RetryAfter: 60
```

### Rate Limits by Endpoint

#### General API Endpoints
- **Default**: 100 requests per 15 minutes per IP
- **Authenticated users**: 200 requests per 15 minutes

#### Search Endpoints
- **Player search**: 30 requests per minute
- **Community features**: 60 requests per minute

#### GSI Endpoints
- **Real-time data**: Unlimited (internal use)

#### External API Dependent
- **Steam API calls**: Limited by Steam's rate limits
- **OpenDota API**: 60 requests per minute

### Rate Limit Exceeded Response
```json
{
  "message": "Rate limit exceeded",
  "error": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60,
  "limit": 100,
  "remaining": 0,
  "reset": 1642694400
}
```

## 🔧 API Configuration

### Base URL
```
Development: http://localhost:3000
Production: https://api.steamvault.com
```

### Request Headers
```http
Content-Type: application/json
Accept: application/json
User-Agent: Steam-Vault-Client/1.0
```

### Response Format
All API responses use JSON format with consistent structure:

```json
{
  "data": {...},           // Main response data
  "meta": {                // Metadata
    "timestamp": "2025-07-18T10:30:00Z",
    "version": "1.0",
    "cached": true,
    "cacheExpiry": "2025-07-18T10:40:00Z"
  },
  "pagination": {          // For paginated responses
    "total": 1000,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

**API Documentation maintained for Steam Vault v1.0**
