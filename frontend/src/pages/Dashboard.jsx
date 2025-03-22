import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import SkillAssessment from "../components/SkillAssessment/SkillAssessment";
import Achievement from "../components/Achievement/Achievement";
import RecommendationService from "../services/RecommendationService";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [recommendedMentors, setRecommendedMentors] = useState([]);
  const [showSkillAssessment, setShowSkillAssessment] = useState(false);

  const mockSkills = [
    { id: 1, name: "JavaScript" },
    { id: 2, name: "React" },
    { id: 3, name: "Node.js" },
    { id: 4, name: "Python" },
  ];

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    if (!userData) {
      navigate("/login");
      return;
    }

    // Redirect mentors to mentor dashboard
    if (userData.role === "mentor") {
      navigate("/mentor-dashboard");
      return;
    }

    setUser(userData);
    fetchAchievements();
    fetchRecommendations();
  }, [navigate]);

  const fetchAchievements = async () => {
    // Mock achievements data - replace with API call
    setAchievements([
      {
        id: 1,
        title: "First Steps",
        description: "Complete your first mentoring session",
        icon: "🎯",
        unlocked: true,
        progress: 100,
      },
      {
        id: 2,
        title: "Skill Master",
        description: "Complete 5 skill assessments",
        icon: "⭐",
        unlocked: false,
        progress: 60,
      },
    ]);
  };

  const fetchRecommendations = async () => {
    try {
      const recommendations = await RecommendationService.getRecommendedMentors(user?.id);
      setRecommendedMentors(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  const handleSkillAssessment = async (assessments) => {
    // Save skill assessments - replace with API call
    console.log("Skill assessments:", assessments);
    setShowSkillAssessment(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/5 bg-blue-600 text-white p-4 space-y-4">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <ul className="space-y-2">
          <li>
            <Link
              to="/mentor-matching"
              className="block p-2 rounded hover:bg-blue-500"
            >
              🔍 Find a Mentor
            </Link>
          </li>
          <li>
            <Link to="/chat" className="block p-2 rounded hover:bg-blue-500">
              💬 Chat
            </Link>
          </li>
          <li>
            <Link
              to="/goal-tracker"
              className="block p-2 rounded hover:bg-blue-500"
            >
              📈 Goal Tracker
            </Link>
          </li>
          <li>
            <button
              onClick={handleLogout}
              className="block w-full text-left p-2 rounded hover:bg-red-500"
            >
              🚪 Logout
            </button>
          </li>
        </ul>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          Welcome, {user.name}!
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Progress Overview */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Progress</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Overall Progress</span>
                  <span className="text-sm font-medium">75%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: "75%" }}></div>
                </div>
              </div>
              <button
                onClick={() => setShowSkillAssessment(true)}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
              >
                Take Skill Assessment
              </button>
            </div>
          </div>

          {/* Achievements Section */}
          <Achievement achievements={achievements} userLevel={3} />

          {/* Skill Assessment Modal */}
          {showSkillAssessment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <div className="max-w-2xl w-full mx-4">
                <SkillAssessment
                  skills={mockSkills}
                  onSave={handleSkillAssessment}
                />
                <button
                  onClick={() => setShowSkillAssessment(false)}
                  className="mt-4 w-full bg-gray-500 text-white py-2 rounded-lg hover:bg-gray-600 transition duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Recommended Mentors */}
          <div className="md:col-span-2 bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Recommended Mentors</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendedMentors.map(mentor => (
                <div key={mentor.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={mentor.avatar || "https://via.placeholder.com/40"}
                      alt={mentor.name}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <h3 className="font-semibold">{mentor.name}</h3>
                      <p className="text-sm text-gray-600">{mentor.expertise}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500">
                      Match Score: {Math.round(mentor.compatibilityScore)}%
                    </p>
                    <button
                      onClick={() => navigate(`/mentor/${mentor.id}`)}
                      className="mt-2 w-full bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600 transition duration-200"
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
