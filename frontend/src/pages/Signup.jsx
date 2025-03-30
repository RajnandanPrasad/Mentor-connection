import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useToast } from "../components/ui/toast";
import { Card, CardContent } from "../components/ui/card";

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
  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
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
    else {
      const passwordValidation = [];
      if (formData.password.length < 8) passwordValidation.push("Password must be at least 8 characters");
      if (formData.password.length > 100) passwordValidation.push("Password must not exceed 100 characters");
      if (!/[A-Z]/.test(formData.password)) passwordValidation.push("Password must contain at least one uppercase letter");
      if (!/[a-z]/.test(formData.password)) passwordValidation.push("Password must contain at least one lowercase letter");
      if (!/\d{2,}/.test(formData.password)) passwordValidation.push("Password must contain at least 2 digits");
      if (/\s/.test(formData.password)) passwordValidation.push("Password must not contain spaces");
      if (!/[!@#$%^&*(),.?":{}|<>]{2,}/.test(formData.password)) passwordValidation.push("Password must contain at least 2 special characters");
      
      if (passwordValidation.length > 0) {
        newErrors.password = passwordValidation.join(", ");
      }
    }
    
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

      const response = await api.post("/api/auth/signup", dataToSend);
      
      console.log("Server response:", response.data);

      if (response.data.token && response.data.user) {
        // Use the login function from AuthContext to handle session management
        await login(response.data.user, response.data.token);
        
        addToast(`Account created successfully! Welcome to MentorConnect.`, "success");
        
        // Redirect based on role
        if (response.data.user.role === 'mentor') {
          navigate('/mentor-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error("Signup error:", err);
      
      // Clear any previous errors
      setErrors({});
      
      if (err.response?.data) {
        // Handle field-specific errors
        if (err.response.data.errors) {
          const backendErrors = {};
          Object.entries(err.response.data.errors).forEach(([field, error]) => {
            if (error) {
              // If the error is an array (from password validation), join them
              if (Array.isArray(error)) {
                backendErrors[field] = error.join(", ");
              } else {
                backendErrors[field] = error;
              }
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
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Create your MentorConnect Account</h1>
          <p className="mt-2 text-neutral-600">Join our community to connect with mentors and grow your skills</p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-wrap">
              {/* Role Selection */}
              <div className="w-full">
                <div className="flex rounded-t-xl">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: "mentee" }))}
                    className={`w-1/2 py-4 text-center font-medium transition-colors ${
                      formData.role === "mentee"
                        ? "bg-primary-600 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Join as Mentee
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, role: "mentor" }))}
                    className={`w-1/2 py-4 text-center font-medium transition-colors ${
                      formData.role === "mentor"
                        ? "bg-secondary-500 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                    }`}
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      Join as Mentor
                    </span>
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="w-full p-8">
                {errors.submit && (
                  <div className="mb-6 p-4 bg-error-50 border border-error-200 text-error-700 rounded-lg animate-fadeIn">
                    {errors.submit}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Info Section */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-neutral-900">Basic Information</h2>
                    
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                        Full Name
                      </label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter your full name"
                        error={errors.name}
                        icon={
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-1">
                        Email Address
                      </label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter your email address"
                        error={errors.email}
                        icon={
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1">
                        Password
                      </label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a strong password"
                        error={errors.password}
                        icon={
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        }
                      />
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-1">
                        Confirm Password
                      </label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Re-enter your password"
                        error={errors.confirmPassword}
                        icon={
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        }
                      />
                    </div>
                  </div>

                  {/* Mentor-specific fields */}
                  {formData.role === "mentor" && (
                    <div className="space-y-4 pt-4 border-t border-neutral-200">
                      <h2 className="text-xl font-semibold text-neutral-900">Mentor Profile</h2>
                      
                      <div>
                        <label htmlFor="title" className="block text-sm font-medium text-neutral-700 mb-1">
                          Professional Title
                        </label>
                        <div className="relative">
                          <Input
                            id="title"
                            name="titleSearch"
                            value={titleSearch}
                            onChange={(e) => setTitleSearch(e.target.value)}
                            placeholder="e.g. Software Engineer, UX Designer"
                            error={errors.title}
                            icon={
                              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            }
                          />

                          {showTitleDropdown && filteredTitles.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-lg py-1 text-base overflow-auto focus:outline-none sm:text-sm">
                              {filteredTitles.map((title, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleTitleSelect(title)}
                                  className="cursor-pointer select-none relative py-2 pl-10 pr-4 hover:bg-primary-50"
                                >
                                  <span className="block truncate">{title}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label htmlFor="experienceLevel" className="block text-sm font-medium text-neutral-700 mb-1">
                          Experience Level
                        </label>
                        <select
                          id="experienceLevel"
                          name="experienceLevel"
                          value={formData.experienceLevel}
                          onChange={handleChange}
                          className={`w-full rounded-lg border ${errors.experienceLevel ? 'border-error-300 focus:ring-error-500 focus:border-error-500' : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'} h-10 px-4 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 transition-all`}
                        >
                          <option value="">Select your experience level</option>
                          {experienceLevels.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                        {errors.experienceLevel && (
                          <p className="mt-1 text-sm text-error-500">{errors.experienceLevel}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="location" className="block text-sm font-medium text-neutral-700 mb-1">
                          Location (Optional)
                        </label>
                        <Input
                          id="location"
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          placeholder="e.g. London, UK or Remote"
                          icon={
                            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          }
                        />
                      </div>

                      <div>
                        <label htmlFor="bio" className="block text-sm font-medium text-neutral-700 mb-1">
                          Professional Bio
                        </label>
                        <textarea
                          id="bio"
                          name="bio"
                          rows={4}
                          value={formData.bio}
                          onChange={handleChange}
                          placeholder="Write a brief description of your experience, skills, and what you can offer as a mentor..."
                          className={`w-full rounded-lg border ${errors.bio ? 'border-error-300 focus:ring-error-500 focus:border-error-500' : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'} px-4 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 transition-all`}
                        />
                        {errors.bio ? (
                          <p className="mt-1 text-sm text-error-500">{errors.bio}</p>
                        ) : (
                          <p className="mt-1 text-sm text-neutral-500">Minimum 50 characters required. Currently: {formData.bio.length} characters</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-4">
                    <Button
                      type="submit"
                      className="w-full py-3"
                      variant={formData.role === "mentor" ? "secondary" : "default"}
                      disabled={loading}
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Account...
                        </div>
                      ) : (
                        `Create ${formData.role === "mentor" ? "Mentor" : "Mentee"} Account`
                      )}
                    </Button>
                  </div>
                </form>

                <div className="mt-6 text-center">
                  <p className="text-neutral-600">
                    Already have an account?{" "}
                    <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
