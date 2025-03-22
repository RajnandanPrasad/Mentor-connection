import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import GoalTracker from '../components/GoalTracker/GoalTracker';

const GoalTracking = () => {
  const { menteeId, mentorId } = useParams();
  const [mentorship, setMentorship] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMentorshipDetails = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `http://localhost:5000/api/mentorships/${menteeId}/${mentorId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        setMentorship(response.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching mentorship details:', err);
        setError('Failed to load mentorship details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (menteeId && mentorId) {
      fetchMentorshipDetails();
    }
  }, [menteeId, mentorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mentorship details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!mentorship) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No mentorship found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Goal Tracking</h1>
          <p className="mt-2 text-gray-600">
            Track and manage goals for your mentorship with {mentorship.mentor.name}
          </p>
        </div>

        {/* Goal Tracker Component */}
        <GoalTracker
          menteeId={menteeId}
          mentorId={mentorId}
        />
      </div>
    </div>
  );
};

export default GoalTracking; 