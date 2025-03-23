import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import MentorCard from '../components/MentorCard';
import SearchFilters from '../components/SearchFilters';
import RequestMentorshipModal from '../components/RequestMentorshipModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MentorMatching = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    experienceRange: '',
    hourlyRate: '',
    availability: false,
    rating: '',
    expertise: ''
  });

  useEffect(() => {
    if (!user || user.role !== 'mentee') {
      navigate('/dashboard');
      return;
    }

    // Add debounce to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchMentors();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchTerm, user, navigate]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      if (!token) {
        console.error("No authentication token found");
        navigate('/login');
        return;
      }

      let url = "http://localhost:5000/api/mentors";
      const queryParams = new URLSearchParams();

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      if (selectedSkills.length > 0) {
        queryParams.append('skills', selectedSkills.join(','));
      }
      if (filters.experienceRange) {
        queryParams.append('experienceRange', filters.experienceRange);
      }
      if (filters.hourlyRate) {
        queryParams.append('hourlyRate', filters.hourlyRate);
      }
      if (filters.availability) {
        queryParams.append('availability', 'true');
      }
      if (filters.rating) {
        queryParams.append('rating', filters.rating);
      }
      if (filters.expertise) {
        queryParams.append('expertise', filters.expertise);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      console.log('Fetching mentors with URL:', url);
      console.log('Using token:', token);

      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Mentors response:', response.data);
      setMentors(response.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching mentors:", err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError(err.response?.data?.message || "Failed to load mentors. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkillToggle = (skillId) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRequestMentorship = (mentor) => {
    setSelectedMentor(mentor);
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async (message) => {
    try {
      if (!token) {
        alert('Please log in to request mentorship');
        return;
      }

      await axios.post(
        `http://localhost:5000/api/mentors/${selectedMentor._id}/request`,
        { message },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      alert('Mentorship request sent successfully!');
      setIsModalOpen(false);
    } catch (error) {
      alert('Failed to send mentorship request: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading mentors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Mentor</h1>
        <p className="mt-2 text-gray-600">Connect with experienced mentors who can guide you in your journey</p>
      </div>

      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <SearchFilters
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
          selectedSkills={selectedSkills}
          onSkillToggle={handleSkillToggle}
          onFilterChange={handleFilterChange}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Results Count */}
      <div className="max-w-7xl mx-auto mb-6">
        <p className="text-gray-600">
          Found {mentors.length} mentor{mentors.length !== 1 ? 's' : ''} matching your criteria
        </p>
      </div>

      {/* Mentors Grid */}
      <div className="max-w-7xl mx-auto">
        {mentors.length === 0 && !error ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No mentors found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map(mentor => (
              <MentorCard
                key={mentor._id}
                mentor={mentor}
                onRequestMentorship={handleRequestMentorship}
              />
            ))}
          </div>
        )}
      </div>

      {/* Request Mentorship Modal */}
      <RequestMentorshipModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitRequest}
        mentorName={selectedMentor?.name}
      />
    </div>
  );
};

export default MentorMatching;
