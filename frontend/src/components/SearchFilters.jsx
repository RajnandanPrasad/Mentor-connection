import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SearchFilters = ({ searchTerm, onSearch, selectedSkills, onSkillToggle, onFilterChange }) => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    experienceRange: '',
    hourlyRate: '',
    availability: false,
    rating: '',
    expertise: ''
  });

  // Available skills for filtering
  const skillOptions = [
    { id: 'ai', label: 'AI & Machine Learning' },
    { id: 'web', label: 'Web Development' },
    { id: 'cyber', label: 'Cybersecurity' },
    { id: 'mobile', label: 'Mobile Development' },
    { id: 'cloud', label: 'Cloud Computing' },
    { id: 'data', label: 'Data Science' },
    { id: 'ui', label: 'UI/UX Design' },
    { id: 'devops', label: 'DevOps' },
    { id: 'blockchain', label: 'Blockchain' },
    { id: 'iot', label: 'IoT' }
  ];

  // Experience range options
  const experienceOptions = [
    { value: '', label: 'Any Experience' },
    { value: '0-2', label: '0-2 years' },
    { value: '3-5', label: '3-5 years' },
    { value: '6-10', label: '6-10 years' },
    { value: '10+', label: '10+ years' }
  ];

  // Hourly rate ranges
  const rateOptions = [
    { value: '', label: 'Any Rate' },
    { value: '0-25', label: '$0 - $25' },
    { value: '26-50', label: '$26 - $50' },
    { value: '51-100', label: '$51 - $100' },
    { value: '100+', label: '$100+' }
  ];

  // Rating options
  const ratingOptions = [
    { value: '', label: 'Any Rating' },
    { value: '4.5', label: '4.5+ Stars' },
    { value: '4', label: '4+ Stars' },
    { value: '3', label: '3+ Stars' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters = {
      experienceRange: '',
      hourlyRate: '',
      availability: false,
      rating: '',
      expertise: ''
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Search Bar */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="Search mentors by name, skills, or expertise..."
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
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

      {/* Filter Toggle Button */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => setIsFiltersOpen(!isFiltersOpen)}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
        >
          <svg
            className={`h-5 w-5 transform transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
          <span>Advanced Filters</span>
        </button>
        {(Object.values(filters).some(value => value) || selectedSkills.length > 0) && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {isFiltersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-6"
          >
            {/* Experience Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <select
                value={filters.experienceRange}
                onChange={(e) => handleFilterChange('experienceRange', e.target.value)}
                className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              >
                {experienceOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hourly Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hourly Rate
              </label>
              <select
                value={filters.hourlyRate}
                onChange={(e) => handleFilterChange('hourlyRate', e.target.value)}
                className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              >
                {rateOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Rating
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              >
                {ratingOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="availability"
                checked={filters.availability}
                onChange={(e) => handleFilterChange('availability', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="availability" className="ml-2 text-sm text-gray-700">
                Show only available mentors
              </label>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => onSkillToggle(skill.id)}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchFilters; 