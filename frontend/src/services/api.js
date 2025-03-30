import axios from 'axios';

// Get API URL from environment variables or default to localhost
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
console.log('API Service: Using base URL:', apiUrl);

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add the auth token and session ID
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    const sessionId = sessionStorage.getItem('sessionId');
    
    console.log(`[API Interceptor] Request to: ${config.url}`);
    console.log(`[API Interceptor] Method: ${config.method.toUpperCase()}`);
    
    if (token) {
      console.log(`[API Interceptor] Adding Authorization token (${token.substring(0, 15)}...)`);
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(`[API Interceptor] No token found in sessionStorage!`);
    }
    
    if (sessionId) {
      console.log(`[API Interceptor] Adding Session ID: ${sessionId}`);
      config.headers['X-Session-ID'] = sessionId;
    } else {
      console.warn(`[API Interceptor] No sessionId found in sessionStorage!`);
    }
    
    // Log headers for debugging
    console.log(`[API Interceptor] Request headers:`, config.headers);
    
    // Log data for debugging if it's present (but don't log sensitive data)
    if (config.data && !config.url.includes('login') && !config.url.includes('password')) {
      if (config.data instanceof FormData) {
        console.log(`[API Interceptor] Request contains FormData`);
      } else {
        console.log(`[API Interceptor] Request data:`, config.data);
      }
    }
    
    return config;
  },
  (error) => {
    console.error('[API Interceptor] Request Error:', error);
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    // Log the response for debugging
    console.log(`[API Interceptor] Response from: ${response.config.url}`);
    console.log(`[API Interceptor] Status: ${response.status}`);
    console.log(`[API Interceptor] Response data:`, response.data);
    
    // If profile update or login/authentication related, log more details
    if (response.config.url.includes('/api/mentors/') || 
        response.config.url.includes('/api/mentees/') ||
        response.config.url.includes('/api/auth/')) {
      console.log(`[API Interceptor] Important API response details:`, {
        hasData: !!response.data, 
        dataType: typeof response.data,
        dataKeys: response.data ? Object.keys(response.data) : []
      });
    }
    
    return response;
  },
  (error) => {
    // Enhanced error logging with more context
    console.error(`[API Interceptor] Error in response from: ${error.config?.url || 'unknown endpoint'}`);
    console.error(`[API Interceptor] Error request method: ${error.config?.method?.toUpperCase() || 'unknown'}`);
    
    if (error.response) {
      console.error(`[API Interceptor] Error status: ${error.response.status}`);
      console.error(`[API Interceptor] Error data:`, error.response.data);
      console.error(`[API Interceptor] Error headers:`, error.response.headers);
    } else if (error.request) {
      console.error('[API Interceptor] No response received:', error.request);
    } else {
      console.error('[API Interceptor] Error setting up request:', error.message);
    }
    
    // Check for network errors
    if (!error.response && error.message === 'Network Error') {
      console.error('[API Interceptor] Network error - check internet connection or server status');
    }
    
    if (error.response?.status === 401) {
      // Clear session data on unauthorized
      console.log('[API Interceptor] Unauthorized request (401), redirecting to login');
      
      // Check if we have the token but still got unauthorized
      const token = sessionStorage.getItem('token');
      if (token) {
        console.warn('[API Interceptor] Had a token but got 401 - possible token expiration or invalidation');
      }
      
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('sessionId');
      
      // Only redirect if not already on login page to prevent redirect loops
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// User profile API functions
export const userProfileApi = {
  // Get user profile
  getProfile: async (userId, role) => {
    try {
      console.log(`[API] Getting ${role} profile for user ${userId}`);
      const response = await api.get(`/api/${role}s/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`[API] Error getting ${role} profile:`, error);
      throw error;
    }
  },
  
  // Update user profile
  updateProfile: async (userId, role, profileData, timeout = 5000) => {
    try {
      console.log(`[API] Updating ${role} profile for user ${userId}`);
      console.log(`[API] Profile data being sent:`, profileData);
      
      // Use a custom config for this request to handle timeouts
      const config = {
        timeout: timeout
      };
      
      // Special handling for mentor profile updates - mentors have more complex data
      if (role === 'mentor') {
        // Ensure proper ID consistency
        const mentorId = userId;
        
        // Deep clone the data to avoid reference issues
        const mentorData = JSON.parse(JSON.stringify(profileData));
        
        // Ensure critical fields are properly formatted
        if (mentorData.mentorProfile) {
          // Convert hourlyRate to number
          if (mentorData.mentorProfile.hourlyRate) {
            mentorData.mentorProfile.hourlyRate = Number(mentorData.mentorProfile.hourlyRate);
          }
          
          // Convert experienceLevel to number
          if (mentorData.mentorProfile.experienceLevel) {
            mentorData.mentorProfile.experienceLevel = Number(mentorData.mentorProfile.experienceLevel);
          }
          
          // Ensure availability is boolean
          if (mentorData.mentorProfile.availability !== undefined) {
            mentorData.mentorProfile.availability = 
              mentorData.mentorProfile.availability === true || 
              mentorData.mentorProfile.availability === 'true' || 
              mentorData.mentorProfile.availability === 1;
          }
        }
        
        console.log(`[API] Processed mentor data:`, mentorData);
        
        // Make the request with the mentor-specific handling
        const response = await api.put(`/api/mentors/${mentorId}`, mentorData, config);
        console.log(`[API] Mentor profile update response:`, response.data);
        return response.data;
      } else if (role === 'mentee') {
        // Special handling for mentee profile updates
        const menteeId = userId;
        
        // Deep clone the data to avoid reference issues
        const menteeData = JSON.parse(JSON.stringify(profileData));
        
        // Ensure critical fields are properly formatted
        if (menteeData.menteeProfile) {
          // Ensure experienceLevel is a number
          if (menteeData.menteeProfile.experienceLevel) {
            menteeData.menteeProfile.experienceLevel = Number(menteeData.menteeProfile.experienceLevel);
          }
          
          // Ensure interests is an array
          if (menteeData.menteeProfile.interests && !Array.isArray(menteeData.menteeProfile.interests)) {
            if (typeof menteeData.menteeProfile.interests === 'string') {
              menteeData.menteeProfile.interests = menteeData.menteeProfile.interests
                .split(',')
                .map(interest => interest.trim())
                .filter(interest => interest);
            } else {
              menteeData.menteeProfile.interests = [];
            }
          }
        }
        
        console.log(`[API] Processed mentee data:`, menteeData);
        
        // Make the request with the mentee-specific endpoint
        const response = await api.put(`/api/mentees/${menteeId}`, menteeData, config);
        console.log(`[API] Mentee profile update response:`, response.data);
        return response.data;
      } else {
        // Standard handling for other roles
        const response = await api.put(`/api/${role}s/${userId}`, profileData, config);
        return response.data;
      }
    } catch (error) {
      console.error(`[API] Error updating ${role} profile:`, error);
      console.error(`[API] Error details:`, error.response?.data);
      throw error;
    }
  },
  
  // Upload profile image
  uploadProfileImage: async (userId, role, imageFile) => {
    try {
      console.log(`[API] Uploading profile image for ${role} ${userId}`);
      
      const formData = new FormData();
      formData.append('profileImage', imageFile);
      
      const response = await api.post(`/api/${role}s/${userId}/profile-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error(`[API] Error uploading profile image:`, error);
      throw error;
    }
  }
};

export default api; 