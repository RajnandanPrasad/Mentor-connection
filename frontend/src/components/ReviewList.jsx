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
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/mentors/${mentorId}/reviews`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Loading reviews...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (reviews.length === 0) {
    return <div className="text-gray-500">No reviews yet</div>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review._id} className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <img
              src={review.userId?.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(review.userId?.name || '')}&background=random`}
              alt={review.userId?.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <h4 className="font-semibold">{review.userId?.name}</h4>
              <StarRating rating={review.rating} />
            </div>
          </div>
          <p className="mt-4 text-gray-600">{review.comment}</p>
          <div className="mt-4 text-sm text-gray-500">
            {new Date(review.createdAt).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReviewList; 