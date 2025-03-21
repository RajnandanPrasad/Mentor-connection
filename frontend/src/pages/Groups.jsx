import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSocket } from '../context/SocketContext';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    type: 'public'
  });
  const { socket, on, off, emit } = useSocket();

  useEffect(() => {
    fetchGroups();

    // Socket event listeners
    on('newGroupMessage', handleNewMessage);
    on('removedFromGroup', handleRemovedFromGroup);

    return () => {
      off('newGroupMessage', handleNewMessage);
      off('removedFromGroup', handleRemovedFromGroup);
    };
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchMessages();
      socket?.emit('joinGroup', selectedGroup._id);
    }

    return () => {
      if (selectedGroup) {
        socket?.emit('leaveGroup', selectedGroup._id);
      }
    };
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/groups', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/groups/${selectedGroup._id}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Failed to load messages');
    }
  };

  const handleNewMessage = (data) => {
    if (data.groupId === selectedGroup?._id) {
      setMessages(prev => [...prev, data.message]);
    }
  };

  const handleRemovedFromGroup = (data) => {
    setGroups(prev => prev.filter(group => group._id !== data.groupId));
    if (selectedGroup?._id === data.groupId) {
      setSelectedGroup(null);
      setMessages([]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/groups',
        newGroup,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroups(prev => [...prev, response.data]);
      setShowCreateModal(false);
      setNewGroup({ name: '', description: '', type: 'public' });
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5000/api/groups/${groupId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGroups(prev =>
        prev.map(group => (group._id === groupId ? response.data : group))
      );
    } catch (error) {
      console.error('Error joining group:', error);
      setError('Failed to join group');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedGroup) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/groups/${selectedGroup._id}/messages`,
        { content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Groups</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Create Group
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex space-x-6">
        {/* Groups List */}
        <div className="w-1/3">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b">
              <h2 className="text-xl font-semibold">Available Groups</h2>
            </div>
            <div className="divide-y">
              {groups.map(group => (
                <div
                  key={group._id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedGroup?._id === group._id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{group.name}</h3>
                      <p className="text-sm text-gray-500">{group.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {group.members.length} members
                      </p>
                    </div>
                    {!group.members.some(m => m.user === localStorage.getItem('userId')) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinGroup(group._id);
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600"
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="w-2/3">
          {selectedGroup ? (
            <div className="bg-white rounded-lg shadow h-[calc(100vh-12rem)]">
              <div className="p-4 border-b">
                <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
                <p className="text-sm text-gray-500">{selectedGroup.description}</p>
              </div>

              {/* Messages */}
              <div className="h-[calc(100%-10rem)] overflow-y-auto p-4 space-y-4">
                {messages.map(message => (
                  <div
                    key={message._id}
                    className={`flex ${
                      message.sender._id === localStorage.getItem('userId')
                        ? 'justify-end'
                        : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        message.sender._id === localStorage.getItem('userId')
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200'
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">
                        {message.sender.name}
                      </p>
                      <p>{message.content}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow h-[calc(100vh-12rem)] flex items-center justify-center">
              <p className="text-gray-500">Select a group to start chatting</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
            <form onSubmit={handleCreateGroup}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newGroup.name}
                    onChange={(e) =>
                      setNewGroup(prev => ({ ...prev, name: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={newGroup.description}
                    onChange={(e) =>
                      setNewGroup(prev => ({
                        ...prev,
                        description: e.target.value
                      }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Type
                  </label>
                  <select
                    value={newGroup.type}
                    onChange={(e) =>
                      setNewGroup(prev => ({ ...prev, type: e.target.value }))
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups; 