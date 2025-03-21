import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor for debugging
API.interceptors.request.use((config) => {
  console.log('Making request to:', config.baseURL + config.url);
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