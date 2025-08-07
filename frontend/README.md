# Steam Vault Frontend

Professional gaming statistics frontend built with React, Vite, and Tailwind CSS.

## 🚀 Features

### User Interface
- **Modern Design**: Dark-themed, responsive UI
- **Interactive Components**: Real-time data visualization
- **Mobile Responsive**: Works perfectly on all devices
- **Professional Layout**: Clean, intuitive navigation

### CS2 Dashboard
- **Comprehensive Statistics**: K/D ratios, win rates, headshot percentages
- **Weapon Analytics**: Detailed weapon performance charts
- **Map Performance**: Map-specific statistics and analysis
- **Match History**: Historical match data with detailed breakdowns
- **Community Features**: Leaderboards, player search, recent activity
- **Real-time Updates**: Live match tracking with GSI integration

### Dota 2 Dashboard
- **Match Analysis**: Detailed match history and performance
- **Hero Statistics**: Comprehensive hero performance tracking
- **Meta Insights**: Current meta analysis and recommendations
- **Behavior Tracking**: Player behavior metrics and improvements
- **Trend Analysis**: Performance trends over time

## 🛠️ Technology Stack

- **React 18**: Modern React with hooks and functional components
- **Vite**: Lightning-fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **Redux Toolkit**: Efficient state management
- **React Router DOM**: Client-side routing
- **Recharts**: Beautiful, composable charts for data visualization
- **Axios**: HTTP client for API requests

## 📁 Project Structure

```
src/
├── app/                    # Redux store configuration
│   └── store.js
├── assets/                 # Static assets
│   └── react.svg
├── components/             # Reusable UI components
│   ├── stats/             # Statistics-specific components
│   ├── CacheStatusDashboard.jsx
│   ├── CS2CommunityStats.jsx
│   ├── CS2ProfileData.jsx
│   ├── ErrorMessage.jsx
│   ├── LoadingSpinner.jsx
│   └── ...
├── config/                # Configuration files
│   ├── firebase.js
│   ├── heroConfig.js
│   └── heroes.json
├── context/               # React context providers
│   └── AuthContext.jsx
├── features/              # Redux slices and API
│   ├── api/
│   ├── auth/
│   └── stats/
├── hooks/                 # Custom React hooks
│   └── useCache.js
├── layouts/               # Layout components
│   └── RootLayout.jsx
├── pages/                 # Page components
│   ├── Cs2Dashboard.jsx
│   ├── Dota2Dashboard.jsx
│   ├── Home.jsx
│   └── ...
├── services/              # API and service layers
│   ├── api.js
│   ├── apiCache.js
│   ├── cs2Service.js
│   ├── dotaService.js
│   └── ...
├── utils/                 # Utility functions
├── App.jsx               # Main App component
└── main.jsx              # Entry point
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Install dependencies**:
```bash
npm install
```

2. **Environment setup**:
Create a `.env` file in the frontend directory:
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_API_BASE_URL=http://localhost:3000
```

3. **Start development server**:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Available Scripts

- **`npm run dev`**: Start development server with hot reload
- **`npm run build`**: Build for production
- **`npm run preview`**: Preview production build locally
- **`npm run lint`**: Run ESLint for code quality
- **`npm run lint:fix`**: Fix ESLint issues automatically

## 🎨 Component Architecture

### Core Components

#### `CS2ProfileData.jsx`
Professional CS2 statistics display with:
- Comprehensive statistics overview
- Weapon performance analytics
- Map-specific performance data
- Rank estimation and progression
- Data quality indicators
- GSI setup instructions

#### `CS2CommunityStats.jsx`
Community features including:
- Player leaderboards
- Player search functionality
- Recent activity feed
- Interactive community metrics

#### `Dota2Dashboard.jsx`
Complete Dota 2 analytics with:
- Match history analysis
- Hero performance tracking
- Meta analysis and insights
- Behavioral metrics

### Utility Components

#### `LoadingSpinner.jsx`
Consistent loading states across the application

#### `ErrorMessage.jsx`
Standardized error display with retry functionality

#### `NotAuthenticated.jsx`
Authentication required messaging

## 🔧 Configuration

### Firebase Configuration
Firebase is configured in `src/config/firebase.js` for:
- Authentication with Steam OAuth
- Real-time database connections
- User session management

### API Configuration
API endpoints are centralized in `src/services/api.js`:
- Base URL configuration
- Request/response interceptors
- Error handling
- Authentication headers

### Routing Configuration
React Router is configured in `App.jsx`:
- Protected routes for authenticated users
- Public routes for general access
- Error boundaries and 404 handling

## 📱 Responsive Design

The application is fully responsive with:
- **Mobile-first approach**: Optimized for mobile devices
- **Tablet support**: Perfect display on tablets
- **Desktop optimization**: Full-featured desktop experience
- **Flexible layouts**: Adapts to any screen size

## 🎯 State Management

### Redux Toolkit
- **Centralized state**: All application state in Redux store
- **Async actions**: RTK Query for API calls
- **Caching**: Intelligent data caching and synchronization
- **DevTools**: Redux DevTools integration for debugging

### Context API
- **Authentication**: User authentication state
- **Theme**: Dark/light theme management
- **Preferences**: User preference storage

## 🔄 Data Flow

1. **User interaction** triggers component events
2. **Actions** are dispatched to Redux store
3. **API calls** are made through service layer
4. **Responses** update Redux state
5. **Components** re-render with new data
6. **Cache** stores data for offline access

## 🎨 Styling

### Tailwind CSS
- **Utility-first**: Rapid development with utility classes
- **Responsive**: Mobile-first responsive design
- **Dark theme**: Professional dark theme throughout
- **Custom components**: Consistent design system

### Component Styling
- **Consistent spacing**: Standardized margins and padding
- **Color palette**: Professional gaming-focused colors
- **Typography**: Clear, readable font hierarchy
- **Animations**: Smooth transitions and micro-interactions

## 🧪 Testing

### Test Setup
```bash
npm run test
```

### Testing Strategy
- **Unit tests**: Component testing with React Testing Library
- **Integration tests**: Page-level functionality testing
- **E2E tests**: Full application flow testing
- **Visual tests**: Screenshot comparison testing

## 🚀 Build and Deployment

### Production Build
```bash
npm run build
```

### Build Optimization
- **Code splitting**: Automatic code splitting for optimal loading
- **Tree shaking**: Remove unused code
- **Asset optimization**: Compressed images and assets
- **Bundle analysis**: Visualize bundle size and composition

### Deployment Options
- **Vercel**: Zero-configuration deployment
- **Netlify**: JAMstack deployment platform
- **AWS S3**: Static website hosting
- **Custom server**: Self-hosted deployment

## 🔧 Development Tools

### ESLint Configuration
Configured for React best practices:
```bash
npm run lint
```

### Prettier Integration
Code formatting with Prettier:
```bash
npm run format
```

### VS Code Settings
Recommended extensions:
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Auto Rename Tag
- Bracket Pair Colorizer

## 📊 Performance

### Optimization Strategies
- **Lazy loading**: Route-based code splitting
- **Memoization**: React.memo for expensive components
- **Virtual scrolling**: Efficient large list rendering
- **Image optimization**: WebP format with fallbacks
- **Caching**: Service worker for offline functionality

### Performance Monitoring
- **Web Vitals**: Core Web Vitals tracking
- **Bundle analysis**: Regular bundle size monitoring
- **Performance profiling**: React DevTools profiler
- **Lighthouse audits**: Regular performance audits

## 🤝 Contributing

### Development Guidelines
1. Follow React best practices
2. Use functional components with hooks
3. Implement proper error boundaries
4. Write comprehensive tests
5. Follow the established code style

### Code Style
- Use meaningful component and variable names
- Implement proper TypeScript types (if applicable)
- Follow the established folder structure
- Document complex logic with comments

### Pull Request Process
1. Create a feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request with description
5. Address review feedback

## 📞 Support

For frontend-specific issues:
- Check component documentation
- Review console errors
- Verify environment variables
- Test API connectivity

## 🔄 Recent Updates

- Enhanced CS2 statistics display
- Improved mobile responsiveness
- Added real-time data synchronization
- Optimized bundle size
- Updated dependencies

---

**Frontend maintained with ❤️ using modern React practices**+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
