import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import RequestMentorshipModal from '../components/RequestMentorshipModal';

const MentorMatching = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Available skills for filtering
  const skillOptions = [
    { id: 'ai', label: 'AI & Machine Learning' },
    { id: 'web', label: 'Web Development' },
    { id: 'cyber', label: 'Cybersecurity' },
    { id: 'mobile', label: 'Mobile Development' },
    { id: 'cloud', label: 'Cloud Computing' },
    { id: 'data', label: 'Data Science' },
  ];

  // Fetch mentors from backend
  const fetchMentors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchTerm) params.append('search', searchTerm);
      if (selectedSkills.length > 0) params.append('skills', selectedSkills.join(','));

      const response = await axios.get(`http://localhost:5000/api/mentors?${params}`);
      
      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format from server');
      }

      setMentors(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching mentors:', err);
      setError('Failed to fetch mentors. Please try again later.');
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch mentors when search or filters change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMentors();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedSkills]);

  const handleSkillToggle = (skillId) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(id => id !== skillId)
        : [...prev, skillId]
    );
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
      {/* Search and Filter Section */}
      <div className="max-w-7xl mx-auto mb-8 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Mentor</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search mentors by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
          />
          <svg
            className="absolute right-3 top-3.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Skill Filters */}
        <div className="flex flex-wrap gap-2">
          {skillOptions.map(skill => (
            <button
              key={skill.id}
              onClick={() => handleSkillToggle(skill.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedSkills.includes(skill.id)
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-blue-500'
              }`}
            >
              {skill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto text-center py-8">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Mentors Grid */}
      <div className="max-w-7xl mx-auto">
        {mentors.length === 0 && !error ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No mentors found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {mentors.map(mentor => (
              <motion.div
                key={mentor._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=random`}
                        alt={mentor.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                      <span 
                        className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                          mentor.mentorProfile?.availability ? 'bg-green-400' : 'bg-gray-400'
                        }`}
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{mentor.name}</h3>
                      <p className="text-blue-600">{mentor.mentorProfile?.title || 'Mentor'}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-gray-600 line-clamp-3">{mentor.mentorProfile?.bio || 'No bio available'}</p>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-yellow-400">★</span>
                        <span className="ml-1 text-gray-600">
                          {(mentor.mentorProfile?.rating || 0).toFixed(1)}
                        </span>
                        <span className="mx-2 text-gray-400">•</span>
                        <span className="text-gray-600">{mentor.mentorProfile?.experience || 'Not specified'}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {mentor.mentorProfile?.skills?.map(skill => (
                        <span
                          key={skill}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRequestMentorship(mentor)}
                    className={`mt-6 w-full py-2 px-4 rounded-lg flex items-center justify-center space-x-2 transition duration-200 ${
                      mentor.mentorProfile?.availability
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                    disabled={!mentor.mentorProfile?.availability}
                  >
                    <span>
                      {mentor.mentorProfile?.availability ? 'Request Mentorship' : 'Currently Unavailable'}
                    </span>
                    {mentor.mentorProfile?.availability && (
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </motion.div>
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
