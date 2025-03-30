import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Import image URLs
import { 
  smartMatching, 
  realtimeChat, 
  goalTracking, 
  mentorDomains,
  fallbackImage 
} from "../assets/imageUrls";

const Home = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  const handleImageError = (imageKey) => {
    setImageErrors(prev => ({
      ...prev,
      [imageKey]: true
    }));
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteUnmute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const topMentors = [
    {
      id: 1,
      name: "Ayush Kumar",
      title: "Senior Software Engineer at Google",
      experience: "8 years",
      rating: 4.9,
      image: "https://ui-avatars.com/api/?name=Sarah+Johnson&background=random"
    },
    {
      id: 2,
      name: "Akhil Pandey",
      title: "AI Research Scientist at Microsoft",
      experience: "10 years",
      rating: 4.8,
      image: "https://ui-avatars.com/api/?name=Michael+Chen&background=random"
    },
    {
      id: 3,
      name: "DR Mukul Sharma",
      title: "Product Manager at Amazon",
      experience: "7 years",
      rating: 4.9,
      image: "https://ui-avatars.com/api/?name=Emily+Rodriguez&background=random"
    }
  ];

  const faqs = [
    {
      question: "Does long-term mentorship really produce outcomes?",
      answer: "Yes, long-term mentorship has proven to be highly effective. Our data shows that mentees who engage in long-term mentorship programs achieve their career goals 85% more often than those without structured guidance."
    },
    {
      question: "What should be the duration of my long-term mentorship?",
      answer: "The ideal duration varies based on your goals. We recommend a minimum of 3 months for meaningful progress, with many successful mentorship relationships lasting 6-12 months or longer."
    },
    {
      question: "How many sessions can I have with the mentor?",
      answer: "Session frequency is flexible and depends on your chosen plan. Typically, mentees have 1-2 sessions per week, with additional support through our messaging platform between sessions."
    },
    {
      question: "When is the right time to take long-term mentorship?",
      answer: "The right time is when you're ready to make a significant career change or advancement. Whether you're starting a new role, switching careers, or preparing for leadership positions, long-term mentorship can provide the guidance you need."
    },
    {
      question: "Do you provide any student discounts on the long-term mentorship plan?",
      answer: "Yes, we offer special student discounts of up to 20% on our mentorship plans. Students can verify their status through their academic email to receive the discount."
    },
    {
      question: "What are 100% money-back guarantee & mentor-change policies?",
      answer: "We offer a 30-day money-back guarantee if you're not satisfied with your mentorship experience. Additionally, you can request a mentor change at any time if you feel the fit isn't right for your goals."
    }
  ];

  const pricingPlans = [
    {
      title: "Introductory Call",
      description: "Get to know your potential mentor and discuss your goals",
      duration: "30 mins",
      price: "$39",
      features: ["Initial consultation", "Goal setting", "Career assessment"]
    },
    {
      title: "Study Plan",
      description: "Structured learning path with regular check-ins",
      duration: "45 mins",
      price: "$50",
      features: ["Customized study plan", "Weekly progress reviews", "Resource recommendations"]
    },
    {
      title: "Interview Preparation",
      description: "Intensive preparation for technical interviews",
      duration: "60 mins",
      price: "$69",
      features: ["Mock interviews", "Code review", "Problem-solving practice"]
    }
  ];

  const socialLinks = [
    { name: "LinkedIn", icon: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-.88-.06-1.607-.967-1.607-.967 0-1.113.753-1.113 1.607v5.604h-3v-11h3v1.765c.477-.226 1.592-.277 2.767-.277 2.924 0 3.5 1.92 3.5 4.416v6.096z" },
    { name: "Twitter", icon: "M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" },
    { name: "Instagram", icon: "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-primary-600 to-primary-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="text-2xl font-bold text-white">
                  MentorConnect
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/login")}
                className="px-4 py-2 text-white hover:text-primary-100 font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/signup")}
                className="px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-primary-50 font-medium transition-all shadow-md hover:shadow-lg"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-[size:20px_20px] opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-900/50 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-5xl md:text-6xl font-bold text-white mb-6"
              >
                Find Your Perfect <span className="text-gradient">Mentor</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-xl text-primary-100 mb-8"
              >
                Connect with industry professionals and get career guidance
              </motion.p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4"
              >
                <button
                  onClick={() => navigate("/mentor-matching")}
                  className="px-8 py-3 bg-white text-primary-600 rounded-lg hover:bg-primary-50 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Find a Mentor
                </button>
                <button
                  onClick={() => navigate("/signup")}
                  className="px-8 py-3 bg-transparent text-white border-2 border-white rounded-lg hover:bg-white/10 text-lg font-medium transition-all"
                >
                  Be a Mentor
                </button>
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="aspect-w-16 aspect-h-9 relative">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                >
                  <source src="/introvideo1.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-primary-800/20" />
                
                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center space-x-4 bg-gradient-to-t from-black/50 to-transparent">
                  <button
                    onClick={handlePlayPause}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={handleMuteUnmute}
                    className="p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    {isMuted ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose MentorConnect Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose MentorConnect?
            </h2>
            <p className="text-xl text-gray-600">
              We provide the best platform for mentorship
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-28 h-28 mx-auto mb-8 bg-blue-50 rounded-2xl p-4 flex items-center justify-center">
                <img
                  src={imageErrors.smartMatching ? fallbackImage : smartMatching}
                  alt="Smart Mentor Matching"
                  className="w-full h-full object-contain"
                  onError={() => handleImageError('smartMatching')}
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
                Smart Mentor Matching
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                recommendations based on your skills and career goals
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-28 h-28 mx-auto mb-8 bg-blue-50 rounded-2xl p-4 flex items-center justify-center">
                <img
                  src={imageErrors.realtimeChat ? fallbackImage : realtimeChat}
                  alt="Real-time Chat & Video Calls"
                  className="w-full h-full object-contain"
                  onError={() => handleImageError('realtimeChat')}
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
                Real-time Chat & Video Calls
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Instant communication with your mentor through our platform
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-28 h-28 mx-auto mb-8 bg-blue-50 rounded-2xl p-4 flex items-center justify-center">
                <img
                  src={imageErrors.goalTracking ? fallbackImage : goalTracking}
                  alt="Goal Tracking"
                  className="w-full h-full object-contain"
                  onError={() => handleImageError('goalTracking')}
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
                Goal Tracking
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Set and track your learning milestones with your mentor
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ y: -5 }}
              className="p-8 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="w-28 h-28 mx-auto mb-8 bg-blue-50 rounded-2xl p-4 flex items-center justify-center">
                <img
                  src={imageErrors.mentorDomains ? fallbackImage : mentorDomains}
                  alt="Mentors from Different Domains"
                  className="w-full h-full object-contain"
                  onError={() => handleImageError('mentorDomains')}
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4 text-center">
                Diverse Mentor Pool
              </h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Connect with mentors from various industries and expertise
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Start your mentorship journey in three simple steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">
                Find Your Ideal Mentor
              </h3>
              <p className="text-gray-600">
                Browse mentors based on skills and career path
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">
                Book a FREE Trial Session
              </h3>
              <p className="text-gray-600">
                Schedule an initial call to get to know your mentor
              </p>
            </motion.div>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative p-6 bg-white rounded-xl shadow-lg"
            >
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 mt-4">
                Start 1:1 Long-Term Mentorship
              </h3>
              <p className="text-gray-600">
                Begin structured learning with your chosen mentor
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Top Mentors Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">
              Discover Top Mentors
            </h2>
            <button
              onClick={() => navigate("/mentor-matching")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Explore All
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topMentors.map((mentor) => (
              <motion.div
                key={mentor.id}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <img
                    src={mentor.image}
                    alt={mentor.name}
                    className="w-16 h-16 rounded-full ring-2 ring-blue-100"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{mentor.name}</h3>
                    <p className="text-sm text-gray-600">{mentor.title}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">{mentor.experience} experience</span>
                  <div className="flex items-center">
                    <span className="text-yellow-400">★</span>
                    <span className="ml-1 text-gray-600">{mentor.rating}</span>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/mentor-matching")}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Book a Session
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-gray-300">
              Everything you need to know about our mentorship programs
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-800 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left"
                >
                  <span className="text-lg font-medium text-white">{faq.question}</span>
                  <motion.span
                    animate={{ rotate: openFaq === index ? 45 : 0 }}
                    className="text-2xl text-blue-400"
                  >
                    +
                  </motion.span>
                </button>
                <AnimatePresence>
                  {openFaq === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-300">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Choose Your Mentorship Plan
            </h2>
            <p className="text-xl text-gray-600">
              Select the perfect plan for your learning journey
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.title}</h3>
                <p className="text-gray-600 mb-6">{plan.description}</p>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-blue-600">{plan.price}</span>
                  <span className="text-gray-600"> / {plan.duration}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-600">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/signup")}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium transition-all"
                >
                  Explore Plan
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 py-12 border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <p className="text-purple-200 max-w-2xl mx-auto">
              Your trusted source to find highly-vetted mentors & industry professionals to move your career ahead.
            </p>
          </div>
          <div className="flex justify-center space-x-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href="#"
                className="text-purple-400 hover:text-white transition-all duration-300 transform hover:scale-110"
              >
                <span className="sr-only">{social.name}</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d={social.icon} />
                </svg>
              </a>
            ))}
          </div>
          <div className="mt-8 text-center">
            <p className="text-purple-300 text-sm">
              © 2024 MentorConnect. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
