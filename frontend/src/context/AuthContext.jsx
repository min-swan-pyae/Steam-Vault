import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser, setLoading, setError, clearUser } from '../features/auth/authSlice';
import { toast } from 'react-hot-toast';

// Helper functions
const loginWithSteam = () => {
  window.location.href = 'http://localhost:3000/auth/steam';
};

const logoutUser = async () => {
  try {
    window.location.href = 'http://localhost:3000/auth/logout';
  } catch (error) {
    console.error('Logout error:', error);
    toast.error('Failed to log out. Please try again.');
  }
};

// Store checkUser function for external use
let globalCheckUser = null;

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const { user, loading } = useSelector((state) => state.auth);

  const checkUser = async () => {
    dispatch(setLoading(true));
    try {
      console.log('Checking user authentication status...');
      const response = await fetch('http://localhost:3000/auth/user', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors'
      });
      
      if (!response.ok) {
        throw new Error(`Authentication check failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Auth check response:', data);
      
      if (data.authenticated && data.user) {
        console.log('User is authenticated:', data.user.displayName || data.user.id);
        
        // Make sure we have steamId properly mapped
        const user = {
          ...data.user,
          steamId: data.user.steamId || data.user.id  // Ensure steamId is always set
        };
        
        dispatch(setUser(user));
      } else {
        console.log('User is not authenticated');
        dispatch(clearUser());
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      toast.error('Authentication check failed. Please try again later.');
      dispatch(setError(error.message));
      dispatch(clearUser());
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Store for external use
  useEffect(() => {
    globalCheckUser = checkUser;
  }, [dispatch]);

  useEffect(() => {
    checkUser();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return children;
}

// Create a named function for useAuth
function useAuth() {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  const login = () => {
    loginWithSteam();
  };

  const logout = () => {
    logoutUser();
    dispatch(clearUser());
  };

  const refreshAuth = () => {
    if (globalCheckUser) {
      globalCheckUser();
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    refreshAuth,
    isAuthenticated: !!user
  };
}

// Export the hook
export { useAuth }; 