import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import MessageStatus from './MessageStatus';
import { playNotificationSound, showNotification } from '../utils/notification';
import { initSocket, disconnectSocket, joinChat, leaveChat } from '../services/socket';

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatInfo, setChatInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const { chatId } = useParams();
  const navigate = useNavigate();

  const currentUser = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!chatId) {
      navigate('/connections');
      return;
    }

    const initializeChat = async () => {
      try {
        // Initialize socket connection
        socketRef.current = initSocket(token);
        
        // Join the chat room
        joinChat(chatId);

        // Set up socket event listeners
        setupSocketListeners();
        
        // Fetch initial messages and chat info
        await Promise.all([
          fetchChatInfo(),
          fetchMessages()
        ]);
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Failed to initialize chat. Please try again.');
      }
    };

    initializeChat();

    return () => {
      if (chatId) {
        leaveChat(chatId);
      }
      disconnectSocket();
    };
  }, [chatId, token]);

  const setupSocketListeners = () => {
    if (!socketRef.current) return;

    socketRef.current.on('newMessage', (message) => {
      setMessages(prev => [...prev, message]);
      scrollToBottom();

      // Play sound and show notification if message is from other user
      if (message.sender._id !== currentUser._id) {
        playNotificationSound();
        showNotification(
          'New Message',
          `${message.sender.name}: ${message.content}`
        );
      }
    });

    socketRef.current.on('messagesRead', ({ userId }) => {
      if (userId !== currentUser._id) {
        setMessages(prev => 
          prev.map(msg => 
            msg.sender._id === currentUser._id
              ? {
                  ...msg,
                  readBy: [...msg.readBy, { user: { _id: userId }, readAt: new Date() }]
                }
              : msg
          )
        );
      }
    });

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error);
      setError('Connection error. Please refresh the page.');
    });
  };

  const fetchChatInfo = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/chats/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setChatInfo(response.data);
    } catch (err) {
      console.error('Error fetching chat info:', err);
      setError('Failed to load chat information.');
      throw err;
    }
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/chats/${chatId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setMessages(response.data);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await axios.post(
        `http://localhost:5000/api/chats/${chatId}/messages`,
        { content: newMessage.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      setNewMessage('');
      // The new message will be added through the socket event
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <div className="flex justify-center items-center h-full">Loading...</div>;
  if (error) return <div className="text-red-500 text-center">{error}</div>;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {chatInfo && (
        <div className="bg-white shadow-sm p-4 flex items-center gap-4">
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              {currentUser._id === chatInfo.mentor._id ? chatInfo.mentee.name : chatInfo.mentor.name}
            </h2>
            <p className="text-sm text-gray-500">
              {currentUser._id === chatInfo.mentor._id ? 'Mentee' : 'Mentor'}
            </p>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${
              message.sender._id === currentUser._id ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender._id === currentUser._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <p>{message.content}</p>
                <MessageStatus message={message} currentUserId={currentUser._id} />
              </div>
              <div className="text-xs mt-1 opacity-70">
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 