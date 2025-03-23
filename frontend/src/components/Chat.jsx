import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import MessageStatus from './MessageStatus';
import { playNotificationSound, showNotification } from '../utils/notification';
import { initSocket, disconnectSocket, joinChat, leaveChat } from '../services/socket';

const Chat = ({ mentee, onClose }) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const [error, setError] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      newSocket.emit('joinChat', {
        mentorId: user._id,
        menteeId: mentee.mentee._id
      });
    });

    newSocket.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();

      // Play sound and show notification if message is from other user
      if (message.sender._id !== user._id) {
        playNotificationSound();
        showNotification(
          'New Message',
          `${message.sender.name}: ${message.content}`
        );
      }
    });

    newSocket.on('messagesRead', ({ userId }) => {
      if (userId !== user._id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.sender._id === user._id
              ? {
                  ...msg,
                  readBy: [...msg.readBy, { user: { _id: userId }, readAt: new Date() }]
                }
              : msg
          )
        );
      }
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setError('Connection error. Please refresh the page.');
    });

    setSocket(newSocket);

    // Fetch chat history
    fetchChatHistory();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, user._id, mentee.mentee._id]);

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/chat/${mentee.mentee._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setMessages(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to load chat history');
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/chat`,
        {
          recipientId: mentee.mentee._id,
          message: newMessage
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      setMessages(prev => [...prev, response.data]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="bg-white border-b p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={mentee.mentee.profileImage || '/default-avatar.png'}
            alt={mentee.mentee.name}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="font-semibold">{mentee.mentee.name}</h3>
            <p className="text-sm text-gray-500">Online</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === user._id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender === user._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <p>{message.content}</p>
                <MessageStatus message={message} currentUserId={user._id} />
              </div>
              <div className="text-xs mt-1 opacity-70">
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 