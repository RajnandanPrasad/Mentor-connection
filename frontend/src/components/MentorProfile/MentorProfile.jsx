import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../StarRating';
import ReviewList from '../ReviewList';
import ImageUpload from '../ImageUpload';
import { toast, Toaster } from 'react-hot-toast';
import { StarIcon, UserIcon, BriefcaseIcon, BookOpenIcon, CalendarIcon, ClockIcon, MapPinIcon, BadgeCheckIcon, AwardIcon } from 'lucide-react';
import { Avatar } from '../ui/avatar';

const MentorProfile = () => {
  const { mentorId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth();
  const [mentor, setMentor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 0, comment: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [imageVersion, setImageVersion] = useState(() => {
    // Initialize with timestamp from localStorage if it exists
    return parseInt(localStorage.getItem(`mentor-image-${mentorId}`) || Date.now().toString());
  });
  const [refreshCount, setRefreshCount] = useState(0);

  // Helper function to update image version timestamp
  const updateImageVersion = () => {
    const newTimestamp = Date.now();
    localStorage.setItem(`mentor-image-${mentorId}`, newTimestamp.toString());
    setImageVersion(newTimestamp);
    return newTimestamp;
  };

  // Helper function to add cache-busting to image URLs
  const addCacheBustingToUrl = (url) => {
    if (!url) return null;
    
    try {
      // Handle relative URLs - ensure they're absolute
      let absoluteUrl = url;
      if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('/')) {
        absoluteUrl = `http://localhost:5000/${url.startsWith('/') ? url.substring(1) : url}`;
      }
      
      // Parse the URL to handle query parameters correctly
      const urlObj = new URL(absoluteUrl.startsWith('/') ? `http://localhost:5000${absoluteUrl}` : absoluteUrl);
      
      // Add or update the timestamp parameter using the stored imageVersion
      urlObj.searchParams.set('t', imageVersion.toString());
      
      console.log('[MentorProfile] Cache-busted URL:', urlObj.toString());
      return urlObj.toString();
    } catch (error) {
      console.error('[MentorProfile] Error creating cache-busted URL:', error, 'for URL:', url);
      
      // Fallback to simple string concatenation if URL parsing fails
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}t=${imageVersion}`;
    }
  };

  // Handle case when auth is null
  const user = auth?.user;
  const isOwnProfile = user?._id === mentorId;
  const isMentee = user?.role === 'mentee';

  // Force a version update on component mount to ensure fresh images
  useEffect(() => {
    // Update the image version on initial component mount to ensure fresh image
    updateImageVersion();
  }, []);

  useEffect(() => {
    fetchMentorProfile();

    // Add client-side cache busting when the imageVersion changes
    const preloadImage = () => {
      if (mentor?.profileImage) {
        const baseUrl = mentor.profileImage.split('?')[0];
        const img = new Image();
        const cacheBustUrl = `${baseUrl}?t=${imageVersion}`;
        console.log('[MentorProfile] Preloading image:', cacheBustUrl);
        
        img.onload = () => console.log('[MentorProfile] Image preloaded successfully');
        img.onerror = (e) => console.error('[MentorProfile] Image preload error:', e);
        img.src = cacheBustUrl;
      }
    };

    preloadImage();
  }, [mentorId, imageVersion]);

  const fetchMentorProfile = async () => {
    try {
      setLoading(true);
      console.log('[MentorProfile] Fetching mentor profile for ID:', mentorId);
      
      // Add timestamp to URL to bust any API caching
      const timestamp = imageVersion;
      
      const response = await axios.get(
        `http://localhost:5000/api/mentors/${mentorId}?t=${timestamp}`,
        {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem('token')}`,
            'X-Session-ID': sessionStorage.getItem('sessionId'),
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
      
      console.log('[MentorProfile] Mentor data received:', response.data);
      
      // Process the mentor data
      const mentorData = response.data;
      
      // Add cache-busting timestamp to profile image if it exists
      if (mentorData.profileImage) {
        const originalImageUrl = mentorData.profileImage;
        mentorData.profileImage = addCacheBustingToUrl(mentorData.profileImage);
        console.log('[MentorProfile] Updated image URL:', {
          original: originalImageUrl,
          cacheBusted: mentorData.profileImage,
          imageVersion: imageVersion
        });
      } else {
        console.log('[MentorProfile] No profile image found in mentor data');
      }
      
      // Log the final mentor data we're setting in state
      console.log('[MentorProfile] Setting mentor state with data:', {
        id: mentorData._id,
        name: mentorData.name,
        hasProfileImage: !!mentorData.profileImage,
        profileImageUrl: mentorData.profileImage,
        imageVersion: imageVersion
      });
      
      setMentor(mentorData);
      setEditedProfile(mentorData);
      setError(null);
    } catch (error) {
      console.error('[MentorProfile] Error fetching mentor profile:', error);
      console.error('[MentorProfile] Error details:', error.response?.data);
      setError('Failed to load mentor profile. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('profileImage', file);
      
      // Get auth token and session ID from sessionStorage
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      
      console.log('[MentorProfile] Uploading profile image for mentor:', mentorId);
      console.log('[MentorProfile] File details:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)} KB`
      });
      
      // Show initial loading toast
      toast.loading('Uploading image...', { id: 'upload-toast' });
      
      // Send the image to the API endpoint
      const response = await axios.post(
        `http://localhost:5000/api/mentors/${mentorId}/profile-image`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Session-ID': sessionId,
            'Content-Type': 'multipart/form-data',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
      
      console.log('[MentorProfile] Image upload response:', response.data);
      
      // Dismiss loading toast
      toast.dismiss('upload-toast');
      
      // Extract the image URL from the response (handle different response formats)
      let imageUrl = '';
      if (response.data && response.data.profileImage) {
        imageUrl = response.data.profileImage;
      } else if (response.data && response.data.imageUrl) {
        imageUrl = response.data.imageUrl;
      } else if (response.data && typeof response.data === 'string') {
        imageUrl = response.data;
      }
      
      if (!imageUrl) {
        throw new Error('No image URL received from server');
      }
      
      // Update the image version with a completely new timestamp
      const newTimestamp = updateImageVersion();
      
      // Add aggressive cache busting parameters to the image URL
      const baseUrl = imageUrl.split('?')[0];
      const imageUrlWithCacheBusting = `${baseUrl}?t=${newTimestamp}&v=${Date.now()}&forceRefresh=true&random=${Math.random()}`;
      
      console.log('[MentorProfile] Image URL with cache busting:', imageUrlWithCacheBusting);
      
      // Attempt to clear the image from browser cache
      if ('caches' in window) {
        try {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => window.caches.open(cacheName)
              .then(cache => cache.delete(baseUrl))
              .catch(err => console.log('[MentorProfile] Cache delete error:', err))
            )
          );
          console.log('[MentorProfile] Cache cleared for image');
        } catch (err) {
          console.error('[MentorProfile] Error clearing cache:', err);
        }
      }
      
      // Create a temporary image to preload the new image
      const tempImage = new Image();
      tempImage.onload = () => {
        console.log('[MentorProfile] New image preloaded successfully');
        
        // Update both mentor and editedProfile with the new image URL
        setMentor(prev => ({
          ...prev,
          profileImage: imageUrlWithCacheBusting,
          _imageTimestamp: newTimestamp
        }));
        
        setEditedProfile(prev => ({
          ...prev,
          profileImage: imageUrlWithCacheBusting
        }));
        
        // Show success message
        toast.success('Profile image uploaded successfully!');
      };
      
      tempImage.onerror = (err) => {
        console.error('[MentorProfile] Error preloading image:', err);
        toast.error('Image uploaded but cannot be displayed. Try refreshing the page.');
      };
      
      // Set the src to start loading the image
      tempImage.src = imageUrlWithCacheBusting;
      
      // Fetch fresh profile data after a brief delay to ensure all updates are applied
      setTimeout(async () => {
        await fetchMentorProfile();
        
        // Force one more refresh just to be sure
        forceRefreshImage();
      }, 1000);
      
    } catch (err) {
      console.error('[MentorProfile] Error uploading profile image:', err);
      toast.dismiss('upload-toast');
      toast.error('Failed to upload profile image: ' + (err.response?.data?.message || err.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      // Validate form data first
      if (!editedProfile.mentorProfile.title || !editedProfile.mentorProfile.bio) {
        setError('Title and bio are required fields');
        return;
      }
      
      // Set saving state to show loading indicator
      setSaving(true);
      
      // Get authentication data from sessionStorage (not localStorage)
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      
      if (!token) {
        setError('Authentication token not found');
        setSaving(false);
        return;
      }
      
      console.log('[MentorProfile] Updating profile for mentor:', mentorId);
      
      // Create a deep copy of the edited profile to avoid reference issues
      const profileToUpdate = JSON.parse(JSON.stringify(editedProfile));
      
      // Preserve the original profile image URL if present
      const originalImageUrl = profileToUpdate.profileImage;
      console.log('[MentorProfile] Original image URL before update:', originalImageUrl);
      
      // Send the updated profile data to the server
      const response = await axios.put(
        `http://localhost:5000/api/mentors/${mentorId}`,
        profileToUpdate,
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'X-Session-ID': sessionId,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        }
      );
      
      console.log('[MentorProfile] Profile update response:', response.data);
      
      // Update the image version timestamp
      const newTimestamp = updateImageVersion();
      
      // Process the updated profile data
      const updatedProfileData = response.data;
      
      // Handle profile image with cache busting
      if (updatedProfileData.profileImage) {
        // Add cache-busting to ensure we get the fresh image
        const originalResponseImageUrl = updatedProfileData.profileImage;
        const baseUrl = originalResponseImageUrl.split('?')[0];
        const refreshedImageUrl = `${baseUrl}?t=${newTimestamp}&v=${Date.now()}&forceRefresh=true`;
        
        updatedProfileData.profileImage = refreshedImageUrl;
        
        console.log('[MentorProfile] Updated profile image with cache busting:', {
          original: originalResponseImageUrl,
          cacheBusted: refreshedImageUrl,
          imageVersion: newTimestamp
        });
        
        // Preload the image to ensure it's loaded
        const preloadImg = new Image();
        preloadImg.src = refreshedImageUrl;
      } else if (originalImageUrl) {
        // If the response doesn't include the image but we had one before, preserve it with cache busting
        const baseUrl = originalImageUrl.split('?')[0];
        const refreshedImageUrl = `${baseUrl}?t=${newTimestamp}&v=${Date.now()}&forceRefresh=true`;
        
        updatedProfileData.profileImage = refreshedImageUrl;
        
        console.log('[MentorProfile] Preserved original profile image with cache busting:', updatedProfileData.profileImage);
        
        // Preload the image to ensure it's loaded
        const preloadImg = new Image();
        preloadImg.src = refreshedImageUrl;
      }
      
      // Update the local state with the processed data
      setMentor(updatedProfileData);
      setEditedProfile(updatedProfileData);
      setIsEditing(false);
      
      // Show success message
      toast.success('Profile saved successfully!');
      
      // Force immediate image refresh
      forceRefreshImage();
      
      // Fetch fresh profile data after a brief delay to ensure all updates are applied
      setTimeout(() => {
        fetchMentorProfile();
      }, 1000);
      
    } catch (err) {
      console.error('[MentorProfile] Error updating profile:', err);
      setError('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleReviewSubmit = async () => {
    try {
      setSubmittingReview(true);
      
      // Input validation
      if (!reviewText.trim() || rating === 0) {
        setError("Please provide both a review text and rating");
        setSubmittingReview(false);
        return;
      }
      
      // Get auth data
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      
      // Get userId from the auth context instead of sessionStorage
      const userId = user?._id || auth?.user?.id;
      
      if (!token || !userId) {
        setError("You must be logged in to submit a review");
        setSubmittingReview(false);
        return;
      }
      
      console.log('[MentorProfile] Submitting review for mentor:', mentorId);
      console.log('[MentorProfile] User ID submitting review:', userId);
      
      // Prepare review data
      const reviewData = {
        mentorId,
        userId,
        rating,
        text: reviewText,
        date: new Date().toISOString()
      };
      
      console.log('[MentorProfile] Review data being submitted:', reviewData);
      
      // Submit review
      const response = await axios.post(
        `http://localhost:5000/api/mentors/${mentorId}/reviews`,
        reviewData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Session-ID': sessionId
          }
        }
      );
      
      console.log('[MentorProfile] Review submission response:', response.data);
      
      // Add the new review to the existing reviews
      const newReview = response.data.review || response.data;
      setReviews(prev => [...prev, newReview]);
      
      // Reset review form
      setReviewText('');
      setRating(0);
      
      // Close the review modal
      setShowReviewModal(false);
      
      // Refresh mentor profile to get updated rating average
      fetchMentorProfile();
      
      toast.success('Review submitted successfully!');
    } catch (err) {
      console.error('[MentorProfile] Error submitting review:', err);
      setError('Failed to submit review: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingReview(false);
    }
  };

  // Enhance the forceRefreshImage function to be more aggressive
  const forceRefreshImage = () => {
    console.log('[MentorProfile] Forcing image refresh');
    
    if (!mentor?.profileImage) {
      console.log('[MentorProfile] No image to refresh');
      return;
    }
    
    // Update version timestamp in localStorage
    const newTimestamp = updateImageVersion();
    
    // Extract the base URL without query parameters
    const baseImageUrl = mentor.profileImage.split('?')[0];
    
    // Create a completely new URL with multiple cache-busting params
    const refreshedImageUrl = `${baseImageUrl}?t=${newTimestamp}&v=${Date.now()}&forceRefresh=true&refresh=${Math.random()}`;
    
    console.log('[MentorProfile] Refreshed image URL:', refreshedImageUrl);
    
    // Attempt to remove image from browser cache
    const clearCache = async () => {
      if ('caches' in window) {
        try {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => window.caches.open(cacheName)
              .then(cache => cache.delete(baseImageUrl))
              .then(cache => cache.delete(mentor.profileImage))
              .catch(err => console.log('[MentorProfile] Cache delete error:', err))
            )
          );
          console.log('[MentorProfile] Cache cleared for image');
        } catch (err) {
          console.error('[MentorProfile] Error clearing cache:', err);
        }
      }
    };
    
    clearCache();
    
    // Preload the image to ensure it's in the browser cache
    const tempImg = new Image();
    tempImg.onload = () => {
      console.log('[MentorProfile] Force-refreshed image loaded successfully');
      
      // Update the mentor state with the new image URL
      setMentor(prev => ({
        ...prev,
        profileImage: refreshedImageUrl
      }));
      
      // Re-fetch profile to make sure we have the latest data
      setTimeout(() => {
        fetchMentorProfile();
      }, 500);
    };
    tempImg.onerror = (e) => {
      console.error('[MentorProfile] Error loading force-refreshed image:', e);
      
      // If we get an error, try to use avatar as fallback
      setMentor(prev => ({
        ...prev,
        profileImage: null
      }));
    };
    tempImg.src = refreshedImageUrl;
    
    // Show a success toast to let user know refresh was attempted
    toast.success('Refreshing image...', { duration: 2000 });
  };

  // Call the force refresh on component mount
  useEffect(() => {
    // Short delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      forceRefreshImage();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Add this function to manually refresh the entire component
  const refreshComponent = () => {
    console.log('[MentorProfile] Manually refreshing component');
    setRefreshCount(prev => prev + 1);
    updateImageVersion();
    fetchMentorProfile();
    toast.success('Refreshing profile...', { duration: 2000 });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <Toaster position="top-right" />
      {/* Manual refresh button */}
      <div className="fixed top-4 right-4">
        <button
          onClick={refreshComponent}
          className="bg-blue-600 text-white p-2 rounded-full shadow-md hover:bg-blue-700 transition-colors"
          title="Refresh profile"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      {/* Hidden iframe for cache busting - add refreshCount to key to force reload */}
      <iframe 
        src={`about:blank?t=${imageVersion}&r=${refreshCount}`} 
        style={{ display: 'none' }} 
        title="cache-buster" 
        key={`iframe-${imageVersion}-${refreshCount}`}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end space-x-6">
                <div className="relative">
                  <Avatar 
                    src={mentor?.profileImage ? 
                        `${mentor.profileImage.split('?')[0]}?t=${imageVersion}&nocache=true&v=${Date.now()}&r=${refreshCount}` : 
                        null}
                    name={mentor?.name || ''}
                    alt={mentor?.name}
                    size="2xl"
                    border={true}
                    borderColor="white"
                    status={mentor?.mentorProfile?.availability ? 'online' : 'offline'}
                    statusPosition="top-right"
                    className="shadow-lg"
                    onClick={isOwnProfile ? forceRefreshImage : undefined}
                  />
                  {isEditing && isOwnProfile && (
                    <div className="absolute bottom-0 right-0">
                      <ImageUpload 
                        onUpload={handleImageUpload} 
                        disabled={uploadingImage}
                      />
                    </div>
                  )}
                  {isOwnProfile && mentor?.profileImage && (
                    <button 
                      onClick={forceRefreshImage}
                      className="absolute top-0 right-0 bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                      title="Refresh image"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white">{mentor?.name}</h1>
                  <p className="text-blue-100 text-lg">{mentor?.mentorProfile?.title}</p>
                  <div className="flex items-center mt-2">
                    <StarRating rating={mentor?.mentorProfile?.rating || 0} />
                    <span className="text-white ml-2">
                      ({mentor?.mentorProfile?.totalReviews || 0} reviews)
                    </span>
                  </div>
                </div>
                <div className="flex space-x-4">
                  {isOwnProfile ? (
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                  ) : isMentee ? (
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Write a Review
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="md:col-span-2">
                {isEditing && isOwnProfile ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <input
                        type="text"
                        value={editedProfile.mentorProfile.title}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          mentorProfile: {
                            ...editedProfile.mentorProfile,
                            title: e.target.value
                          }
                        })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Bio</label>
                      <textarea
                        value={editedProfile.mentorProfile.bio}
                        onChange={(e) => setEditedProfile({
                          ...editedProfile,
                          mentorProfile: {
                            ...editedProfile.mentorProfile,
                            bio: e.target.value
                          }
                        })}
                        rows="4"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    
                    {/* Save Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={handleProfileUpdate}
                        disabled={uploadingImage || saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? (
                          <div className="flex items-center space-x-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Saving...</span>
                          </div>
                        ) : (
                          <span>Save Changes</span>
                        )}
                      </button>
                    </div>
                    
                    {/* Error display */}
                    {error && (
                      <div className="text-sm text-red-500 mt-2">
                        {error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">About</h2>
                      <p className="mt-2 text-gray-600">{mentor?.mentorProfile?.bio}</p>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {mentor?.mentorProfile?.specializations?.map((skill, index) => (
                          <span
                            key={index}
                            className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">Experience</h2>
                      <p className="mt-2 text-gray-600">
                        {mentor?.mentorProfile?.experienceLevel} years of experience
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900">Mentorship Details</h3>
                  <div className="mt-4 space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium">Rate:</span> ${mentor?.mentorProfile?.hourlyRate}/hour
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Experience:</span> {mentor?.mentorProfile?.experienceLevel} years
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Total Reviews:</span> {mentor?.mentorProfile?.totalReviews || 0}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900">Availability</h3>
                  <div className="mt-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      mentor?.mentorProfile?.availability
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {mentor?.mentorProfile?.availability ? 'Available' : 'Not Available'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>
          <ReviewList mentorId={mentorId} />
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Write a Review</h3>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <StarRating
                    rating={rating}
                    onRatingChange={setRating}
                    interactive
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  rows="4"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Share your experience with this mentor..."
                />
              </div>

              {error && (
                <div className={`text-sm ${
                  error.includes('successfully') ? 'text-green-600' : 'text-red-500'
                }`}>
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={!rating || !reviewText.trim() || submittingReview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submittingReview ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Submit Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MentorProfile; 