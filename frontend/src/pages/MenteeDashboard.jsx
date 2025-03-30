import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useToast } from "../components/ui/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import VideoCall from "../components/VideoCall";
import TaskManager from "../components/TaskManager";
import SessionTracker from "../components/SessionTracker";
import { format } from "date-fns";
import { CometChat } from "@cometchat-pro/chat";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import ChatComponent from "../components/Chat/ChatComponent";
import { toast } from "react-hot-toast";
import axios from "axios";
import TroubleshootingModal from "../components/TroubleshootingModal";
import { MessageCircle, Video, X, Phone, Wifi, AlertCircle, Loader2, Search, RefreshCw, MessageSquare, Mail } from "lucide-react";
import 'react-circular-progressbar/dist/styles.css';
import ChatDebugger from "../components/Chat/ChatDebugger";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import GoalTracker from "../components/GoalTracker";
import { Input } from "../components/ui/input";
import SessionList from "../components/SessionList";  // New import
import { Avatar } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";

// Custom CSS for notification animations
const notificationStyles = `
  @keyframes pulse-border {
    0% { border-color: rgba(220, 38, 38, 0.8); }
    50% { border-color: rgba(248, 113, 113, 0.4); }
    100% { border-color: rgba(220, 38, 38, 0.8); }
  }
  
  @keyframes highlight-animation {
    0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
    100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
  }
  
  .animate-pulse-border {
    animation: pulse-border 2s infinite;
  }
  
  .highlight-animation {
    animation: highlight-animation 2s ease-out;
  }
  
  .mentorship-status-banner.bg-red-100 {
    animation: pulse-border 2s infinite;
  }
`;

const MenteeDashboard = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { socket, isConnected, reconnect } = useSocket();
  const { toast } = useToast();
  const [mentor, setMentor] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [chatNotifications, setChatNotifications] = useState(0);
  const [callNotifications, setCallNotifications] = useState(false);
  const [goals, setGoals] = useState([]);
  const [approachingGoals, setApproachingGoals] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootingIssue, setTroubleshootingIssue] = useState('');
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callRingtone, setCallRingtone] = useState(null);
  const [showSocketDebugger, setShowSocketDebugger] = useState(false);
  const [mentorshipStatus, setMentorshipStatus] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredChats, setFilteredChats] = useState([]);
  const { chatId: routeChatId } = useParams();
  
  const apiUrl = import.meta.env.VITE_API_URL || "";

  useEffect(() => {
    // Request notification permissions when the component mounts
    // and then handle the saved mentorship status
    requestNotificationPermission().then(permissionGranted => {
      // Check for saved mentorship status in localStorage
      const savedMentorshipStatus = localStorage.getItem('mentorshipStatus');
      if (savedMentorshipStatus) {
        try {
          const parsedStatus = JSON.parse(savedMentorshipStatus);
          // Only use saved status if it's less than 24 hours old
          const statusTime = new Date(parsedStatus.timestamp).getTime();
          const currentTime = new Date().getTime();
          const hoursDiff = (currentTime - statusTime) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            setMentorshipStatus(parsedStatus);
            // Show toast notification for the saved status
            const toastMessage = parsedStatus.status === 'accepted' 
              ? 'Your mentorship request was accepted!'
              : 'Your mentorship request was declined.';
            
            // Show a toast notification
            const toastType = parsedStatus.status === 'accepted' ? toast.success : toast.error;
            toastType(toastMessage, {
              duration: 5000,
              icon: parsedStatus.status === 'accepted' ? '🎉' : '😞'
            });
            
            // Also show browser notification after page refresh if permission was granted
            if (permissionGranted) {
              if (parsedStatus.status === 'accepted') {
                showBrowserNotification('Mentorship Request Accepted', toastMessage);
              } else if (parsedStatus.status === 'rejected') {
                showBrowserNotification('Mentorship Request Rejected', toastMessage);
              }
              
              // Try to play notification sound
              try {
                const audio = new Audio('/sounds/notification.mp3');
                audio.play().catch(e => console.error('Could not play notification sound on refresh:', e));
              } catch (e) {
                console.error('Could not play notification sound on refresh:', e);
              }
            }
          } else {
            // Status is too old, clear it
            localStorage.removeItem('mentorshipStatus');
          }
        } catch (e) {
          console.error('Error parsing saved mentorship status:', e);
          localStorage.removeItem('mentorshipStatus');
        }
      }
    });
    
    fetchMentor();
    fetchGoals();
  }, []);

  // Fetch goals for the mentee
  const fetchGoals = async () => {
    if (!user || !token) return;
    
    try {
      const response = await axios.get(`${apiUrl}/api/goals/mentee/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGoals(response.data);
      
      // Check for goals approaching due date (within 3 days)
      const currentDate = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(currentDate.getDate() + 3);
      
      const approaching = response.data.filter(goal => {
        const dueDate = new Date(goal.dueDate);
        return dueDate > currentDate && dueDate <= threeDaysFromNow;
      });
      
      setApproachingGoals(approaching.length);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  // Separate useEffect for socket setup to ensure proper dependencies
  useEffect(() => {
    // Only setup socket listeners when user is authenticated AND socket is connected
    if (user && user._id && socket && isConnected) {
      console.log("User authenticated and socket connected - setting up listeners");
    setupSocketListeners();
    loginToCometChat();
    } else {
      console.log("Cannot setup socket listeners:", { 
        userAuthenticated: !!user && !!user._id,
        socketAvailable: !!socket,
        socketConnected: isConnected
      });
    }
  }, [user, socket, isConnected]);

  useEffect(() => {
    if (activeTab === "chat") {
      // Reset notification count when tab is opened
      setChatNotifications(0);
    }
    
    if (activeTab === "video-call") {
      // Reset call notification when tab is opened
      setCallNotifications(false);
    }
    
    if (activeTab === "goal-tracking") {
      // Refresh goals when the tab is opened
      fetchGoals();
      // Reset approaching goals notification when tab is opened
      setApproachingGoals(0);
    }
  }, [activeTab]);

  useEffect(() => {
    // Verify socket connection after initial setup
    if (socket && isConnected) {
      console.log("Socket connected and ready in MenteeDashboard");
    } else if (socket && !isConnected) {
      console.log("Socket instance exists but not connected, attempting reconnect...");
      reconnect();
    } else {
      console.log("No socket instance available in MenteeDashboard");
    }
  }, [socket, isConnected]);

  // Request permission for browser notifications
  const requestNotificationPermission = () => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return Promise.resolve(false);
    }
    
    // If permission is already granted, no need to ask again
    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted');
      return Promise.resolve(true);
    }
    
    // If permission wasn't denied, request it
    if (Notification.permission !== 'denied') {
      return Notification.requestPermission()
        .then(permission => {
          console.log('Notification permission:', permission);
          
          // Test notification to ensure it works after permission is granted
          if (permission === 'granted') {
            setTimeout(() => {
              try {
                new Notification('Notifications enabled', {
                  body: 'You will now receive notifications about mentorship updates',
                  icon: '/favicon.ico'
                });
              } catch (error) {
                console.error('Error showing test notification:', error);
              }
            }, 1000);
            return true;
          }
          return false;
        })
        .catch(error => {
          console.error('Error requesting notification permission:', error);
          return false;
        });
    }
    
    return Promise.resolve(false);
  };

  // Helper function to show browser notifications that handles errors
  const showBrowserNotification = (title, message) => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }
    
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: message,
          icon: '/favicon.ico'
        });
        
        // Log success
        console.log('Browser notification shown:', title);
        
        // Auto close after 5 seconds
        setTimeout(() => notification.close(), 5000);
        
        return true;
      } catch (error) {
        console.error('Error showing notification:', error);
        return false;
      }
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          try {
            const notification = new Notification(title, {
              body: message,
              icon: '/favicon.ico'
            });
            
            // Log success
            console.log('Browser notification shown after permission granted:', title);
            
            // Auto close after 5 seconds
            setTimeout(() => notification.close(), 5000);
            
            return true;
          } catch (error) {
            console.error('Error showing notification after permission granted:', error);
            return false;
          }
        }
      });
    }
    
    return false;
  };

  // Fetch assigned mentor details
  const fetchMentor = async () => {
    try {
      if (!user || !user._id || !token) {
        console.warn("Cannot fetch mentor: user not authenticated");
        return;
      }
      
      console.log("Fetching mentor connection for mentee:", user._id);
      
      // Call the mentees/:menteeId/mentors endpoint to get mentor with connection details
      const response = await axios.get(`${apiUrl}/api/mentees/${user._id}/mentors`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Mentor data response:", response.data);
      
      // Check if the response has data and contains at least one mentor
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Get the first mentor (in case there are multiple)
        const mentorData = response.data[0];
        console.log("Selected mentor data:", mentorData);
        
        // Mentor data already includes connectionId and startDate from the API
        setMentor(mentorData);
        
        // Attempt to register the mentor in CometChat for real-time communication
        try {
          if (mentorData._id && mentorData.name) {
            registerUserInCometChat(mentorData._id, mentorData.name);
          }
        } catch (cometChatError) {
          console.warn("CometChat registration error:", cometChatError);
        }
      } else {
        console.warn("No mentor connections found for this mentee");
        setMentor(null);
      }
    } catch (error) {
      console.error("Error fetching mentor:", error);
      toast.error("Failed to fetch mentor information");
    }
  };

  // Setup socket listeners for real-time notifications
  const setupSocketListeners = () => {
    if (!socket || !user) {
      console.error("Cannot setup socket listeners - missing socket or user");
      return;
    }
    
    console.log("Setting up socket listeners for mentee:", user._id);
    console.log("Socket connected:", !!socket.connected, "Socket ID:", socket.id);
    
    // Join the user's personal room for socket events
    const joinData = { userId: user._id };
    socket.emit('join', joinData);
    console.log("Emitted join event for mentee:", joinData);
    
    // Force a join to user's room with explicit room name
    const userRoom = `user_${user._id}`;
    socket.emit('join-room', { room: userRoom });
    console.log("Also joining explicit room:", userRoom);
    
    // Emit a user-online event to update the server's user tracking
    socket.emit('user-online', { 
      userId: user._id,
      userType: 'mentee', 
      timestamp: new Date().toISOString()
    });
    console.log("Emitted user-online event");

    // First, remove any existing listeners to prevent duplicates
    socket.off("video-offer");
    socket.off("newMessage");
    socket.off("newMessageNotification");
    socket.off("newTask");
    socket.off("chatSessionEnded");
    socket.off("mentorshipRequestUpdate");
    socket.off("notification");
    socket.off("error");
    
    // Listen for general notifications
    socket.on("notification", (notification) => {
      console.log("Received general notification:", notification);
      
      // Handle different notification types
      switch (notification.type) {
        case 'mentorship_request':
          console.log("Received mentorship request notification via general channel");
          // Forward to specific handler if needed
          if (notification.status === 'rejected') {
            toast.error(notification.message, {
              duration: 10000,
              icon: '❌'
            });
          }
          break;
          
        case 'connection_update':
          toast.info(notification.message, {
            duration: 5000,
            icon: '🔄'
          });
          break;
          
        default:
          // Generic notification handling
          if (notification.level === 'error') {
            toast.error(notification.message);
          } else if (notification.level === 'warning') {
            toast.warning(notification.message);
          } else {
            toast.info(notification.message);
          }
      }
    });
    
    // Listen for mentorship request updates - Improved handling for better notification display
    socket.on("mentorshipRequestUpdate", (data) => {
      console.log("📢 RECEIVED MENTORSHIP REQUEST UPDATE:", data);
      console.log("Status:", data.status);
      console.log("Message:", data.message);
      console.log("Rejection details:", data.rejectionDetails);
      
      // Save the notification to localStorage
      const mentorshipStatus = {
        status: data.status,
        message: data.message,
        timestamp: data.timestamp || new Date().toISOString(),
        alertType: data.alertType || (data.status === 'accepted' ? 'success' : 'error'),
        priority: data.priority || 'normal',
        actionRequired: data.actionRequired || false,
        rejectionDetails: data.rejectionDetails || null
      };

      console.log("Saving mentorship status to state and localStorage:", mentorshipStatus);
      
      try {
        // First save to localStorage to ensure persistence
        localStorage.setItem('mentorshipStatus', JSON.stringify(mentorshipStatus));
        
        // Then update state - use a callback to ensure we're not depending on stale state
        setMentorshipStatus(() => mentorshipStatus);
        
        console.log("State and localStorage updated with notification:", mentorshipStatus.status);
        
        // Force a re-render by using a small timeout
        setTimeout(() => {
          console.log("Verifying mentorshipStatus was updated:", mentorshipStatus);
          // Double-check if the state was updated correctly
          if (!document.querySelector('.mentorship-status-banner')) {
            console.warn("Mentorship status banner not found after update, forcing re-render");
            setMentorshipStatus(prevState => {
              console.log("Forcing re-render with prev state:", prevState);
              return {...mentorshipStatus};
            });
          } else {
            console.log("Mentorship status banner found in DOM");
          }
        }, 500);
        
        // Track the notification display on the page
        window.hasRejectionNotification = data.status === 'rejected';
      } catch (error) {
        console.error("Error saving mentorship notification:", error);
        // Fallback: at least try to update the state if localStorage fails
        setMentorshipStatus(mentorshipStatus);
      }
      
      // Display toast notification
      if (data.status === 'accepted') {
        toast.success(data.message, {
          duration: 8000,
          icon: '😊',
          style: {
            border: '1px solid #4CAF50',
            padding: '16px',
            color: '#4CAF50',
            backgroundColor: '#f0fff0',
          },
        });
        
        // Try to play notification sound
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(e => {
            console.error('Could not play notification sound:', e);
            // Create a fallback sound using Audio API
            try {
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.type = 'sine';
              oscillator.frequency.value = 800; // Hz
              gainNode.gain.value = 0.3; // volume
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.start();
              
              // Play for 500ms then stop
              setTimeout(() => {
                oscillator.stop();
                audioContext.close();
              }, 500);
            } catch (fallbackError) {
              console.error('Could not play fallback sound:', fallbackError);
            }
          });
        } catch (e) {
          console.error('Could not play notification sound:', e);
        }
      } else if (data.status === 'rejected') {
        // More prominent notification for rejections
        const rejectionReason = data.rejectionDetails?.reason ? 
          `\n\nReason: "${data.rejectionDetails.reason}"` : '';
          
        console.log("Showing rejection notification with reason:", rejectionReason);
        
        // Display a more attention-grabbing toast for rejections 
        toast.error(`${data.message}${rejectionReason}`, {
          duration: 15000,
          icon: '❌',
          style: {
            border: '3px solid #FF5252',
            padding: '16px',
            color: '#c62828',
            backgroundColor: '#fff8f8',
            fontWeight: 'bold',
            fontSize: '1.05em',
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          },
        });
        
        // Try to play notification sound for rejection - make it more prominent
        try {
          const audio = new Audio('/sounds/notification.mp3');
          
          // Add error handling for missing file
          audio.onerror = () => {
            console.log('Could not load notification.mp3, using fallback sound');
            try {
              // Create a more attention-grabbing sound for rejection
              const audioContext = new (window.AudioContext || window.webkitAudioContext)();
              const oscillator = audioContext.createOscillator();
              const gainNode = audioContext.createGain();
              
              oscillator.type = 'sine';
              oscillator.frequency.value = 400; // Hz - lower tone for rejection
              gainNode.gain.value = 0.5; // Increased volume for rejections
              
              oscillator.connect(gainNode);
              gainNode.connect(audioContext.destination);
              
              oscillator.start();
              
              // Play pattern of 2 beeps
              setTimeout(() => {
                oscillator.frequency.value = 350;
              }, 200);
              
              setTimeout(() => {
                oscillator.stop();
                audioContext.close();
              }, 600);
            } catch (fallbackError) {
              console.error('Could not play fallback sound:', fallbackError);
            }
          };
          
          // Play twice for emphasis on rejection
          audio.play().catch(e => console.error('Could not play notification sound:', e));
          setTimeout(() => {
            audio.currentTime = 0;
            audio.play().catch(e => console.error('Could not play notification sound (repeat):', e));
          }, 700);
        } catch (e) {
          console.error('Could not play notification sound:', e);
        }
        
        // For high priority rejections, also show an alert after a brief delay to ensure the user sees it
        if (data.priority === 'high') {
          setTimeout(() => {
            alert(`IMPORTANT: Your mentorship request has been rejected.\n${rejectionReason ? 'Reason: ' + data.rejectionDetails.reason : ''}\n\nYou can find other mentors who might be a better fit.`);
          }, 1000);
        }
        
        // Request permission and show browser notification
        requestNotificationPermission().then(permissionGranted => {
          if (permissionGranted) {
            showBrowserNotification('Mentorship Request Rejected', data.message);
          }
        });
        
        // Force check UI update again after 1 second to really make sure it's displayed
        setTimeout(() => {
          if (!document.querySelector('.mentorship-status-banner')) {
            console.warn("Banner still not visible after 1 second, forcing another update");
            setMentorshipStatus(currentStatus => {
              if (currentStatus && currentStatus.status === 'rejected') {
                return {...currentStatus};
              }
              return mentorshipStatus; // Use the one we just created
            });
          }
        }, 1000);
      }
    });
    
    console.log("Registering video-offer handler");
    
    // Handle incoming video call offers
    socket.on("video-offer", (data) => {
      console.log("🔴 MENTEE: Received video call offer:", data);
      alert("Incoming video call from " + (data.callerName || "your mentor"));
      
      setCallNotifications(true);
      
      // Display a prominent incoming call UI
      setIncomingCall({
        callId: data.callId,
        callerId: data.callerId,
        callerName: data.callerName,
        timestamp: data.timestamp
      });
      
      // Also show a toast notification
      toast.success(`Incoming video call from ${data.callerName}`, {
        duration: 60000, // Keep notification visible longer
        action: {
          label: "Answer",
          onClick: () => {
            handleAcceptCall(data);
          }
        },
        id: 'video-call-notification' // Use ID to prevent duplicate toasts
      });
      
      // Play ringtone for incoming call (use a built-in sound to avoid file dependency)
      try {
        // Create a simple beep tone using Audio API instead of loading an external file
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Hz
        gainNode.gain.value = 0.3; // volume
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        // Store a cleanup function instead of the audio object
        setCallRingtone(() => {
          return () => {
            oscillator.stop();
            audioContext.close();
          };
        });
        
        // Set up a repeating pattern
        const beepInterval = setInterval(() => {
          oscillator.frequency.value = oscillator.frequency.value === 800 ? 600 : 800;
        }, 500);
        
        // Update the cleanup function to also clear the interval
        setCallRingtone(() => {
          return () => {
            oscillator.stop();
            audioContext.close();
            clearInterval(beepInterval);
          };
        });
      } catch (error) {
        console.error("Failed to play ringtone:", error);
      }
    });

    // Updated handler for newMessage - only manage notifications 
    // Let ChatComponent handle the actual messages
    socket.on("newMessage", (data) => {
      console.log("Received new message notification:", data);
      
      // Only increment counter if not already on chat tab
      if (activeTab !== "chat") {
        setChatNotifications(prev => prev + 1);
        
        // Show toast notification about the new message
        toast.success(`New message from ${data.senderName || 'your mentor'}`, {
          duration: 3000,
          action: {
            label: "View",
            onClick: () => {
              navigate("/chat");
            }
          }
        });
      }
    });

    // Also listen for newMessageNotification events for notification purposes
    socket.on("newMessageNotification", (data) => {
      console.log("Received new message notification:", data);
      
      // Check if we're already on the chat tab and viewing the same chat
      if (activeTab === "chat" && selectedChatId === data.chatId) {
        // No need to show a notification if user is already viewing this chat
        return;
      }
      
      // Update chat notifications with the new message count
      setChatNotifications(prev => {
        const newCounts = {...prev};
        newCounts[data.chatId] = (newCounts[data.chatId] || 0) + 1;
        return newCounts;
      });
      
      // Play notification sound
      try {
        const audio = new Audio('/message-notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Could not play notification sound:', e));
      } catch (err) {
        console.error('Error playing notification sound:', err);
      }
      
      // Show toast notification
      toast.success(`New message from ${data.senderName || 'your mentor'}: ${data.text || ''}`, {
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            navigate(`/chat${data.chatId ? `/${data.chatId}` : ''}`);
          }
        }
      });
      
      // Show browser notification if permission granted and page not in focus
      if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        new Notification('New message', {
          body: `${data.senderName || 'Your mentor'}: ${data.text || ''}`,
          icon: '/favicon.ico'
        });
      }
      
      // Refresh chat list to show the latest message
      if (chats.length > 0) {
        fetchAllChats();
      }
    });

    // Handle new task assignments
    socket.on("newTask", (task) => {
      toast.success(`New task assigned: ${task.title}`, {
        duration: 5000,
        action: {
          label: "View",
          onClick: () => {
            setActiveTab("tasks");
          }
        }
      });
    });

    // Add a handler for chat session ended event
    socket.on("chatSessionEnded", (data) => {
      console.log("Chat session ended:", data);
      toast.info(`Chat session ended by ${data.endedBy}`, {
        icon: '🔚',
      });
    });

    // Add a handler for errors
    socket.on("error", (error) => {
      console.error("Socket error:", error);
      toast.error(`Connection error: ${error.message || 'Unknown error'}`);
    });

    // Handle connection updates
    socket.on("connectionUpdate", (data) => {
      console.log(`Connection updated:`, data);
    });

    // Clean up event listeners when component unmounts
    return () => {
      console.log("Cleaning up socket listeners for mentee");
      socket.off("video-offer");
      socket.off("newMessage");
      socket.off("newMessageNotification");
      socket.off("newTask");
      socket.off("chatSessionEnded");
      socket.off("mentorshipRequestUpdate");
      socket.off("notification");
      socket.off("error");
    };
  };

  // Register user in CometChat for real-time communication
  const registerUserInCometChat = (uid, name) => {
    if (!uid || !name) {
      console.warn("Cannot register user in CometChat: missing uid or name");
      return;
    }
    
    // Check if AUTH_KEY exists
    const authKey = import.meta.env.VITE_COMETCHAT_AUTH_KEY;
    if (!authKey) {
      // Silently fail without error logging in console
      return;
    }
    
    const user = new CometChat.User(uid);
    user.setName(name);

    CometChat.createUser(user, authKey).then(
      () => console.log(`User ${name} registered in CometChat`),
      (error) => {
        // Only log non-duplicate errors and only in development
        if (error.code !== "ERR_ALREADY_EXISTS" && import.meta.env.DEV) {
          console.warn("CometChat Registration not completed. Make sure AUTH_KEY is valid.");
        }
      }
    );
  };

  // CometChat login for mentee
  const loginToCometChat = () => {
    if (!user || !user._id) return;
    
    const authKey = import.meta.env.VITE_COMETCHAT_AUTH_KEY;
    if (!authKey) {
      console.error("CometChat auth key not found in environment variables");
      return;
    }
    
      CometChat.login(user._id, authKey)
        .then(() => {
          console.log("CometChat Login Successful!");
        })
        .catch((error) => {
          console.error("CometChat Login Failed", error);
        });
  };

  const handleAcceptCall = (callData) => {
    try {
      // Stop ringtone if it's playing
      if (callRingtone) {
        callRingtone(); // Call the cleanup function
        setCallRingtone(null);
      }
      
      // Clear toast notification
      toast.dismiss('video-call-notification');
      
      // Check if socket is initialized and connected
      if (!socket) {
        toast.error("Unable to connect to server. Please refresh the page.");
        setTroubleshootingIssue('socket_disconnected');
        setShowTroubleshooting(true);
        handleRejectCall(callData);
        return;
      }

      if (!isConnected) {
        toast.loading("Reconnecting to server...");
        setTroubleshootingIssue('reconnecting');
        
        // Try to reconnect if we have the reconnect function
        if (typeof reconnect === 'function') {
          reconnect();
          
          // Wait for reconnection and check again
          setTimeout(() => {
            if (isConnected) {
              toast.success("Connection restored");
              // Continue with accepting call after successful reconnection
              proceedWithCallAcceptance(callData);
            } else {
              toast.error("Unable to connect to server. Please refresh the page.");
              setTroubleshootingIssue('socket_disconnected');
              setShowTroubleshooting(true);
              handleRejectCall(callData);
            }
          }, 3000);
          
          return;
        } else {
          toast.error("Socket connection failed. Please refresh the page.");
          setTroubleshootingIssue('socket_disconnected');
          setShowTroubleshooting(true);
          handleRejectCall(callData);
          return;
        }
      }
      
      // If socket is connected, proceed with accepting the call
      proceedWithCallAcceptance(callData);
      
    } catch (error) {
      console.error("Error accepting video call:", error);
      toast.error("Failed to accept video call. Please try again.");
      setTroubleshootingIssue('call_failed');
      setShowTroubleshooting(true);
      handleRejectCall(callData);
    }
  };
  
  // Function to handle the actual call acceptance
  const proceedWithCallAcceptance = (callData) => {
    console.log("Accepting video call:", callData);
    
    // Emit accept call event to the server
    if (socket && isConnected) {
      socket.emit("accept-call", {
        callId: callData.callId,
        recipientId: callData.callerId
      });
    }
    
    // Set the active call state
    setActiveCall({
      callId: callData.callId,
      recipientId: callData.callerId,
      recipientName: callData.callerName
    });
    
    // Clear incoming call notification
    setIncomingCall(null);
    setCallNotifications(false);
    
    toast.success(`Joining video call with ${callData.callerName}`);
  };

  const handleRejectCall = (callData) => {
    // Stop ringtone if it's playing
    if (callRingtone) {
      callRingtone(); // Call the cleanup function
      setCallRingtone(null);
    }
    
    // Clear toast notification
    toast.dismiss('video-call-notification');
    
    if (socket && isConnected) {
      console.log("Rejecting call:", callData);
      socket.emit("reject-call", {
        callId: callData.callId,
        recipientId: callData.callerId,
        reason: "Call declined by user"
      });
    }
    
    // Clear all call states
    setIncomingCall(null);
    setCallNotifications(false);
    toast.success("Call declined");
  };

  const handleEndCall = () => {
    console.log("Ending active call");
    setActiveCall(null);
  };

  const initiateVideoCall = (mentorData) => {
    if (!mentorData || !mentorData._id) {
      toast.error("Cannot initiate call: Missing mentor information");
      return;
    }
    
    setIsInitiatingCall(true);
    
    // Check if the socket is initialized
    if (!socket) {
      toast.error("Connection error: Socket not initialized");
      setIsInitiatingCall(false);
      return;
    }
    
    // Make sure the socket is connected before proceeding
    if (!isConnected) {
      toast.loading("Checking connection status...", { id: "connection-check" });
      
      // Try to reconnect the socket
      if (reconnect) {
        reconnect();
      }
      
      // Wait for reconnection attempt
      setTimeout(() => {
        if (socket && socket.connected) {
          toast.success("Connection established", { id: "connection-check" });
          proceedWithVideoCall(mentorData);
        } else {
          toast.error("Unable to connect to the server. Please try again later.", { id: "connection-check" });
          setTroubleshootingIssue('socket_disconnected');
          setShowTroubleshooting(true);
          setIsInitiatingCall(false);
        }
      }, 3000);
      
      return;
    }
    
    // Socket is connected, proceed with call
    proceedWithVideoCall(mentorData);
  };

  // New helper function to handle actual call initialization
  const proceedWithVideoCall = (mentorData) => {
    try {
      const callId = `call-${Date.now()}-${user._id}-${mentorData._id}`;
      
      // Set up the call in the UI
      setActiveTab("video-call");
      setActiveCall({
        callId,
        recipientId: mentorData._id,
        recipientName: mentorData.name
      });
      
      // Emit call signal to the mentor
      if (socket && socket.connected) {
        socket.emit("video-offer", {
          callId: callId,
          callerId: user._id,
          callerName: user.name,
          recipientId: mentorData._id,
          recipientName: mentorData.name,
          timestamp: new Date().toISOString(),
          offer: {} // Empty offer placeholder
        });
        
        // Check if the event was actually emitted
        if (!socket.connected) {
          throw new Error("Socket disconnected while sending offer");
        }
        
        toast.success(`Calling ${mentorData.name}...`);
      } else {
        throw new Error("Socket not connected");
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error(`Failed to initiate call: ${error.message}`);
      setTroubleshootingIssue('call_failed');
      setShowTroubleshooting(true);
      setActiveCall(null);
    }
    
    setIsInitiatingCall(false);
  };

  const formatMessageTime = (timestamp) => {
    return format(new Date(timestamp), "h:mm a");
  };

  const handleChatWithMentor = async (mentor) => {
    if (!mentor || !mentor._id) {
      toast.error("Mentor information is missing");
      return;
    }
    
    // Navigate to the chat page with the mentor's ID
    navigate(`/chat/${mentor._id}`);
  };

  // If there's an incoming call, show the incoming call UI
  if (incomingCall && !activeCall) {
  return (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 bg-white rounded-xl shadow-2xl">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center animate-pulse">
              <Phone className="h-10 w-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl font-bold mb-1">Incoming Video Call</h2>
            <p className="text-lg mb-3">from {incomingCall.callerName}</p>
            
            <div className="flex gap-4 mt-6">
              <Button 
                onClick={() => handleRejectCall(incomingCall)} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <X className="h-5 w-5 mr-2" />
                Decline
              </Button>
              
              <Button 
                onClick={() => handleAcceptCall(incomingCall)} 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <Video className="h-5 w-5 mr-2" />
                Accept
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Show the active video call view when a call is in progress
  if (activeCall) {
    return (
      <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
        <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
          <h2 className="text-xl font-bold text-white">Video Call with {activeCall.recipientName}</h2>
          <Button 
            onClick={handleEndCall} 
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            End Call
          </Button>
        </div>
        <div className="flex-1 w-full">
          <VideoCall
            callId={activeCall.callId}
            recipientId={activeCall.recipientId}
            recipientName={activeCall.recipientName}
            onEndCall={handleEndCall}
          />
        </div>
      </div>
    );
  }

  // Function to clear mentorship status notifications
  const clearMentorshipNotification = () => {
    console.log("Clearing mentorship notification");
    
    // Clear from state
    setMentorshipStatus(null);
    
    // Clear from localStorage
    localStorage.removeItem('mentorshipStatus');
    
    // Clear window tracking variable
    window.hasRejectionNotification = false;
    
    // Add a toast to confirm dismissal
    toast.success("Notification dismissed", {
      duration: 2000,
      icon: '✓',
    });
    
    console.log("Mentorship notification cleared");
  };

  // Testing function to simulate receiving a mentorship notification
  const simulateMentorshipNotification = (status = 'accepted', options = {}) => {
    console.log(`📣 Simulating ${status} mentorship notification...`);
    
    // Create a realistic test notification message
    let message, alertType, priority, rejectionDetails = null;
    
    if (status === 'accepted') {
      message = 'Your mentorship request has been accepted! You can now chat with your mentor.';
      alertType = 'success';
      priority = 'high';
    } else {
      const reason = options.reason || 'The mentor is currently at maximum capacity and cannot take new mentees at this time.';
      message = `Your mentorship request has been declined by ${options.mentorName || 'the mentor'}. You may submit a new request to another mentor or try again later.`;
      alertType = 'error';
      priority = 'high';
      rejectionDetails = { reason };
    }
    
    const notificationData = {
      type: 'mentorship_request',
      status: status,
      timestamp: new Date().toISOString(),
      message: message,
      alertType: alertType,
      priority: priority,
      actionRequired: status === 'rejected',
      rejectionDetails: rejectionDetails,
      mentorName: options.mentorName || 'Test Mentor'
    };
    
    console.log("Creating simulated notification with data:", notificationData);
    
    // First update state directly to ensure the UI updates
    setMentorshipStatus({
      status: notificationData.status,
      message: notificationData.message,
      timestamp: notificationData.timestamp,
      alertType: notificationData.alertType,
      priority: notificationData.priority,
      actionRequired: notificationData.actionRequired,
      rejectionDetails: notificationData.rejectionDetails
    });
    
    // Then save to localStorage for persistence
    localStorage.setItem('mentorshipStatus', JSON.stringify(notificationData));
    
    // Add window tracking variable for debugging
    window.hasRejectionNotification = status === 'rejected';
    
    console.log("State and localStorage updated with notification data");
    
    // Verify the notification banner appears
    setTimeout(() => {
      const bannerExists = !!document.querySelector('.mentorship-status-banner');
      console.log("Verification: notification banner exists =", bannerExists);
      
      if (!bannerExists) {
        console.warn("Banner not showing after simulation, forcing re-render");
        setMentorshipStatus(prevState => ({...prevState}));
        
        // Try one more time after a delay if still not visible
        setTimeout(() => {
          if (!document.querySelector('.mentorship-status-banner')) {
            console.warn("Banner still not visible, making final attempt to show it");
            // Force a complete refresh of the state with new object
            setMentorshipStatus(null);
            setTimeout(() => setMentorshipStatus(JSON.parse(localStorage.getItem('mentorshipStatus'))), 50);
          }
        }, 500);
      }
    }, 200);
    
    // Show toast notification
    if (status === 'accepted') {
      toast.success(notificationData.message, {
        duration: 10000,
        icon: '🎉',
        position: 'top-center',
        style: {
          borderRadius: '10px',
          background: '#22c55e',
          color: '#fff',
          padding: '16px',
          fontWeight: 'bold'
        }
      });
      
      // Request permission and show browser notification
      requestNotificationPermission().then(permissionGranted => {
        if (permissionGranted) {
          showBrowserNotification('Mentorship Request Accepted', notificationData.message);
        }
      });
    } else {
      // Get rejection reason for display
      const rejectionReason = notificationData.rejectionDetails?.reason ? 
        `\n\nReason: "${notificationData.rejectionDetails.reason}"` : '';
      
      // Show a more prominent notification for rejected requests
      toast.error(`${notificationData.message}${rejectionReason}`, {
        duration: 15000,
        icon: '❌',
        position: 'top-center',
        style: {
          borderRadius: '10px',
          background: '#fee2e2',
          color: '#b91c1c',
          padding: '16px',
          border: '3px solid #ef4444',
          fontWeight: 'bold',
          fontSize: '1.05em',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        },
        action: {
          label: "Find Mentors",
          onClick: () => navigate('/mentor-matching')
        }
      });
      
      // Add an alert to ensure the user sees the rejection in test mode
      if (notificationData.priority === 'high') {
        setTimeout(() => {
          alert(`IMPORTANT: Your mentorship request has been rejected.\n${rejectionReason ? 'Reason: ' + notificationData.rejectionDetails.reason : ''}\n\nCheck the dashboard for more information.`);
        }, 500);
      }
      
      // Request permission and show browser notification
      requestNotificationPermission().then(permissionGranted => {
        if (permissionGranted) {
          showBrowserNotification('Mentorship Request Rejected', notificationData.message);
        }
      });
    }
    
    console.log('Simulation complete, notification should be visible');
  };

  // FOR TESTING: Add a function to simulate an incoming call
  const simulateIncomingCall = () => {
    console.log("Simulating incoming call");
    
    // Create test call data
    const testCallData = {
      callId: `test-call-${Date.now()}`,
      callerId: mentor ? mentor._id : "test-mentor-id",
      callerName: mentor ? mentor.name : "Test Mentor",
      timestamp: new Date().toISOString()
    };
    
    // Display the incoming call UI
    setIncomingCall(testCallData);
    setCallNotifications(true);
    
    // Play ringtone
    try {
      // Create a simple beep tone using Audio API
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 800; // Hz
      gainNode.gain.value = 0.3; // volume
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start();
      
      // Store a cleanup function
      setCallRingtone(() => {
        return () => {
          oscillator.stop();
          audioContext.close();
        };
      });
      
      // Set up a repeating pattern
      const beepInterval = setInterval(() => {
        oscillator.frequency.value = oscillator.frequency.value === 800 ? 600 : 800;
      }, 500);
      
      // Update the cleanup function to also clear the interval
      setCallRingtone(() => {
        return () => {
          oscillator.stop();
          audioContext.close();
          clearInterval(beepInterval);
        };
      });
    } catch (error) {
      console.error("Failed to play ringtone:", error);
    }
    
    // Show toast notification
    toast.success(`Incoming video call from ${testCallData.callerName}`, {
      duration: 60000,
      action: {
        label: "Answer",
        onClick: () => handleAcceptCall(testCallData)
      },
      id: 'video-call-notification'
    });
    
    // Show browser notification for incoming call
    showBrowserNotification('Incoming video call', `${testCallData.callerName} is calling you`);
  };

  // Add a function to force reload the mentorship notification with clean state
  const forceReloadMentorshipNotification = () => {
    console.log("Forcing clean reload of mentorship notification from localStorage");
    
    // First clear state to ensure clean reload
    setMentorshipStatus(null);
    
    // After a short delay, reload from localStorage
    setTimeout(() => {
      const saved = localStorage.getItem('mentorshipStatus');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          console.log("Retrieved notification data:", parsed);
          
          // Check for valid timestamp
          if (!parsed.timestamp) {
            parsed.timestamp = new Date().toISOString();
            console.log("Added missing timestamp to notification");
          }
          
          // Set state with the parsed data
          setMentorshipStatus(parsed);
          console.log(`Notification status loaded: ${parsed.status}`);
          
          // Check if banner appears after a brief delay
          setTimeout(() => {
            const bannerElement = document.querySelector('.mentorship-status-banner');
            if (bannerElement) {
              console.log("SUCCESS: Mentorship notification banner is visible");
              bannerElement.classList.add('highlight-animation');
              setTimeout(() => bannerElement.classList.remove('highlight-animation'), 2000);
            } else {
              console.error("FAILED: Mentorship notification banner not found in DOM after reload");
              
              // One last attempt - completely new object with restructured data
              const finalAttempt = {
                ...parsed,
                timestamp: new Date().toISOString(),
                _forceDisplay: true
              };
              
              setMentorshipStatus(finalAttempt);
              console.warn("Making final attempt with restructured notification object");
            }
          }, 200);
          
          toast.success("Reloaded notification from storage", {
            duration: 3000
          });
        } catch (e) {
          console.error("Error parsing saved notification:", e);
          toast.error("Failed to parse saved notification");
        }
      } else {
        console.warn("No saved notification found in localStorage");
        toast.error("No saved notification found", {
          description: "Try testing with one of the simulation buttons first"
        });
      }
    }, 100);
  };

  // Effect to check for saved mentorship status on each render - enhanced to handle edge cases
  useEffect(() => {
    if (!mentorshipStatus) {
      // Check if we have a saved status that should be displayed
      const savedStatus = localStorage.getItem('mentorshipStatus');
      if (savedStatus) {
        try {
          const parsedStatus = JSON.parse(savedStatus);
          // Only use saved status if it's less than 24 hours old
          const statusTime = parsedStatus.timestamp ? new Date(parsedStatus.timestamp).getTime() : new Date().getTime();
          const currentTime = new Date().getTime();
          const hoursDiff = (currentTime - statusTime) / (1000 * 60 * 60);
          
          if (hoursDiff < 24) {
            console.log("Found saved mentorship status, restoring:", parsedStatus);
            
            // If there's a rejection notification, log this more prominently
            if (parsedStatus.status === 'rejected') {
              console.log("%c⚠️ RESTORING REJECTION NOTIFICATION", "color: red; font-weight: bold; font-size: 14px");
            }
            
            setMentorshipStatus(parsedStatus);
            
            // Log the status of the notification banner for debugging
            setTimeout(() => {
              const bannerExists = !!document.querySelector('.mentorship-status-banner');
              console.log("After restoring saved status, banner exists:", bannerExists);
              
              // If banner still doesn't exist, try one more forced update
              if (!bannerExists) {
                console.warn("Banner still not showing, forcing one more update");
                setMentorshipStatus({...parsedStatus, _forceUpdate: Date.now()});
              }
            }, 100);
          } else {
            console.log("Found expired mentorship status, removing from localStorage");
            localStorage.removeItem('mentorshipStatus');
          }
        } catch (error) {
          console.error("Error parsing saved mentorship status:", error);
          localStorage.removeItem('mentorshipStatus');
        }
      }
    }
  }, [mentorshipStatus]);

  // Add this function to fetch all chats
  const fetchAllChats = async () => {
    if (!token) return;
    
    setLoadingChats(true);
    try {
      const response = await axios.get(`${apiUrl}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChats(response.data);
      setFilteredChats(response.data);
      
      // If there's a chat ID in the URL or from a mentor, select it
      if (routeChatId) {
        setSelectedChatId(routeChatId);
      } else if (response.data.length > 0 && !selectedChatId) {
        setSelectedChatId(response.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      toast.error("Failed to load your chats. Please try again.");
    } finally {
      setLoadingChats(false);
    }
  };

  // Add this function to handle chat selection
  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    // Reset notification count when a chat is selected
    setChatNotifications(prev => {
      const newCounts = {...prev};
      delete newCounts[chatId];
      return newCounts;
    });
  };

  // Add this function to get chat partner name
  const getChatPartnerName = (chat) => {
    if (!chat) return "Unknown";
    
    // As a mentee, we want to see the mentor's name
    return chat.mentor?.name || "Mentor";
  };

  // Add this useEffect to fetch chats when user opens the chat tab
  useEffect(() => {
    if (activeTab === "chat") {
      fetchAllChats();
    }
  }, [activeTab]);

  // Add this useEffect to handle search filtering
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredChats(chats);
      return;
    }
    
    const filtered = chats.filter(chat => {
      const partnerName = getChatPartnerName(chat).toLowerCase();
      return partnerName.includes(searchQuery.toLowerCase());
    });
    
    setFilteredChats(filtered);
  }, [searchQuery, chats]);

  // Function to handle the reception of a new message
  const handleNewMessage = (message) => {
    // Refresh the chat list to show the latest message
    fetchAllChats();
  };

  return (
    <div className="container mx-auto py-6">
      {/* Add custom CSS styles */}
      <style>{notificationStyles}</style>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold">Mentee Dashboard</h1>
          {mentor && (
            <span className="text-sm text-muted-foreground">
              Mentor: {mentor.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSocketDebugger(true)}
            className="flex items-center gap-2 text-xs bg-slate-100 hover:bg-slate-200"
          >
            <Wifi className={`h-3 w-3 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
            <span>Connection Status</span>
          </Button>
          
          {/* Test Buttons - only shown in development mode */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-100 rounded-md border border-gray-300">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Development Testing Tools</h3>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => socket ? 
                    (socket.connected ? alert('Socket Connected ✅') : alert('Socket exists but not connected ⚠️')) 
                    : alert('No socket instance ❌')
                  }
                  className="px-3 py-1 bg-gray-200 text-xs text-gray-700 rounded hover:bg-gray-300"
                >
                  Check Connection
                </button>
                
                <button 
                  onClick={() => simulateMentorshipNotification('accepted', { mentorName: 'John Doe' })}
                  className="px-3 py-1 bg-green-100 text-xs text-green-700 rounded hover:bg-green-200 font-bold"
                >
                  Test Accept Notification
                </button>
                
                <button 
                  onClick={() => simulateMentorshipNotification('rejected', { 
                    reason: 'I currently don\'t have availability for new mentees', 
                    // mentorName: 'Prince Kumar' 
                  })}
                  className="px-3 py-1 bg-red-100 text-xs text-red-700 rounded hover:bg-red-200 font-bold"
                >
                  Test Reject w/Reason
                </button>
                
                <button 
                  onClick={() => simulateMentorshipNotification('rejected', { mentorName: 'Alex Johnson' })}
                  className="px-3 py-1 bg-orange-100 text-xs text-orange-700 rounded hover:bg-orange-200"
                >
                  Test Reject (Default)
                </button>
                
                <button 
                  onClick={() => {
                    // Force reload display from localStorage using the dedicated function
                    forceReloadMentorshipNotification();
                  }}
                  className="px-3 py-1 bg-blue-100 text-xs text-blue-700 rounded hover:bg-blue-200 font-bold"
                >
                  Reload From Storage
                </button>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            onClick={logout}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Mentorship Status Banner - Enhanced for better visibility */}
      {mentorshipStatus && (
        <div className={`p-4 mb-6 rounded-md mentorship-status-banner ${
          mentorshipStatus.status === 'accepted' ? 'bg-green-100 border-green-400' : 
          mentorshipStatus.status === 'rejected' ? 'bg-red-100 border-red-400 animate-pulse-border shadow-lg' : 'bg-blue-100 border-blue-400'
        } border-2 shadow-md`}>
          {mentorshipStatus.status === 'accepted' && (
      <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold text-green-800">
                  <CheckCircleIcon className="h-5 w-5 inline mr-2" />
                  {mentorshipStatus.message || 'Your mentorship request has been accepted!'}
                </p>
                <p className="text-sm text-green-700 mt-1">You can now chat with your mentor and schedule sessions.</p>
        </div>
              <button 
                onClick={() => clearMentorshipNotification()} 
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Dismiss
              </button>
      </div>
          )}
          
          {mentorshipStatus.status === 'rejected' && (
            <div className="flex flex-col">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-red-800 text-lg">
                    <XCircleIcon className="h-6 w-6 inline mr-2" />
                    {mentorshipStatus.message || 'Your mentorship request has been declined.'}
                  </p>
                  
                  {/* Show rejection reason if provided */}
                  {mentorshipStatus.rejectionDetails?.reason && (
                    <p className="text-sm text-red-700 mt-2 border-l-3 border-red-400 pl-3 italic font-medium">
                      "{mentorshipStatus.rejectionDetails.reason}"
                    </p>
                  )}
                  
                  <p className="text-sm text-red-700 mt-3 font-medium">
                    Don't worry! You can find other mentors who might be a better fit for your goals.
                  </p>
                </div>
                <button 
                  onClick={() => clearMentorshipNotification()} 
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Dismiss
                </button>
              </div>
              
              <div className="mt-4 flex space-x-3">
                <button 
                  onClick={() => navigate('/mentor-matching')}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 text-sm font-medium"
                >
                  Find Other Mentors
                </button>
                <button 
                  onClick={() => clearMentorshipNotification()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 text-sm"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="goal-tracking" className="relative">
            Goal Tracking
            {approachingGoals > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {approachingGoals}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="chat" className="relative" onClick={() => navigate("/chat")}>
            Chat
            {chatNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {chatNotifications}
              </span>
            )}
          </TabsTrigger>
          {callNotifications && (
            <TabsTrigger value="video-call" className="relative animate-pulse bg-green-100">
              Incoming Call
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-3 h-3 flex items-center justify-center">
                •
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            {mentor && (
              <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 p-4 border-b border-primary-200">
                  <h3 className="text-lg font-semibold text-primary-900">Your Mentor Connection</h3>
                </div>
                <div className="p-5">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-5">
                    <div className="flex items-center gap-4">
                      <Avatar 
                        src={mentor?.profileImage}
                        name={mentor?.name || 'Your Mentor'}
                        alt={mentor?.name || 'Your Mentor'}
                        size="xl"
                        border={true}
                        borderColor="primary"
                        status={mentor?.mentorProfile?.availability ? 'online' : 'offline'}
                        statusPosition="bottom-right"
                      />
                      <div>
                        <h2 className="text-xl font-bold text-neutral-900">{mentor?.name || 'Your Mentor'}</h2>
                        <div className="text-sm text-neutral-600 mb-1">{mentor?.mentorProfile?.title || 'Mentor'}</div>
                        <div className="flex items-center text-xs text-neutral-500 mb-2">
                          <Mail className="h-3 w-3 mr-1" />
                          <span>{mentor?.email || 'No email available'}</span>
                        </div>
                        {mentor?.mentorProfile?.specializations && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {mentor.mentorProfile.specializations.slice(0, 3).map((spec, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {spec}
                              </Badge>
                            ))}
                            {mentor.mentorProfile.specializations.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{mentor.mentorProfile.specializations.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="md:ml-auto flex flex-col sm:flex-row gap-2 mt-4 md:mt-0 w-full md:w-auto">
                      <Button 
                        onClick={() => initiateVideoCall(mentor || {})}
                        disabled={!mentor}
                        className="w-full sm:w-auto"
                      >
                        <Video className="h-4 w-4 mr-2" />
                        Video Call
                      </Button>
                      
                      <Button 
                        variant="outline"
                        onClick={() => handleChatWithMentor(mentor || {})}
                        disabled={!mentor}
                        className="w-full sm:w-auto"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat
                      </Button>
                    </div>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-neutral-100">
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">Connection Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Connected Since</span>
                          <span className="font-medium">{mentor.startDate ? format(new Date(mentor.startDate), "PPP") : "Recently"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Connection ID</span>
                          <span className="font-medium text-xs bg-neutral-200 px-2 py-0.5 rounded">{mentor.connectionId || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-neutral-50 rounded-lg p-3">
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">Mentorship Stats</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Total Sessions</span>
                          <span className="font-medium">{mentor.totalSessions || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Availability</span>
                          <span className={`font-medium ${mentor?.mentorProfile?.availability ? 'text-green-600' : 'text-amber-600'}`}>
                            {mentor?.mentorProfile?.availability ? 'Available' : 'Unavailable'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {mentor?.mentorProfile?.bio && (
                    <div className="mt-4 bg-neutral-50 p-3 rounded-lg">
                      <h4 className="text-sm font-medium text-neutral-700 mb-2">About Your Mentor</h4>
                      <p className="text-sm text-neutral-600 line-clamp-3">{mentor.mentorProfile.bio}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
            
            {/* Goal Tracker Card */}
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-semibold text-lg">Track Your Goals</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Set learning goals and track your progress
                  </p>
                </div>
                <Button 
                  onClick={() => setActiveTab('goal-tracking')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  View All Goals
                </Button>
              </div>
              
              {/* Recent Goals Preview */}
              <div className="space-y-2 mt-2">
                {goals.length > 0 ? (
                  <>
                    <h4 className="text-sm font-medium">Recent Goals:</h4>
                    <div className="max-h-40 overflow-y-auto">
                      {goals.slice(0, 3).map(goal => (
                        <div key={goal._id} className="bg-white p-2 rounded flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium">{goal.title}</div>
                            <div className="text-xs text-gray-500">
                              Due: {format(new Date(goal.dueDate), "MMM dd, yyyy")}
                            </div>
                          </div>
                          <div className="w-8 h-8">
                            <CircularProgressbar
                              value={goal.progress || 0}
                              text={`${goal.progress || 0}%`}
                              styles={buildStyles({
                                textSize: '2rem',
                                pathColor: goal.progress < 30 ? '#EF4444' : goal.progress < 70 ? '#F59E0B' : '#10B981',
                                textColor: goal.progress < 30 ? '#EF4444' : goal.progress < 70 ? '#F59E0B' : '#10B981',
                              })}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {approachingGoals > 0 && (
                      <div className="bg-amber-50 p-2 rounded border border-amber-200 text-amber-800 text-sm">
                        <AlertCircle className="w-4 h-4 inline-block mr-1" />
                        You have {approachingGoals} goal{approachingGoals > 1 ? 's' : ''} due soon!
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>No goals created yet.</p>
                    <Button 
                      onClick={() => setActiveTab('goal-tracking')} 
                      variant="outline" 
                      className="mt-2"
                    >
                      Create Your First Goal
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          <TaskManager role="mentee" />
        </TabsContent>

        <TabsContent value="sessions">
          <SessionList 
            userId={user?._id} 
            userRole="mentee"
            previewMode={false}
          />
        </TabsContent>

        <TabsContent value="goal-tracking">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Goal Tracking</h2>
                <p className="text-gray-500">Track your learning progress and achieve your goals</p>
              </div>
            </div>

            <GoalTracker role="mentee" />
                    </div>
        </TabsContent>

        <TabsContent value="chat" className="h-full flex flex-col">
          <div className="flex-1 flex h-[calc(100vh-220px)]">
            {/* Chat Sidebar - List of Chats */}
            <div className="w-1/3 bg-white rounded-l-lg border-r border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold mb-4">Messages</h2>
                <div className="relative mb-4">
                  <Input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                {loadingChats ? (
                  <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
                  </div>
                ) : filteredChats.length > 0 ? (
                  filteredChats.map(chat => (
                    <div
                      key={chat._id}
                      onClick={() => handleSelectChat(chat._id)}
                      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedChatId === chat._id 
                          ? 'bg-primary-50 border-l-4 border-l-primary-500' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                          <span className="text-primary-600 font-semibold">
                            {getChatPartnerName(chat).charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-neutral-900">{getChatPartnerName(chat)}</h3>
                          <p className="text-sm text-neutral-500">
                            {chat.lastMessage ? 
                              (chat.lastMessage.length > 25 ? 
                                chat.lastMessage.substring(0, 25) + "..." : 
                                chat.lastMessage) : 
                              "No messages yet"}
                          </p>
                        </div>
                        {chat.unreadCount > 0 && (
                          <span className="ml-auto bg-primary-500 text-white text-xs px-2 py-1 rounded-full">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center">
                    <p className="text-neutral-500 mb-4">No chats found</p>
                    <Button
                      onClick={() => navigate('/mentor-matching')}
                      variant="default"
                      size="sm"
                    >
                      Find a Mentor
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <Button 
                  onClick={fetchAllChats} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Chats
                </Button>
              </div>
            </div>
            
            {/* Chat Content Area */}
            <div className="w-2/3 bg-white rounded-r-lg flex flex-col overflow-hidden">
              {selectedChatId ? (
                <div className="flex-1 h-full">
                  <ChatComponent 
                    partnerId={mentor?._id}
                    partnerName={mentor?.name}
                    partnerRole="mentor"
                    userRole="mentee"
                    chatId={selectedChatId}
                    onNewMessage={handleNewMessage}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="bg-primary-50 rounded-full p-6 mb-4">
                    <MessageCircle className="h-12 w-12 text-primary-500" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No chat selected</h3>
                  <p className="text-neutral-500 mb-6 max-w-md">
                    Select a conversation from the sidebar or start a new chat with your mentor.
                  </p>
                  {mentor && (
                    <Button
                      onClick={() => navigate(`/chat${mentor?._id ? `/${mentor._id}` : ''}`)}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Chat with {mentor.name}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <TroubleshootingModal 
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
        connectionIssue={troubleshootingIssue}
      />

      {/* Connection Debugger Modal */}
      {showSocketDebugger && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-4/5 max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Socket Connection Debugger</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowSocketDebugger(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <ChatDebugger 
                socket={socket} 
                userId={user?._id} 
                isConnected={isConnected} 
                onReconnect={reconnect}
                mentorId={mentor?._id}
              />
              
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2">Manual Actions</h3>
                <div className="flex flex-wrap gap-2">
              <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => {
                      if (socket && user?._id) {
                        const joinData = { userId: user._id };
                        socket.emit('join', joinData);
                        console.log("Manually emitted join event:", joinData);
                        toast.success("Join event sent");
                      }
                    }}
                  >
                    Join Room
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => {
                      if (socket && user?._id) {
                        const userRoom = `user_${user._id}`;
                        socket.emit('join-room', { room: userRoom });
                        console.log("Manually joined explicit room:", userRoom);
                        toast.success("Join room event sent");
                      }
                    }}
                  >
                    Join Explicit Room
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => {
                      if (socket && user?._id) {
                        socket.emit('user-online', { 
                          userId: user._id,
                          userType: 'mentee', 
                          timestamp: new Date().toISOString()
                        });
                        console.log("Manually emitted user-online event");
                        toast.success("User online event sent");
                      }
                    }}
                  >
                    Signal Online
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={async () => {
                      try {
                        const response = await axios.get(`${apiUrl}/api/debug/socket-connections`);
                        console.log("Server socket connections:", response.data);
                        toast.success("Retrieved server socket info - check console");
                      } catch (error) {
                        console.error("Failed to fetch socket info:", error);
                        toast.error("Failed to get socket info");
                      }
                    }}
                  >
                    Check Server Connections
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={async () => {
                      if (!user?._id) return;
                      try {
                        const response = await axios.get(`${apiUrl}/api/debug/check-user-socket/${user._id}`);
                        console.log("User socket check:", response.data);
                        toast.success(response.data.isConnected 
                          ? "Server confirms you are connected!" 
                          : "Server shows you as disconnected");
                      } catch (error) {
                        console.error("Failed to check user socket:", error);
                        toast.error("Failed to check socket status");
                      }
                    }}
                  >
                    Check My Connection
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => {
                      if (reconnect) {
                        reconnect();
                        toast.success("Socket reconnection triggered");
                      } else {
                        toast.error("Reconnect function not available");
                      }
                    }}
                  >
                    Force Reconnect
              </Button>
                </div>
              </div>
              
              <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold mb-2">Test Events</h3>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={simulateIncomingCall}
                  >
                    Simulate Incoming Call
                  </Button>
                </div>
              </div>
            </div>
          </div>
            </div>
          )}

      {/* Socket connection status - only shown in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-2 right-2 z-50 p-2 bg-white rounded-md shadow-md text-xs border border-gray-200">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${socket && socket.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{socket && socket.connected ? 'Socket Connected' : 'Socket Disconnected'}</span>
            {!socket && <span className="text-red-500">(No socket instance)</span>}
          </div>
          {socket && !socket.connected && (
            <button 
              onClick={() => reconnect && reconnect()} 
              className="mt-1 px-2 py-1 bg-blue-500 text-white rounded text-xs w-full"
            >
              Reconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default MenteeDashboard;
