import React, { useEffect, useState } from "react";
import { CometChat } from "@cometchat-pro/chat";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import MentorshipRequests from "../components/MentorshipRequests";
import TaskManager from "../components/TaskManager";
import SessionTracker from "../components/SessionTracker";
import SessionScheduler from "../components/SessionScheduler";
import VideoCall from "../components/VideoCall";
import ChatComponent from "../components/Chat/ChatComponent";
import TroubleshootingModal from "../components/TroubleshootingModal";
import { MessageCircle, Video, X, Target, Users, Calendar, CheckSquare, Award, RefreshCw, Search, LogOut, Menu, Loader2 } from "lucide-react";
import GoalTracker from "../components/GoalTracker";
import { Header } from "../components/ui/Header";
import { Link, useNavigate } from "react-router-dom";
import { Avatar } from '../components/ui/avatar';

const MentorDashboard = () => {
  const { user, logout, token } = useAuth();
  const { socket, isConnected, reconnect } = useSocket();
  const navigate = useNavigate();
  const [mentees, setMentees] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCall, setActiveCall] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootingIssue, setTroubleshootingIssue] = useState('');
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [stats, setStats] = useState({
    totalMentees: 0,
    pendingRequests: 0,
    completedSessions: 0,
    activeMentees: 0
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const apiUrl = import.meta.env.VITE_API_URL || "";

  // Effect to handle initial load and refresh timer
  useEffect(() => {
    if (user && user._id) {
      console.log("Initial load - user detected:", user._id);
      fetchMentees();
      fetchStats();

      // Auto-refresh mentees list every 30 seconds
      const interval = setInterval(() => {
        if (activeTab === "mentees") {
          console.log("Auto-refreshing mentees list");
          fetchMentees();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [user, activeTab]);

  // Effect for setting up socket listeners
  useEffect(() => {
    if (socket && user) {
      console.log("Setting up socket listeners for user:", user._id);
      console.log("Socket connected:", isConnected);
      console.log("Socket instance:", socket?.id);
      
      // Join the user's personal room for socket events
      socket.emit('join', { userId: user._id });
      console.log("Emitted join event for user:", user._id);
      
      const handleRefresh = (data) => {
        console.log("Socket event triggered mentee refresh:", data);
        fetchMentees();
        fetchStats();
      };
      
      socket.on("newMentorshipRequest", handleRefresh);
      socket.on("requestStatusUpdated", handleRefresh);
      socket.on("connectionUpdate", handleRefresh);
      socket.on("video-offer", (data) => {
        toast.success(`Incoming video call from ${data.callerName}`, {
          action: { label: "Accept", onClick: () => handleAcceptCall(data) },
        });
      });

      return () => {
        console.log("Cleaning up socket listeners");
        socket.off("newMentorshipRequest", handleRefresh);
        socket.off("requestStatusUpdated", handleRefresh);
        socket.off("connectionUpdate", handleRefresh);
        socket.off("video-offer");
      };
    }
  }, [socket, isConnected, user]);

  // Effect for CometChat registration
  useEffect(() => {
    if (user && user._id) {
      registerUserInCometChat(user._id, user.name);
    }
  }, [user]);

  // Effect to refresh mentees when tab changes
  useEffect(() => {
    if ((activeTab === "mentees" || activeTab === "overview") && user && user._id) {
      fetchMentees();
      fetchStats();
    }
  }, [activeTab, user]);

  const fetchStats = async () => {
    if (!user || !user._id || !token) return;
    
    try {
      // You would replace this with actual API calls to get stats
      // For now, let's use some sample stats based on mentees
      const pendingRequestsResponse = await axios.get(`${apiUrl}/api/mentorship-requests/count/pending/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const sessionResponse = await axios.get(`${apiUrl}/api/sessions/count/mentor/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const menteesResponse = await axios.get(`${apiUrl}/api/connections/mentor/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activeMentees = menteesResponse.data?.filter(m => m.status === 'accepted') || [];
      
      setStats({
        totalMentees: menteesResponse.data?.length || 0,
        pendingRequests: pendingRequestsResponse.data?.count || 0,
        completedSessions: sessionResponse.data?.count || 0,
        activeMentees: activeMentees.length
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchMentees = async () => {
    if (!user || !user._id) {
      console.warn("Cannot fetch mentees: user not available");
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Fetching mentees for mentor:", user._id);
      console.log("Using API URL:", apiUrl);
      console.log("Using token:", token ? "Token exists" : "No token");
      
      // Add a timestamp to avoid caching issues
      const timestamp = new Date().getTime();
      
      const res = await axios.get(`${apiUrl}/api/connections/mentor/${user._id}?t=${timestamp}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("API Response status:", res.status);
      console.log("API Response headers:", res.headers);
      console.log("Received mentee data:", res.data);
      
      if (!res.data || res.data.length === 0) {
        console.log("No mentees found for this mentor");
        setMentees([]);
        return;
      }
      
      // Map connection data to mentee objects
      const menteeData = res.data.map((conn) => {
        // Check if mentee data is properly populated
        if (!conn.mentee || !conn.mentee._id) {
          console.warn("Found connection with missing mentee data:", conn);
          return null;
        }
        
        return {
          _id: conn.mentee._id,
          name: conn.mentee.name || "Unknown User",
          email: conn.mentee.email || "No email provided",
          connectionId: conn._id,
          status: conn.status,
          profileImage: conn.mentee.profileImage || "/default-avatar.png"
        };
      }).filter(mentee => mentee !== null);
      
      console.log("Parsed mentee data:", menteeData);
      setMentees(menteeData);
      
      // If we're in chat tab with no selected mentee but have mentees, auto-select the first one
      if (activeTab === "chat" && !selectedMentee && menteeData.length > 0) {
        setSelectedMentee(menteeData[0]);
      }

      // Register all mentees in CometChat
      menteeData.forEach((mentee) => {
        if (mentee && mentee._id && mentee.name) {
          registerUserInCometChat(mentee._id, mentee.name);
        }
      });
    } catch (error) {
      console.error("Error fetching mentees:", error);
      
      // Detailed error logging
      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error response status:", error.response.status);
        console.error("Error response headers:", error.response.headers);
      }
      
      toast.error(`Failed to fetch mentees: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

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

  const initiateChat = (menteeId) => {
    // Find the mentee in the list
    const mentee = mentees.find(m => m._id === menteeId);
    if (!mentee) {
      toast.error("Mentee not found");
      return;
    }
    
    // Check if socket is connected first
    if (!socket || !isConnected) {
      // Show a loading toast while attempting to connect
      toast.loading("Establishing connection...", { id: "chat-connection" });
      
      // Try to reconnect if possible
      if (reconnect) {
        reconnect();
      }
      
      // Wait for reconnection attempt
      setTimeout(() => {
        if (socket && socket.connected) {
          toast.success("Connection established", { id: "chat-connection" });
          // Now proceed with opening the chat
          setActiveChat({
            menteeId: mentee._id,
            menteeName: mentee.name,
            menteeImage: mentee.profileImage
          });
        } else {
          toast.error("Unable to connect to the server. Please try again later.", { id: "chat-connection" });
        }
      }, 2000);
      
      return;
    }
    
    // Socket is connected, open the chat
    setActiveChat({
      menteeId: mentee._id,
      menteeName: mentee.name,
      menteeImage: mentee.profileImage
    });
  };

  const closeActiveChat = () => {
    setActiveChat(null);
  };

  const initiateVideoCall = async (menteeId) => {
    // Find the mentee in the list
    const mentee = mentees.find(m => m._id === menteeId);
    if (!mentee) {
      toast.error("Mentee not found");
      return;
    }
    
    setIsInitiatingCall(true);
    
    // Check if the socket is initialized and connected
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
          proceedWithVideoCall(mentee);
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
    proceedWithVideoCall(mentee);
  };
  
  // Update the proceedWithVideoCall function to include better error handling
  const proceedWithVideoCall = (mentee) => {
    if (!mentee) return;
    
    try {
      // Generate a unique call ID
      const newCallId = `call-${Date.now()}-${user._id.substring(0, 5)}`;
      console.log('Generated new call ID:', newCallId);
      
      // Emit video-offer to the selected mentee
      if (socket && socket.connected) {
        socket.emit("video-offer", {
          callId: newCallId,
          callerId: user._id,
          callerName: user.name,
          recipientId: mentee._id,
          recipientName: mentee.name,
          timestamp: new Date().toISOString(),
          offer: {} // Empty offer placeholder
        });
        
        // Check if the event was actually emitted
        if (!socket.connected) {
          throw new Error("Socket disconnected while sending offer");
        }
        
        // Set the active call data
        setActiveCall({
          callId: newCallId,
          recipientId: mentee._id,
          recipientName: mentee.name
        });
        
        // Show notification
        toast.success(`Calling ${mentee.name}...`);
      } else {
        throw new Error("Socket not connected");
      }
    } catch (error) {
      console.error("Error initiating call:", error);
      toast.error(`Failed to initiate call: ${error.message}`);
      setTroubleshootingIssue('call_failed');
      setShowTroubleshooting(true);
    }
    
    setIsInitiatingCall(false);
  };

  const handleAcceptCall = (callData) => {
    setActiveCall({
      callId: callData.callId,
      recipientId: callData.callerId,
      recipientName: callData.callerName
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Custom Mobile-specific Header */}
      <div className="md:hidden bg-gradient-to-r from-primary-600 to-primary-800 text-white sticky top-0 z-50 px-4 py-3 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <Link to="/" className="flex items-center space-x-2">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-lg font-bold">MentorConnect</span>
          </Link>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-primary-700/50 hover:bg-primary-700/70 text-white focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`md:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsMobileMenuOpen(false)}>
      </div>
      
      {/* Mobile Menu - Mentor specific */}
      <div className={`md:hidden fixed right-0 top-0 bottom-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex flex-col h-full overflow-y-auto">
          <div className="p-4 bg-gradient-primary text-white">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">Mentor Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)} 
                className="p-2 rounded-lg hover:bg-primary-700/50 text-white focus:outline-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-2 text-sm opacity-80">
              {user.name}
            </div>
          </div>
          
          <div className="p-4 bg-primary-50 border-b border-primary-100">
            <div className="flex items-center">
              <Avatar 
                src={user.profileImage}
                name={user.name}
                alt={user.name}
                size="md"
                border={true}
                borderColor="primary"
                status={user.isOnline ? 'online' : 'offline'}
              />
              <div className="ml-3">
                <p className="font-semibold text-primary-900">{user.name}</p>
                <span className="px-2 py-0.5 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">
                  Mentor
                </span>
              </div>
            </div>
          </div>
          
          <nav className="flex-1 px-4 py-3">
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">Main</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab("overview");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg ${
                      activeTab === "overview" ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                    } transition-colors font-medium`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab("requests");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg ${
                      activeTab === "requests" ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                    } transition-colors font-medium`}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Mentorship Requests
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab("mentees");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg ${
                      activeTab === "mentees" ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                    } transition-colors font-medium`}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    My Mentees
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">Mentoring</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab("tasks");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg ${
                      activeTab === "tasks" ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                    } transition-colors font-medium`}
                  >
                    <CheckSquare className="w-5 h-5 mr-3" />
                    Task Management
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab("sessions");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg ${
                      activeTab === "sessions" ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                    } transition-colors font-medium`}
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    Session Tracker
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold mb-2">Progress</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => {
                      setActiveTab("goals");
                      setIsMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2.5 rounded-lg ${
                      activeTab === "goals" ? "bg-primary-50 text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
                    } transition-colors font-medium`}
                  >
                    <Award className="w-5 h-5 mr-3" />
                    Mentee Goals
                  </button>
                </li>
              </ul>
            </div>
          </nav>
          
          <div className="p-4 border-t border-neutral-200">
            <button
              onClick={logout}
              className="flex w-full items-center px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-medium"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>
      
      {/* Desktop Header */}
      <div className="hidden md:block">
        <Header />
      </div>
      
      <div className="flex flex-col md:flex-row">
        {/* Sidebar - Desktop Only */}
        <div className="hidden md:block w-64 bg-gradient-primary text-white min-h-[calc(100vh-64px)] p-6 shadow-lg">
          <nav className="space-y-6">
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary-200 font-semibold mb-3">Main</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setActiveTab("overview")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "overview" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab("requests")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "requests" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    Mentorship Requests
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab("mentees")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "mentees" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <Users className="w-5 h-5 mr-3" />
                    My Mentees
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary-200 font-semibold mb-3">Mentoring</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setActiveTab("tasks")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "tasks" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <CheckSquare className="w-5 h-5 mr-3" />
                    Task Management
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setActiveTab("sessions")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "sessions" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <Calendar className="w-5 h-5 mr-3" />
                    Session Tracker
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary-200 font-semibold mb-3">Progress</h3>
              <ul className="space-y-1">
                <li>
                  <button 
                    onClick={() => setActiveTab("goals")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "goals" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <Award className="w-5 h-5 mr-3" />
                    Mentee Goals
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="pt-6">
              <button
                onClick={logout}
                className="flex w-full items-center px-3 py-2 rounded-lg text-primary-100 hover:bg-primary-700/50 transition-colors font-medium"
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-4 md:p-8 pt-6">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard Overview */}
            {activeTab === "overview" && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 sm:mb-0">
                    Welcome, {user.name}!
                  </h1>
                  <span className="px-3 py-1 bg-secondary-100 text-secondary-800 rounded-full text-sm font-medium self-start sm:self-auto">
                    Mentor
                  </span>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card className="bg-gradient-to-br from-primary-50 to-primary-100 border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-primary-600 font-medium">Active Mentees</p>
                          <h3 className="text-2xl font-bold text-primary-900 mt-1">{stats.activeMentees}</h3>
                        </div>
                        <div className="bg-primary-200 p-3 rounded-full">
                          <Users className="h-6 w-6 text-primary-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-secondary-50 to-secondary-100 border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-secondary-600 font-medium">Pending Requests</p>
                          <h3 className="text-2xl font-bold text-secondary-900 mt-1">{stats.pendingRequests}</h3>
                        </div>
                        <div className="bg-secondary-200 p-3 rounded-full">
                          <Users className="h-6 w-6 text-secondary-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-accent-50 to-accent-100 border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-accent-600 font-medium">Completed Sessions</p>
                          <h3 className="text-2xl font-bold text-accent-900 mt-1">{stats.completedSessions}</h3>
                        </div>
                        <div className="bg-accent-200 p-3 rounded-full">
                          <Calendar className="h-6 w-6 text-accent-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-neutral-50 to-neutral-100 border-none shadow-md hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm text-neutral-600 font-medium">Total Connections</p>
                          <h3 className="text-2xl font-bold text-neutral-900 mt-1">{stats.totalMentees}</h3>
                        </div>
                        <div className="bg-neutral-200 p-3 rounded-full">
                          <Target className="h-6 w-6 text-neutral-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Main Content Column */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Pending Requests Preview */}
                    <Card className="shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Mentorship Requests</CardTitle>
                        <Button 
                          onClick={() => setActiveTab("requests")} 
                          variant="outline" 
                          size="sm"
                        >
                          View All
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px] overflow-auto">
                          <MentorshipRequests 
                            onRequestUpdate={fetchMentees} 
                            previewMode={true} 
                            limit={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Active Mentees Preview */}
                    <Card className="shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Active Mentees</CardTitle>
                        <Button 
                          onClick={() => setActiveTab("mentees")} 
                          variant="outline" 
                          size="sm"
                        >
                          View All
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {mentees
                            .filter(m => m.status === 'accepted')
                            .slice(0, 4)
                            .map((mentee) => (
                              <div key={mentee._id} className="border border-neutral-100 rounded-lg p-4 hover:shadow-md transition-shadow">
                                <div className="flex items-center gap-3">
                                  <Avatar 
                                    src={mentee.profileImage}
                                    name={mentee.name}
                                    alt={mentee.name}
                                    size="md"
                                    border={true}
                                    borderColor="primary"
                                    status={mentee.isOnline ? 'online' : 'offline'}
                                  />
                                  <div>
                                    <h3 className="font-semibold text-neutral-900">{mentee.name}</h3>
                                    <p className="text-xs text-neutral-500">{mentee.email}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <Button 
                                    onClick={() => initiateChat(mentee._id)} 
                                    size="sm" 
                                    className="flex-1"
                                  >
                                    <MessageCircle className="h-3 w-3 mr-1" />
                                    Chat
                                  </Button>
                                  <Button
                                    onClick={() => initiateVideoCall(mentee._id)}
                                    size="sm"
                                    variant="secondary"
                                    className="flex-1"
                                  >
                                    <Video className="h-3 w-3 mr-1" />
                                    Call
                                  </Button>
                                </div>
                              </div>
                            ))}
                          
                          {mentees.filter(m => m.status === 'accepted').length === 0 && (
                            <div className="col-span-2 text-center py-6 text-neutral-500">
                              <p>No active mentees found. Accept mentorship requests to connect with mentees.</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Sidebar Column */}
                  <div className="space-y-6">
                    {/* Sessions Overview */}
                    <Card className="shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br from-neutral-50 to-neutral-100">
                      <CardHeader>
                        <CardTitle>Upcoming Sessions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SessionScheduler previewMode={true} limit={3} 
                          userId={user._id}
                          userRole="mentor"
                          mentees={mentees.filter(m => m.status === 'accepted')}
                        />
                        <Button 
                          onClick={() => setActiveTab("sessions")} 
                          className="w-full mt-4"
                          variant="outline"
                        >
                          View All Sessions
                        </Button>
                      </CardContent>
                    </Card>
                    
                    {/* Quick Actions */}
                    <Card className="shadow-md hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <Button 
                            onClick={() => setActiveTab("requests")} 
                            className="w-full justify-start"
                            variant="outline"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Review Pending Requests
                          </Button>
                          <Button 
                            onClick={() => setActiveTab("tasks")} 
                            className="w-full justify-start"
                            variant="outline"
                          >
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Manage Mentee Tasks
                          </Button>
                          <Button 
                            onClick={() => setActiveTab("goals")} 
                            className="w-full justify-start"
                            variant="outline"
                          >
                            <Award className="h-4 w-4 mr-2" />
                            Review Mentee Goals
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
            
            {/* Requests Tab */}
            {activeTab === "requests" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <h2 className="text-2xl font-bold text-primary-900">Mentorship Requests</h2>
                  <p className="text-neutral-500">Review and manage your pending mentorship requests</p>
                </div>
                <div className="p-6">
                  <MentorshipRequests onRequestUpdate={fetchMentees} />
                </div>
              </div>
            )}
            
            {/* Mentees Tab */}
            {activeTab === "mentees" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-primary-900">My Mentees</h2>
                      <p className="text-neutral-500">Manage your mentee connections</p>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative w-full md:w-auto">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                        <Input
                          placeholder="Search mentees..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 min-w-[200px]"
                        />
                      </div>
                      <Button 
                        onClick={fetchMentees} 
                        variant="outline"
                        disabled={loading}
                      >
                        {loading ? 
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : 
                          <RefreshCw className="h-4 w-4 mr-2" />
                        }
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  {loading ? (
                    <div className="flex justify-center items-center py-20">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                      <span className="ml-3 text-primary-600">Loading mentees...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {mentees.length === 0 && (
                        <div className="col-span-3 text-center py-8 text-neutral-500">
                          <p>No mentees found. Accept mentorship requests to connect with mentees.</p>
                        </div>
                      )}
                      
                      {mentees
                        .filter((m) => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((mentee) => (
                          <Card key={mentee._id} className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
                            <div className="p-4 border-b border-neutral-100 bg-gradient-to-r from-primary-50 to-primary-100">
                              <div className="flex items-center gap-3">
                                <Avatar 
                                  src={mentee.profileImage}
                                  name={mentee.name}
                                  alt={mentee.name}
                                  size="md"
                                  border={true}
                                  borderColor="primary"
                                  status={mentee.isOnline ? 'online' : 'offline'}
                                />
                                <div>
                                  <h3 className="text-lg font-semibold text-primary-900">{mentee.name}</h3>
                                  <p className="text-sm text-primary-700">{mentee.email}</p>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
                              <div className="flex gap-2">
                                <Button 
                                  onClick={() => initiateChat(mentee._id)} 
                                  className="flex-1"
                                >
                                  <MessageCircle className="h-4 w-4 mr-2" />
                                  Chat
                                </Button>
                                <Button
                                  onClick={() => initiateVideoCall(mentee._id)}
                                  variant="secondary"
                                  className="flex-1"
                                  disabled={isInitiatingCall}
                                >
                                  <Video className="h-4 w-4 mr-2" />
                                  {isInitiatingCall ? 'Calling...' : 'Video Call'}
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Tasks Tab */}
            {activeTab === "tasks" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <h2 className="text-2xl font-bold text-primary-900">Task Management</h2>
                  <p className="text-neutral-500">Create and manage tasks for your mentees</p>
                </div>
                <div className="p-6">
                  <TaskManager />
                </div>
              </div>
            )}
            
            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <h2 className="text-2xl font-bold text-primary-900">Session Scheduler</h2>
                  <p className="text-neutral-500">Schedule and manage mentoring sessions</p>
                </div>
                <div className="p-6">
                  <SessionScheduler 
                    userId={user._id}
                    userRole="mentor"
                    mentees={mentees.filter(m => m.status === 'accepted')}
                  />
                </div>
              </div>
            )}
            
            {/* Goals Tab */}
            {activeTab === "goals" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <h2 className="text-2xl font-bold text-primary-900">Mentee Goal Tracking</h2>
                  <p className="text-neutral-500">Monitor and manage your mentees' learning goals</p>
                </div>
                <div className="p-6">
                  <GoalTracker 
                    role="mentor"
                    mentorId={user._id}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active Chat Modal */}
      {activeChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="p-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Avatar 
                  src={activeChat.menteeImage}
                  name={activeChat.menteeName}
                  alt={activeChat.menteeName}
                  size="md"
                  border={true}
                  borderColor="primary"
                  status={activeChat.isOnline ? 'online' : 'offline'}
                />
                <h2 className="text-lg font-semibold">Chat with {activeChat.menteeName}</h2>
              </div>
              <Button
                variant="ghost"
                className="text-white hover:bg-primary-700/50 p-2 h-auto"
                onClick={closeActiveChat}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ChatComponent 
                partnerId={activeChat.menteeId}
                partnerName={activeChat.menteeName}
                partnerRole="mentee"
                userRole="mentor"
              />
            </div>
          </div>
        </div>
      )}

      {/* Active Video Call */}
      {activeCall && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
          <div className="p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <h2 className="text-xl font-bold text-white">Video Call with {activeCall.recipientName}</h2>
            <Button 
              onClick={() => setActiveCall(null)} 
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
              onEndCall={() => setActiveCall(null)}
            />
          </div>
        </div>
      )}

      <TroubleshootingModal 
        isOpen={showTroubleshooting}
        onClose={() => setShowTroubleshooting(false)}
        connectionIssue={troubleshootingIssue}
      />
    </div>
  );
};

export default MentorDashboard;
