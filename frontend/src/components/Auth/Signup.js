const handleSignup = async (signupData) => {
  try {
    const response = await API.post('/api/auth/signup', signupData);
    console.log('Signup successful:', response.data);
    // Handle successful signup
  } catch (error) {
    console.error('Signup error:', error);
    if (error.response) {
      // Handle specific error messages from backend
      alert(error.response.data.message || 'Signup failed');
    } else if (error.request) {
      // Network error
      alert('Network error. Please check your connection and try again.');
    } else {
      alert('An error occurred. Please try again.');
    }
  }
}; 