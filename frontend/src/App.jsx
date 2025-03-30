import React from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Suspense, useEffect, useState } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import MentorDashboard from "./pages/MentorDashboard";
import MentorMatching from "./pages/MentorMatching";
import Chat from "./pages/Chat";
import Connections from "./pages/Connections";
import Groups from "./pages/Groups";
import MenteeDashboard from "./pages/MenteeDashboard";
import GoalTracker from "./pages/GoalTracker";
import UserProfile from "./pages/UserProfile";
import Sessions from "./pages/Sessions";

import ProtectedRoute from "./components/ProtectedRoute";
import MentorProfile from './components/MentorProfile/MentorProfile';
import { AuthProvider } from './context/AuthContext';
import { initSocket, disconnectSocket } from './services/socket';
import { ToastProvider } from './components/ui/toast';
import { Toaster } from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

// Error boundary component for catching rendering errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-center mb-4">Something went wrong</h1>
            <div className="bg-gray-100 p-4 rounded overflow-auto max-h-48 mb-4">
              <p className="text-sm font-mono text-red-700">
                {this.state.error?.toString()}
              </p>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                window.location.href = '/';
              }}
              className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Return to Home
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Page not found component
const NotFound = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-gray-600 mb-6">Page Not Found</h2>
        <p className="text-gray-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

function App() {
  const [appError, setAppError] = useState(null);
  
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      try {
        initSocket(token);
      } catch (error) {
        console.error("Error initializing socket:", error);
        setAppError(error.message);
      }
    }
    return () => {
      try {
        disconnectSocket();
      } catch (error) {
        console.error("Error disconnecting socket:", error);
      }
    };
  }, []);

  // Global error handler for unexpected errors
  useEffect(() => {
    const handleGlobalError = (event) => {
      console.error("Unhandled error:", event.error);
      setAppError(event.error?.message || "An unexpected error occurred");
      event.preventDefault();
    };

    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  if (appError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-4">Application Error</h1>
          <p className="text-gray-700 mb-6">{appError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  console.log("App is rendering"); // Debug log

  return (
    <ToastProvider>
      <AuthProvider>
        <ErrorBoundary>
          <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={
                <Suspense fallback={
                  <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                }>
                  <Home />
                </Suspense>
              } />
              <Route path="/login" element={
                <Suspense fallback={
                  <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                }>
                  <Login />
                </Suspense>
              } />
              <Route path="/signup" element={
                <Suspense fallback={
                  <div className="flex h-screen items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
                  </div>
                }>
                  <Signup />
                </Suspense>
              } />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/mentor-dashboard" element={<MentorDashboard />} />
                <Route path="/mentor-matching" element={<MentorMatching />} />
                <Route path="/chat/:chatId" element={<Chat />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/connections" element={<Connections />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/mentee-dashboard" element={<MenteeDashboard />} />
                <Route path="/goal-tracker" element={<GoalTracker />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/sessions" element={<Sessions />} />
              </Route>
               
              <Route path="/mentor/:mentorId" element={<MentorProfile />} />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </ErrorBoundary>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
