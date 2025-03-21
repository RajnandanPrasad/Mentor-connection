import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const MentorDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || userData.role !== 'mentor') {
      navigate('/dashboard');
      return;
    }
    setUser(userData);
    fetchRequests();
  }, [navigate]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/mentors/requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Failed to fetch mentorship requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, status) => {
    try {
      const token = localStorage.getItem('token');
      // Update request status
      await axios.put(
        `http://localhost:5000/api/mentors/requests/${requestId}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (status === 'accepted') {
        // Create a new chat when request is accepted
        const request = requests.find(r => r._id === requestId);
        if (request) {
          await axios.post(
            'http://localhost:5000/api/chats',
            { menteeId: request.mentee._id },
            { headers: { Authorization: `Bearer ${token}` } }
          );
        }
      }

      fetchRequests(); // Refresh the requests list
    } catch (error) {
      alert('Failed to update request: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/5 bg-blue-600 text-white p-4 space-y-4">
        <h2 className="text-2xl font-bold">Mentor Dashboard</h2>
        <ul className="space-y-2">
          <li>
            <Link to="/chat" className="block p-2 rounded hover:bg-blue-500">
              💬 Chat with Mentees
            </Link>
          </li>
          <li>
            <Link to="/mentor-requests" className="block p-2 rounded hover:bg-blue-500">
              📩 Mentorship Requests
            </Link>
          </li>
          <li>
            <Link to="/mentor-profile" className="block p-2 rounded hover:bg-blue-500">
              👤 My Profile
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

        {/* Mentorship Requests Section */}
        <div className="mt-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Pending Mentorship Requests</h2>
          <div className="grid gap-4">
            {requests.length > 0 ? (
              requests.map((request) => (
                <div
                  key={request._id}
                  className="bg-white p-4 rounded-lg shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{request.mentee.name}</h3>
                      <p className="text-gray-600 mt-1">{request.message}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Requested on: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="space-x-2">
                      <button
                        onClick={() => handleRequestAction(request._id, 'accepted')}
                        className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRequestAction(request._id, 'rejected')}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-600">No pending mentorship requests.</p>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Active Mentees</h3>
            <p className="text-3xl font-bold text-blue-600">
              {requests.filter(r => r.status === 'accepted').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Pending Requests</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {requests.filter(r => r.status === 'pending').length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-2">Total Sessions</h3>
            <p className="text-3xl font-bold text-green-600">0</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentorDashboard;
