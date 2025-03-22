import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StarRating from '../StarRating';
import ReviewList from '../ReviewList';
import ImageUpload from '../ImageUpload';

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

  // Handle case when auth is null
  const user = auth?.user;
  const isOwnProfile = user?._id === mentorId;
  const isMentee = user?.role === 'mentee';

  useEffect(() => {
    fetchMentorProfile();
  }, [mentorId]);

  const fetchMentorProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/mentors/${mentorId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMentor(response.data);
      setEditedProfile(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching mentor profile:', err);
      setError('Failed to load mentor profile');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(
        `http://localhost:5000/api/mentors/${mentorId}/upload-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      setMentor(prev => ({
        ...prev,
        mentorProfile: {
          ...prev.mentorProfile,
          images: [...(prev.mentorProfile.images || []), response.data.imageUrl]
        }
      }));
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const response = await axios.put(
        `http://localhost:5000/api/mentors/${mentorId}`,
        editedProfile,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setMentor(response.data);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  };

  const handleReviewSubmit = async () => {
    try {
      setError(null); // Clear any previous errors
      const response = await axios.post(
        `http://localhost:5000/api/mentors/${mentorId}/reviews`,
        newReview,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      
      // Update the mentor's rating and total reviews
      setMentor(prev => ({
        ...prev,
        mentorProfile: {
          ...prev.mentorProfile,
          rating: response.data.newRating,
          totalReviews: (prev.mentorProfile.totalReviews || 0) + 1
        }
      }));
      
      // Show success message
      setError('Review submitted successfully!');
      setTimeout(() => {
        setShowReviewModal(false);
        setNewReview({ rating: 0, comment: '' });
        setError(null); // Clear the success message
      }, 2000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err.response?.data?.message || 'Failed to submit review');
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-end space-x-6">
                <div className="relative">
                  <img
                    src={mentor?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(mentor?.name || '')}&background=random`}
                    alt={mentor?.name}
                    className="w-32 h-32 rounded-full border-4 border-white object-cover"
                  />
                  {isEditing && isOwnProfile && (
                    <div className="absolute bottom-0 right-0">
                      <ImageUpload 
                        onUpload={handleImageUpload} 
                        disabled={uploadingImage}
                      />
                    </div>
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
                    rating={newReview.rating}
                    onRatingChange={(rating) => setNewReview({ ...newReview, rating })}
                    interactive
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
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
                  disabled={!newReview.rating || !newReview.comment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit Review
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