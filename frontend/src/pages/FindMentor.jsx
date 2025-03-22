import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const FindMentor = () => {
  const navigate = useNavigate();
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
    // Add debounce to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchMentors();
    }, 300); // Wait 300ms after user stops typing

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const fetchMentors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      let url = "http://localhost:5000/api/mentors";
      if (searchTerm) {
        url += `?search=${encodeURIComponent(searchTerm)}`;
      }
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMentors(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching mentors:", err);
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError("Failed to load mentors. Please try again later.");
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
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `http://localhost:5000/api/connections/request/${mentorId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data) {
        navigate("/chat", { 
          state: { 
            chatPartner: {
              mentor: { _id: mentorId },
              mentee: { _id: JSON.parse(localStorage.getItem("user"))._id }
            }
          }
        });
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
                <svg
                  className={`w-3 h-3 ${availability ? 'text-white' : 'text-gray-500'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Available Now
              </button>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Price Range</label>
                {priceRange !== "All" && (
                  <button
                    onClick={() => setPriceRange("All")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {[
                  { range: '$0-$50', icon: '💰' },
                  { range: '$51-$100', icon: '💵' },
                  { range: '$101-$200', icon: '💸' },
                  { range: '$200+', icon: '💎' }
                ].map(({ range, icon }) => (
                  <button
                    key={range}
                    onClick={() => setPriceRange(range)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-all duration-200 transform hover:scale-105 flex items-center gap-1 ${
                      priceRange === range
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{icon}</span>
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Filter */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Min Rating</label>
                {minRating > 0 && (
                  <button
                    onClick={() => setMinRating(0)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`p-1 rounded transition-all duration-200 transform hover:scale-110 ${
                      minRating === rating
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-400'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-700">Sort By</label>
                {sortBy !== "rating" && (
                  <button
                    onClick={() => setSortBy("rating")}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-2 py-1 rounded text-xs border border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="rating">Highest Rating</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="experience">Most Experience</option>
                <option value="reviews">Most Reviews</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4 mb-8">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          /* Mentors Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mentors.map((mentor) => (
              <div
                key={mentor._id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
              >
                <div className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="relative">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(mentor.name)}&background=random`}
                        alt={mentor.name}
                        className="w-16 h-16 rounded-full"
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {mentor.name}
                      </h3>
                      <p className="text-blue-600">{mentor.mentorProfile?.title || 'Mentor'}</p>
                    </div>
                  </div>

                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {mentor.mentorProfile?.bio || 'No bio available'}
                  </p>

                  {mentor.mentorProfile?.skills && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {mentor.mentorProfile.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-yellow-400">★</span>
                      <span className="ml-1 text-gray-600">
                        {(mentor.mentorProfile?.rating || 0).toFixed(1)}
                      </span>
                      <span className="mx-2 text-gray-400">•</span>
                      <span className="text-gray-600">
                        {mentor.mentorProfile?.experienceLevel || 'Not specified'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleConnect(mentor._id)}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Request Mentorship
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindMentor; 