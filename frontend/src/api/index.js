import axios from 'axios';

const API = axios.create({
  baseURL: 'https://mentor-connect-og82.onrender.com',  // Hardcode temporarily for testing
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
API.interceptors.request.use((config) => {
  console.log('Request URL:', config.baseURL + config.url);
  console.log('Request Data:', config.data);
  return config;
});

// Add response interceptor for debugging
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error Details:', {
      baseURL: error.config?.baseURL,
      url: error.config?.url,
      method: error.config?.method,
      error: error.message
    });
    return Promise.reject(error);
  }
);

export default API;

// Replace direct URLs like:
// axios.get('http://localhost:5000/api/route')
// With:
// API.get('/api/route')