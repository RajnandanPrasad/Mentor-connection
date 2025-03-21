// ... existing code ...
const API = axios.create({
    baseURL: process.env.REACT_APP_BACKEND_URL,
    withCredentials: true
  });
  // ... existing code ...
  
  // Replace direct URLs like:
  // axios.get('http://localhost:5000/api/route')
  // With:
  // API.get('/api/route')