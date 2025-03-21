const handleSignup = async (formData) => {
  try {
    console.log('Using API URL:', process.env.REACT_APP_BACKEND_URL);
    const response = await API.post('/api/auth/signup', formData);
    console.log('Signup response:', response.data);
    // Handle successful signup
  } catch (error) {
    console.error('Detailed error:', {
      message: error.message,
      response: error.response?.data,
      config: error.config
    });
    // Show user-friendly error message
    alert(error.response?.data?.message || 'Network error. Please try again.');
  }
}; 