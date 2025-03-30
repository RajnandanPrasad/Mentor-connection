import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';

const AcceptedMentees = () => {
  const { user, token } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('AcceptedMentees component mounted');
    console.log('Current user:', user);
    console.log('Token available:', !!token);
    fetchConnections();
  }, [user, token]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      if (!token) {
        console.error("No token found! API call will fail.");
        setError('Authentication error. Please log in again.');
        return;
      }

      console.log('Fetching connections from:', `${import.meta.env.VITE_API_URL}/api/connections`);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/connections`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Full API Response:', response.data);
      if (!Array.isArray(response.data)) {
        console.error('Invalid JSON response:', response);
        setError('Unexpected server response. Please try again.');
        return;
      }

      response.data.forEach((conn, index) => {
        console.log(`Connection ${index}:`, conn);
      });

      const acceptedConnections = response.data.filter(conn => {
        console.log('Connection status:', conn.status);
        return conn.status === 'accepted';
      });

      console.log('Filtered accepted connections:', acceptedConnections);
      setConnections(acceptedConnections);
      setError(null);
    } catch (error) {
      console.error('Error details:', error.response || error);
      setError(error.response?.data?.message || 'Failed to fetch connections');
      toast.error('Failed to fetch connections');
    } finally {
      setLoading(false);
    }
  };

  const handleEndConnection = async (connectionId) => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/connections/${connectionId}/end`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      toast.success('Connection ended successfully');
      fetchConnections(); // Refresh the list
    } catch (error) {
      console.error('Error ending connection:', error);
      toast.error('Failed to end connection');
    }
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

  if (connections.length === 0) {
    return (
      <div className="text-center text-gray-600 p-4">
        {user?.role === 'mentor' ? 'No connected mentees yet' : 'No connected mentors yet'}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {connections.map((connection) => {
        const displayUser = user?.role === 'mentor' ? connection?.mentee : connection?.mentor;
        
        if (!displayUser) {
          console.warn(`Skipping connection due to missing data:`, connection);
          return null;
        }
        
        return (
          <motion.div
            key={connection._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-md p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src={displayUser.profileImage || '/default-avatar.png'}
                  alt={displayUser.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-lg">{displayUser.name}</h3>
                  <p className="text-gray-600">{displayUser.email}</p>
                  {user?.role === 'mentor' && connection.mentee?.skills && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {connection.mentee.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleEndConnection(connection._id)}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 border border-red-600 rounded hover:bg-red-50 transition-colors"
                >
                  End Connection
                </button>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Connected since: {new Date(connection.startDate).toLocaleDateString()}
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default AcceptedMentees;
