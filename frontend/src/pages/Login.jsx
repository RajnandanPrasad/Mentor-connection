import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const Login = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
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
    <div className="flex min-h-screen bg-gray-50">
      {/* Left Panel - Features */}
      <div className="hidden md:flex md:w-1/3 bg-blue-600 text-white p-8 flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-8">MentorConnect</h1>
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                💬
              </div>
              <div>
                <h3 className="font-semibold">Real-time Chat</h3>
                <p className="text-blue-100">Connect instantly with your mentor/mentee</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                📈
              </div>
              <div>
                <h3 className="font-semibold">Goal Tracking</h3>
                <p className="text-blue-100">Track your learning progress</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                🎯
              </div>
              <div>
                <h3 className="font-semibold">Smart Matching</h3>
                <p className="text-blue-100">Find the perfect mentor match</p>
              </div>
            </div>
          </div>
        </div>
        <div className="text-sm text-blue-100">
          © 2024 MentorConnect. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Welcome back!</h2>
            <p className="text-gray-600 mt-2">Please sign in to your account</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg">
              {error}
              {retryAfter > 0 && (
                <div className="mt-2 text-sm">
                  You can try again in {retryAfter} seconds
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || retryAfter > 0}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50"
            >
              {loading ? "Signing in..." : retryAfter > 0 ? `Try again in ${retryAfter}s` : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">
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
