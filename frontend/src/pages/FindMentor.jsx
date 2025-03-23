import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const FindMentor = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("All");
  const [selectedSkill, setSelectedSkill] = useState("All");
  const [availability, setAvailability] = useState(true);
  const [priceRange, setPriceRange] = useState("All");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("rating");

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
        navigate('/login');
        return;
      }

      let url = "http://localhost:5000/api/mentors";
      const queryParams = new URLSearchParams();

      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      if (experienceLevel !== "All") {
        queryParams.append('experienceRange', experienceLevel);
      }
      if (selectedSkill !== "All") {
        queryParams.append('skills', selectedSkill);
      }
      if (availability) {
        queryParams.append('availability', 'true');
      }
      if (minRating > 0) {
        queryParams.append('rating', minRating);
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      console.log('Fetching mentors with URL:', url);
      const response = await axios.get(url, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Mentors response:', response.data);
      setMentors(response.data);
      setError("");
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

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleConnect = async (mentorId) => {
    try {
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/mentors/${mentorId}/request`,
        { message: "I would like to request mentorship" },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      if (response.data) {
        setError("Mentorship request sent successfully!");
        // Refresh the mentors list to update availability
        fetchMentors();
      }
    } catch (err) {
      console.error("Error connecting with mentor:", err);
      setError(err.response?.data?.message || "Failed to connect with mentor");
    }
  };

  const handleResetFilters = () => {
    setExperienceLevel("All");
    setSelectedSkill("All");
    setAvailability(true);
    setPriceRange("All");
    setMinRating(0);
    setSortBy("rating");
    fetchMentors();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Your Perfect Mentor
          </h1>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search mentors by name..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Advanced Filters</h2>
            <button
              onClick={handleResetFilters}
              className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1 transition-colors"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Experience Level Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Experience</label>
                {experienceLevel !== "All" && (
                  <button
                    onClick={() => setExperienceLevel("All")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { level: 'Beginner', icon: '🌱' },
                  { level: 'Intermediate', icon: '🌿' },
                  { level: 'Advanced', icon: '🌳' },
                  { level: 'Expert', icon: '🎯' }
                ].map(({ level, icon }) => (
                  <button
                    key={level}
                    onClick={() => setExperienceLevel(level)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-1 ${
                      experienceLevel === level
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{icon}</span>
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Skills Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Skills</label>
                {selectedSkill !== "All" && (
                  <button
                    onClick={() => setSelectedSkill("All")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { skill: 'JavaScript', icon: '⚡' },
                  { skill: 'React', icon: '⚛️' },
                  { skill: 'Node.js', icon: '🟢' },
                  { skill: 'Python', icon: '🐍' },
                  { skill: 'Java', icon: '☕' },
                  { skill: 'SQL', icon: '🗄️' }
                ].map(({ skill, icon }) => (
                  <button
                    key={skill}
                    onClick={() => setSelectedSkill(skill)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-1 ${
                      selectedSkill === skill
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{icon}</span>
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Availability Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Availability</label>
                {!availability && (
                  <button
                    onClick={() => setAvailability(true)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                onClick={() => setAvailability(!availability)}
                className={`w-full px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-1 ${
                  availability
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <span>{availability ? '🟢' : '🔴'}</span>
                {availability ? 'Available' : 'Unavailable'}
              </button>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Minimum Rating</label>
                {minRating > 0 && (
                  <button
                    onClick={() => setMinRating(0)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full"
                />
                <span className="text-xs font-medium text-gray-700">{minRating}⭐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          /* Mentors Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-gray-500">No mentors found matching your criteria.</p>
              </div>
            ) : (
              mentors.map((mentor) => (
                <div
                  key={mentor._id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      {mentor.profileImage ? (
                        <img
                          src={`http://localhost:5000${mentor.profileImage}`}
                          alt={mentor.name}
                          className="h-16 w-16 rounded-full"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-xl">
                            {mentor.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {mentor.name}
                      </h3>
                      <p className="text-sm text-gray-500">{mentor.email}</p>
                      {mentor.mentorProfile && (
                        <>
                          <p className="mt-2 text-sm text-gray-600">
                            {mentor.mentorProfile.title}
                          </p>
                          <div className="mt-2 flex items-center">
                            <span className="text-yellow-400">⭐</span>
                            <span className="ml-1 text-sm text-gray-600">
                              {mentor.mentorProfile.rating?.toFixed(1) || 'No rating'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {mentor.mentorProfile && (
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {mentor.mentorProfile.skills?.map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => handleConnect(mentor._id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Connect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindMentor; 