import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';
import { useNavigate } from 'react-router-dom';

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const { on, off } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    fetchConnections();

    // Listen for connection updates
    on('connectionUpdate', handleConnectionUpdate);
    on('connectionEnded', handleConnectionEnded);

    return () => {
      off('connectionUpdate', handleConnectionUpdate);
      off('connectionEnded', handleConnectionEnded);
    };
  }, [filter]);

  const fetchConnections = async () => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = filter === 'all' ? '/api/connections' : `/api/connections/history?status=${filter}`;
      const response = await axios.get(`http://localhost:5000${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConnections(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching connections:', error);
      setError('Failed to load connections');
      setLoading(false);
    }
  };

  const handleConnectionUpdate = (data) => {
    setConnections(prev => prev.map(conn => 
      conn._id === data.connection._id ? data.connection : conn
    ));
  };

  const handleConnectionEnded = ({ connectionId }) => {
    setConnections(prev => prev.map(conn => 
      conn._id === connectionId ? { ...conn, status: 'ended' } : conn
    ));
  };

  const handleEndConnection = async (connectionId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/connections/${connectionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchConnections();
    } catch (error) {
      console.error('Error ending connection:', error);
      setError('Failed to end connection');
    }
  };

  const handleStartChat = (connection) => {
    navigate('/chat', { state: { chatPartner: connection } });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Connections</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${
              filter === 'pending'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('accepted')}
            className={`px-4 py-2 rounded ${
              filter === 'accepted'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('ended')}
            className={`px-4 py-2 rounded ${
              filter === 'ended'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Past
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {connections.length === 0 ? (
          <div className="text-center text-gray-500">
            No connections found
          </div>
        ) : (
          connections.map((connection) => (
            <div
              key={connection._id}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">
                    {connection.mentor.name}
                    {connection.mentor.mentorProfile?.title && (
                      <span className="text-gray-500 text-sm ml-2">
                        ({connection.mentor.mentorProfile.title})
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    Connected with: {connection.mentee.name}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {new Date(connection.createdAt).toLocaleDateString()}
                  </p>
                  {connection.requestMessage && (
                    <p className="mt-4 text-gray-700">
                      "{connection.requestMessage}"
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      connection.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : connection.status === 'accepted'
                        ? 'bg-green-100 text-green-800'
                        : connection.status === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                  </span>
                  {connection.status === 'accepted' && (
                    <div className="mt-4 space-x-2">
                      <button
                        onClick={() => handleStartChat(connection)}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        Chat
                      </button>
                      <button
                        onClick={() => handleEndConnection(connection._id)}
                        className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                      >
                        End Connection
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Connections; 