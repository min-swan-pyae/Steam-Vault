import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from './app/store'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import Dota2Dashboard from './pages/Dota2Dashboard'
import PlayerProfile from './pages/PlayerProfile'
import PlayerHeroes from './pages/PlayerHeroes'
import MatchDetails from './pages/MatchDetails'
import ErrorPage from './pages/ErrorPage'
import Cs2Dashboard from './pages/Cs2Dashboard'
import MarketPlace from './pages/MarketPlace'
import ForumPage from './pages/ForumPage'
import PostDetails from './pages/PostDetails'
import UserSettings from './pages/UserSettings'
import AdminDashboard from './pages/AdminDashboard'
// Removed WeeklySummary & MarketTrends pages per scope reduction
import NotificationsAll from './pages/NotificationsAll'
import PerformanceSummary from './components/stats/PerformanceSummary'
import DetailedHeroStats from './pages/DetailedHeroStats'
import EnhancedMetaAnalysis from './components/stats/EnhancedMetaAnalysis'
import './services/cacheManager.js'

// Create a client
const queryClient = new QueryClient()

function App() {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <Router>
            <Routes>
              <Route path="/" element={<RootLayout />}>
                <Route index element={<Home />} />
                <Route path="dota2">
                  <Route index element={<Dota2Dashboard />} />
                  <Route path="players/:steamId" element={<PlayerProfile />} />
                  <Route path="players/:steamId/heroes" element={<PlayerHeroes />} />
                  <Route path="players/:steamId/hero/:heroId" element={<DetailedHeroStats />} />
                  <Route path="match/:matchId" element={<MatchDetails />} />
                </Route>
                <Route path="cs2">
                  <Route index element={<Cs2Dashboard/>} />
                  <Route path="players/:steamId" element={<Cs2Dashboard />} />
                </Route>
                <Route path="marketplace" element={<MarketPlace/>} />
                <Route path="forum" element={<ForumPage/>} />
                <Route path="forum/posts/:postId" element={<PostDetails/>} />
                <Route path="settings" element={<UserSettings/>} />
                <Route path="admin" element={<AdminDashboard/>} />
                <Route path="notifications" element={<NotificationsAll/>} />
              </Route>
              <Route path="/error" element={<ErrorPage />} />
            </Routes>
          </Router>
          <Toaster position="top-right" />
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </Provider>
  )
}

export default App
