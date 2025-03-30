import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import StarRating from './StarRating';

const ReviewList = ({ mentorId }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [mentorId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem('token');
      const sessionId = sessionStorage.getItem('sessionId');
      
      console.log('[ReviewList] Fetching reviews for mentor:', mentorId);
      
      const response = await axios.get(`http://localhost:5000/api/mentors/${mentorId}/reviews`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'X-Session-ID': sessionId
        }
      });
      
      console.log('[ReviewList] Reviews data:', response.data);
      
      // Handle different response structures
      let reviewData = [];
      if (Array.isArray(response.data)) {
        reviewData = response.data;
      } else if (response.data.reviews && Array.isArray(response.data.reviews)) {
        reviewData = response.data.reviews;
      } else if (typeof response.data === 'object') {
        // If none of the above, try to extract reviews from response
        reviewData = Object.values(response.data).filter(item => 
          item && typeof item === 'object' && (item.rating !== undefined || item.text !== undefined)
        );
      }
      
      console.log('[ReviewList] Processed review data:', reviewData);
      
      setReviews(reviewData);
      setError(null);
    } catch (err) {
      console.error('[ReviewList] Error fetching reviews:', err);
      setError('Failed to load reviews: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse p-4 bg-gray-100 rounded-lg">Loading reviews...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4 bg-red-50 rounded-lg">{error}</div>;
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="text-gray-500 p-6 bg-gray-50 rounded-lg text-center">
        No reviews yet. Be the first to leave a review!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review, index) => (
        <motion.div 
          key={review._id || review.id || index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.1 }}
          className="bg-white p-6 rounded-lg shadow"
        >
          <div className="flex items-center space-x-4">
            <img
              src={
                (review.userId?.profileImage || review.user?.profileImage) || 
                `https://ui-avatars.com/api/?name=${encodeURIComponent((review.userId?.name || review.user?.name || 'User') + '')}&background=random`
              }
              alt={(review.userId?.name || review.user?.name || 'User')}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null; // Prevent infinite fallback loop
                e.target.src = `https://ui-avatars.com/api/?name=User&background=random`;
              }}
            />
            <div>
              <h4 className="font-semibold">{review.userId?.name || review.user?.name || 'Anonymous User'}</h4>
              <StarRating rating={review.rating || 0} />
            </div>
          </div>
          <p className="mt-4 text-gray-600">{review.text || review.comment || 'No comment provided'}</p>
          <div className="mt-4 text-sm text-gray-500">
            {new Date(review.createdAt || review.date || Date.now()).toLocaleDateString()}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ReviewList; 