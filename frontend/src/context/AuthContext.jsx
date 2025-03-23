import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [auth, setAuth] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
    loading: true,
    sessionId: null
  });

  const updateAuthState = (newState) => {
    console.log('AuthContext: Updating auth state:', newState);
    setAuth(newState);
  };

  const clearAuthData = () => {
    console.log('AuthContext: Clearing auth data');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('sessionId');
    updateAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      sessionId: null
    });
    navigate('/login');
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth...');
        // Check for existing token and user data in sessionStorage
        const token = sessionStorage.getItem('token');
        const user = JSON.parse(sessionStorage.getItem('user') || 'null');
        const sessionId = sessionStorage.getItem('sessionId');
        
        console.log('AuthContext: Found session data:', {
          hasToken: !!token,
          hasUser: !!user,
          hasSessionId: !!sessionId,
          userRole: user?.role
        });
        
        if (!token || !user || !sessionId) {
          console.log('AuthContext: Missing session data');
          if (isMounted) {
            updateAuthState(prev => ({ ...prev, loading: false }));
          }
          return;
        }

        // Verify token validity with backend
        console.log('AuthContext: Verifying token...');
        const response = await api.get('/api/auth/verify-token', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-session-id': sessionId
          }
        });
        
        console.log('AuthContext: Token verification response:', response.data);
        
        if (isMounted) {
          if (response.data.valid) {
            // Verify session ID matches
            if (response.data.sessionId === sessionId) {
              console.log('AuthContext: Session valid, updating state with user role:', user.role);
              updateAuthState({
                isAuthenticated: true,
                user,
                token,
                loading: false,
                sessionId
              });
            } else {
              console.log('AuthContext: Session ID mismatch, clearing session');
              clearAuthData();
            }
          } else {
            console.log('AuthContext: Invalid token, clearing session');
            clearAuthData();
          }
        }
      } catch (error) {
        console.error('AuthContext: Initialization error:', error);
        if (isMounted) {
          clearAuthData();
        }
      }
    };

    initializeAuth();

    // Listen for storage events from other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user' || e.key === 'sessionId') {
        if (e.newValue === null && isMounted) {
          clearAuthData();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [navigate]);

  const login = async (userData, token, sessionId) => {
    try {
      console.log('AuthContext: Starting login process', {
        userData,
        hasToken: !!token,
        hasSessionId: !!sessionId,
        userRole: userData?.role
      });

      // Store data in sessionStorage first
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('sessionId', sessionId);

      // Then update auth state
      updateAuthState({
        isAuthenticated: true,
        user: userData,
        token,
        loading: false,
        sessionId
      });

      console.log('AuthContext: Auth state updated, navigating based on role:', userData.role);
      // Navigate based on role
      if (userData.role === 'mentor') {
        console.log('AuthContext: Navigating to mentor dashboard');
        navigate('/mentor-dashboard');
      } else {
        console.log('AuthContext: Navigating to mentee dashboard');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      clearAuthData();
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('AuthContext: Logging out');
      clearAuthData();
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 