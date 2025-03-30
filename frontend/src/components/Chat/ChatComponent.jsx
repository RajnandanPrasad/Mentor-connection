import React, { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import axios from "axios";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import { Loader2, Send, AlertCircle, Wifi, WifiOff, RefreshCw, X, MessageSquare } from "lucide-react";
import ConnectionTestButton from '../ConnectionTestButton';
import ConnectionErrorModal from '../ConnectionErrorModal';
import { Avatar } from '../ui/avatar';
import { Message } from './Message';

// ChatComponent can be used by both mentees and mentors
const ChatComponent = ({ partnerId, partnerName, partnerRole, userRole, chatId: directChatId, recipient, onNewMessage }) => {
  const { user, token } = useAuth();
  const { socket, isConnected } = useSocket();
  const [chatId, setChatId] = useState(directChatId || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reconnecting, setReconnecting] = useState(false);
  const messagesEndRef = useRef(null);
  const apiUrl = import.meta.env.VITE_API_URL || "";
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [messageStatuses, setMessageStatuses] = useState({});

  // Scroll to the bottom of the messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Add this after scrollToBottom function
  const markMessagesAsRead = useCallback(() => {
    if (!messages.length || !chatId || !socket || !isConnected) return;
    
    // Find unread messages from the other person
    const unreadMessages = messages.filter(
      msg => msg.sender !== user._id && !msg.readAt
    );
    
    if (unreadMessages.length === 0) return;
    
    console.log(`Marking ${unreadMessages.length} messages as read`);
    
    // Mark each message as read
    unreadMessages.forEach(message => {
      socket.emit('markMessageRead', { 
        messageId: message._id, 
        chatId,
        readBy: user._id
      });
      
      // Update local state to indicate these are read
      setMessages(prev => prev.map(msg => 
        msg._id === message._id ? { ...msg, readAt: new Date().toISOString() } : msg
      ));
    });
  }, [messages, chatId, socket, isConnected, user._id]);

  // Add useEffect to call markMessagesAsRead when messages change or when component becomes visible
  useEffect(() => {
    if (document.visibilityState === 'visible') {
      markMessagesAsRead();
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        markMessagesAsRead();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [messages, markMessagesAsRead]);

  // Initialize chat and fetch messages
  useEffect(() => {
    if (directChatId) {
      // If a direct chatId is provided, use it
      setChatId(directChatId);
      // Use a self-executing async function for async operations
      const loadMessages = async () => {
        try {
          await fetchMessages(directChatId);
        } catch (error) {
          console.error("Error loading messages:", error);
        }
      };
      loadMessages();
    } else if (partnerId && user && token) {
      // Otherwise, fetch chat based on partnerId
      fetchChat();
    }
  }, [directChatId, partnerId, user, token]);

  // Update the reconnection useEffect
  useEffect(() => {
    if (socket && !isConnected && chatId && !reconnecting) {
      // Socket was connected but got disconnected
      console.log('Socket disconnected, attempting to reconnect...');
      attemptReconnection();
    } else if (isConnected && chatId && reconnecting) {
      // Socket has been reconnected
      console.log(`Socket reconnected successfully`);
      setReconnecting(false);
      toast.success("Chat connection restored");
    }
  }, [isConnected, chatId, reconnecting]);

  // Handle real-time messages through socket
  useEffect(() => {
    if (!socket || !chatId) return;
    
    console.log(`Setting up socket listeners for chat ${chatId}`);
    
    // Clean up any existing listeners first
    socket.off('newMessage');
    socket.off('messageRead');
    socket.off('messageDelivered');
    socket.off('chatSessionEnded');
    
    // Join the chat room with more consistent format
    console.log(`Joining chat room ${chatId}`);
    
    // More reliable room joining with proper data structure
    const joinData = {
      chatId: typeof chatId === 'string' ? chatId : (chatId.chatId || chatId._id || chatId.id),
      userId: user._id,
      userRole: userRole
    };
    socket.emit('joinChat', joinData);
    
    // Verify the room was joined successfully
    socket.once('room-joined', (data) => {
      console.log('Successfully joined chat room:', data);
    });
    
    const handleNewMessage = (message) => {
      console.log('New message received:', message);
      console.log('Current user ID:', user._id);
      console.log('Message sender ID:', message.sender);
      
      // Play a sound if the message is from the partner
      if (message.sender !== user._id) {
        try {
          // Create a simple notification sound
          const audio = new Audio('/message-notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(err => console.log('Notification sound failed to play:', err));
        } catch (err) {
          console.log('Could not play notification sound:', err);
        }
        
        // Mark message as delivered immediately
        if (socket && isConnected && message._id) {
          socket.emit('messageDelivered', {
            messageId: message._id,
            chatId: chatId,
            recipientId: message.sender,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // Make sure we're not adding duplicates
      setMessages(prev => {
        if (prev.some(m => m._id === message._id)) {
          console.log('Duplicate message detected, not adding to state');
          return prev;
        }
        console.log('Adding new message to state');
        return [...prev, message];
      });
      
      // Scroll to bottom when new message arrives
      setTimeout(scrollToBottom, 100);
      
      // Automatically mark message as read if it's from the other person
      if (message.sender !== user._id && socket && isConnected) {
        console.log('Marking message as read:', message._id);
        socket.emit('messageRead', {
          messageId: message._id,
          chatId: chatId,
          recipientId: message.sender,
          timestamp: new Date().toISOString()
        });
        
        // Update message statuses
        setMessageStatuses(prev => ({
          ...prev,
          [message._id]: 'read'
        }));
      }
      
      // Notify parent component if callback exists
      if (typeof onNewMessage === 'function') {
        onNewMessage(message);
      }
    };

    // Register the message listener
    socket.on('newMessage', handleNewMessage);
    
    // Handle message read confirmations
    socket.on('messageRead', handleMessageRead);
    
    // Handle message delivered confirmations
    socket.on('messageDelivered', handleMessageDelivered);
    
    // Handle chat session end events
    socket.on('chatSessionEnded', handleChatSessionEnded);
    
    // Return unsubscribe function
    return () => {
      console.log('Cleaning up chat socket listeners');
      socket.off('newMessage', handleNewMessage);
      socket.off('messageRead', handleMessageRead);
      socket.off('messageDelivered', handleMessageDelivered);
      socket.off('chatSessionEnded', handleChatSessionEnded);
      
      // Leave the chat room when unmounting
      if (chatId) {
        console.log(`Leaving chat room ${chatId}`);
        socket.emit('leaveChat', {
          chatId: typeof chatId === 'string' ? chatId : (chatId.chatId || chatId._id || chatId.id),
          userId: user._id
        });
      }
    };
  }, [socket, chatId, isConnected, user._id]);

  // Update the existing useEffect for scrolling to also mark messages as read
  useEffect(() => {
    scrollToBottom();
    
    // If we have a chat open and messages, mark them as read
    if (chatId && isConnected && messages.length > 0) {
      markMessagesAsRead();
    }
  }, [messages, chatId, isConnected, markMessagesAsRead]);

  // Focus input field when chat is loaded
  useEffect(() => {
    if (!loading && !error && inputRef.current) {
      inputRef.current.focus();
    }
  }, [loading, error]);

  // Add this useEffect after the other useEffect hooks
  useEffect(() => {
    // Log connection status and chatId changes for debugging
    console.log("Chat connection status changed:", { 
      isConnected, 
      chatId, 
      reconnecting, 
      inputDisabled: reconnecting
    });
    
    // Log reasons why input might be disabled
    if (!isConnected) {
      console.log("Input might be disabled because: Socket not connected");
    }
    if (!chatId) {
      console.log("Input might be disabled because: No chat ID available");
    }
    if (reconnecting) {
      console.log("Input might be disabled because: Reconnecting in progress");
    }
    
    // Force focus on input if conditions are right
    if (isConnected && chatId && !reconnecting && inputRef.current) {
      console.log("Attempting to focus input field");
      setTimeout(() => {
        inputRef.current.focus();
      }, 300);
    }
  }, [isConnected, chatId, reconnecting]);

  // Add a new useEffect to monitor connection status changes and show helpful messages
  useEffect(() => {
    // Monitor connection status changes
    if (chatId && isConnected && !reconnecting && !loading) {
      // Everything looks good - chat is ready
      toast.success("Chat is ready! You can now send messages.", {
        id: "chat-ready",
        duration: 3000
      });
    } else if (chatId && !isConnected && !loading) {
      // We have a chat but lost connection
      toast.error("Connection lost. Trying to reconnect...", {
        id: "chat-connection-lost",
        duration: 5000
      });
    }

    // Add debugging to console when chat conditions change
    console.log("Chat conditions changed:", {
      chatId,
      isConnected,
      reconnecting,
      loading,
      chatReadyToUse: chatId && isConnected && !reconnecting && !loading
    });
  }, [chatId, isConnected, reconnecting, loading]);

  // Add a periodic check to ensure we're in the chat room
  useEffect(() => {
    if (!socket || !chatId || !isConnected) return;
    
    // Function to verify room membership and rejoin if needed
    const verifyRoomMembership = () => {
      if (socket && isConnected && chatId) {
        console.log(`Periodic check: Ensuring membership in chat room ${chatId}`);
        
        // Rejoin the chat room to ensure we're receiving messages
        if (typeof chatId === 'string') {
          socket.emit('joinChat', chatId);
        } else if (typeof chatId === 'object' && chatId.chatId) {
          socket.emit('joinChat', chatId.chatId);
        } else {
          socket.emit('joinChat', { chatId });
        }
        
        // Send a test message to the room to verify it's working
        socket.emit('chatActive', { chatId });
      }
    };
    
    // Verify immediately upon connecting
    verifyRoomMembership();
    
    // Then check periodically (every 30 seconds)
    const interval = setInterval(verifyRoomMembership, 30000);
    
    return () => clearInterval(interval);
  }, [socket, chatId, isConnected]);
  
  // Add debugging for missed messages
  useEffect(() => {
    if (!socket || !isConnected) return;
    
    // Listen for socket debug events
    const handleConnectionDebug = (data) => {
      console.log('Socket connection debug info:', data);
    };
    
    socket.on('connection-debug', handleConnectionDebug);
    
    return () => {
      socket.off('connection-debug', handleConnectionDebug);
    };
  }, [socket, isConnected]);

  const fetchChat = async () => {
    setLoading(true);
    try {
      console.log(`Fetching chat between user ${user._id} and partner ${partnerId}`);
      
      // First check if we have an existing chat
      const chatResponse = await axios.get(
        `${apiUrl}/api/chat/find?userId=${user._id}&partnerId=${partnerId}`,
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (chatResponse.data && chatResponse.data._id) {
        console.log("Existing chat found:", chatResponse.data);
        setChatId(chatResponse.data._id);
        // Use the updated fetchMessages function
        await fetchMessages(chatResponse.data._id);
        
        // Join the chat room
        if (socket && isConnected) {
          socket.emit('joinChat', {
            chatId: chatResponse.data._id,
            userId: user._id,
            userRole: userRole
          });
        }
      } else {
        // No existing chat, create a new one
        console.log("No existing chat found, creating new chat");
        const createChatResponse = await axios.post(
          `${apiUrl}/api/chat`,
          { 
            userId: user._id, 
            partnerId: partnerId,
            partnerRole: partnerRole || 'mentor',
            userRole: userRole || 'mentee'
          },
          { headers: { Authorization: `Bearer ${token}` }}
        );
        
        if (createChatResponse.data && createChatResponse.data._id) {
          console.log("New chat created:", createChatResponse.data);
          setChatId(createChatResponse.data._id);
          setMessages([]);
          
          // Join the chat room for the new chat
          if (socket && isConnected) {
            socket.emit('joinChat', {
              chatId: createChatResponse.data._id,
              userId: user._id,
              userRole: userRole
            });
          }
        } else {
          throw new Error("Failed to create chat");
        }
      }
      setError(null);
    } catch (error) {
      console.error("Error fetching/creating chat:", error);
      setError("Could not connect to chat server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific chat
  const fetchMessages = async (chatIdToUse) => {
    if (!chatIdToUse && !chatId) {
      console.error("No chat ID available to fetch messages");
      return;
    }

    const targetChatId = chatIdToUse || chatId;
    setLoading(true);
    
    try {
      const response = await axios.get(`${apiUrl}/api/chat/${targetChatId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessages(response.data);
      // Notify parent component that we've loaded messages if callback exists
      if (typeof onNewMessage === 'function') {
        onNewMessage();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError("Failed to load messages. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Add this function after the fetchMessages function and before handleSendMessage
  const attemptReconnection = async () => {
    if (!socket) return;
    
    setReconnecting(true);
    console.log('Attempting to reconnect socket...');
    
    try {
      // First, try to reconnect the socket
      socket.connect();
      
      // Set a timeout to check if connection was successful
      const timeout = setTimeout(() => {
        if (!socket.connected) {
          console.log('Socket reconnection timeout - still not connected');
          toast.error("Connection failed. Please try again.");
          setReconnecting(false);
        }
      }, 5000);
      
      // Set up a one-time listener for reconnection
      const onReconnect = () => {
        clearTimeout(timeout);
        console.log('Socket reconnected successfully');
        toast.success("Connection restored!");
        
        // Rejoin all necessary chat rooms
        if (chatId) {
          console.log(`Rejoining chat room ${chatId} after reconnection`);
          socket.emit('joinChat', chatId);
          
          // Reload messages to ensure we have the latest
          fetchMessages(chatId);
        }
        
        setReconnecting(false);
      };
      
      socket.once('connect', onReconnect);
      
      // Clean up if component unmounts during reconnection attempt
      return () => {
        clearTimeout(timeout);
        socket.off('connect', onReconnect);
      };
    } catch (error) {
      console.error('Error during reconnection attempt:', error);
      toast.error("Failed to reconnect. Please refresh the page.");
      setReconnecting(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!newMessage.trim()) return;
    if (!chatId) {
      setError("Cannot send message: Chat not initialized");
      return;
    }
    
    const messageText = newMessage.trim();
    setNewMessage(""); // Clear the input field immediately for better UX
    
    // Create a temporary message ID to track this message
    const tempId = `temp-${Date.now()}`;
    
    // Add message to UI immediately with pending status
    const tempMessage = {
      _id: tempId,
      content: messageText,
      sender: user._id,
      chatId: chatId,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // Scroll to bottom immediately
    setTimeout(scrollToBottom, 50);
    
    try {
      // Actually send the message to the server
      const response = await axios.post(
        `${apiUrl}/api/chat/${chatId}/messages`, 
        { content: messageText },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Get the real message from the response
      const sentMessage = response.data;
      
      // Replace the temporary message with the real one
      setMessages(prev => prev.map(m => 
        m._id === tempId ? sentMessage : m
      ));
      
      // Emit message to socket if connected
      if (socket && isConnected) {
        socket.emit('message', {
          chatId,
          messageId: sentMessage._id,
          senderId: user._id,
          recipientId: recipient?._id || partnerId,
          content: messageText
        });
      }
      
      // Notify parent component if callback exists
      if (typeof onNewMessage === 'function') {
        onNewMessage(sentMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Update the temporary message to show error
      setMessages(prev => prev.map(m => 
        m._id === tempId ? {...m, status: 'error'} : m
      ));
      
      // Show error to user
      toast.error("Failed to send message. Please try again.");
    }
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (timestamp) => {
    try {
      return format(new Date(timestamp), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return {};
    
    const groupedMessages = {};
    
    messages.forEach(message => {
      if (!message.createdAt) return;
      
      const date = formatMessageDate(message.createdAt);
      if (!groupedMessages[date]) {
        groupedMessages[date] = [];
      }
      groupedMessages[date].push(message);
    });
    
    return groupedMessages;
  };

  const tryAgain = () => {
    setError(null);
    fetchChat();
  };

  // Add a new endChat function after tryAgain function
  const endChat = () => {
    if (!socket || !isConnected || !chatId) {
      toast.error("Cannot end chat: Not connected");
      return;
    }
    
    // Notify the partner that you're ending the chat session
    socket.emit("endChatSession", {
      chatId,
      recipientId: partnerId,
      endedBy: user.name
    });
    
    toast.success("Chat session ended");
    
    // Clear the chat UI but keep the component mounted
    setMessages([]);
    setChatId(null);
  };

  // Add this debug function 
  const debugChat = () => {
    console.log("------- CHAT DEBUG INFO -------");
    console.log("Chat Component Props:", { partnerId, partnerName, partnerRole, userRole });
    console.log("User:", user);
    console.log("Token:", token ? "Present" : "Missing");
    console.log("Socket Connected:", isConnected);
    console.log("Socket ID:", socket?.id);
    console.log("Chat ID:", chatId);
    console.log("API URL:", apiUrl);
    console.log("Messages Count:", messages.length);
    console.log("Chat Status:", { loading, error });
    console.log("------------------------------");
    
    toast.success("Debug info logged to console");
  };

  // Get grouped messages
  const groupedMessages = groupMessagesByDate(messages);
  const groupDates = Object.keys(groupedMessages).sort((a, b) => 
    new Date(a) - new Date(b)
  );

  // Render error state
  if (error) {
    return (
      <Card className="p-0 overflow-hidden h-full flex flex-col">
        <div className="bg-blue-600 text-white p-4">
          <h2 className="text-xl font-semibold">
            {partnerName ? `Chat with ${partnerName}` : 'Chat'}
          </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-800 mb-2">Chat Error</h3>
            <p className="text-red-600 mb-4">{error}</p>
            
            {error.includes("connection with this mentee") && (
              <ConnectionErrorModal
                type="chat"
                errorMessage={error}
                onRetry={async () => {
                  // Attempt to repair connection and retry
                  try {
                    setLoading(true);
                    const params = userRole === 'mentor' 
                      ? { mentorId: user._id, menteeId: partnerId } 
                      : { mentorId: partnerId, menteeId: user._id };
                      
                    const response = await axios.post(`${apiUrl}/api/connections/repair`, params);
                    
                    if (response.data.success) {
                      toast.success("Connection repaired successfully");
                      // Create a separate async function for fetchChat
                      const refreshChat = async () => {
                        await fetchChat();
                      };
                      refreshChat();
                    } else {
                      toast.error("Failed to repair connection");
                    }
                  } catch (err) {
                    console.error("Error repairing connection:", err);
                    toast.error("Failed to repair connection");
                  } finally {
                    setLoading(false);
                    setError(null);
                  }
                }}
                onClose={() => setError(null)}
              />
            )}
            
            <div className="flex flex-col sm:flex-row justify-center gap-2">
              <Button 
                onClick={tryAgain} 
                className="bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Render loading state
  if (loading) {
  return (
    <Card className="p-0 overflow-hidden h-full flex flex-col">
      <div className="bg-blue-600 text-white p-4">
        <h2 className="text-xl font-semibold">
            {partnerName ? `Chat with ${partnerName}` : 'Loading Chat...'}
        </h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500">Loading chat messages...</p>
        </div>
      </Card>
    );
  }

  // Add this component at the bottom of the file, just before the return statement
  const DiagnosticHelper = () => {
    const [showDetails, setShowDetails] = useState(false);
    
    return (
      <div className="border-t border-gray-200 p-2 bg-gray-50">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {!chatId && <span className="text-xs text-orange-500 ml-2">No chat initialized</span>}
              {reconnecting && <span className="text-xs text-blue-500 ml-2">Reconnecting...</span>}
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 hover:underline"
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </button>
              
              {!isConnected && (
                <button 
                  onClick={() => {
                    if (socket?.connected) {
                      toast.success("Already connected!");
                    } else if (socket) {
                      toast.loading("Reconnecting...");
                      attemptReconnection();
                    } else {
                      toast.error("Socket not initialized");
                    }
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600"
                >
                  Reconnect
                </button>
              )}
              
              {!chatId && (
                <button 
                  onClick={() => {
                    fetchChat();
                    toast.loading("Initializing chat...");
                  }}
                  className="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600"
                >
                  Initialize Chat
                </button>
              )}

              {isConnected && chatId && (
          <button 
                  onClick={() => {
                    // Force join the chat room
                    socket.emit('joinChat', { chatId });
                    toast.success("Rejoined chat room");
                  }}
                  className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600"
                >
                  Rejoin Room
          </button>
              )}
            </div>
          </div>
          
          {!isConnected && (
            <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
              Not connected to the server. Please use the Reconnect button above or refresh the page.
            </div>
          )}
          
          {!chatId && isConnected && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200">
              No chat initialized. If you're a mentor, use the Initialize Chat button. If you're a mentee, wait for your mentor to start the chat.
            </div>
          )}
          
          {showDetails && (
            <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded border border-gray-200">
              <div><strong>Socket ID:</strong> {socket?.id || 'Not connected'}</div>
              <div><strong>Chat ID:</strong> {chatId || 'Not initialized'}</div>
              <div><strong>Status:</strong> {loading ? 'Loading' : error ? 'Error' : reconnecting ? 'Reconnecting' : 'Ready'}</div>
              <div><strong>Messages:</strong> {messages.length}</div>
              <div><strong>User:</strong> {user?.name} ({userRole})</div>
              <div><strong>Partner:</strong> {partnerName} ({partnerRole})</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="p-0 overflow-hidden h-full flex flex-col">
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">
            {partnerName ? `Chat with ${partnerName}` : 'Chat'}
          </h2>
          <div className="text-sm opacity-80 flex items-center mt-1">
            {isConnected ? (
              <span className="flex items-center">
                <Wifi className="h-4 w-4 mr-1" /> Connected
              </span>
            ) : (
              <span className="flex items-center text-red-200">
                <WifiOff className="h-4 w-4 mr-1" /> Disconnected
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <ConnectionTestButton 
            testVideo={false}
            onComplete={(results) => {
              if (results.socket?.success) {
                toast.success('Chat connection verified');
                // If we were in an error state, try fetching chat again
                if (error) {
                  tryAgain();
                }
              }
            }}
          />
          
          {!isConnected && (
            <Button 
              onClick={() => window.location.reload()} 
              size="sm"
              variant="secondary"
              className="bg-blue-500 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-1" /> Reconnect
            </Button>
          )}
          <Button 
            onClick={endChat} 
            size="sm"
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
            disabled={!isConnected || !chatId}
          >
            End Chat
          </Button>
        </div>
      </div>

      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 bg-gray-50"
      >
        {/* Show date sections and messages */}
        {Object.entries(groupMessagesByDate(messages)).map(([date, dateMessages]) => (
          <div key={date}>
            <div className="flex justify-center my-4">
              <span className="bg-neutral-100 text-neutral-600 text-xs px-3 py-1 rounded-full">
                {formatMessageDate(date)}
              </span>
            </div>
            
            {dateMessages.map((message, index) => {
              const isOwn = message.sender === user._id;
              const isFirst = index === 0 || dateMessages[index - 1].sender !== message.sender;
              const showAvatar = isFirst;
              const isLastMessage = index === messages.length - 1;
              
              return (
                <Message 
                  key={message._id}
                  message={message}
                  isOwn={isOwn}
                  isFirst={isFirst}
                  showAvatar={showAvatar && !isOwn}
                  isRead={isLastMessage && isOwn && message.status === 'read'}
                  isDelivered={isLastMessage && isOwn && message.status === 'delivered'}
                  partnerName={partnerName}
                  partnerImage={recipient?.profileImage}
                />
              );
            })}
          </div>
        ))}
        
        {messages.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <MessageSquare className="h-16 w-16 text-neutral-300 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">No messages yet</h3>
            <p className="text-neutral-500 max-w-sm">
              Start the conversation by typing a message below.
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {isConnected === false || !chatId ? <DiagnosticHelper /> : null}

      <form 
        onSubmit={handleSendMessage} 
        className="p-4 border-t bg-white flex items-center"
      >
        {console.log("Send button state:", {
          messageEmpty: !newMessage.trim(), 
          isConnected, 
          chatId, 
          reconnecting,
          shouldBeEnabled: newMessage.trim() && isConnected && chatId
        })}
          <Input
          ref={inputRef}
          type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          placeholder={!isConnected ? "Reconnecting..." : !chatId ? "Initializing chat..." : "Type your message..."}
          className="flex-1 mr-2"
          disabled={false}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (isConnected && chatId) {
                handleSendMessage(e);
              } else if (!isConnected) {
                toast.error("Not connected. Please wait for connection to be restored.");
              } else if (!chatId) {
                toast.error("Chat not initialized. Please wait a moment.");
              }
            }
          }}
          autoFocus
          />
          <Button 
            type="submit"
          disabled={!newMessage.trim()}
          onClick={(e) => {
            if (!isConnected) {
              e.preventDefault();
              toast.error("Not connected. Please reconnect first.");
              return;
            }
            
            if (!chatId) {
              e.preventDefault();
              toast.error("Chat not initialized. Please wait a moment.");
              return;
            }
            
            handleSendMessage(e);
          }}
            className="bg-blue-600 hover:bg-blue-700"
          >
          {!isConnected ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          </Button>
      </form>
    </Card>
  );
};

export default ChatComponent; 