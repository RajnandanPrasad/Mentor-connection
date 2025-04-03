// ... existing code ...
const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // Use Vite environment variable
    withCredentials: true
});

  // ... existing code ...
  
  // Replace direct URLs like:
  // axios.get('http://localhost:5000/api/route')
  // With:
  // API.get('/api/route')
