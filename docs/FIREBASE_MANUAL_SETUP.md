# Steam Vault - Firebase Manual Setup Guide

This guide covers the Firebase setup steps that cannot be automated through scripts and must be done manually in the Firebase Console.

## 🚀 Prerequisites

Before starting, ensure you have:
- A Firebase project created
- Firebase CLI installed (`npm install -g firebase-tools`)
- Project admin access to Firebase Console
- Environment variables configured in your `.env` file

## 📋 Manual Setup Checklist

### 1. Firebase Project Configuration

#### 1.1 Enable Required Services

Navigate to Firebase Console → Your Project → Build

✅ **Firestore Database**
1. Go to Firestore Database → Create database
2. Choose "Start in production mode" (we'll use custom security rules)
3. Select your preferred location (closest to your users)

✅ **Authentication**
1. Go to Authentication → Sign-in method
2. We'll configure this in the next section

✅ **Storage (Optional - for user avatars/images)**
1. Go to Storage → Get started
2. Choose your security rules mode
3. Select storage location

#### 1.2 Firebase Configuration
1. Go to Project Settings → General
2. Scroll down to "Your apps" section
3. Click "Web" icon to create a web app
4. Register your app name: "Steam Vault"
5. Copy the Firebase config object for your `.env` file

### 2. Authentication Setup

#### 2.1 Configure Authentication Providers

Navigate to Authentication → Sign-in method

✅ **Anonymous (Temporary Sessions)**
1. Click "Anonymous" → Enable → Save

✅ **Custom Token (for Steam OAuth)**
1. This is automatically enabled
2. We use custom tokens for Steam OAuth integration

#### 2.2 Authorized Domains
1. Go to Authentication → Settings → Authorized domains
2. Add your domains:
   - `localhost` (for development)
   - `your-production-domain.com`

### 3. Firestore Security Rules

#### 3.1 Deploy Security Rules
```bash
# Navigate to your project directory
cd /path/to/steam-vault

# Deploy the security rules we created
firebase deploy --only firestore:rules
```

#### 3.2 Verify Rules Deployment
1. Go to Firestore Database → Rules
2. Verify the rules match the content from `firestore.rules`
3. Click "Publish" if changes are pending

### 4. Firestore Indexes

#### 4.1 Run Index Creation Script
```bash
# Navigate to backend directory
cd backend

# Run the index creation script
node scripts/createFirebaseIndexes.js
```

#### 4.2 Manual Index Creation (if script fails)

Navigate to Firestore Database → Indexes → Composite

Create the following composite indexes manually:

**📊 CS2 Statistics Indexes:**
```
Collection: matches
Fields: steamId (Ascending), date (Descending), __name__ (Ascending)

Collection: weaponStats  
Fields: steamId (Ascending), kills (Descending), __name__ (Ascending)

Collection: mapStats
Fields: steamId (Ascending), totalMatches (Descending), __name__ (Ascending)
```

**💬 Forum Indexes:**
```
Collection: forumPosts
Fields: categoryId (Ascending), createdAt (Descending), __name__ (Ascending)

Collection: forumPosts
Fields: categoryId (Ascending), isPinned (Descending), lastActivity (Descending), __name__ (Ascending)

Collection: forumComments
Fields: postId (Ascending), createdAt (Ascending), __name__ (Ascending)
```

**🔔 Notification Indexes:**
```
Collection: notifications
Fields: steamId (Ascending), isRead (Ascending), createdAt (Descending), __name__ (Ascending)
```

**👤 User Activity Indexes:**
```
Collection: userActivity
Fields: steamId (Ascending), createdAt (Descending), __name__ (Ascending)
```

**🛒 Marketplace Indexes:**
```
Collection: marketWatchlists
Fields: steamId (Ascending), updatedAt (Descending), __name__ (Ascending)
```

**🛡️ Moderation Indexes:**
```
Collection: forumReports
Fields: status (Ascending), createdAt (Descending), __name__ (Ascending)
```

**📈 Leaderboard Indexes:**
```
Collection: playerStats
Fields: kdRatio (Descending), __name__ (Ascending)

Collection: playerStats
Fields: totalKills (Descending), __name__ (Ascending)

Collection: playerStats
Fields: winRate (Descending), __name__ (Ascending)
```

**🔍 Search Indexes:**
```
Collection: users
Fields: lastSeen (Descending), __name__ (Ascending)

Collection: emailConnections
Fields: email (Ascending), __name__ (Ascending)

Collection: notifications
Fields: type (Ascending), __name__ (Ascending)

Collection: forumPosts
Fields: tags (Arrays), __name__ (Ascending)

Collection: userProfiles
Fields: privacy.showStatsPublicly (Ascending), __name__ (Ascending)
```

### 5. Initial Data Setup

#### 5.1 Create Forum Categories

Navigate to Firestore Database → Data

Create documents in the `forumCategories` collection:

**Document ID: `general`**
```json
{
  "name": "General Discussion",
  "description": "General gaming and Steam discussions",
  "color": "#3B82F6",
  "order": 1,
  "isActive": true,
  "permissions": {
    "canView": ["all"],
    "canPost": ["verified"],
    "canReply": ["verified"]
  },
  "stats": {
    "totalPosts": 0,
    "totalComments": 0,
    "lastActivity": null
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Document ID: `cs2`**
```json
{
  "name": "Counter-Strike 2",
  "description": "CS2 gameplay, strategies, and updates",
  "color": "#FF6B35",
  "order": 2,
  "isActive": true,
  "permissions": {
    "canView": ["all"],
    "canPost": ["verified"],
    "canReply": ["verified"]
  },
  "stats": {
    "totalPosts": 0,
    "totalComments": 0,
    "lastActivity": null
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Document ID: `marketplace`**
```json
{
  "name": "Marketplace",
  "description": "Steam Community Market discussion and trading",
  "color": "#4CAF50",
  "order": 3,
  "isActive": true,
  "permissions": {
    "canView": ["all"],
    "canPost": ["verified"],
    "canReply": ["verified"]
  },
  "stats": {
    "totalPosts": 0,
    "totalComments": 0,
    "lastActivity": null
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### 5.2 Create System Settings

Create documents in the `systemSettings` collection:

**Document ID: `maintenance`**
```json
{
  "value": {
    "enabled": false,
    "message": "System maintenance in progress. Please check back later.",
    "startTime": null,
    "endTime": null
  },
  "updatedAt": "2024-01-01T00:00:00Z",
  "updatedBy": "system"
}
```

**Document ID: `features`**
```json
{
  "value": {
    "forumEnabled": true,
    "marketplaceEnabled": true,
    "notificationsEnabled": true,
    "cs2StatsEnabled": true,
    "registrationEnabled": true
  },
  "updatedAt": "2024-01-01T00:00:00Z",
  "updatedBy": "system"
}
```

### 6. Storage Rules (If Using Firebase Storage)

Navigate to Storage → Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // User profile images
    match /users/{steamId}/profile/{imageId} {
      allow read: if true; // Public read
      allow write: if request.auth != null && request.auth.uid == steamId
                   && resource.size < 5 * 1024 * 1024 // 5MB limit
                   && resource.contentType.matches('image/.*');
    }
    
    // Forum attachments
    match /forum/{postId}/{imageId} {
      allow read: if true; // Public read
      allow write: if request.auth != null
                   && resource.size < 10 * 1024 * 1024 // 10MB limit
                   && resource.contentType.matches('image/.*');
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### 7. Gmail Setup (For Email Notifications)

**🎯 Simple Method - Using Gmail App Password (Recommended)**

#### 7.1 Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification" if not already enabled
3. Follow the setup process to secure your account

#### 7.2 Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" as the app
3. Select "Other (custom name)" as the device
4. Enter name: "Steam Vault Notifications"
5. Click "Generate"
6. **Copy the 16-character app password** (like `abcd efgh ijkl mnop`)
7. **Important**: Remove spaces when adding to `.env` file

#### 7.3 Add to Environment Variables
Add these to your `.env` file:
```env
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your16characterpassword
```

✅ **Benefits of App Password method:**
- No OAuth consent screen verification required
- No Google app verification process needed  
- No refresh tokens or complex authentication
- Works immediately once configured
- More reliable for server applications

### 8. Environment Variables Setup

Create/update your `.env` file with the required values:

```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Frontend Firebase Config
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

# Steam API
STEAM_API_KEY=your-steam-api-key

# Gmail Configuration (Simple App Password method)
GMAIL_USER=your-gmail@gmail.com
GMAIL_APP_PASSWORD=your16characterpassword

# Application Settings
BASE_URL=http://localhost:3000
NODE_ENV=development
```

### 9. Testing Firebase Setup

#### 9.1 Test Database Connection
```bash
# Run the index creation script to test connection
cd backend
node scripts/createFirebaseIndexes.js
```

#### 9.2 Test Security Rules
1. Go to Firestore Database → Rules → Playground
2. Test various scenarios:
   - Authenticated user reading their own data
   - Anonymous user trying to write data
   - Verified user creating forum posts

#### 9.3 Test Authentication
1. Start your application
2. Try Steam OAuth login
3. Check if user document is created in Firestore
4. Verify session persistence

### 10. Monitoring and Maintenance

#### 10.1 Set Up Usage Alerts
1. Go to Project Settings → Usage and billing
2. Set up budget alerts for:
   - Firestore reads/writes
   - Storage usage
   - Authentication usage

#### 10.2 Enable Monitoring
1. Navigate to Project Settings → Integrations
2. Enable Google Analytics (optional)
3. Set up error reporting
4. Configure performance monitoring

### 11. Production Deployment

#### 11.1 Update Security Rules for Production
1. Remove test data and test users
2. Ensure all rules are properly restrictive
3. Test security rules in playground
4. Deploy updated rules

#### 11.2 Configure Production Domains
1. Update Authentication → Authorized domains
2. Add your production domain
3. Update CORS settings if needed

#### 11.3 Performance Optimization
1. Review and optimize Firestore indexes
2. Set up TTL (Time To Live) for cache collections
3. Configure security rules for optimal performance

## 🔧 Troubleshooting

### Common Issues

**Index Creation Fails:**
- Ensure you have sufficient permissions
- Check for existing conflicting indexes
- Verify collection names match exactly

**Authentication Not Working:**
- Verify authorized domains are configured
- Check Steam API key validity
- Ensure custom token generation is working

**Security Rules Rejecting Valid Requests:**
- Test rules in the playground
- Check user authentication status
- Verify document structure matches rules

**Performance Issues:**
- Review Firestore usage in console
- Check for missing indexes
- Optimize query patterns

### Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Steam Web API Documentation](https://steamcommunity.com/dev)

## ✅ Final Verification

After completing all steps, verify:
- [ ] All Firestore indexes are built
- [ ] Security rules are deployed and working
- [ ] Authentication providers are configured
- [ ] Initial data is created
- [ ] Environment variables are set
- [ ] Gmail API is configured (if using email notifications)
- [ ] Application connects to Firebase successfully
- [ ] Users can authenticate via Steam
- [ ] Data reads/writes work as expected

Your Firebase setup is now complete! 🎉