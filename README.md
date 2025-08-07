# Steam Vault - Professional Gaming Statistics Platform

## 🎮 Overview

Steam Vault is a comprehensive gaming statistics platform that provides professional-grade analytics for Counter-Strike 2 (CS2) and Dota 2 players. Built with modern web technologies and integrated with Steam's APIs, it offers detailed performance tracking, match history, and competitive insights.

## ✨ Features

### 🔫 Counter-Strike 2 (CS2)
- **Comprehensive Statistics**: Kill/Death ratios, headshot percentages, win rates, and more
- **Real-time Data**: Game State Integration (GSI) for live match tracking
- **Professional Display**: Statistics formatted like professional sites (CSSTATS.GG)
- **Historical Data**: Complete match history from Steam API
- **Weapon Analytics**: Detailed weapon performance statistics
- **Map Statistics**: Performance analysis across different maps
- **Rank Tracking**: Estimated rank based on performance metrics
- **Community Features**: Leaderboards, player search, and recent activity

### 🏆 Dota 2
- **Match History**: Detailed match tracking and analysis
- **Hero Performance**: Comprehensive hero statistics and trends
- **Meta Analysis**: Current meta insights and recommendations
- **Player Behavior**: Toxicity tracking and improvement suggestions
- **Performance Trends**: Long-term performance analysis
- **Enhanced Analytics**: Advanced statistical breakdowns

### 🚀 Technical Features
- **Modern UI**: Beautiful, responsive design with dark theme
- **Real-time Updates**: Live data synchronization
- **Caching System**: Intelligent caching for optimal performance
- **Authentication**: Secure Steam OAuth integration
- **Data Visualization**: Interactive charts and graphs
- **Mobile Responsive**: Works perfectly on all devices

## 🛠️ Technology Stack

### Frontend
- **React 18**: Modern React with hooks and functional components
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework
- **Redux Toolkit**: State management
- **React Router**: Client-side routing
- **Recharts**: Data visualization library

### Backend
- **Node.js**: Server-side JavaScript runtime
- **Express.js**: Web application framework
- **Firebase**: Real-time database and authentication
- **Steam Web API**: Official Steam API integration
- **Passport.js**: Authentication middleware
- **Game State Integration**: Real-time CS2 match data

### Database
- **Firebase Firestore**: NoSQL database for real-time data
- **Steam Web API**: Historical match data
- **Intelligent Caching**: Multi-layer caching system

## 📋 Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Steam Web API Key** ([Get one here](https://steamcommunity.com/dev/apikey))
- **Firebase Project** ([Create one here](https://console.firebase.google.com/))

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/min-swan-pyae/Steam-Vault.git
cd Steam-Vault
```

### 2. Install Dependencies

#### Backend
```bash
cd backend
npm install
```

#### Frontend
```bash
cd frontend
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env)
Create a `.env` file in the `backend` directory:
```env
# Steam API Configuration
STEAM_API_KEY=your_steam_api_key_here

# Firebase Configuration
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour_private_key_here\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your_client_email@your_project.iam.gserviceaccount.com



# Server Configuration
PORT=3000
BASE_URL=http://localhost:3000

# Session Configuration
SESSION_SECRET=your_session_secret_here
```

#### Frontend Environment (.env)
Create a `.env` file in the `frontend` directory:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id


```

### 4. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Authentication with Google provider
4. Create a service account and download the JSON key
5. Extract the values for your backend `.env` file

### 5. Steam API Setup

1. Get your Steam Web API key from [Steam Community](https://steamcommunity.com/dev/apikey)
2. Add it to your backend `.env` file
3. Ensure your domain is authorized (for production)

## 🏃‍♂️ Running the Application

### Development Mode

#### Start Backend Server
```bash
cd backend
npm start
```
The backend will run on `http://localhost:3000`

#### Start Frontend Server
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:5173`

### Production Mode

#### Build Frontend
```bash
cd frontend
npm run build
```

#### Start Production Server
```bash
cd backend
npm run start:prod
```

## 🎯 Usage

### 1. Authentication
- Navigate to the application
- Click "Login with Steam"
- Authorize the application through Steam

### 2. CS2 Statistics
- Go to the CS2 Dashboard
- View comprehensive statistics including:
  - Kill/Death ratios
  - Win rates
  - Headshot percentages
  - Weapon statistics
  - Map performance
  - Match history

### 3. Game State Integration (GSI) Setup
For real-time CS2 match tracking:

1. Navigate to your CS2 installation folder
2. Go to `csgo/cfg/` directory
3. Create a file named `gamestate_integration_steamvault.cfg`
4. Add the following configuration:

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

Replace `YOUR_STEAM_ID` with your actual Steam ID.

### 4. Dota 2 Statistics
- Access Dota 2 dashboard
- View match history and hero performance
- Analyze meta trends and recommendations

### 5. Community Features
- Browse leaderboards
- Search for other players
- View recent community activity

## 🔧 Configuration

### Cache Configuration
The application uses intelligent caching:
- Steam API data: 30-60 minutes
- User statistics: 10 minutes
- Leaderboards: 10 minutes
- Recent activity: 2 minutes

### Rate Limiting
- Steam API: Respects Steam's rate limits
- Firebase: Optimized for concurrent users
- Caching: Reduces API calls significantly

## 📊 API Endpoints

### CS2 Endpoints
- `GET /api/cs2/player/:steamId/profile` - Player profile data
- `GET /api/cs2/player/:steamId/stats` - Player statistics
- `GET /api/cs2/player/:steamId/matches` - Match history
- `GET /api/cs2/player/:steamId/weapons` - Weapon statistics
- `GET /api/cs2/player/:steamId/maps` - Map performance
- `GET /api/cs2/leaderboard` - Community leaderboard
- `GET /api/cs2/search` - Player search
- `GET /api/cs2/activity` - Recent activity
- `POST /api/cs2/gsi/:steamId` - Game State Integration endpoint

### Dota 2 Endpoints
- `GET /api/dota/player/:steamId/profile` - Player profile
- `GET /api/dota/player/:steamId/matches` - Match history
- `GET /api/dota/player/:steamId/heroes` - Hero statistics
- `GET /api/dota/meta` - Meta analysis

### Authentication Endpoints
- `GET /auth/steam` - Steam OAuth login
- `GET /auth/steam/callback` - Steam OAuth callback
- `GET /auth/logout` - Logout
- `GET /auth/user` - Current user info

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### API Testing
Use the provided test endpoints:
- `GET /api/cs2/test` - Test CS2 API
- `GET /api/dota/test` - Test Dota 2 API

## 🚀 Deployment

### Environment Variables
Ensure all production environment variables are set:
- Database connections
- API keys
- Session secrets
- CORS origins

### Build Process
```bash
# Build frontend
cd frontend
npm run build

# Start production server
cd backend
npm start
```

### Recommended Hosting
- **Backend**: Heroku, DigitalOcean, AWS
- **Frontend**: Vercel, Netlify, AWS S3
- **Database**: Firebase (already configured)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Maintain consistent code style

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Steam Web API** for providing comprehensive gaming data
- **Firebase** for real-time database and authentication
- **Valve Corporation** for Game State Integration
- **React Team** for the excellent frontend framework
- **Tailwind CSS** for the utility-first styling approach

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the [documentation](docs/)
- Review the [FAQ](docs/FAQ.md)

## 🔄 Updates

The application is actively maintained with regular updates:
- New features and improvements
- Bug fixes and performance optimizations
- Security updates
- Steam API compatibility updates

---

**Made with ❤️ by the Steam Vault Team**

```


