import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import MentorshipRequests from '../components/MentorshipRequests';
import Chat from '../components/Chat';
import TaskManagement from '../components/TaskManagement';
import { io } from 'socket.io-client';

const MentorDashboard = () => {
  const { token, user } = useAuth();
  const [mentees, setMentees] = useState([]);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [chattingWith, setChattingWith] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'pending'
  const [taskStats, setTaskStats] = useState(null);
  const [showTaskManagement, setShowTaskManagement] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      console.log('No token or user found, skipping initialization');
      return;
    }

    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('join', user._id);
    });

    newSocket.on('newMentorshipRequest', (data) => {
      console.log('New mentorship request received:', data);
      toast.success('New mentorship request received!');
      fetchMentees();
    });

    newSocket.on('connectionUpdate', (data) => {
      console.log('Connection update received:', data);
      fetchMentees();
    });

    newSocket.on('newMessage', (data) => {
      console.log('New message received:', data);
      toast.success(`New message from ${data.sender.name}`);
      fetchMentees();
    });

    setSocket(newSocket);

    fetchMentees();
    fetchTaskStats();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, user]);

  const fetchMentees = async () => {
    if (!token) {
      console.log('No token available, skipping fetch');
      return;
    }

    try {
      console.log('Fetching connected mentees...');
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/connections`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      console.log('Received connections:', response.data);
      
      // Filter connections where the current user is the mentor
      const mentorConnections = response.data.filter(
        connection => connection.mentor._id === user._id
      );
      console.log('Filtered mentor connections:', mentorConnections);
      
      setMentees(mentorConnections);
      setError(null);
    } catch (error) {
      console.error('Error fetching mentees:', error);
      setError('Failed to fetch mentees');
      toast.error('Error fetching mentees');
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/tasks/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setTaskStats(response.data);
    } catch (error) {
      console.error('Error fetching task stats:', error);
      toast.error('Failed to fetch task statistics');
    }
  };

  const handleRequestUpdate = () => {
    console.log('Request update triggered, refreshing mentees...');
    fetchMentees();
  };

  const filteredMentees = mentees.filter(mentee => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return mentee.status === 'active';
    if (activeTab === 'pending') return mentee.status === 'pending';
    return true;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-600 p-4">
        {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mentor Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.name}</p>
            </div>
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{mentees.length}</div>
                <div className="text-sm text-gray-600">Total Mentees</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {mentees.filter(m => m.status === 'active').length}
                </div>
                <div className="text-sm text-gray-600">Active Mentees</div>
              </div>
              {taskStats && (
                <>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{taskStats.totalTasks}</div>
                    <div className="text-sm text-gray-600">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {taskStats.statusBreakdown.find(s => s._id === 'pending')?.count || 0}
                    </div>
                    <div className="text-sm text-gray-600">Pending Tasks</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Mentorship Requests Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                Mentorship Requests
              </h2>
              <MentorshipRequests onRequestUpdate={handleRequestUpdate} />
            </div>
          </div>

          {/* Connected Mentees Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Connected Mentees
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-lg ${
                      activeTab === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-2 rounded-lg ${
                      activeTab === 'active'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-4 py-2 rounded-lg ${
                      activeTab === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Pending
                  </button>
                </div>
              </div>

              {filteredMentees.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600">No mentees found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredMentees.map((mentee) => (
                    <div key={mentee._id} className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <img
                            src={mentee.mentee.profileImage || '/default-avatar.png'}
                            alt={mentee.mentee.name}
                            className="w-16 h-16 rounded-full border-4 border-white shadow-md"
                          />
                          <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                            mentee.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                          }`}></span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{mentee.mentee.name}</h3>
                          <p className="text-sm text-gray-600">{mentee.mentee.email}</p>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                            mentee.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {mentee.status.charAt(0).toUpperCase() + mentee.status.slice(1)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-gray-700 text-sm">{mentee.message}</p>
                      </div>

                      <div className="mt-4 flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Connected since: {new Date(mentee.createdAt).toLocaleDateString()}
                      </div>

                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Goals</h4>
                        <div className="flex flex-wrap gap-2">
                          {mentee.mentee.goals?.map((goal, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                            >
                              {goal}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 flex space-x-3">
                        <button
                          onClick={() => {
                            setSelectedMentee(mentee);
                            setShowTaskManagement(true);
                          }}
                          className="bg-purple-100 text-purple-700 py-2 px-4 rounded-lg hover:bg-purple-200 transition duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setChattingWith(mentee)}
                          className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition duration-200"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mentee Profile Modal */}
      {selectedMentee && !showTaskManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Mentee Profile</h3>
              <button
                onClick={() => setSelectedMentee(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedMentee.mentee.profileImage || '/default-avatar.png'}
                  alt={selectedMentee.mentee.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md"
                />
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedMentee.mentee.name}</h4>
                  <p className="text-gray-600">{selectedMentee.mentee.email}</p>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Bio</h5>
                <p className="text-gray-700">{selectedMentee.mentee.bio}</p>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Goals</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedMentee.mentee.goals?.map((goal, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                    >
                      {goal}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-900 mb-2">Skills</h5>
                <div className="flex flex-wrap gap-2">
                  {selectedMentee.mentee.skills?.map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-900 mb-2">Connection Details</h5>
                <div className="space-y-2">
                  <p className="text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Connected since: {new Date(selectedMentee.createdAt).toLocaleDateString()}
                  </p>
                  <p className="text-gray-600 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Initial message: {selectedMentee.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Management Modal */}
      {showTaskManagement && selectedMentee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Task Management - {selectedMentee.mentee.name}
              </h3>
              <button
                onClick={() => {
                  setShowTaskManagement(false);
                  setSelectedMentee(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <TaskManagement menteeId={selectedMentee.mentee._id} />
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {chattingWith && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            <Chat mentee={chattingWith} onClose={() => setChattingWith(null)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorDashboard;
