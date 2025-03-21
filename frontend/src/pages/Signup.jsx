import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// Professional titles with categories
const professionalTitles = {
  "Software Development": [
    "Software Engineer",
    "Frontend Developer",
    "Backend Developer",
    "Full Stack Developer",
    "Mobile App Developer",
    "DevOps Engineer",
  ],
  "Data & AI": [
    "Data Scientist",
    "Machine Learning Engineer",
    "AI Engineer",
    "Data Analyst",
    "Business Intelligence Analyst",
  ],
  "Design": [
    "UX Designer",
    "UI Designer",
    "Product Designer",
    "Graphic Designer",
    "Visual Designer",
  ],
  "Product & Management": [
    "Product Manager",
    "Project Manager",
    "Scrum Master",
    "Agile Coach",
    "Technical Lead",
  ],
  "Other": [
    "Cloud Architect",
    "Security Engineer",
    "System Administrator",
    "QA Engineer",
    "Technical Writer",
  ]
};

const experienceLevels = [
  { value: "beginner", label: "Beginner (0-2 years)" },
  { value: "intermediate", label: "Intermediate (3-5 years)" },
  { value: "advanced", label: "Advanced (5-10 years)" },
  { value: "expert", label: "Expert (10+ years)" }
];

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "mentee",
    title: "",
    bio: "",
    experienceLevel: "",
    location: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [titleSearch, setTitleSearch] = useState("");
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);
  const [filteredTitles, setFilteredTitles] = useState([]);

  // Filter titles based on search
  useEffect(() => {
    if (titleSearch) {
      const filtered = Object.values(professionalTitles)
        .flat()
        .filter(title => 
          title.toLowerCase().includes(titleSearch.toLowerCase())
        );
      setFilteredTitles(filtered);
      setShowTitleDropdown(true);
    } else {
      setFilteredTitles([]);
      setShowTitleDropdown(false);
    }
  }, [titleSearch]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const handleTitleSelect = (title) => {
    setFormData(prev => ({
      ...prev,
      title
    }));
    setTitleSearch(title);
    setShowTitleDropdown(false);
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic validation
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Mentor-specific validation
    if (formData.role === "mentor") {
      if (!formData.title?.trim()) newErrors.title = "Professional title is required";
      if (!formData.experienceLevel) newErrors.experienceLevel = "Experience level is required";
      if (!formData.bio?.trim()) newErrors.bio = "Bio is required";
      else if (formData.bio.trim().length < 50) newErrors.bio = "Bio must be at least 50 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const dataToSend = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role
      };

      if (formData.role === "mentor") {
        // Validate mentor data before sending
        const mentorErrors = {};
        
        if (!formData.title?.trim()) {
          mentorErrors.title = "Professional title is required";
        }
        if (!formData.experienceLevel) {
          mentorErrors.experienceLevel = "Experience level is required";
        }
        if (!formData.bio?.trim()) {
          mentorErrors.bio = "Bio is required";
        } else if (formData.bio.trim().length < 50) {
          mentorErrors.bio = "Bio must be at least 50 characters";
        }

        if (Object.keys(mentorErrors).length > 0) {
          setErrors(mentorErrors);
          setLoading(false);
          return;
        }

        dataToSend.mentorData = {
          title: formData.title.trim(),
          experienceLevel: formData.experienceLevel,
          bio: formData.bio.trim(),
          location: formData.location?.trim() || ""
        };
      }

      console.log("Sending data to server:", JSON.stringify(dataToSend, null, 2));

      const response = await axios.post("http://localhost:5000/api/auth/signup", dataToSend);
      
      console.log("Server response:", response.data);

      if (response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
        navigate(formData.role === "mentor" ? "/mentor-dashboard" : "/dashboard");
      }
    } catch (err) {
      console.error("Signup error:", err.response?.data || err);
      
      // Clear any previous errors
      setErrors({});
      
      if (err.response?.data) {
        // Handle field-specific errors
        if (err.response.data.errors) {
          const backendErrors = {};
          Object.entries(err.response.data.errors).forEach(([field, error]) => {
            if (error) {
              backendErrors[field] = error;
            }
          });
          setErrors(backendErrors);
        } else {
          // Set general error message if no specific errors
          setErrors({
            submit: err.response.data.message || "An error occurred during signup"
          });
        }
      } else {
        // Handle network or other errors
        setErrors({
          submit: "Network error. Please try again later."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Join our community as a {formData.role}
          </p>
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-md p-4">
            {errors.submit}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white p-6 rounded-lg shadow-md">
          <div className="space-y-6">
            {/* Role Selection */}
            <div className="flex justify-center space-x-4">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: "mentee" }))}
                className={`px-6 py-2 rounded-full ${
                  formData.role === "mentee"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                Mentee
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: "mentor" }))}
                className={`px-6 py-2 rounded-full ${
                  formData.role === "mentor"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                Mentor
              </button>
            </div>

            {/* Basic Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
          <input
            type="text"
            name="name"
                value={formData.name}
            onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                } focus:ring-blue-500 focus:border-blue-500`}
          />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email address
              </label>
          <input
            type="email"
            name="email"
                value={formData.email}
            onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } focus:ring-blue-500 focus:border-blue-500`}
          />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
          <input
            type="password"
            name="password"
                value={formData.password}
            onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md shadow-sm ${
                  errors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                } focus:ring-blue-500 focus:border-blue-500`}
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Mentor-specific fields */}
            {formData.role === "mentor" && (
              <>
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700">
                    Professional Title {formData.role === "mentor" && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={titleSearch}
                    onChange={(e) => {
                      setTitleSearch(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        title: e.target.value
                      }));
                    }}
                    placeholder="Search or enter your title"
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      errors.title ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-blue-500 focus:border-blue-500`}
                  />
                  {showTitleDropdown && filteredTitles.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                      {filteredTitles.map((title) => (
                        <div
                          key={title}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleTitleSelect(title)}
                        >
                          {title}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Experience Level {formData.role === "mentor" && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    name="experienceLevel"
                    value={formData.experienceLevel}
                    onChange={handleChange}
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      errors.experienceLevel ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-blue-500 focus:border-blue-500`}
                  >
                    <option value="">Select experience level</option>
                    {experienceLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  {errors.experienceLevel && (
                    <p className="mt-1 text-sm text-red-600">{errors.experienceLevel}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bio {formData.role === "mentor" && <span className="text-red-500">*</span>}
                    <span className="text-sm text-gray-500 ml-1">(minimum 50 characters)</span>
                  </label>
              <textarea
                name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className={`mt-1 block w-full rounded-md shadow-sm ${
                      errors.bio ? 'border-red-300' : 'border-gray-300'
                    } focus:ring-blue-500 focus:border-blue-500`}
                    placeholder="Tell us about your experience and expertise..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    {formData.bio.length}/50 characters
                  </p>
                  {errors.bio && (
                    <p className="mt-1 text-sm text-red-600">{errors.bio}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Location (optional)
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                onChange={handleChange}
                    className="mt-1 block w-full rounded-md shadow-sm border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. New York, USA"
                  />
                </div>
            </>
          )}
          </div>

          <div>
          <button
            type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
              {loading ? "Creating account..." : "Create Account"}
          </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
          Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
