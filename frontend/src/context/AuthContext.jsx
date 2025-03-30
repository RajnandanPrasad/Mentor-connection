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

  const updateUserData = (updatedUserData) => {
    try {
      console.log('AuthContext: Updating user data:', updatedUserData);
      
      // Validate that we have the minimum required fields
      if (!updatedUserData || !updatedUserData._id) {
        console.error('AuthContext: Invalid user data for update - missing ID');
        return false;
      }
      
      // Get current user data from sessionStorage to compare
      const currentUserStr = sessionStorage.getItem('user');
      if (!currentUserStr) {
        console.error('AuthContext: No existing user data in sessionStorage');
        return false;
      }
      
      let currentUser;
      try {
        currentUser = JSON.parse(currentUserStr);
      } catch (parseError) {
        console.error('AuthContext: Error parsing current user data:', parseError);
        return false;
      }
      
      // Ensure role consistency
      if (currentUser.role !== updatedUserData.role) {
        console.warn(`AuthContext: Role mismatch - current: ${currentUser.role}, updated: ${updatedUserData.role}`);
        // Preserve the original role
        updatedUserData.role = currentUser.role;
      }
      
      // Special handling for mentor profiles
      if (updatedUserData.role === 'mentor') {
        console.log('AuthContext: Applying special handling for mentor profile update');
        
        // Preserve any critical mentor-specific fields that may not be in the updated data
        if (currentUser.mentorProfile && (!updatedUserData.mentorProfile || Object.keys(updatedUserData.mentorProfile).length === 0)) {
          console.log('AuthContext: Preserving mentorProfile data from current user');
          updatedUserData.mentorProfile = currentUser.mentorProfile;
        }
      }
      
      // Store updated data
      const serializedData = JSON.stringify(updatedUserData);
      sessionStorage.setItem('user', serializedData);
      
      // Update the auth state
      updateAuthState({
        ...auth,
        user: updatedUserData
      });
      
      console.log('AuthContext: User data updated successfully');
      return true;
    } catch (error) {
      console.error('AuthContext: Update user data error:', error);
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Initializing auth...');
        // Check for existing token and user data in sessionStorage
        const token = sessionStorage.getItem('token');
        const userStr = sessionStorage.getItem('user');
        const sessionId = sessionStorage.getItem('sessionId');
        
        console.log('AuthContext: Found session data:', {
          hasToken: !!token,
          hasUser: !!userStr,
          hasSessionId: !!sessionId
        });
        
        if (!token || !userStr || !sessionId) {
          console.log('AuthContext: Missing session data');
          if (isMounted) {
            updateAuthState(prev => ({ ...prev, loading: false }));
          }
          return;
        }

        // Parse user data
        let user;
        try {
          user = JSON.parse(userStr);
        } catch (error) {
          console.error('AuthContext: Error parsing user data:', error);
          clearAuthData();
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
              console.log('AuthContext: Session valid, updating state with user:', user);
              updateAuthState({
                isAuthenticated: true,
                user: {
                  ...user,
                  _id: user._id || user.id // Ensure _id is available
                },
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

    // Listen for storage changes in other tabs
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user' || e.key === 'sessionId') {
        initializeAuth();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = async (userData, token, sessionId) => {
    try {
      console.log('AuthContext: Logging in user:', userData);
      // Store auth data in sessionStorage
      sessionStorage.setItem('token', token);
      sessionStorage.setItem('user', JSON.stringify(userData));
      sessionStorage.setItem('sessionId', sessionId);

      // Update auth state
      updateAuthState({
        isAuthenticated: true,
        user: {
          ...userData,
          _id: userData._id || userData.id // Ensure _id is available
        },
        token,
        loading: false,
        sessionId
      });

      return true;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      clearAuthData();
      return false;
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if needed
      if (auth.token) {
        await api.post('/api/auth/logout', null, {
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'x-session-id': auth.sessionId
          }
        });
      }
    } catch (error) {
      console.error('AuthContext: Logout error:', error);
    } finally {
      clearAuthData();
    }
  };

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, updateAuthState, updateUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 