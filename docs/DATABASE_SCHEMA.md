# Steam Vault - Complete Firebase Database Schema

## 🗄️ Collections Overview

### 1. **users** - Core user profiles
### 2. **userProfiles** - Extended user profile data (requires Gmail connection)
### 3. **sessions** - User session management
### 4. **notifications** - User notification system
### 5. **emailConnections** - Gmail account connections
### 6. **marketWatchlists** - Marketplace watchlist items
### 7. **priceAlerts** - Price drop notifications tracking
### 8. **forumCategories** - Forum category management
### 9. **forumPosts** - Community forum posts
### 10. **forumComments** - Post comments and replies
### 11. **forumReports** - Content moderation reports
### 12. **userActivity** - User activity tracking for forums
### 13. **matches** - CS2 match data (GSI)
### 14. **playerStats** - CS2 aggregated player statistics
### 15. **weaponStats** - CS2 weapon-specific statistics
### 16. **mapStats** - CS2 map-specific statistics
### 17. **gsiConfigs** - CS2 GSI configuration
### 18. **leaderboards** - CS2 leaderboard cache
### 19. **marketCache** - Marketplace data cache
### 20. **systemSettings** - Application configuration

---

## 🔧 Detailed Schema Definition

### 1. users (Core User Data - Steam Auth)
```json
{
  "steamId": "76561198000000000", // Document ID
  "displayName": "PlayerName",
  "avatarUrl": "https://steamcdn-a.akamaihd.net/...",
  "profileUrl": "https://steamcommunity.com/profiles/...",
  "country": "US",
  "createdAt": "timestamp",
  "lastSeen": "timestamp",
  "updatedAt": "timestamp",
  "isActive": true,
  "permissions": {
    "isBanned": false,
    "banReason": null,
    "banExpiresAt": null,
    "isModerator": false,
    "isAdmin": false
  }
}
```

### 2. userProfiles (Extended Profiles - Requires Gmail Connection)
```json
{
  "id": "auto-generated", // Document ID
  "steamId": "76561198000000000",
  "email": "user@gmail.com", // Connected Gmail account
  "isEmailVerified": true,
  "preferences": {
    "enableNotifications": true,
    "emailNotifications": true,
    "priceAlerts": true,
    "forumNotifications": true,
    "notificationFrequency": "instant" // instant, daily, weekly
  },
  "forumSettings": {
    "displayName": "Custom Forum Name",
    "signature": "Custom signature",
    "showSteamProfile": true,
    "allowPrivateMessages": true
  },
  "privacy": {
    "showStatsPublicly": true,
    "showWatchlistPublicly": false,
    "showMatchHistoryPublicly": true
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 3. sessions (User Session Management)
```json
{
  "sessionId": "session_key", // Document ID
  "steamId": "76561198000000000",
  "userData": {}, // Cached user data
  "createdAt": "timestamp",
  "expiresAt": "timestamp",
  "lastActivity": "timestamp",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0..."
}
```

### 4. notifications (User Notifications)
```json
{
  "id": "auto-generated", // Document ID
  "steamId": "76561198000000000",
  "type": "price_drop", // price_drop, forum_reply, mention, system
  "title": "Price Drop Alert",
  "message": "AK-47 | Redline price dropped to $45.00",
  "data": {
    "itemId": "item_reference",
    "oldPrice": 50.00,
    "newPrice": 45.00,
    "url": "/marketplace/item/ak47-redline"
  },
  "isRead": false,
  "isSent": false, // For email notifications
  "sentAt": null,
  "createdAt": "timestamp",
  "readAt": null
}
```

### 5. emailConnections (Gmail Integration)
```json
{
  "id": "auto-generated", // Document ID
  "steamId": "76561198000000000",
  "email": "user@gmail.com",
  "isVerified": true,
  "verificationToken": "verification_token",
  "verifiedAt": "timestamp",
  "oauthTokens": {
    "accessToken": "encrypted_token",
    "refreshToken": "encrypted_refresh_token",
    "expiresAt": "timestamp"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 6. marketWatchlists (Marketplace Watchlist)
```json
{
  "id": "{steamId}_{appid}_{hashName}", // Document ID
  "steamId": "76561198000000000",
  "appid": 730,
  "hashName": "AK-47 | Redline (Field-Tested)",
  "name": "AK-47 | Redline",
  "iconUrl": "https://steamcommunity-a.akamaihd.net/...",
  "targetPrice": 45.00, // Price alert threshold
  "currentPrice": 50.00,
  "priceHistory": [
    {
      "price": 52.00,
      "date": "timestamp"
    }
  ],
  "alertsEnabled": true,
  "lastPriceCheck": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 7. priceAlerts (Price Alert Tracking)
```json
{
  "id": "auto-generated", // Document ID
  "watchlistItemId": "watchlist_item_reference",
  "steamId": "76561198000000000",
  "itemName": "AK-47 | Redline (Field-Tested)",
  "targetPrice": 45.00,
  "triggeredPrice": 44.50,
  "triggeredAt": "timestamp",
  "notificationSent": true,
  "emailSent": true,
  "isActive": false // Set to false after triggering
}
```

### 8. forumCategories (Forum Categories)
```json
{
  "id": "general", // Document ID (slug)
  "name": "General Discussion",
  "description": "General gaming and Steam discussions",
  "iconUrl": "https://...",
  "color": "#3B82F6",
  "order": 1,
  "isActive": true,
  "permissions": {
    "canView": ["all"], // all, verified, moderator, admin
    "canPost": ["verified"],
    "canReply": ["verified"]
  },
  "stats": {
    "totalPosts": 150,
    "totalComments": 450,
    "lastActivity": "timestamp"
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 9. forumPosts (Forum Posts)
```json
{
  "id": "auto-generated", // Document ID
  "categoryId": "general",
  "authorSteamId": "76561198000000000",
  "authorDisplayName": "PlayerName",
  "title": "Discussion about CS2 updates",
  "content": "Post content here...",
  "contentHtml": "<p>Rendered HTML content</p>",
  "tags": ["cs2", "discussion"],
  "isPinned": false,
  "isLocked": false,
  "isDeleted": false,
  "stats": {
    "views": 25,
    "likes": 5,
    "dislikes": 1,
    "comments": 10
  },
  "lastActivity": "timestamp", // Last comment time
  "lastCommentBy": "76561198000000001",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "editHistory": [
    {
      "editedBy": "76561198000000000",
      "editedAt": "timestamp",
      "reason": "Fixed typo"
    }
  ]
}
```

### 10. forumComments (Post Comments)
```json
{
  "id": "auto-generated", // Document ID
  "postId": "post_reference",
  "authorSteamId": "76561198000000000",
  "authorDisplayName": "PlayerName",
  "content": "Comment content...",
  "contentHtml": "<p>Rendered HTML content</p>",
  "parentCommentId": null, // For threaded comments
  "level": 0, // Comment depth level
  "isDeleted": false,
  "stats": {
    "likes": 3,
    "dislikes": 0
  },
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "editHistory": [
    {
      "editedBy": "76561198000000000",
      "editedAt": "timestamp",
      "reason": "Updated information"
    }
  ]
}
```

### 11. forumReports (Content Moderation)
```json
{
  "id": "auto-generated", // Document ID
  "reporterSteamId": "76561198000000000",
  "reportedSteamId": "76561198000000001",
  "contentType": "post", // post, comment, user
  "contentId": "content_reference",
  "reason": "toxic_language", // toxic_language, spam, harassment, inappropriate
  "description": "User was using offensive language",
  "evidence": {
    "screenshots": ["url1", "url2"],
    "chatLogs": "captured content"
  },
  "status": "pending", // pending, reviewed, resolved, dismissed
  "reviewedBy": null, // Moderator steamId
  "reviewedAt": null,
  "resolution": null,
  "resolutionNotes": null,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 12. userActivity (User Activity Tracking)
```json
{
  "id": "auto-generated", // Document ID
  "steamId": "76561198000000000",
  "activityType": "post_created", // post_created, comment_added, like_given
  "activityData": {
    "postId": "post_reference",
    "postTitle": "Discussion title"
  },
  "createdAt": "timestamp",
  "retentionUntil": "timestamp" // Auto-delete after 1 month
}
```

### 13. matches (CS2 Match Data - GSI)
```json
{
  "id": "auto-generated", // Document ID
  "steamId": "76561198000000000",
  "matchId": "demo_1234567890",
  "mapName": "de_dust2",
  "result": "Win", // Win, Loss, Draw, Analyzed
  "gameMode": "competitive", // competitive, casual, deathmatch
  "kills": 25,
  "deaths": 12,
  "assists": 8,
  "headshots": 12,
  "damage": 2450,
  "mvps": 3,
  "score": 16, // Team score
  "opponentScore": 10,
  "duration": 2400, // seconds
  "kdRatio": 2.08,
  "headshotPercentage": 48,
  "createdAt": "timestamp",
  "date": "timestamp"
}
```

### 14. playerStats (CS2 Player Statistics)
```json
{
  "steamId": "76561198000000000", // Document ID
  "personaName": "PlayerName",
  "totalKills": 1250,
  "totalDeaths": 800,
  "totalAssists": 450,
  "totalMatches": 85,
  "totalMVPs": 35,
  "totalHeadshots": 600,
  "kdRatio": 1.56,
  "winRate": 65, // percentage
  "headshotPercentage": 48,
  "averageScore": 18.5,
  "mostPlayedMap": "de_dust2",
  "mostSuccessfulMap": "de_mirage",
  "favoriteWeapon": "AK-47",
  "currentRank": "Global Elite",
  "peakRank": "Global Elite",
  "totalPlaytime": 45600, // seconds
  "lastUpdated": "timestamp",
  "lastSeen": "timestamp"
}
```

### 15. weaponStats (CS2 Weapon Statistics)
```json
{
  "id": "{steamId}_{weaponName}", // Document ID
  "steamId": "76561198000000000",
  "weaponName": "AK-47",
  "weaponType": "rifle",
  "kills": 150,
  "deaths": 25, // Deaths while holding this weapon
  "headshots": 75,
  "headshotPercentage": 50,
  "accuracy": 65.5, // Hit percentage
  "damage": 18500,
  "averageDamage": 123.33,
  "shotsFired": 850,
  "shotsHit": 557,
  "matchesUsed": 45,
  "updatedAt": "timestamp"
}
```

### 16. mapStats (CS2 Map Statistics)
```json
{
  "id": "{steamId}_{mapName}", // Document ID
  "steamId": "76561198000000000",
  "mapName": "de_dust2",
  "totalMatches": 25,
  "wins": 16,
  "losses": 9,
  "winRate": 64,
  "totalKills": 425,
  "totalDeaths": 300,
  "totalRounds": 380,
  "avgKills": 17.0,
  "avgDeaths": 12.0,
  "kdRatio": 1.42,
  "bestPerformance": {
    "kills": 28,
    "deaths": 8,
    "matchDate": "timestamp"
  },
  "updatedAt": "timestamp"
}
```

### 17. gsiConfigs (CS2 GSI Configuration)
```json
{
  "steamId": "76561198000000000", // Document ID
  "config": {
    "authToken": "generated_token",
    "endpoint": "http://localhost:3000/api/cs2/gsi",
    "bufferTime": 0.1,
    "throttle": 0.1
  },
  "isActive": true,
  "lastConnection": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### 18. leaderboards (CS2 Leaderboard Cache)
```json
{
  "type": "kills", // Document ID: kills, kd, wins, headshots
  "data": [
    {
      "rank": 1,
      "steamId": "76561198000000000",
      "personaName": "TopPlayer",
      "value": 2500,
      "lastUpdated": "timestamp"
    }
  ],
  "generatedAt": "timestamp",
  "expiresAt": "timestamp"
}
```

### 19. marketCache (Marketplace Cache)
```json
{
  "key": "search_page_123", // Document ID
  "data": {}, // Cached search results
  "createdAt": "timestamp",
  "expiresAt": "timestamp",
  "hits": 5 // Cache hit counter
}
```

### 20. systemSettings (Application Configuration)
```json
{
  "key": "maintenance", // Document ID
  "value": {
    "enabled": false,
    "message": "System maintenance in progress",
    "startTime": "timestamp",
    "endTime": "timestamp"
  },
  "updatedAt": "timestamp",
  "updatedBy": "admin_steam_id"
}
```

---

## 🔍 Indexes Required

### Composite Indexes
1. **matches**: steamId (ASC), date (DESC)
2. **weaponStats**: steamId (ASC), kills (DESC)
3. **mapStats**: steamId (ASC), totalMatches (DESC)
4. **forumPosts**: categoryId (ASC), createdAt (DESC)
5. **forumPosts**: categoryId (ASC), isPinned (DESC), lastActivity (DESC)
6. **forumComments**: postId (ASC), createdAt (ASC)
7. **notifications**: steamId (ASC), isRead (ASC), createdAt (DESC)
8. **userActivity**: steamId (ASC), createdAt (DESC)
9. **marketWatchlists**: steamId (ASC), updatedAt (DESC)
10. **forumReports**: status (ASC), createdAt (DESC)

### Single Field Indexes
1. **users**: lastSeen (DESC)
2. **forumPosts**: tags (ARRAY)
3. **notifications**: type (ASC)
4. **playerStats**: kdRatio (DESC), totalKills (DESC), winRate (DESC)
5. **emailConnections**: email (ASC)

---

## 🔐 Security Considerations

### Access Control Rules
- **Steam Auth Required**: All user-specific collections require Steam authentication
- **Gmail Connection Required**: Extended features require verified Gmail connection
- **Content Moderation**: Automated toxic content detection and manual reporting
- **Rate Limiting**: API rate limits to prevent abuse
- **Data Retention**: User activity auto-deleted after 1 month

### Privacy Controls
- Users can control visibility of their stats and watchlists
- Email addresses encrypted at rest
- OAuth tokens securely encrypted
- User content can be deleted (GDPR compliance)

This comprehensive schema supports all your requested features:
- ✅ Steam OAuth authentication
- ✅ Gmail integration for notifications
- ✅ Price drop alerts via email
- ✅ Community forums with CRUD operations
- ✅ Content moderation and reporting
- ✅ CS2 GSI data storage
- ✅ Marketplace watchlist functionality
- ✅ User profile management
- ✅ 1-month data retention for forum activity