# Steam Vault Frontend

Professional gaming statistics frontend for CS2 and Dota 2, built with React 19, Vite, Tailwind CSS, and modern web technologies.

## 🚀 Features

### User Interface
- **Modern Design**: Dark-themed, responsive UI with smooth animations
- **Real-time Updates**: Server-Sent Events (SSE) for live notifications
- **Data Visualization**: Interactive charts and graphs with Recharts
- **Lazy Loading**: Optimized image loading with retry logic
- **Error Handling**: Comprehensive error states with retry options
- **Loading States**: Consistent loading spinners and skeleton screens

### CS2 Dashboard
- **Player Statistics**: K/D ratio, win rate, headshot percentage
- **Weapon Analytics**: Performance metrics for each weapon
- **Map Statistics**: Map-specific performance analysis
- **Match History**: Detailed match records with pagination
- **Community Features**: Leaderboards, player search, recent activity feed
- **Real-time GSI**: Live match tracking (when configured)

### Dota 2 Dashboard
- **Match Analysis**: Detailed match history and performance
- **Hero Statistics**: Win rates, KDA, and performance per hero
- **Behavior Metrics**: Behavior score and commend tracking
- **Performance Trends**: Playtime and performance over time
- **Detailed Hero Stats**: Deep dive into individual hero performance

### Steam Marketplace
- **Item Search**: Advanced search with filters and bulk search
- **Price Tracking**: Real-time prices and historical charts
- **Watchlist**: Personal item tracking with price monitoring (30 items per user limit)
- **Price Alerts**: Automatic notifications for price drops with customizable alert settings
- **Categories**: Browse items by game and category
- **Item Details**: Comprehensive item information and market trends

### Community Forums
- **Discussion System**: Create posts, add comments, nested replies
- **Content Interaction**: Like posts and comments
- **Moderation**: Report inappropriate content
- **User Posts**: View your own posts and comments
- **Category Organization**: Browse by topic categories
- **Real-time Updates**: Live notification of replies and comments if someone interacts with your content

### User Settings
- **Steam Authentication**: Secure login via Steam OAuth
- **User Settings**: Customize notification preferences and privacy
- **Gmail Integration**: Optional email notifications
- **Data Export**: Download your data (GDPR compliance)
- **Notification Preferences**: In-app notification management

### Admin Dashboard
- **Moderation Tools**: Manage reports, users, and content
- **User Management**: Apply suspensions, warnings, view moderation status
- **Content Management**: Delete posts/comments with cascade
- **Bulk Operations**: Resolve multiple reports, bulk delete
- **Statistics**: Aggregated overview of platform activity
- **Paginated Lists**: Efficient browsing of users, posts, comments, reports

## 🛠️ Technology Stack

### Core
- **React 19** - Latest React with improved performance
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing

### State Management
- **Redux Toolkit** - Simplified Redux with modern patterns
- **TanStack Query** - Server state management and caching
- **Context API** - Authentication and notification context

### UI & Visualization
- **Recharts** - Composable charting library
- **Framer Motion** - Animation library
- **React Hot Toast** - Toast notifications
- **React Icons** - Icon library

### Data & API
- **Axios** - HTTP client with interceptors
- **Firebase Client SDK** - Firestore real-time database
- **XLSX** - Excel export functionality


## ⚙️ Configuration

### Environment Variables

Create `.env` file in `frontend/` directory:

```env
# Firebase Client SDK
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

# API Configuration
VITE_API_BASE_URL=http://localhost:3000

# Production (uncomment for production)
# VITE_API_BASE_URL=https://your-backend.herokuapp.com
```

### Key Configuration Files

**Firebase** (`src/config/firebase.js`):
- Firebase client SDK initialization
- Firestore database connection
- Used by authentication and data services

**API** (`src/services/api.js`):
- Axios instance configuration
- Request/response interceptors
- Base URL and headers setup

**Routing** (`src/App.jsx`):
- React Router configuration
- Protected and public routes
- Layout structure

**Tailwind** (`tailwind.config.js`):
- Custom theme colors
- Extended utilities
- Plugin configuration

### Service Architecture

The frontend uses a layered service architecture:

1. **Request Queue** (`requestQueue.js`): Throttles API calls to prevent rate limiting
2. **API Cache** (`apiCache.js`): Caches API responses with TTL
3. **Image Cache** (`imageCache.js`): Caches images from CDN with retry logic
4. **Background Refresh** (`backgroundRefresh.js`): Refreshes stale data automatically
5. **Cache Manager** (`cacheManager.js`): Coordinates all caching layers

## 🏃‍♂️ Getting Started

### Installation (Make sure you are in frontend folder)

```bash
# Install dependencies
npm install

# Create .env file
# Add required environment variables (see Configuration section)
```

### Development

```bash
# Start development server
npm run dev
# App runs on http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### First Run

1. **Start Backend**: Ensure backend is running on configured API URL
2. **Access App**: Open http://localhost:5173 in browser
3. **Login**: Click "Login with Steam" to authenticate
4. **Explore**: Navigate to CS2, Dota 2, Marketplace, or Forums

## 🧩 Component Architecture

### Page Components

| Component | Purpose |
|-----------|---------|
| `Home.jsx` | Landing page with features overview |
| `Cs2Dashboard.jsx` | CS2 statistics and community features |
| `Dota2Dashboard.jsx` | Dota 2 match history and analytics |
| `PlayerProfile.jsx` | Dota 2 player profile page |
| `PlayerHeroes.jsx` | Dota 2 hero statistics page |
| `DetailedHeroStats.jsx` | Deep dive into specific hero |
| `MatchDetails.jsx` | Detailed match information |
| `MarketPlace.jsx` | Steam marketplace features |
| `ForumPage.jsx` | Community forum listing |
| `PostDetails.jsx` | Forum post detail view |
| `UserSettings.jsx` | User preferences and settings |
| `AdminDashboard.jsx` | Admin moderation interface |
| `NotificationsAll.jsx` | Notification center |

### Reusable Components

**Statistics**:
- `CS2ProfileData.jsx` - CS2 player stats display
- `CS2CommunityStats.jsx` - Leaderboards, search, activity
- `PerformanceSummary.jsx` - Player performance overview

**UI Components**:
- `LoadingSpinner.jsx` - Loading indicators
- `ErrorMessage.jsx` - Error display with retry
- `NotificationBell.jsx` - Notification icon with badge
- `SearchBar.jsx` - Search input component
- `HeroImage.jsx` - Hero image with lazy loading
- `TeamPlayersTable.jsx` - Team composition table

**Features**:
- `EmailConnection.jsx` - Gmail integration UI
- `PriceSimulator.jsx` - Price alert testing
- `CacheStatusDashboard.jsx` - Cache monitoring
- `NotAuthenticated.jsx` - Auth required message

### Context Providers

**AuthContext** (`src/context/AuthContext.jsx`):
- User authentication state
- Steam OAuth integration
- Session management
- Protected route logic

**NotificationContext** (`src/context/NotificationContext.jsx`):
- Real-time notification updates via SSE
- Notification count tracking
- Toast notifications
- Notification preferences

## 🎨 Styling & Theming

### Tailwind CSS
- **Dark Theme**: Primary color scheme
- **Responsive**: Mobile-first breakpoints
- **Custom Colors**: Brand-specific palette
- **Utilities**: Extended utility classes

### Animations
- **Framer Motion**: Page transitions and micro-interactions
- **CSS Transitions**: Hover states and loading states
- **Loading Skeletons**: Content placeholders



## 🏗️ Build & Deployment

### Production Build

```bash
# Create optimized production build
npm run build
# Output in dist/

# Preview production build locally
npm run preview
```

### Deployment Options

**Vercel** (⭐ Recommended):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Netlify**:
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Other Platforms**:
- **AWS S3 + CloudFront**: Static hosting
- **Firebase Hosting**: Google's hosting
- **GitHub Pages**: Free hosting for public repos

### Environment Variables for Production

Set these in your deployment platform:
- All `VITE_*` variables from `.env`
- Update `VITE_API_BASE_URL` to production backend URL

### Build Optimization

Vite automatically:
- ✅ Minifies JavaScript and CSS
- ✅ Tree-shakes unused code
- ✅ Code splits by route
- ✅ Optimizes images
- ✅ Generates source maps

## 📝 Contributing

### Development Guidelines

**React Best Practices**:
- Use functional components with hooks
- Implement error boundaries for robustness
- Use PropTypes or TypeScript for type checking
- Keep components small and focused
- Extract reusable logic into custom hooks

**Code Style**:
- Follow ESLint configuration
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep files under 300 lines when possible

**State Management**:
- Use local state for UI-only state
- Use Context for shared app state (auth, notifications)
- Use Redux Toolkit for complex global state
- Use TanStack Query for server state

**Performance**:
- Implement lazy loading for routes
- Use React.memo for expensive components
- Optimize re-renders with useCallback and useMemo
- Monitor bundle size with `npm run build`

### Pull Request Checklist

- [ ] Code follows ESLint rules
- [ ] Components are responsive (mobile/desktop)
- [ ] Error states are handled
- [ ] Loading states are implemented
- [ ] No console errors or warnings
- [ ] Documentation updated if needed
- [ ] Tested in development environment

## 🔧 Troubleshooting

### Common Issues

**API Connection Fails**:
- Verify backend is running
- Check `VITE_API_BASE_URL` in `.env`
- Check CORS configuration on backend

**Firebase Errors**:
- Verify Firebase credentials in `.env`
- Check Firebase project configuration
- Ensure Firestore is enabled

**Build Errors**:
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf .vite`
- Check for incompatible dependencies

**Images Not Loading**:
- Check network connectivity
- Verify CDN URLs are accessible
- Check browser console for errors

## 📚 Additional Resources

- [React Documentation](https://react.dev/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [TanStack Query](https://tanstack.com/query/latest)

## 📄 License

MIT License - See root LICENSE file for details.

---

**Frontend maintained with ❤️ using modern React 19 and Vite**
