# Steam Vault Frontend

Professional gaming statistics frontend built with React, Vite, Tailwind CSS, and Redux Toolkit.

## 🚀 Features
- Modern dark-themed, responsive UI
- Real-time data visualization (charts, dashboards)
- CS2 dashboard: K/D, win rate, headshot %, weapon/map stats, match history, leaderboards
- Dota 2 dashboard: match analysis, hero stats, meta insights, behavior tracking
- Marketplace: item search, trending, price history, watchlist, price alerts
- Community: forums, leaderboards, player search, recent activity
- Notification system: in-app and email (Gmail integration)
- Data export (planned)

## 🛠️ Technology Stack
- React 18, Vite, Tailwind CSS
- Redux Toolkit, React Router, Recharts, Axios

## 📁 Project Structure
```
src/
  app/          # Redux store
  assets/       # Static assets
  components/   # UI components (stats, dashboards, charts, etc.)
  config/       # Firebase, hero config
  context/      # Auth context
  features/     # Redux slices, API
  hooks/        # Custom hooks
  layouts/      # Layout components
  pages/        # Page components (CS2, Dota2, Home, Marketplace, Forum, etc.)
  services/     # API/service layers
  utils/        # Utility functions
  App.jsx       # Main app
  main.jsx      # Entry point
```

## ⚙️ Configuration
- Firebase config in `src/config/firebase.js`
- API endpoints in `src/services/api.js`
- Routing in `App.jsx` (protected/public routes)
- Environment variables in `.env`

## 🗄️ Database Schema (Summary)
- users, userProfiles, sessions, notifications, emailConnections
- marketWatchlists, priceAlerts
- forumCategories, forumPosts, forumComments, forumReports, userActivity
- matches, playerStats, weaponStats, mapStats, gsiConfigs, leaderboards, marketCache, systemSettings

See [`docs/DATABASE_SCHEMA.md`](../docs/DATABASE_SCHEMA.md) for full schema.

## 🏃‍♂️ Getting Started
1. Install dependencies: `npm install`
2. Setup `.env` file (see backend README)
3. Start dev server: `npm run dev`

## 🧩 Component Architecture
- CS2ProfileData.jsx: CS2 stats display
- CS2CommunityStats.jsx: Leaderboards, search, activity
- Dota2Dashboard.jsx: Dota 2 analytics
- LoadingSpinner.jsx, ErrorMessage.jsx: Utility components

## 🧪 Testing
- `npm run test` for frontend tests
- Unit, integration, E2E, visual tests

## ☁️ Build & Deployment
- Build: `npm run build`
- Deploy: Vercel, Netlify, AWS S3, custom server

## 📝 Contributing
- Follow React best practices
- Functional components, hooks, error boundaries
- Write tests, update docs, follow code style

---
**Frontend maintained with ❤️ using modern React practices**
