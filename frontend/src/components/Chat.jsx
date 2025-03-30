import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { io } from 'socket.io-client';
import MessageStatus from './MessageStatus';
import { playNotificationSound, showNotification } from '../utils/notification';

const Chat = ({ mentee, onClose }) => {
  const { token, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [chatInfo, setChatInfo] = useState(null);
  const [error, setError] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Initialize socket connection
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const newSocket = io(apiUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      if (reconnecting) {
        toast.success('Chat reconnected!');
        setReconnecting(false);
      }
      
      // Join the chat room
      const recipientId = mentee.mentee?._id;
      if (recipientId && user?._id) {
        newSocket.emit('joinChat', {
          mentorId: user.role === 'mentor' ? user._id : recipientId,
          menteeId: user.role === 'mentee' ? user._id : recipientId
        });
      }
    });

    newSocket.on('connect_error', () => {
      console.log('Socket connection error');
      setReconnecting(true);
      toast.error('Chat connection error. Trying to reconnect...');
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
                  readBy: [...(msg.readBy || []), { user: { _id: userId }, readAt: new Date() }]
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
  }, [token, user, mentee]);

  const fetchChatHistory = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const recipientId = mentee.mentee?._id;
      
      if (!recipientId) {
        throw new Error('Invalid recipient ID');
      }
      
      const response = await axios.get(
        `${apiUrl}/api/chat/${recipientId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data && Array.isArray(response.data)) {
        setMessages(response.data);
        
        // Mark messages as read
        if (socket && socket.connected) {
          socket.emit('markMessagesAsRead', { 
            senderId: recipientId
          });
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      toast.error('Failed to load chat history. Please try again.');
      setError('Failed to load chat history. Please try again.');
    } finally {
      setLoading(false);
      // Scroll to bottom after messages load
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    const messageText = newMessage.trim();
    setNewMessage(''); // Clear input right away for better UX

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const recipientId = mentee.mentee?._id;
      
      if (!recipientId) {
        throw new Error('Invalid recipient ID');
      }
      
      // Optimistically add message to UI
      const tempMessage = {
        _id: `temp-${Date.now()}`,
        content: messageText,
        sender: {
          _id: user._id,
          name: user.name
        },
        createdAt: new Date(),
        status: 'sending'
      };
      
      setMessages(prev => [...prev, tempMessage]);
      scrollToBottom();
      
      const response = await axios.post(
        `${apiUrl}/api/chat`,
        {
          recipientId,
          message: messageText
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      // Replace the temp message with the actual one
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempMessage._id ? response.data : msg
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._id.startsWith('temp-') ? { ...msg, status: 'failed' } : msg
        )
      );
    }
  };

  const handleRetryMessage = async (messageId) => {
    const failedMessage = messages.find(msg => msg._id === messageId);
    if (!failedMessage) return;
    
    // Remove the failed message
    setMessages(prev => prev.filter(msg => msg._id !== messageId));
    
    // Re-use the send message functionality with the same content
    setNewMessage(failedMessage.content);
    setTimeout(() => {
      document.getElementById('message-input-form').dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }, 0);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-red-500 mb-4">{error}</p>
        <button 
          onClick={fetchChatHistory} 
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Try Again
        </button>
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
            <p className="text-sm text-gray-500">
              {reconnecting ? 'Reconnecting...' : 'Online'}
            </p>
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
            key={message._id || index}
            className={`flex ${message.sender._id === user._id ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.sender._id === user._id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <p>{message.content}</p>
                {message.status === 'failed' ? (
                  <button 
                    onClick={() => handleRetryMessage(message._id)}
                    className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded"
                  >
                    Retry
                  </button>
                ) : (
                  <MessageStatus message={message} currentUserId={user._id} />
                )}
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
      <form id="message-input-form" onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={reconnecting}
          />
          <button
            type="submit"
            className={`px-4 py-2 rounded-lg transition duration-200 ${
              reconnecting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            disabled={reconnecting}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat; 