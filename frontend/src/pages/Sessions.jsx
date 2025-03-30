import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import SessionList from '../components/SessionList';
import SessionScheduler from '../components/SessionScheduler';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Loader2, AlertTriangle } from 'lucide-react';

// Component-specific error boundary
const ComponentErrorBoundary = ({ name, children }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  // Reset error state if children change
  useEffect(() => {
    setHasError(false);
    setError(null);
  }, [children]);

  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
        <h3 className="font-bold text-red-700 mb-2">Error rendering {name}</h3>
        <p className="text-sm text-red-600 mb-2">{error?.message || "Unknown error"}</p>
        <button 
          onClick={() => {
            setHasError(false);
            setError(null);
          }}
          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <React.Fragment>
      {React.Children.map(children, child => {
        return React.cloneElement(child, {
          ...child.props,
          onError: (err) => {
            console.error(`Error in ${name}:`, err);
            setError(err);
            setHasError(true);
          }
        });
      })}
    </React.Fragment>
  );
};

// Safe renderer for components
const SafeComponent = ({ name, component: Component, props = {} }) => {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  if (hasError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
        <h3 className="font-bold text-red-700 mb-2">Error in {name}</h3>
        <p className="text-sm text-red-600 mb-2">{error?.message || "Unknown error"}</p>
        <button 
          onClick={() => {
            setHasError(false);
            setError(null);
          }}
          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  try {
    // Using a div wrapper to catch potential rendering errors
    return (
      <div 
        onError={(e) => {
          console.error(`Error in ${name}:`, e);
          setError(e);
          setHasError(true);
          e.preventDefault(); // Prevent propagation
        }}
      >
        <Component 
          {...props} 
          onError={(e) => {
            console.error(`Component ${name} reported error:`, e);
            setError(e);
            setHasError(true);
          }}
        />
      </div>
    );
  } catch (e) {
    console.error(`Error rendering ${name}:`, e);
    setError(e);
    setHasError(true);
    
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <h3 className="font-bold text-red-700 mb-2">Failed to render {name}</h3>
        <p className="text-sm text-red-600">{e.message}</p>
      </div>
    );
  }
};

const Sessions = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [mentees, setMentees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [renderCount, setRenderCount] = useState(0);
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  console.log("[Sessions Page] Initializing with user:", user?.role, user?._id);
  console.log("[Sessions Page] Render count:", renderCount);

  // Force re-render function
  const forceRerender = () => {
    setRenderCount(prev => prev + 1);
  };

  useEffect(() => {
    if (!user) {
      console.log("[Sessions Page] No user found, redirecting to login");
      navigate('/login');
      return;
    }

    console.log("[Sessions Page] User authenticated:", user.role, user._id);

    // If mentor, fetch their mentees for the SessionScheduler
    if (user.role === 'mentor') {
      console.log("[Sessions Page] User is a mentor, fetching mentees");
      fetchMentees();
    } else {
      // If mentee, just end loading
      console.log("[Sessions Page] User is a mentee, no need to fetch mentees");
      setLoading(false);
    }
  }, [user, navigate, renderCount]);

  const fetchMentees = async () => {
    if (!user || !user._id) {
      console.error("[Sessions Page] Cannot fetch mentees - missing user data");
      setError("Missing user data");
      setLoading(false);
      return;
    }
    
    try {
      console.log("[Sessions Page] Fetching mentees for SessionScheduler");
      const res = await axios.get(`${apiUrl}/api/connections/mentor/${user._id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("[Sessions Page] Retrieved mentee connections:", res.data);
      
      // Map connection data to mentee objects
      const menteeData = res.data
        .filter(conn => conn.status === 'accepted')
        .map((conn) => {
          if (!conn.mentee || !conn.mentee._id) {
            console.warn("[Sessions Page] Invalid mentee data in connection:", conn);
            return null;
          }
          return {
            _id: conn.mentee._id,
            name: conn.mentee.name || "Unknown User",
            email: conn.mentee.email || "No email provided",
            connectionId: conn._id,
            status: conn.status,
            profileImage: conn.mentee.profileImage || "/default-avatar.png"
          };
        })
        .filter(mentee => mentee !== null);
      
      console.log("[Sessions Page] Processed mentee data:", menteeData);
      setMentees(menteeData);
    } catch (error) {
      console.error("[Sessions Page] Error fetching mentees:", error);
      setError(`Failed to fetch mentees: ${error.message}`);
      toast.error("Failed to fetch mentees");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
        <Header />
        <div className="flex h-[calc(100vh-80px)] items-center justify-center">
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
            <p className="mt-4 text-gray-600">Loading session data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
        <Header />
        <div className="container mx-auto px-4 py-8 flex justify-center">
          <div className="bg-red-50 p-6 rounded-lg border border-red-200 max-w-md">
            <AlertTriangle className="h-8 w-8 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Error Loading Sessions</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                forceRerender();
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render a debug component to validate UI components
  const renderDebugInfo = () => {
    if (process.env.NODE_ENV !== 'development') return null;
    
    return (
      <div className="mb-4 p-4 bg-gray-100 border border-gray-300 rounded-md text-xs">
        <h3 className="font-bold mb-2">Debug Info</h3>
        <p>User Role: {user?.role || 'Not set'}</p>
        <p>User ID: {user?._id || 'Not set'}</p>
        <p>Token: {token ? 'Present' : 'Missing'}</p>
        <p>Render Count: {renderCount}</p>
        {user?.role === 'mentor' && (
          <p>Mentees Loaded: {mentees.length}</p>
        )}
        <div className="mt-2">
          <button
            onClick={forceRerender}
            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          >
            Force Refresh
          </button>
        </div>
      </div>
    );
  };

  // Try each component individually
  const renderAppropriateComponent = () => {
    if (user.role === 'mentor') {
      console.log("[Sessions Page] Attempting to render SessionScheduler");
      try {
        return (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Rendering SessionScheduler with {mentees.length} mentees</h3>
            <div className="bg-gray-50 p-2 rounded-md mb-4 overflow-hidden">
              <div>
                <SessionScheduler 
                  userId={user._id}
                  userRole="mentor"
                  mentees={mentees}
                />
              </div>
            </div>
          </div>
        );
      } catch (err) {
        console.error("Failed to render SessionScheduler:", err);
        return (
          <div className="p-4 bg-red-100 rounded-md border border-red-300">
            <h3 className="font-bold text-red-700 mb-2">Error rendering SessionScheduler</h3>
            <p className="text-sm">{err.message}</p>
          </div>
        );
      }
    } else {
      console.log("[Sessions Page] Attempting to render SessionList");
      try {
        return (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-3">Rendering SessionList</h3>
            <div className="bg-gray-50 p-2 rounded-md mb-4">
              <SessionList 
                userId={user._id}
                userRole="mentee"
                key={`session-list-${renderCount}`}
              />
            </div>
          </div>
        );
      } catch (err) {
        console.error("Failed to render SessionList:", err);
        return (
          <div className="p-4 bg-red-100 rounded-md border border-red-300">
            <h3 className="font-bold text-red-700 mb-2">Error rendering SessionList</h3>
            <p className="text-sm">{err.message}</p>
          </div>
        );
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {renderDebugInfo()}
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-4 bg-primary-50 border-b border-primary-100">
              <h2 className="text-2xl font-bold text-primary-900">
                {user.role === 'mentor' ? 'Session Scheduler' : 'Your Sessions'}
              </h2>
              <p className="text-neutral-500">
                {user.role === 'mentor' 
                  ? 'Schedule and manage mentoring sessions with your mentees' 
                  : 'View and join your scheduled mentoring sessions'}
              </p>
            </div>
            
            <div className="p-6">
              {/* Individual component rendering for better error isolation */}
              {renderAppropriateComponent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sessions; 