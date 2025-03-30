import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const MentorshipRequests = ({ onRequestUpdate }) => {
  const { token, user } = useAuth();
  const { socket, isConnected } = useSocket(); // Use the socket from context
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  
  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    fetchRequests();
    
    // Use socket from SocketContext instead of creating a new one
    if (socket) {
      socket.on('requestStatusUpdated', (data) => {
        console.log('Request status updated:', data);
        fetchRequests();
        if (onRequestUpdate) {
          onRequestUpdate();
        }
      });

      return () => {
        socket.off('requestStatusUpdated');
      };
    }
  }, [socket, token]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      console.log('Fetching mentorship requests...');
      console.log('Using API URL:', apiUrl);
      console.log('Using token:', token ? 'Token exists' : 'No token');
      
      const response = await axios.get(
        `${apiUrl}/api/mentors/requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      console.log('API Response status:', response.status);
      console.log('Received requests:', response.data);
      
      setRequests(response.data);
      setError(null);
    } catch (error) {
      console.error('Error fetching requests:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      
      setError('Failed to fetch requests');
      toast.error('Failed to fetch requests: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = async (requestId, menteeId, action) => {
    try {
      if (!socket || !socket.connected) {
        console.error('Socket not connected. Cannot update request status.');
        toast.error('Connection error. Please try again later.');
        return;
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      
      let rejectionDetails = null;
      
      // If rejecting, prompt for a reason
      if (newStatus === 'rejected') {
        const reason = prompt('Please provide a reason for declining this request (optional):');
        if (reason) {
          rejectionDetails = { reason };
        }
      }
      
      // Update status in the database
      axios.put(`${apiUrl}/api/mentors/requests/${requestId}`, { status: newStatus }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(response => {
          // Update local state
          setRequests(prevRequests => 
            prevRequests.map(req => 
              req._id === requestId ? { ...req, status: newStatus } : req
            )
          );
          
          // Show success message
          toast.success(`Request ${action === 'accept' ? 'accepted' : 'rejected'} successfully`);
          
          // Emit socket event to notify mentee
          if (socket && socket.connected) {
            console.log(`Emitting requestStatusUpdated event for mentee ${menteeId}`);
            socket.emit('requestStatusUpdated', { 
              requestId, 
              status: newStatus, 
              menteeId,
              rejectionDetails,
              mentorName: user?.name || 'your mentor'
            });
          } else {
            console.error('Socket not connected when trying to emit requestStatusUpdated event');
          }
        })
        .catch(error => {
          console.error('Error updating request status:', error);
          toast.error('Failed to update request status: ' + error.message);
        });
    } catch (error) {
      console.error('Error handling request:', error);
      
      // Detailed error logging
      if (error.response) {
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      }
      
      toast.error(error.response?.data?.message || `Failed to process request: ${error.message}`);
    }
  };

  const viewMenteeProfile = (mentee) => {
    console.log('Viewing mentee profile:', mentee);
    setSelectedMentee(mentee);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

  if (requests.length === 0) {
    return (
      <p className="text-gray-600 text-center py-4">No pending mentorship requests</p>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <div key={request._id} className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4">
            <img
              src={request.mentee.profileImage || '/default-avatar.png'}
              alt={request.mentee.name}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">{request.mentee.name}</h3>
              <p className="text-sm text-gray-600">{request.mentee.email}</p>
              <p className="text-xs text-gray-400">ID: {request.mentee._id}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-700">{request.message}</p>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Requested on: {new Date(request.createdAt).toLocaleDateString()}
          </div>

          <div className="mt-6 flex space-x-4">
            <button
              onClick={() => handleRequestAction(request._id, request.mentee._id, 'accept')}
              disabled={processingRequestId === request._id}
              className={`flex-1 ${
                processingRequestId === request._id 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              } text-white py-2 px-4 rounded transition duration-200`}
            >
              {processingRequestId === request._id ? 'Processing...' : 'Accept'}
            </button>
            <button
              onClick={() => handleRequestAction(request._id, request.mentee._id, 'reject')}
              disabled={processingRequestId === request._id}
              className={`flex-1 ${
                processingRequestId === request._id 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white py-2 px-4 rounded transition duration-200`}
            >
              Reject
            </button>
            <button
              onClick={() => viewMenteeProfile(request.mentee)}
              className="flex-1 bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition duration-200"
            >
              View Profile
            </button>
          </div>
        </div>
      ))}

      {/* Mentee Profile Modal */}
      {selectedMentee && (
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
                  src={selectedMentee.profileImage || '/default-avatar.png'}
                  alt={selectedMentee.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-md"
                />
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedMentee.name}</h4>
                  <p className="text-gray-600">{selectedMentee.email}</p>
                </div>
              </div>

              {selectedMentee.bio && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Bio</h5>
                  <p className="text-gray-700">{selectedMentee.bio}</p>
                </div>
              )}

              {selectedMentee.goals && selectedMentee.goals.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Goals</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedMentee.goals.map((goal, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedMentee.skills && selectedMentee.skills.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Skills</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedMentee.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MentorshipRequests; 