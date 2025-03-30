import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/ui/Header';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { userProfileApi } from '../services/api';
import { Avatar } from '../components/ui/avatar';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Award, 
  Calendar, 
  MapPin, 
  Edit, 
  AlertCircle, 
  Save,
  CheckCircle,
  X,
  Camera,
  Upload,
  Trash
} from 'lucide-react';

const UserProfile = () => {
  const { user, token, updateUserData, logout } = useAuth();
  const navigate = useNavigate();
  
  // Toast configuration options
  const toastOptions = {
    duration: 5000, // 5 seconds
    style: {
      borderRadius: '10px',
      background: '#333',
      color: '#fff',
      padding: '16px'
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [errors, setErrors] = useState({});
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(0);
  const [imageVersion, setImageVersion] = useState(Date.now());
  const [refreshCount, setRefreshCount] = useState(0);
  const fileInputRef = useRef(null);
  const saveInProgressRef = useRef(false);
  
  const apiUrl = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    if (user?._id) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [user]);

  const addCacheBustingToUrl = (url) => {
    if (!url) return url;
    try {
      const timestamp = Date.now();
      // Check if the URL already has query parameters
      if (url.includes('?')) {
        return `${url}&v=${timestamp}&r=${refreshCount}`;
      } else {
        return `${url}?v=${timestamp}&r=${refreshCount}`;
      }
    } catch (error) {
      console.error("Error adding cache-busting to URL:", error);
      return url;
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      console.log("Fetching user profile for:", user._id, "with role:", user.role);
      
      const profileData = await userProfileApi.getProfile(user._id, user.role);
      console.log("Profile data received:", profileData);
      
      // Add cache-busting to the profile image URL if it exists
      if (profileData.profileImage) {
        profileData.profileImage = addCacheBustingToUrl(profileData.profileImage);
      }
      
      setProfileData(profileData);
      
      // Set image preview if user has a profile image
      if (profileData.profileImage) {
        setImagePreview(profileData.profileImage);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      console.error('Error details:', error.response?.data);
      toast.error(`Failed to load profile data: ${error.response?.data?.message || error.message}`, toastOptions);
    } finally {
      setLoading(false);
    }
  };

  const refreshImage = () => {
    console.log("Refreshing profile image");
    setRefreshCount(prevCount => prevCount + 1);
    setImageVersion(Date.now());
    
    // If we have a profile image, update it with a new cache-busting parameter
    if (profileData && profileData.profileImage) {
      const refreshedUrl = addCacheBustingToUrl(profileData.profileImage);
      setImagePreview(refreshedUrl);
      
      // Also update it in the profile data
      setProfileData(prevData => ({
        ...prevData,
        profileImage: refreshedUrl
      }));
      
      toast.success("Image refreshed", {
        ...toastOptions,
        duration: 2000
      });
    }
  };

  const handleInputChange = (e, section = 'basic') => {
    const { name, value } = e.target;
    
    if (section === 'basic') {
      setProfileData({
        ...profileData,
        [name]: value
      });
    } else if (section === 'mentorProfile' && user.role === 'mentor') {
      setProfileData({
        ...profileData,
        mentorProfile: {
          ...profileData.mentorProfile,
          [name]: value
        }
      });
    } else if (section === 'menteeProfile' && user.role === 'mentee') {
      setProfileData({
        ...profileData,
        menteeProfile: {
          ...profileData.menteeProfile,
          [name]: value
        }
      });
    }
  };

  const handleSkillsChange = (e) => {
    // Process the input value to an array of trimmed, non-empty skills
    const value = e.target.value;
    const skills = value.split(',')
      .map(skill => skill.trim())
      .filter(skill => skill); // Filter out empty strings
    
    console.log(`[Skills] Processing ${user.role} skills/interests:`, skills);
    
    // Update the appropriate profile section based on user role
    if (user.role === 'mentor') {
      // Ensure mentorProfile exists
      const mentorProfile = profileData.mentorProfile || {};
      
      setProfileData({
        ...profileData,
        mentorProfile: {
          ...mentorProfile,
          specializations: skills
        }
      });
      
      console.log('[Skills] Updated mentor specializations:', skills);
    } else if (user.role === 'mentee') {
      // Ensure menteeProfile exists
      const menteeProfile = profileData.menteeProfile || {};
      
      setProfileData({
        ...profileData,
        menteeProfile: {
          ...menteeProfile,
          interests: skills
        }
      });
      
      console.log('[Skills] Updated mentee interests:', skills);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file', toastOptions);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB', toastOptions);
      return;
    }

    setImageFile(file);

    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const uploadProfileImage = async () => {
    if (!imageFile) return null;

    try {
      setUploadingImage(true);
      const loadingToastId = toast.loading('Uploading profile image...', toastOptions);
      
      // Create a more robust URL for the image upload endpoint
      const userId = user._id || user.id;
      console.log(`[Profile Image] Uploading image for ${user.role} with ID ${userId}`);
      
      const response = await userProfileApi.uploadProfileImage(userId, user.role, imageFile);
      console.log("[Profile Image] Upload response:", response);
      
      // Extract the image URL using multiple possible response formats
      let imageUrl = null;
      if (response) {
        if (response.profileImage) imageUrl = response.profileImage;
        else if (response.imageUrl) imageUrl = response.imageUrl;
        else if (response.image) imageUrl = response.image;
        else if (typeof response === 'string') imageUrl = response;
      }
      
      // Make sure we actually have a valid URL
      if (imageUrl) {
        // Increment the refresh counter
        setRefreshCount(prev => prev + 1);
        setImageVersion(Date.now());
        
        // Add cache-busting parameters
        const imageUrlWithCacheBusting = addCacheBustingToUrl(imageUrl);
        console.log("[Profile Image] Final image URL with cache busting:", imageUrlWithCacheBusting);
        
        // Try to clear the browser cache for this image
        try {
          if ('caches' in window) {
            caches.open('image-cache').then(cache => {
              cache.delete(imageUrl).then(deleted => {
                console.log("[Profile Image] Image cache deleted:", deleted);
              });
            });
          }
        } catch (cacheError) {
          console.error("[Profile Image] Error clearing cache:", cacheError);
        }
        
        // Update the profile data with the new image URL
        setProfileData(prevData => ({
          ...prevData,
          profileImage: imageUrlWithCacheBusting
        }));
        
        // Also update image preview to show the new image immediately
        setImagePreview(imageUrlWithCacheBusting);
        
        // Preload the image to ensure it's loaded from the server
        const preloadImg = new Image();
        preloadImg.onload = () => {
          console.log("[Profile Image] New image preloaded successfully");
        };
        preloadImg.onerror = (err) => {
          console.error("[Profile Image] Failed to preload new image:", err);
        };
        preloadImg.src = imageUrlWithCacheBusting;
        
        toast.dismiss(loadingToastId);
        toast.success('Profile image updated successfully', toastOptions);
        return imageUrlWithCacheBusting;
      } else {
        console.error("[Profile Image] No image URL in response:", response);
        toast.dismiss(loadingToastId);
        toast.error('Failed to process uploaded image', toastOptions);
        return null;
      }
    } catch (error) {
      console.error('[Profile Image] Error uploading image:', error);
      console.error('[Profile Image] Error details:', error.response?.data);
      toast.error(`Failed to upload profile image: ${error.response?.data?.message || error.message}`, toastOptions);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Basic validation
    if (!profileData.name) newErrors.name = 'Name is required';
    if (!profileData.email) newErrors.email = 'Email is required';
    
    // Specific validation for mentor or mentee
    if (user.role === 'mentor' && profileData.mentorProfile) {
      if (!profileData.mentorProfile.title) newErrors.title = 'Title is required';
      if (!profileData.mentorProfile.bio) newErrors.bio = 'Bio is required';
      if (!profileData.mentorProfile.hourlyRate) newErrors.hourlyRate = 'Hourly rate is required';
    } else if (user.role === 'mentee' && profileData.menteeProfile) {
      if (!profileData.menteeProfile.educationLevel) newErrors.educationLevel = 'Education level is required';
      if (!profileData.menteeProfile.goals) newErrors.goals = 'Goals are required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const verifyProfileSave = async (originalData, updatedData) => {
    // Only run the verification for mentor profiles which are having issues
    if (user.role !== 'mentor') return true;
    
    console.log("[Profile Verify] Starting verification of saved mentor profile");
    
    try {
      // Get the latest profile data directly from the backend
      const freshData = await userProfileApi.getProfile(user._id || user.id, user.role);
      console.log("[Profile Verify] Fresh profile data from backend:", freshData);
      
      // Check if critical fields were actually updated
      if (!freshData.mentorProfile) {
        console.error("[Profile Verify] Missing mentorProfile in fresh data!");
        
        // Try to create the mentorProfile if it doesn't exist
        try {
          console.log("[Profile Verify] Attempting to create missing mentorProfile");
          const createPayload = {
            mentorProfile: updatedData.mentorProfile || {}
          };
          
          await userProfileApi.updateProfile(user._id || user.id, 'mentor', createPayload, 10000);
          console.log("[Profile Verify] Created mentorProfile object");
          
          // Get fresh data again to check if it worked
          const refreshedData = await userProfileApi.getProfile(user._id || user.id, user.role);
          if (refreshedData.mentorProfile) {
            console.log("[Profile Verify] Successfully created mentorProfile", refreshedData.mentorProfile);
            // Continue with the refreshed data
            freshData.mentorProfile = refreshedData.mentorProfile;
          } else {
        return false;
          }
        } catch (createError) {
          console.error("[Profile Verify] Failed to create mentorProfile:", createError);
          return false;
        }
      }
      
      // Keep track of fields that needed fixing
      const fixedFields = [];
      let allFieldsVerified = true;
      
      // Check critical mentor fields
      const criticalFields = [
        { 
          name: 'hourlyRate', 
          process: (val) => typeof val === 'string' ? parseFloat(val) : val,
          compare: (a, b) => parseFloat(a) === parseFloat(b)
        },
        { 
          name: 'experienceLevel', 
          process: (val) => typeof val === 'string' ? parseInt(val, 10) : val,
          compare: (a, b) => parseInt(a, 10) === parseInt(b, 10)
        },
        { 
          name: 'title', 
          process: (val) => val,
          compare: (a, b) => a === b
        },
        { 
          name: 'bio', 
          process: (val) => val,
          compare: (a, b) => a === b
        },
        { 
          name: 'availability', 
          process: (val) => typeof val === 'string' ? val === 'true' : !!val,
          compare: (a, b) => (!!a) === (!!b) 
        },
        { 
          name: 'specializations', 
          process: (val) => Array.isArray(val) ? val : (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : []),
          compare: (a, b) => JSON.stringify(a) === JSON.stringify(b)
        }
      ];
      
      // Check each critical field
      for (const field of criticalFields) {
        const originalValue = field.process(originalData.mentorProfile?.[field.name]);
        const updatedValue = field.process(updatedData.mentorProfile?.[field.name]);
        const freshValue = field.process(freshData.mentorProfile?.[field.name]);
        
        // Only check if the field was actually changed
        const wasFieldUpdated = !field.compare(originalValue, updatedValue);
        
        if (wasFieldUpdated) {
          console.log(`[Profile Verify] Field '${field.name}' was updated in original request`);
          const isValueCorrect = field.compare(updatedValue, freshValue);
          
          if (!isValueCorrect) {
            console.error(`[Profile Verify] Field '${field.name}' was not updated correctly!`);
            console.error(`[Profile Verify] Expected: ${JSON.stringify(updatedValue)}`);
            console.error(`[Profile Verify] Got: ${JSON.stringify(freshValue)}`);
            
            // Try to fix this specific field
            try {
              console.log(`[Profile Verify] Attempting to directly update ${field.name}`);
            const fixData = {
              mentorProfile: {
                  [field.name]: updatedValue
                }
              };
              
              await userProfileApi.updateProfile(user._id || user.id, 'mentor', fixData, 10000);
              console.log(`[Profile Verify] Direct ${field.name} update completed`);
              
              // Record that we fixed this field
              fixedFields.push(field.name);
          } catch (fixError) {
              console.error(`[Profile Verify] Failed to directly update ${field.name}:`, fixError);
              allFieldsVerified = false;
            }
          } else {
            console.log(`[Profile Verify] Field '${field.name}' was correctly updated to: ${JSON.stringify(freshValue)}`);
          }
        }
      }
      
      if (fixedFields.length > 0) {
        console.log(`[Profile Verify] Successfully fixed fields: ${fixedFields.join(', ')}`);
        
        // If we had to fix fields, get the profile one more time to confirm
        const finalCheck = await userProfileApi.getProfile(user._id || user.id, user.role);
        setProfileData(finalCheck); // Update local state with the very latest data
        console.log(`[Profile Verify] Final state after all fixes:`, finalCheck);
        
        return true; // Return true if we successfully fixed the fields
      }
      
      if (!allFieldsVerified) {
        console.error("[Profile Verify] Some fields could not be verified or fixed");
        return false;
      }
      
      console.log("[Profile Verify] All mentor profile fields verified successfully!");
      return true;
    } catch (error) {
      console.error("[Profile Verify] Error during verification:", error);
      return false;
    }
  };

  // Wrap saveProfile in useCallback to prevent recreation on each render
  const saveProfile = useCallback(async () => {
    // Skip if profile data is missing
    if (!profileData) {
      console.log("[Profile Save] No profile data available, skipping save");
      return;
    }

    // Safety check using ref to prevent multiple simultaneous saves 
    // (better than state for race conditions)
    if (saveInProgressRef.current) {
      console.log("[Profile Save] Save already in progress via ref check");
      return;
    }

    // Prevent multiple rapid clicks (debounce)
    const now = Date.now();
    if (now - lastSaveTime < 2000) { // 2 second debounce
      console.log("[Profile Save] Prevented duplicate save - too soon after last attempt");
      return;
    }
    setLastSaveTime(now);
    
    // Log the current state before validating
    console.log("[Profile Save] Starting save process with data:", profileData);
    console.log("[Profile Save] Current user:", user);
    
    if (!validateForm()) {
      toast.error('Please fix the errors before saving', toastOptions);
      return;
    }

    // If already saving, don't start another save process
    if (saving) {
      console.log("[Profile Save] Save already in progress, ignoring duplicate request");
      return;
    }

    try {
      setSaving(true);
      saveInProgressRef.current = true; // Set ref to true at start of save
      
      console.log("[Profile Save] Validation passed, proceeding with save");
      
      // Create a visible notification that saving is in progress
      const savingToastId = toast.loading('Saving your profile changes...', {
        ...toastOptions,
        duration: 20000 // Set a longer timeout for loading state
      });
      
      // First upload image if there's a new one
      let imageUrl = null;
      if (imageFile) {
        console.log("[Profile Save] Uploading new profile image");
        imageUrl = await uploadProfileImage();
        console.log("[Profile Save] Image uploaded, URL:", imageUrl);
      }
      
      // Create a deep clone of the profile data to avoid reference issues
      let updatedProfile = JSON.parse(JSON.stringify(profileData));
      console.log("[Profile Save] Deep cloned profile data:", updatedProfile);
      
      if (imageUrl) {
        updatedProfile.profileImage = imageUrl;
      }
      
      // Make sure the user role-specific profile object exists
      if (user.role === 'mentor') {
        if (!updatedProfile.mentorProfile) {
        updatedProfile.mentorProfile = {};
          console.log("[Profile Save] Created missing mentorProfile object");
        }
        
        // Make sure ID field is consistent - use _id for all operations
        if (user.id && !updatedProfile._id) {
          updatedProfile._id = user.id;
          console.log("[Profile Save] Added _id from user.id for consistency");
        }
      } else if (user.role === 'mentee') {
        if (!updatedProfile.menteeProfile) {
        updatedProfile.menteeProfile = {};
          console.log("[Profile Save] Created missing menteeProfile object");
        }
      }
      
      // Ensure fields are properly formatted for the backend
      if (user.role === 'mentor') {
        const mp = updatedProfile.mentorProfile;
        console.log("[Profile Save] Processing mentor-specific fields");
        
        // Handle hourly rate (ensure it's a number)
        if (typeof mp.hourlyRate === 'string') {
          mp.hourlyRate = parseFloat(mp.hourlyRate.replace(/[^\d.]/g, '')) || 0;
          console.log("[Profile Save] Converted hourlyRate to number:", mp.hourlyRate);
        }
        
        // Handle experience level (ensure it's a number)
        if (typeof mp.experienceLevel === 'string') {
          mp.experienceLevel = parseInt(mp.experienceLevel, 10) || 0;
          console.log("[Profile Save] Converted experienceLevel to number:", mp.experienceLevel);
        }
        
        // Handle specializations (ensure it's an array)
        if (mp.specializations && !Array.isArray(mp.specializations)) {
          if (typeof mp.specializations === 'string') {
            mp.specializations = mp.specializations
            .split(',')
            .map(skill => skill.trim())
            .filter(skill => skill);
            console.log("[Profile Save] Converted specializations to array:", mp.specializations);
          } else {
            mp.specializations = [];
            console.log("[Profile Save] Reset specializations to empty array");
          }
        }
        
        // Ensure availability is a boolean
        if (mp.availability !== undefined && typeof mp.availability !== 'boolean') {
          mp.availability = mp.availability === 'true' || mp.availability === true || mp.availability === 1;
          console.log("[Profile Save] Converted availability to boolean:", mp.availability);
        }
        
        // Ensure all required fields exist and have proper defaults
        const requiredMentorFields = {
          title: mp.title || profileData.mentorProfile?.title || 'Mentor',
          bio: mp.bio || profileData.mentorProfile?.bio || '',
          hourlyRate: mp.hourlyRate || profileData.mentorProfile?.hourlyRate || 0,
          experienceLevel: mp.experienceLevel || profileData.mentorProfile?.experienceLevel || 0,
          specializations: mp.specializations || profileData.mentorProfile?.specializations || [],
          availability: mp.availability !== undefined ? mp.availability : true
        };
        
        // Update the mentor profile with required fields
        updatedProfile.mentorProfile = {
          ...mp,
          ...requiredMentorFields
        };
        
        console.log("[Profile Save] Final mentorProfile after processing:", updatedProfile.mentorProfile);
      } else if (user.role === 'mentee') {
        const mp = updatedProfile.menteeProfile;
        console.log("[Profile Save] Processing mentee-specific fields");
        
        // Handle interests (ensure it's an array)
        if (mp.interests && !Array.isArray(mp.interests)) {
          if (typeof mp.interests === 'string') {
            mp.interests = mp.interests
            .split(',')
            .map(interest => interest.trim())
            .filter(interest => interest);
            console.log("[Profile Save] Converted interests to array:", mp.interests);
          } else {
            mp.interests = [];
            console.log("[Profile Save] Reset interests to empty array");
          }
        }
        
        // Handle experience level (ensure it's a number)
        if (typeof mp.experienceLevel === 'string') {
          mp.experienceLevel = parseInt(mp.experienceLevel, 10) || 0;
          console.log("[Profile Save] Converted experienceLevel to number:", mp.experienceLevel);
        }
      }
      
      console.log("[Profile Save] Final profile data ready for API:", updatedProfile);
      
      // Update profile using the API service
      console.log("[Profile Save] Calling API to update profile");
      
      // Use a try/catch within the function to attempt different payload formats if the first fails
      let updatedData;
      try {
        updatedData = await userProfileApi.updateProfile(user._id || user.id, user.role, updatedProfile);
      console.log("[Profile Save] Profile update API response:", updatedData);
      } catch (updateError) {
        console.error("[Profile Save] First update attempt failed:", updateError);
        
        // Try with a simplified payload for mentor profile
        if (user.role === 'mentor') {
          console.log("[Profile Save] Trying simplified mentor profile update");
          
          // Create a more streamlined payload focusing only on mentor-specific fields
          const simplifiedPayload = {
            name: updatedProfile.name,
            email: updatedProfile.email,
            mentorProfile: {
              title: updatedProfile.mentorProfile.title,
              bio: updatedProfile.mentorProfile.bio,
              hourlyRate: updatedProfile.mentorProfile.hourlyRate,
              experienceLevel: updatedProfile.mentorProfile.experienceLevel,
              specializations: updatedProfile.mentorProfile.specializations,
              availability: updatedProfile.mentorProfile.availability
            }
          };
          
          try {
            // Use a longer timeout for this attempt
            updatedData = await userProfileApi.updateProfile(user._id || user.id, 'mentor', simplifiedPayload, 10000);
            console.log("[Profile Save] Simplified profile update succeeded:", updatedData);
          } catch (simplifiedError) {
            console.error("[Profile Save] Simplified update also failed:", simplifiedError);
            throw updateError; // Throw the original error for consistent error handling
          }
        } else {
          throw updateError;
        }
      }
      
      // Double-check the response from API
      if (!updatedData || Object.keys(updatedData).length === 0) {
        console.error("[Profile Save] Empty response from API - this may cause UI sync issues");
        
        // Attempt to fetch fresh data instead
        try {
          console.log("[Profile Save] Fetching fresh data after empty update response");
          const freshData = await userProfileApi.getProfile(user._id || user.id, user.role);
          if (freshData) {
            console.log("[Profile Save] Successfully retrieved fresh data:", freshData);
            updatedData = freshData;
          }
        } catch (refreshError) {
          console.error("[Profile Save] Failed to get fresh data:", refreshError);
        }
      }
      
      // Update local auth context
      if (updatedData) {
        // For mentors, make sure we keep the mentorProfile data
        let updatedMentorProfile = updatedData.mentorProfile;
        
        // If mentorProfile is missing or empty in the response, but we had it in our update
        if (user.role === 'mentor' && (!updatedMentorProfile || Object.keys(updatedMentorProfile).length === 0)) {
          console.log("[Profile Save] mentorProfile missing in response, using our updated data");
          updatedMentorProfile = updatedProfile.mentorProfile;
        }
        
        const updatedUserData = {
          ...user,
          _id: updatedData._id || user._id || user.id,
          id: updatedData._id || user._id || user.id, // Ensure both id and _id are set
          name: updatedData.name || user.name,
          email: updatedData.email || user.email,
          profileImage: updatedData.profileImage || user.profileImage,
          role: user.role // Ensure role doesn't change
        };
        
        // For mentors, explicitly include the mentorProfile
        if (user.role === 'mentor') {
          updatedUserData.mentorProfile = updatedMentorProfile;
        }
        
        console.log("[Profile Save] Updating user data in auth context:", updatedUserData);
        let updateSuccess;
        try {
          updateSuccess = updateUserData(updatedUserData);
          console.log("[Profile Save] Auth context update success:", updateSuccess);
          
          if (!updateSuccess) {
            console.error("[Profile Save] Auth context update returned false - this may cause sync issues");
            
            // Attempt a direct sessionStorage update as fallback
            try {
              console.log("[Profile Save] Attempting direct sessionStorage update");
              sessionStorage.setItem('user', JSON.stringify(updatedUserData));
              console.log("[Profile Save] Direct sessionStorage update completed");
              
              // Force refresh the page to ensure sync if direct update was needed
              if (user.role === 'mentor') {
                console.log("[Profile Save] Scheduling page refresh for mentor profile sync");
                setTimeout(() => {
                  window.location.reload();
                }, 1000); // Wait 1 second before refresh
              }
            } catch (storageError) {
              console.error("[Profile Save] Failed direct sessionStorage update:", storageError);
            }
          }
        } catch (authUpdateError) {
          console.error("[Profile Save] Error during auth context update:", authUpdateError);
        }
        
        // Update the local profile data state with our merged data to ensure UI consistency
        const mergedProfileData = {
          ...updatedData,
          mentorProfile: user.role === 'mentor' ? updatedMentorProfile : updatedData.mentorProfile
        };
        
        setProfileData(mergedProfileData);
        console.log("[Profile Save] Updated local profile state with merged data:", mergedProfileData);
        
        // Update image preview if needed
        if (updatedData.profileImage && updatedData.profileImage !== imagePreview) {
          setImagePreview(updatedData.profileImage);
          console.log("[Profile Save] Updated image preview with new profile image");
        }
        
        // Add a parameter with current timestamp to force refresh of any cached images
        const timestamp = new Date().getTime();
        if (updatedData.profileImage && updatedData.profileImage.includes('http')) {
          const refreshedImageUrl = updatedData.profileImage.includes('?') 
            ? `${updatedData.profileImage}&t=${timestamp}` 
            : `${updatedData.profileImage}?t=${timestamp}`;
          setImagePreview(refreshedImageUrl);
          console.log("[Profile Save] Added timestamp to image URL to prevent caching:", refreshedImageUrl);
        }
      } else {
        console.warn("[Profile Save] Didn't receive updated data from API!");
        
        // For mentors, if we don't get response data, force a sync from server
        if (user.role === 'mentor') {
          try {
            const freshData = await userProfileApi.getProfile(user._id || user.id, 'mentor');
            if (freshData) {
              setProfileData(freshData);
              console.log("[Profile Save] Forced refresh of mentor profile after missing API response");
            }
          } catch (err) {
            console.error("[Profile Save] Failed to refresh mentor profile:", err);
          }
        }
      }
      
      // Store original data for verification
      const originalProfileData = JSON.parse(JSON.stringify(profileData));

      // Verify the save was successful (especially important for mentor profiles)
      const verificationResult = await verifyProfileSave(originalProfileData, updatedData || updatedProfile);

      toast.dismiss(savingToastId);

      if (verificationResult) {
        toast.success('Profile updated successfully!', {
          ...toastOptions,
          icon: '✅',
        });
        
        // Force a page reload for mentor profiles to ensure data is refreshed
        if (user.role === 'mentor') {
          toast.success('Refreshing page to show updated profile...', {
            ...toastOptions,
            duration: 2000
          });
          
          // Set a short timeout to allow the success message to be seen
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } else {
        if (user.role === 'mentor') {
          toast.success('Profile partially updated. Refreshing page...', {
            ...toastOptions,
            icon: '⚠️',
          });
          
          // Always reload for mentors to ensure we have fresh data
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          toast.success('Profile updated successfully!', {
            ...toastOptions,
            icon: '✅',
          });
        }
      }
      
      // Clear the file input
      setImageFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      console.log("[Profile Save] Cleared file input after successful save");
      
    } catch (error) {
      console.error('[Profile Save] Error updating profile:', error);
      if (error.response) {
        console.error('[Profile Save] Error status:', error.response.status);
        console.error('[Profile Save] Error data:', error.response.data);
        
        // Provide more specific error messages based on the response
        if (error.response.status === 400) {
          toast.error(`Validation error: ${error.response.data.message || 'Please check your input fields'}`, toastOptions);
        } else if (error.response.status === 401) {
          toast.error('Authentication error: Please log in again', toastOptions);
          setTimeout(() => {
            logout();
            navigate('/login');
          }, 3000);
        } else if (error.response.status === 403) {
          toast.error('Permission denied: You don\'t have access to update this profile', toastOptions);
        } else if (error.response.status === 500) {
          toast.error('Server error: The server encountered an issue. Please try again later.', toastOptions);
        } else {
          toast.error(`Failed to update profile: ${error.response.data.message || error.message}`, toastOptions);
        }
      } else if (error.message === 'Network Error') {
        toast.error('Network error: Please check your internet connection', toastOptions);
      } else {
        toast.error(`Failed to update profile: ${error.message || 'Unknown error occurred'}`, toastOptions);
      }
      
      // Force profile refresh to ensure UI is in sync with server data
      try {
        console.log("[Profile Save] Refreshing profile data after error");
        await fetchUserProfile();
      } catch (refreshError) {
        console.error('[Profile Save] Error refreshing profile after save failure:', refreshError);
      }
    } finally {
      setSaving(false);
      saveInProgressRef.current = false; // Reset ref when save completes
      console.log("[Profile Save] Save process completed");
    }
  }, [
    profileData, 
    user, 
    lastSaveTime, 
    saving, 
    validateForm, 
    verifyProfileSave,
    toastOptions,
    updateUserData,
    navigate,
    logout,
    setProfileData,
    imageFile,
    setImageFile,
    fileInputRef,
    imagePreview,
    setImagePreview,
    fetchUserProfile
  ]);

  // Wrap handleSaveProfile in useCallback to prevent recreation on each render
  const handleSaveProfile = useCallback(async (e) => {
    // Prevent any default form submission behavior
    if (e) {
      e.preventDefault();
      console.log("[Profile Save] Save button clicked - event details:", {
        type: e.type,
        target: e.target,
        currentTarget: e.currentTarget,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log("[Profile Save] Save function called without event");
    }
    
    console.log("[Profile Save] Save button clicked - initiating save process");
    try {
      await saveProfile();
    } catch (error) {
      console.error("[Profile Save] Error during save:", error);
      toast.error("An unexpected error occurred during save", toastOptions);
      setSaving(false); // Make sure to reset saving state if there's an uncaught error
    }
  }, [saveProfile, toastOptions]);

  const removeProfileImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setProfileData({
      ...profileData,
      profileImage: null
    });
  };

  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };

  const forceSyncProfile = async () => {
    try {
      setSyncing(true);
      const savingToastId = toast.loading('Forcing profile sync...', toastOptions);
      
      console.log("[SYNC] Initiating force profile sync");
      const userId = user._id || user.id;
      
      // Get fresh profile data from the backend
      const freshProfileData = await userProfileApi.getProfile(userId, user.role);
      console.log("[SYNC] Fresh profile data from backend:", freshProfileData);
      
      // Special handling for mentor profiles
      if (user.role === 'mentor') {
        // Handle missing mentorProfile
        if (!freshProfileData.mentorProfile) {
          console.log("[SYNC] Creating missing mentorProfile structure in fresh data");
          
          // Use existing profile data if available, or create defaults
          const currentMentorProfile = profileData?.mentorProfile || {
          title: 'Mentor',
          bio: '',
          hourlyRate: 0,
          experienceLevel: 0,
          specializations: [],
          availability: true
        };
          
          // Create mentorProfile in the fresh data
          freshProfileData.mentorProfile = currentMentorProfile;
          
          // Try to save this profile back to the server
          try {
            console.log("[SYNC] Saving mentorProfile structure to server");
            await userProfileApi.updateProfile(userId, 'mentor', freshProfileData);
          } catch (error) {
            console.error("[SYNC] Error saving mentorProfile structure:", error);
            // Continue with local update even if server save fails
          }
        }
      }
      
      // Update the UI state with fresh data
      setProfileData(freshProfileData);
      console.log("[SYNC] Updated local state with fresh data");
      
      // Update auth context and session storage with basic user data
      const basicUserData = {
        ...user,
        _id: freshProfileData._id || userId,
        id: freshProfileData._id || userId,
        name: freshProfileData.name || user.name,
        email: freshProfileData.email || user.email,
        profileImage: freshProfileData.profileImage || user.profileImage,
        role: user.role // Preserve role
      };
      
      // For mentors, ensure mentorProfile is included
      if (user.role === 'mentor' && freshProfileData.mentorProfile) {
        basicUserData.mentorProfile = freshProfileData.mentorProfile;
      }
      // For mentees, ensure menteeProfile is included if available
      else if (user.role === 'mentee' && freshProfileData.menteeProfile) {
        basicUserData.menteeProfile = freshProfileData.menteeProfile;
      }
      
      // Update session storage directly for reliability
      sessionStorage.setItem('user', JSON.stringify(basicUserData));
      console.log("[SYNC] Updated session storage directly");
      
      // Also update via the context API
      updateUserData(basicUserData);
      console.log("[SYNC] Auth context update completed");
      
      // Dismiss the loading toast
      toast.dismiss(savingToastId);
      
      // Show success message
      toast.success('Profile data synchronized!', {
        ...toastOptions,
        icon: '✅',
        style: {
          ...toastOptions.style,
          border: '1px solid #10b981',
          background: '#ecfdf5',
          color: '#064e3b'
        }
      });
      
      // For mentors, always reload the page to ensure UI consistency
      if (user.role === 'mentor') {
        toast.success('Refreshing page with latest data...', {
          ...toastOptions,
          duration: 2000
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      console.error("[SYNC] Force sync error:", error);
      toast.error('Failed to synchronize profile data', toastOptions);
      
      // If server sync fails, at least make sure UI is in a good state
      try {
        // If we have any profile data, update the session directly as a fallback
        if (profileData) {
          const userData = {
            ...user,
            name: profileData.name || user.name,
            email: profileData.email || user.email,
            profileImage: profileData.profileImage || user.profileImage
          };
          
          if (user.role === 'mentor' && profileData.mentorProfile) {
            userData.mentorProfile = profileData.mentorProfile;
          }
          
          sessionStorage.setItem('user', JSON.stringify(userData));
          console.log("[SYNC] Updated session storage as error recovery");
        }
      } catch (storageError) {
        console.error("[SYNC] Failed to update session in error recovery:", storageError);
      }
    } finally {
      setSyncing(false);
    }
  };

  // Effect to ensure saving state gets reset if component unmounts during save
  useEffect(() => {
    return () => {
      if (saving) {
        console.log("[Profile Save] Component unmounted during save - cleaning up");
        setSaving(false);
      }
    };
  }, [saving]);

  // Add a new function for direct mentor save
  const directMentorSave = async () => {
    if (user.role !== 'mentor') {
      toast.error('This function is only available for mentors', toastOptions);
      return;
    }
    
    if (!profileData || !profileData.mentorProfile) {
      toast.error('Mentor profile data is missing', toastOptions);
      return;
    }
    
    try {
      setSaving(true);
      const savingToastId = toast.loading('Directly saving mentor profile...', toastOptions);
      
      const userId = user._id || user.id;
      console.log("[MENTOR DEBUG] Direct save initiated with user ID:", userId);
      
      // Create simplified payload with careful handling of all fields
      const mp = profileData.mentorProfile || {};
      
      // Process specializations to ensure it's an array
      let specializations = [];
      if (mp.specializations) {
        if (Array.isArray(mp.specializations)) {
          specializations = mp.specializations.filter(s => !!s);
        } else if (typeof mp.specializations === 'string') {
          specializations = mp.specializations
            .split(',')
            .map(s => s.trim())
            .filter(s => !!s);
        }
      }
      
      const savePayload = {
        name: profileData.name || user.name,
        email: profileData.email || user.email,
        mentorProfile: {
          title: mp.title || 'Mentor',
          bio: mp.bio || '',
          hourlyRate: Number(mp.hourlyRate) || 0,
          experienceLevel: Number(mp.experienceLevel) || 0,
          specializations: specializations,
          availability: mp.availability === undefined ? true : !!mp.availability
        }
      };
      
      console.log("[MENTOR DEBUG] Prepared payload for direct save:", savePayload);
      
      // Get the base URL and authentication details
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      
      // Try various possible API endpoints in sequence
      const endpoints = [
        // First try the profile endpoint
        { url: `${baseUrl}/api/mentors/profile`, method: 'put' },
        // Then try with ID
        { url: `${baseUrl}/api/mentors/${userId}`, method: 'put' },
        // Then try the user update endpoint which some backends use
        { url: `${baseUrl}/api/users/${userId}`, method: 'put' }
      ];
      
      let response = null;
      let successEndpoint = null;
      
      // Try each endpoint in sequence until one works
      for (const endpoint of endpoints) {
        try {
          console.log(`[MENTOR DEBUG] Trying API endpoint: ${endpoint.url}`);
          
          // Make the request
          const result = await axios({
            method: endpoint.method,
            url: endpoint.url,
        data: savePayload,
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Session-ID': sessionId,
            'Content-Type': 'application/json'
          },
        timeout: 8000 // 8 seconds timeout
      });
      
          // If we got here, the request succeeded
          response = result;
          successEndpoint = endpoint.url;
          console.log(`[MENTOR DEBUG] Success with endpoint: ${successEndpoint}`);
          break;
        } catch (error) {
          console.error(`[MENTOR DEBUG] Failed with endpoint ${endpoint.url}:`, error.message);
          // Continue to the next endpoint
        }
      }
      
      // If all endpoints failed, throw an error
      if (!response) {
        throw new Error("All API endpoints failed");
      }
      
      console.log(`[MENTOR DEBUG] Direct save succeeded with ${successEndpoint}:`, response.data);
      
      // Update the user data and UI
      if (response.data) {
        // Update local state
        setProfileData({
          ...profileData,
          ...response.data
        });
        
        // Update the auth context
      const updatedUserData = {
        ...user,
          name: response.data.name || profileData.name || user.name,
          email: response.data.email || profileData.email || user.email,
          mentorProfile: response.data.mentorProfile || profileData.mentorProfile || user.mentorProfile
        };
        
        // Update via both auth context and session storage for redundancy
        updateUserData(updatedUserData);
      sessionStorage.setItem('user', JSON.stringify(updatedUserData));
      
      toast.dismiss(savingToastId);
        toast.success('Profile saved successfully!', toastOptions);
      
        // Force page reload to ensure data is fresh
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      } else {
        toast.dismiss(savingToastId);
        toast.warning('Save completed but received no data in response.', toastOptions);
        
        // Trigger sync anyway to ensure we have fresh data
        setTimeout(() => {
          forceSyncProfile();
        }, 1000);
      }
    } catch (error) {
      console.error("[MENTOR DEBUG] Direct save error:", error);
      console.error("[MENTOR DEBUG] Error response:", error.response?.data);
      
      // Create a helpful error message
      let errorMessage = 'Failed to save profile';
      
      if (error.response) {
        const status = error.response.status;
        
        if (status === 404) {
          errorMessage = 'API endpoint not found. Contact support.';
        } else if (status === 401) {
          errorMessage = 'Authentication error. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'You do not have permission to update this profile.';
        } else if (status === 400) {
          errorMessage = `Validation error: ${error.response.data.message || 'Invalid data format'}`;
        } else if (status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Check your connection.';
      }
      
      toast.error(errorMessage, toastOptions);
      
      // Always fall back to forceSyncProfile as a recovery method
      setTimeout(() => {
        forceSyncProfile();
      }, 2000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
        <Header />
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!user || !profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
        <Header />
        <div className="flex flex-col items-center justify-center min-h-[80vh]">
          <AlertCircle className="w-12 h-12 text-error-500 mb-4" />
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">Profile Not Found</h1>
          <p className="text-neutral-600 mb-6">Unable to load your profile information.</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Profile Sidebar */}
          <div className="w-full md:w-64">
            <Card className="sticky top-20">
              <CardContent className="p-6">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-32 h-32 relative">
                      <Avatar 
                        src={imagePreview || 
                          (profileData.profileImage ? addCacheBustingToUrl(profileData.profileImage) : null)
                        }
                        alt={profileData.name}
                        name={profileData.name}
                        size="2xl"
                        border={true}
                        borderColor="white"
                        className="shadow-md"
                        status={user.role === 'mentor' && profileData.mentorProfile?.availability ? 'online' : undefined}
                        onClick={refreshImage}
                      />
                      
                      {user._id === profileData._id && (
                        <button
                          type="button"
                          className="absolute bottom-0 right-0 bg-white p-1 rounded-full shadow-md hover:bg-gray-100"
                          onClick={refreshImage}
                          title="Refresh image"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={handleImageClick}
                    >
                      <div className="text-white text-center">
                        <Camera className="w-8 h-8 mx-auto mb-1" />
                        <span className="text-xs">Change Photo</span>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageChange}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                  
                  {imagePreview && (
                    <div className="flex space-x-2 mb-4 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-xs"
                        onClick={removeProfileImage}
                      >
                        <Trash className="w-3 h-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  )}
                  
                  <h2 className="text-xl font-bold text-neutral-900 mt-4">{profileData.name}</h2>
                  <p className="text-neutral-500">
                    {user.role === 'mentor' 
                      ? profileData.mentorProfile?.title || 'Mentor'
                      : profileData.menteeProfile?.title || 'Mentee'
                    }
                  </p>
                </div>
                
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg ${
                      activeTab === 'personal'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <User className="w-4 h-4 mr-3" />
                    Personal Information
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('professional')}
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg ${
                      activeTab === 'professional'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mr-3" />
                    {user.role === 'mentor' ? 'Mentor Profile' : 'Education & Goals'}
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('skills')}
                    className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-lg ${
                      activeTab === 'skills'
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <Award className="w-4 h-4 mr-3" />
                    {user.role === 'mentor' ? 'Skills & Expertise' : 'Interests & Skills'}
                  </button>
                </nav>
              </CardContent>
            </Card>
          </div>
          
          {/* Main Content */}
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Edit Your Profile</CardTitle>
              </CardHeader>
              
              <CardContent>
                {/* Personal Information */}
                {activeTab === 'personal' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-neutral-900">Personal Information</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                          <Input
                            name="name"
                            value={profileData.name || ''}
                            onChange={handleInputChange}
                            placeholder="Your full name"
                            className="pl-10"
                            error={errors.name}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                          <Input
                            name="email"
                            value={profileData.email || ''}
                            onChange={handleInputChange}
                            placeholder="Your email address"
                            className="pl-10"
                            error={errors.email}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                          <Input
                            name="phone"
                            value={profileData.phone || ''}
                            onChange={handleInputChange}
                            placeholder="Your phone number"
                            className="pl-10"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                          <Input
                            name="location"
                            value={profileData.location || ''}
                            onChange={handleInputChange}
                            placeholder="Your location (City, Country)"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Professional Information / Education & Goals */}
                {activeTab === 'professional' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {user.role === 'mentor' ? 'Mentor Profile' : 'Education & Goals'}
                    </h3>
                    
                    <div className="space-y-4">
                      {user.role === 'mentor' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Professional Title</label>
                            <Input
                              name="title"
                              value={profileData.mentorProfile?.title || ''}
                              onChange={(e) => handleInputChange(e, 'mentorProfile')}
                              placeholder="e.g. Senior Software Engineer"
                              error={errors.title}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Bio</label>
                            <textarea
                              name="bio"
                              value={profileData.mentorProfile?.bio || ''}
                              onChange={(e) => handleInputChange(e, 'mentorProfile')}
                              rows="4"
                              className={`mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                                errors.bio ? 'border-error-300' : ''
                              }`}
                              placeholder="Tell mentees about yourself, your experience, and your mentoring style"
                            />
                            {errors.bio && <p className="mt-1 text-xs text-error-500">{errors.bio}</p>}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Years of Experience</label>
                            <Input
                              name="experienceLevel"
                              type="number"
                              value={profileData.mentorProfile?.experienceLevel || ''}
                              onChange={(e) => handleInputChange(e, 'mentorProfile')}
                              placeholder="Years of professional experience"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Hourly Rate ($)</label>
                            <Input
                              name="hourlyRate"
                              type="number"
                              value={profileData.mentorProfile?.hourlyRate || ''}
                              onChange={(e) => handleInputChange(e, 'mentorProfile')}
                              placeholder="Your hourly rate in USD"
                              error={errors.hourlyRate}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Availability</label>
                            <div className="flex items-center space-x-4">
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  name="availability"
                                  checked={profileData.mentorProfile?.availability === true}
                                  onChange={() => setProfileData({
                                    ...profileData,
                                    mentorProfile: {
                                      ...profileData.mentorProfile,
                                      availability: true
                                    }
                                  })}
                                  className="form-radio text-primary-600"
                                />
                                <span className="ml-2">Available for new mentees</span>
                              </label>
                              <label className="inline-flex items-center">
                                <input
                                  type="radio"
                                  name="availability"
                                  checked={profileData.mentorProfile?.availability === false}
                                  onChange={() => setProfileData({
                                    ...profileData,
                                    mentorProfile: {
                                      ...profileData.mentorProfile,
                                      availability: false
                                    }
                                  })}
                                  className="form-radio text-primary-600"
                                />
                                <span className="ml-2">Not available</span>
                              </label>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Education Level</label>
                            <select
                              name="educationLevel"
                              value={profileData.menteeProfile?.educationLevel || ''}
                              onChange={(e) => handleInputChange(e, 'menteeProfile')}
                              className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                              <option value="">Select your education level</option>
                              <option value="High School">High School</option>
                              <option value="Associate's Degree">Associate's Degree</option>
                              <option value="Bachelor's Degree">Bachelor's Degree</option>
                              <option value="Master's Degree">Master's Degree</option>
                              <option value="PhD">PhD</option>
                              <option value="Self-taught">Self-taught</option>
                              <option value="Bootcamp">Bootcamp</option>
                              <option value="Other">Other</option>
                            </select>
                            {errors.educationLevel && <p className="mt-1 text-xs text-error-500">{errors.educationLevel}</p>}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Career Goals</label>
                            <textarea
                              name="goals"
                              value={profileData.menteeProfile?.goals || ''}
                              onChange={(e) => handleInputChange(e, 'menteeProfile')}
                              rows="4"
                              className={`mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                                errors.goals ? 'border-error-300' : ''
                              }`}
                              placeholder="Describe your career goals and what you hope to achieve through mentorship"
                            />
                            {errors.goals && <p className="mt-1 text-xs text-error-500">{errors.goals}</p>}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Experience Level</label>
                            <select
                              name="experienceLevel"
                              value={profileData.menteeProfile?.experienceLevel || ''}
                              onChange={(e) => handleInputChange(e, 'menteeProfile')}
                              className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                              <option value="">Select your experience level</option>
                              <option value="0">No experience</option>
                              <option value="1">Less than 1 year</option>
                              <option value="2">1-2 years</option>
                              <option value="3">3-5 years</option>
                              <option value="5">5+ years</option>
                            </select>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Skills & Expertise / Interests & Skills */}
                {activeTab === 'skills' && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {user.role === 'mentor' ? 'Skills & Expertise' : 'Interests & Skills'}
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">
                          {user.role === 'mentor' ? 'Areas of Expertise' : 'Areas of Interest'}
                        </label>
                        <p className="text-sm text-neutral-500 mb-2">Enter skills separated by commas</p>
                        <textarea
                          value={
                            user.role === 'mentor'
                              ? (profileData.mentorProfile?.specializations || []).join(', ')
                              : (profileData.menteeProfile?.interests || []).join(', ')
                          }
                          onChange={handleSkillsChange}
                          rows="3"
                          className="mt-1 block w-full rounded-lg border-neutral-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                          placeholder={
                            user.role === 'mentor'
                              ? 'e.g. JavaScript, React, Node.js, Leadership, System Design'
                              : 'e.g. Web Development, Machine Learning, UI/UX Design'
                          }
                        />
                      </div>
                      
                      {user.role === 'mentor' && (
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">Industries</label>
                          <Input
                            name="industries"
                            value={profileData.mentorProfile?.industries || ''}
                            onChange={(e) => handleInputChange(e, 'mentorProfile')}
                            placeholder="e.g. Technology, Finance, Healthcare"
                          />
                        </div>
                      )}
                      
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Languages</label>
                        <Input
                          name="languages"
                          value={
                            user.role === 'mentor'
                              ? profileData.mentorProfile?.languages || ''
                              : profileData.menteeProfile?.languages || ''
                          }
                          onChange={(e) => handleInputChange(e, user.role === 'mentor' ? 'mentorProfile' : 'menteeProfile')}
                          placeholder="e.g. English, Spanish, French"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-8 flex flex-col md:flex-row justify-end gap-2 md:gap-4">
                  {user.role === 'mentor' && (
                    <Button 
                      onClick={directMentorSave} 
                      className="w-full md:w-auto order-1 md:order-1"
                      variant="secondary"
                      size="lg"
                      type="button"
                      disabled={saving || syncing}
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
                      <div className="flex items-center space-x-2">
                        <Save className="w-5 h-5" />
                          <span>Fast Save for Mentors</span>
                      </div>
                      )}
                    </Button>
                  )}
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={saving || syncing} 
                    className="w-full md:w-auto order-2 md:order-2"
                    variant="default"
                    size="lg"
                    type="button"
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
                      <div className="flex items-center space-x-2">
                        <Save className="w-5 h-5" />
                        <span>Save All Changes</span>
                      </div>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Debug Panel */}
      <div className="max-w-6xl mx-auto px-4 pb-8">
        <div className="flex justify-end mt-4">
          <Button 
            onClick={toggleDebugMode} 
            variant="ghost" 
            size="sm"
            className="text-xs"
          >
            {debugMode ? 'Hide Debug Info' : 'Show Debug Info'}
          </Button>
        </div>
        
        {debugMode && (
          <Card className="mt-4 overflow-hidden">
            <CardHeader className="bg-neutral-800 text-white">
              <CardTitle className="text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="p-4 text-xs font-mono overflow-auto max-h-96">
              <div className="mb-4">
                <h4 className="font-bold mb-1">User:</h4>
                <pre className="bg-neutral-100 p-2 rounded overflow-auto">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-bold mb-1">Profile Data:</h4>
                <pre className="bg-neutral-100 p-2 rounded overflow-auto">
                  {JSON.stringify(profileData, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {user?.role === 'mentor' && (
        <div className="max-w-6xl mx-auto px-4 pb-4">
          <div className="flex justify-center mt-2">
            <Button 
              onClick={forceSyncProfile} 
              variant="outline" 
              size="sm"
              className="text-xs bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
              disabled={syncing}
            >
              {syncing ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-3 w-3 text-amber-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Syncing...</span>
                </div>
              ) : (
                <>🔄 Force Mentor Profile Sync</>
              )}
            </Button>
          </div>
          <div className="text-center mt-1">
            <p className="text-xs text-amber-600">Synchronizes profile data with server, confirming your profile is up-to-date</p>
          </div>
        </div>
      )}
      
      <Toaster position="top-right" />
    </main>
  );
};

export default UserProfile; 