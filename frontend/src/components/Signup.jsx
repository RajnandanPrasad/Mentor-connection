const handleSignup = async (formData) => {
  try {
    console.log('Attempting signup with URL:', 'https://mentor-connect-og82.onrender.com/api/auth/signup');
    
    // Try direct axios call for testing
    const response = await axios.post(
      'https://mentor-connect-og82.onrender.com/api/auth/signup',
      formData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      }
    );
    
    console.log('Signup successful:', response.data);
    // Handle successful signup
    
  } catch (error) {
    console.error('Signup failed:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    alert(error.response?.data?.message || 'Signup failed. Please try again.');
  }
}; 