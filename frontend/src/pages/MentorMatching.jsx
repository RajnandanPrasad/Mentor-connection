import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import MentorCard from '../components/MentorCard';
import SearchFilters from '../components/SearchFilters';
import RequestMentorshipModal from '../components/RequestMentorshipModal';

const MentorMatching = () => {
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

  // Fetch mentors from backend
  const fetchMentors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSkills.length > 0) params.append('skills', selectedSkills.join(','));
      
      // Add filter parameters
      if (filters.experienceRange) params.append('experienceRange', filters.experienceRange);
      if (filters.hourlyRate) params.append('hourlyRate', filters.hourlyRate);
      if (filters.availability) params.append('availability', 'true');
      if (filters.rating) params.append('rating', filters.rating);
      if (filters.expertise) params.append('expertise', filters.expertise);

      console.log('Fetching mentors with params:', Object.fromEntries(params));
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(`http://localhost:5000/api/mentors?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Response from server:', response.data);
      
      if (!Array.isArray(response.data)) {
        console.error('Invalid response format:', response.data);
        throw new Error('Invalid response format from server');
      }

      setMentors(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching mentors:', err);
      console.error('Error response:', err.response?.data);
      setError(err.response?.data?.message || 'Failed to fetch mentors. Please try again later.');
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch mentors when search, filters, or selected skills change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMentors();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedSkills, filters]);

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
      const token = localStorage.getItem('token');
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
