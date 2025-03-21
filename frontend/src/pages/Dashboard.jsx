import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

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
  }, [navigate]);

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
      <div className="flex-1 p-6 bg-gray-100">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome, {user.name}!
        </h1>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Actions Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-4">
              <button
                onClick={() => navigate("/mentor-matching")}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition duration-200"
              >
                Find a Mentor
              </button>
              <button
                onClick={() => navigate("/goal-tracker")}
                className="w-full py-2 px-4 bg-green-500 text-white rounded hover:bg-green-600 transition duration-200"
              >
                Set Learning Goals
              </button>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Status</h2>
            <div className="space-y-2">
              <p className="text-gray-600">
                Role: <span className="font-medium">Mentee</span>
              </p>
              <p className="text-gray-600">
                Email: <span className="font-medium">{user.email}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
