import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const user = JSON.parse(sessionStorage.getItem('user'));
      if (user?.role === 'mentor') {
        navigate('/mentor-dashboard');
      } else {
        navigate('/dashboard');
      }
    }
  }, [isAuthenticated, navigate]);

  // Countdown timer for rate limit
  useEffect(() => {
    if (retryAfter <= 0) return;

    const timer = setInterval(() => {
      setRetryAfter(prev => {
        if (prev <= 1) {
          setError("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [retryAfter]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error && !retryAfter) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission if rate limited
    if (retryAfter > 0) {
      setError(`Please wait ${retryAfter} seconds before trying again`);
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Ensure email and password are trimmed
      const loginData = {
        email: formData.email.trim(),
        password: formData.password
      };

      console.log('Login: Attempting login with email:', loginData.email);
      
      const response = await api.post("/api/auth/login", loginData);
      console.log('Login: Server response received:', {
        hasToken: !!response.data.token,
        hasSessionId: !!response.data.sessionId,
        hasUser: !!response.data.user,
        userRole: response.data.user?.role
      });
      
      if (!response.data.token || !response.data.sessionId || !response.data.user) {
        console.error('Login: Invalid response structure:', {
          hasToken: !!response.data.token,
          hasSessionId: !!response.data.sessionId,
          hasUser: !!response.data.user
        });
        throw new Error("Invalid response from server");
      }

      console.log('Login: Valid response, calling login function');
      await login(response.data.user, response.data.token, response.data.sessionId);
      
      console.log('Login: Login successful, auth state should be updated');
      addToast("Login successful! Redirecting...", "success");
      
    } catch (err) {
      console.error("Login: Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        headers: err.response?.headers
      });

      if (err.response?.status === 429) {
        // Get retry-after header, default to 30 seconds if not provided
        const retryAfterHeader = err.response.headers?.['retry-after'] || '30';
        const waitSeconds = parseInt(retryAfterHeader, 10);
        setRetryAfter(waitSeconds);
        setError(`Too many login attempts. Please wait ${waitSeconds} seconds before trying again.`);
      } else if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).join(", ");
        setError(errorMessages);
      } else {
        setError("An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Left Panel - Features */}
      <div className="hidden md:flex md:w-1/3 bg-gradient-primary text-white p-8 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-[size:20px_20px] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/50 to-transparent" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-8">MentorConnect</h1>
          <div className="space-y-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-500/30 backdrop-blur-sm rounded-xl shadow-inner">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Real-time Chat</h3>
                <p className="text-primary-100">Connect instantly with your mentor/mentee</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-500/30 backdrop-blur-sm rounded-xl shadow-inner">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Goal Tracking</h3>
                <p className="text-primary-100">Track your learning progress</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-primary-500/30 backdrop-blur-sm rounded-xl shadow-inner">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-white">Smart Matching</h3>
                <p className="text-primary-100">Find the perfect mentor match</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-primary-100 relative z-10">
          © 2024 MentorConnect. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-neutral-900 mb-2">Welcome back!</h2>
            <p className="text-neutral-600">Please sign in to your account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg animate-fadeIn">
              {error}
              {retryAfter > 0 && (
                <div className="mt-2 text-sm font-medium">
                  You can try again in {retryAfter} seconds
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                Email Address
              </label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                icon={
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-neutral-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-primary-600 hover:text-primary-700">
                  Forgot password?
                </Link>
              </div>
              <Input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter your password"
                icon={
                  <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || retryAfter > 0}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : retryAfter > 0 ? `Try again in ${retryAfter}s` : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-neutral-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
