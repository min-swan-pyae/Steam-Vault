# Steam Vault - Professional Gaming Statistics Platform

## 🎮 Overview
Steam Vault is a comprehensive gaming statistics platform for Counter-Strike 2 (CS2) and Dota 2. It provides professional-grade analytics, match history, leaderboards, weapon/map stats, marketplace features, and community forums. Built with React, Node.js, Express, Firebase, and Steam Web API.

## ✨ Features
### Counter-Strike 2 (CS2)
- Comprehensive player statistics (K/D, win rate, headshot %, weapon, map)
- Real-time Game State Integration (GSI) for live match tracking
- Historical match data from Steam API
- Community leaderboards, player search, recent activity
- Price alerts and notifications for marketplace items

### Dota 2
- Match history and hero performance analytics
- Meta insights and recommendations
- Player behavior tracking
- Community features and forums

### Marketplace
- Item search, trending, price history
- Watchlist and price alert system
- Bulk search and item details

### Community & Notifications
- Forums, categories, posts, comments, moderation
- In-app and email notifications (price drops, forum replies, system alerts)
- Gmail integration for advanced notification delivery
- Data export (planned)

## 🛠️ Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Redux Toolkit, React Router, Recharts
- **Backend**: Node.js, Express.js, Firebase Admin SDK, Passport.js, Steam Web API
- **Database**: Firebase Firestore (NoSQL), multi-layer caching

## 📚 Database Schema (Summary)
Steam Vault uses a robust Firestore schema. Key collections:
- **users**: Steam-auth user profiles
- **userProfiles**: Extended profiles (Gmail, notification prefs, privacy)
- **sessions**: Session management
- **notifications**: User notifications (price, forum, system)
- **emailConnections**: Gmail account connections
- **marketWatchlists**: Marketplace watchlist items
- **priceAlerts**: Price drop notifications
- **forumCategories, forumPosts, forumComments, forumReports, userActivity**: Forums and moderation
- **matches, playerStats, weaponStats, mapStats, gsiConfigs, leaderboards, marketCache, systemSettings**: Game and market data

See [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) for full schema and indexes.

## 📋 Prerequisites
- Node.js (v18+)
- npm or yarn
- Steam Web API Key ([Get one](https://steamcommunity.com/dev/apikey))
- Firebase Project ([Create one](https://console.firebase.google.com/))

## 🚀 Installation
1. Clone the repository
2. Install dependencies (backend & frontend)
3. Configure environment variables (see below)
4. Setup Firebase and Steam API keys

## ⚙️ Environment Configuration
### Backend `.env`
```
STEAM_API_KEY=your_steam_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email@your_project.iam.gserviceaccount.com
PORT=3000
SESSION_SECRET=your_session_secret_here
GMAIL_USER=yourgmail@gmail.com
GMAIL_CLIENT_ID=gmail_client_id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=
GMAIL_APP_PASSWORD=
```
### Frontend `.env`
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_API_BASE_URL=http://localhost:3000

# Public URLs (for production emails/links)
# FRONTEND_URL=https://app.yourdomain.com
# BACKEND_PUBLIC_URL=https://api.yourdomain.com
```

## 🏃‍♂️ Running the Application
- Backend: `cd backend && npm start`
- Frontend: `cd frontend && npm run dev`

## 🧩 Usage
- Login with Steam
- Access CS2 and Dota 2 dashboards
- Use marketplace features (search, watchlist, price alerts)
- Participate in forums
- Configure notifications and Gmail integration

## 🔗 API Endpoints
See [`backend/README.md`](backend/README.md) for full API reference.

Key user endpoints:
- `GET /api/users/export` – authenticated data export
- `POST /api/users/preferences` – save notification preferences

## 🧪 Testing
- Backend: `cd backend && npm test`
- Frontend: `cd frontend && npm test`

## ☁️ Deployment
- Build frontend: `cd frontend && npm run build`
- Start backend: `cd backend && npm start`
- Recommended hosting: Backend (Heroku, DigitalOcean, AWS), Frontend (Vercel, Netlify, AWS S3), Database (Firebase)

## 🛡️ Security & Privacy
- Steam OAuth required for user features
- Gmail integration for notifications (optional)
- User privacy controls for stats, watchlists, match history
- Content moderation and reporting in forums

## 📝 Contributing
- Fork, branch, commit, PR
- Follow ESLint and code style
- Write tests and update documentation

## 📖 License
MIT License

## 🙏 Acknowledgments
- Steam Web API, Firebase, Valve, React, Tailwind CSS

## 🆘 Support
- GitHub issues
- Documentation in `docs/`
- FAQ in `docs/FAQ.md`

## 🔄 Updates
- Actively maintained: new features, bug fixes, performance, security

---

**Made with ❤️ by the Steam Vault Team**


