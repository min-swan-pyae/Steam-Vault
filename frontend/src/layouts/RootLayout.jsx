import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import NotificationBell from '../components/NotificationBell'

export default function RootLayout() {
  const { user, loading, login, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full">
      {/* Navigation */}
      <nav className="w-full bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex-shrink-0">
                <span className="text-lg lg:text-xl font-bold text-blue-500">SteamVault</span>
              </Link>
              <div className="hidden lg:block">
                <div className="ml-6 xl:ml-10 flex items-baseline space-x-2 xl:space-x-4">
                  <NavLink to="/dota2">Dota 2</NavLink>
                  <NavLink to="/cs2">CS2</NavLink>
                  <NavLink to="/marketplace">Marketplace</NavLink>
                  <NavLink to="/forum">Forum</NavLink>
                  {user && (user.role === 'admin' || (Array.isArray(user.roles) && user.roles.includes('admin'))) && (
                    <NavLink to="/admin">Admin</NavLink>
                  )}
                </div>
              </div>
            </div>
            
            <div className="hidden lg:block">
              <div className="flex items-center">
                {loading ? (
                  <div className="text-gray-300">Loading...</div>
                ) : user ? (
                  <div className="flex items-center space-x-2 xl:space-x-4">
                    <NotificationBell />
                    <img
                      src={user.photos?.[0]?.value}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-sm font-medium hidden xl:inline">{user.displayName}</span>
                    <Link 
                      to="/settings"
                      className="px-2 xl:px-3 py-2 rounded-md text-sm font-medium bg-gray-600 hover:bg-gray-700 transition-colors"
                    >
                      <span className="hidden xl:inline">⚙️ Settings</span>
                      <span className="xl:hidden">⚙️</span>
                    </Link>
                    <button
                      onClick={logout}
                      className="px-2 xl:px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={login}
                    className="flex items-center px-4 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 22c-5.5 0-10-4.5-10-10S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/>
                      <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                    </svg>
                    Login with Steam
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none"
              >
                <svg
                  className="h-6 w-6"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          <div className={`${isMenuOpen ? 'block' : 'hidden'} lg:hidden pb-3`}>
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <MobileNavLink to="/dota2" onClick={() => setIsMenuOpen(false)}>
                Dota 2
              </MobileNavLink>
              <MobileNavLink to="/cs2" onClick={() => setIsMenuOpen(false)}>
                CS2
              </MobileNavLink>
              <MobileNavLink to="/marketplace" onClick={() => setIsMenuOpen(false)}>
                Marketplace
              </MobileNavLink>
              <MobileNavLink to="/forum" onClick={() => setIsMenuOpen(false)}>
                Forum
              </MobileNavLink>
              {user && (user.role === 'admin' || (Array.isArray(user.roles) && user.roles.includes('admin'))) && (
                <MobileNavLink to="/admin" onClick={() => setIsMenuOpen(false)}>
                  Admin
                </MobileNavLink>
              )}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-700">
              {user ? (
                <div className="space-y-3 px-5">
                  <div className="flex items-center">
                    <img
                      src={user.photos?.[0]?.value}
                      alt={user.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="ml-3">
                      <div className="text-base font-medium">{user.displayName}</div>
                    </div>
                    <div className="ml-auto">
                      <NotificationBell />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link 
                      to="/settings"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-gray-600 hover:bg-gray-700 text-center transition-colors"
                    >
                      ⚙️ Settings
                    </Link>
                    <button
                      onClick={logout}
                      className="px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-5">
                  <button
                    onClick={login}
                    className="w-full flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-green-600 hover:bg-green-700"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.6 0 12 0zm0 22c-5.5 0-10-4.5-10-10S6.5 2 12 2s10 4.5 10 10-4.5 10-10 10z"/>
                      <path d="M12 6c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z"/>
                    </svg>
                    Login with Steam
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="w-full">
        <Outlet />
      </main>
    </div>
  )
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="px-3 py-2 rounded-md text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ to, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-gray-700"
    >
      {children}
    </Link>
  )
} 