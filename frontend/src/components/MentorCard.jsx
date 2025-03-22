import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import StarRating from './StarRating';

const MentorCard = ({ mentor, onRequestMentorship }) => {
  const [latestReview, setLatestReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLatestReview();
  }, [mentor._id]);

  const fetchLatestReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/mentors/${mentor._id}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.length > 0) {
        setLatestReview(response.data[0]); // Get the most recent review
      }
    } catch (error) {
      console.error('Error fetching latest review:', error);
    } finally {
      setLoading(false);
    }
  };

  const getExperienceDisplay = () => {
    if (mentor.mentorProfile.experience) {
      return `${mentor.mentorProfile.experience} years`;
    }
    if (mentor.mentorProfile.experienceLevel) {
      return mentor.mentorProfile.experienceLevel.charAt(0).toUpperCase() + 
             mentor.mentorProfile.experienceLevel.slice(1);
    }
    return 'Experience not specified';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300"
    >
      <div className="relative">
        <div className="absolute top-4 right-4 z-10">
          {mentor.mentorProfile.availability ? (
            <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">
              Available
            </span>
          ) : (
            <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
              Unavailable
            </span>
          )}
        </div>
        <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
        <div className="absolute -bottom-12 left-6">
          {mentor.profileImage ? (
            <img
              src={mentor.profileImage}
              alt={mentor.name}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg"
            />
          ) : (
            <div className="h-24 w-24 rounded-full border-4 border-white bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">
                {mentor.name.charAt(0)}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-16 px-6 pb-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{mentor.name}</h3>
            <p className="text-blue-600 font-medium">{mentor.mentorProfile.title}</p>
          </div>
          <div className="flex items-center">
            <StarRating rating={mentor.mentorProfile.rating || 0} />
            <span className="ml-2 text-sm text-gray-600">
              ({mentor.mentorProfile.totalReviews || 0})
            </span>
          </div>
        </div>

        <p className="mt-4 text-gray-600 text-sm line-clamp-2">{mentor.mentorProfile.bio}</p>

        <div className="mt-4">
          <div className="flex flex-wrap gap-2">
            {mentor.mentorProfile.skills?.map((skill, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>

        {/* Latest Review */}
        {latestReview && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <img
                src={latestReview.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(latestReview.userId?.name || '')}&background=random`}
                alt={latestReview.userId?.name}
                className="w-6 h-6 rounded-full"
              />
              <span className="text-sm font-medium text-gray-700">{latestReview.userId?.name}</span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{latestReview.comment}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="ml-1 text-sm text-gray-600">{getExperienceDisplay()}</span>
            </div>
            {mentor.mentorProfile.hourlyRate && (
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                </svg>
                <span className="ml-1 text-sm text-gray-600">${mentor.mentorProfile.hourlyRate}/hr</span>
              </div>
            )}
          </div>
          <div className="flex space-x-3">
            <Link
              to={`/mentor/${mentor._id}`}
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View Profile
            </Link>
            <button
              onClick={() => onRequestMentorship(mentor)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              Request Mentorship
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MentorCard; 