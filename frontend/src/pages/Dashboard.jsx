import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axios from "axios";
import { Header } from "../components/ui/Header";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../components/ui/toast";
import SkillAssessment from "../components/SkillAssessment/SkillAssessment";
import Achievement from "../components/Achievement/Achievement";
import AcceptedMentees from "../components/AcceptedMentees";
import ChatComponent from "../components/Chat/ChatComponent";
import VideoCall from "../components/VideoCall";
import TaskManager from "../components/TaskManager";
import SessionTracker from "../components/SessionTracker";
import GoalTracker from "../components/GoalTracker";
import TroubleshootingModal from "../components/TroubleshootingModal";
import RecommendationService from "../services/RecommendationService";
import { CometChat } from "@cometchat-pro/chat";
import { format } from "date-fns";
import { MessageCircle, Video, X, Phone, AlertCircle, Search, RefreshCw, Loader2 } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { socket, isConnected, reconnect } = useSocket();
  const { addToast } = useToast();
  
  // Standard Dashboard states
  const [achievements, setAchievements] = useState([]);
  const [recommendedMentors, setRecommendedMentors] = useState([]);
  const [showSkillAssessment, setShowSkillAssessment] = useState(false);
  
  // States from MenteeDashboard
  const [mentor, setMentor] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [chatNotifications, setChatNotifications] = useState(0);
  const [callNotifications, setCallNotifications] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [troubleshootingIssue, setTroubleshootingIssue] = useState('');
  const [activeMentor, setActiveMentor] = useState(null);
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [mentorshipStatus, setMentorshipStatus] = useState(null);
  
  // Additional state variables for enhanced chat functionality
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [loadingChats, setLoadingChats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredChats, setFilteredChats] = useState([]);
  
  const apiUrl = import.meta.env.VITE_API_URL || "";

  const mockSkills = [
    { id: 1, name: "JavaScript" },
    { id: 2, name: "React" },
    { id: 3, name: "Node.js" },
    { id: 4, name: "Python" },
  ];

  // Initial setup effects
  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    // Redirect mentors to mentor dashboard
    if (user.role === "mentor") {
      navigate("/mentor-dashboard");
      return;
    }

    fetchAchievements();
    fetchRecommendations();
    fetchMentor();
    fetchGoals();
    
    // Check saved mentorship status from local storage
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
          
          addToast(toastMessage, parsedStatus.status === 'accepted' ? "success" : "error");
        } else {
          // Status is too old, clear it
          localStorage.removeItem('mentorshipStatus');
        }
      } catch (e) {
        console.error('Error parsing saved mentorship status:', e);
        localStorage.removeItem('mentorshipStatus');
      }
    }
  }, [user, navigate]);

  // Socket setup effect
  useEffect(() => {
    if (user && user._id && socket && isConnected) {
      console.log("User authenticated and socket connected - setting up listeners");
      setupSocketListeners();
      loginToCometChat();
    }
  }, [user, socket, isConnected]);

  // Tab switching effect
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
    }
  }, [activeTab]);

  // Add a new effect to fetch all available chats when the chat tab is active
  useEffect(() => {
    if (activeTab === "chat") {
      fetchAllChats();
    }
  }, [activeTab]);

  // Add a new effect to filter chats based on search query
  useEffect(() => {
    if (chats.length > 0) {
      const filtered = chats.filter(chat => {
        const mentorName = chat.mentor?.name || "";
        const menteeName = chat.mentee?.name || "";
        const searchLower = searchQuery.toLowerCase();
        return mentorName.toLowerCase().includes(searchLower) || 
               menteeName.toLowerCase().includes(searchLower);
      });
      setFilteredChats(filtered);
    }
  }, [searchQuery, chats]);

  const fetchAchievements = async () => {
    // Mock achievements data - replace with API call
    setAchievements([
      {
        id: 1,
        title: "First Steps",
        description: "Complete your first mentoring session",
        icon: "🎯",
        unlocked: true,
        progress: 100,
      },
      {
        id: 2,
        title: "Skill Master",
        description: "Complete 5 skill assessments",
        icon: "⭐",
        unlocked: false,
        progress: 60,
      },
    ]);
  };

  const fetchRecommendations = async () => {
    try {
      const recommendations = await RecommendationService.getRecommendedMentors(user?.id);
      setRecommendedMentors(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };
  
  const fetchGoals = async () => {
    if (!user || !token) return;
    
    try {
      const response = await axios.get(`${apiUrl}/api/goals/mentee/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGoals(response.data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };
  
  const fetchMentor = async () => {
    if (!user || !token) return;
    
    try {
      // Get the mentee's accepted mentor connections
      const response = await axios.get(`${apiUrl}/api/connections/mentee/${user._id}?status=accepted`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activeMentors = response.data || [];
      if (activeMentors.length > 0) {
        // Set the first accepted mentor as active
        setMentor(activeMentors[0]);
        setActiveMentor(activeMentors[0].mentor);
      }
    } catch (error) {
      console.error("Error fetching mentor:", error);
    }
  };
  
  const setupSocketListeners = () => {
    if (!socket) return;
    
    // Join the user's personal room for socket events
    socket.emit('join', { userId: user._id });
    
    // Chat message event
    socket.on('new-message', (data) => {
      if (activeTab !== 'chat') {
        setChatNotifications(prev => prev + 1);
        addToast(`New message from ${data.senderName}`, "info");
      }
    });
    
    // Call events
    socket.on('video-offer', (data) => {
      setIncomingCall(data);
      setCallNotifications(true);
      addToast(`Incoming call from ${data.callerName}`, "info", {
        action: { label: "Answer", onClick: () => handleAcceptCall(data) }
      });
    });
    
    // Mentorship status update events
    socket.on('mentorship-request-status', (data) => {
      const mentorName = data.mentorName || 'Your mentor';
      const status = data.status;
      
      setMentorshipStatus({
        status,
        mentorId: data.mentorId,
        timestamp: new Date().toISOString()
      });
      
      // Save status to localStorage for persistence
      localStorage.setItem('mentorshipStatus', JSON.stringify({
        status,
        mentorId: data.mentorId,
        timestamp: new Date().toISOString()
      }));
      
      const message = status === 'accepted' 
        ? `${mentorName} accepted your mentorship request!` 
        : `${mentorName} declined your mentorship request.`;
      
      addToast(message, status === 'accepted' ? "success" : "error");
      
      // Refresh mentor data if accepted
      if (status === 'accepted') {
        fetchMentor();
      }
    });
    
    return () => {
      socket.off('new-message');
      socket.off('video-offer');
      socket.off('mentorship-request-status');
    };
  };
  
  const loginToCometChat = () => {
    if (!user || !user._id) return;
    
    const authKey = import.meta.env.VITE_COMETCHAT_AUTH_KEY;
    if (!authKey) return;
    
    CometChat.login(user._id, authKey)
      .then(loggedInUser => console.log("CometChat login successful:", loggedInUser))
      .catch(error => console.error("CometChat login failed:", error));
  };
  
  const handleAcceptCall = (callData) => {
    setActiveTab('video-call');
    setActiveCall(callData);
    setIncomingCall(null);
    setCallNotifications(false);
  };
  
  const handleInitiateCall = (mentorData) => {
    if (!mentorData || !mentorData._id) {
      addToast("Cannot initiate call: mentor data is incomplete", "error");
      return;
    }
    
    setIsInitiatingCall(true);
    setActiveTab('video-call');
    
    // Send call request to the server
    if (socket && isConnected) {
      socket.emit('initiate-call', {
        targetUserId: mentorData._id,
        callerId: user._id,
        callerName: user.name
      });
      
      setActiveCall({
        callerId: user._id,
        callerName: user.name,
        targetUserId: mentorData._id,
        targetUserName: mentorData.name,
        initiatedByMe: true
      });
    } else {
      addToast("Cannot initiate call: socket not connected", "error");
      setIsInitiatingCall(false);
    }
  };
  
  const handleEndCall = () => {
    setActiveCall(null);
    setActiveTab('overview');
  };

  const handleSkillAssessment = async (assessments) => {
    // Save skill assessments - replace with API call
    console.log("Skill assessments:", assessments);
    setShowSkillAssessment(false);
    addToast("Skill assessment saved successfully!", "success");
  };

  const handleLogout = () => {
    logout();
  };

  // Function to fetch all available chats
  const fetchAllChats = async () => {
    if (!token) return;
    
    setLoadingChats(true);
    try {
      const response = await axios.get(`${apiUrl}/api/chat`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setChats(response.data);
      setFilteredChats(response.data);
      
      // If there are chats but no selected chat, select the first one
      if (response.data.length > 0 && !selectedChatId) {
        setSelectedChatId(response.data[0]._id);
      }
    } catch (error) {
      console.error("Error fetching chats:", error);
      addToast("Failed to load your chats. Please try again.", "error");
    } finally {
      setLoadingChats(false);
    }
  };

  // Function to select a chat
  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
  };

  // Function to get chat partner name
  const getChatPartnerName = (chat) => {
    if (!chat) return "Unknown";
    
    if (user.role === "mentee") {
      return chat.mentor?.name || "Mentor";
    } else {
      return chat.mentee?.name || "Mentee";
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      <Header />
      
      <div className="flex flex-col md:flex-row">
        {/* Sidebar - keep it visible on desktop and controlled by Header on mobile */}
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
                  <Link to="/mentor-matching" className="flex items-center px-3 py-2 rounded-lg text-primary-100 hover:bg-primary-700/50 transition-colors font-medium">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Find a Mentor
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary-200 font-semibold mb-3">Communication</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => navigate("/chat")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "chat" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <div className="relative">
                      <MessageCircle className="w-5 h-5 mr-3" />
                      {chatNotifications > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          {chatNotifications > 9 ? '9+' : chatNotifications}
                        </span>
                      )}
                    </div>
                    Chat
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab("video-call")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "video-call" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <div className="relative">
                      <Video className="w-5 h-5 mr-3" />
                      {callNotifications && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                          !
                        </span>
                      )}
                    </div>
                    Video Call
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-xs uppercase tracking-wider text-primary-200 font-semibold mb-3">Progress</h3>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => setActiveTab("goal-tracking")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "goal-tracking" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Goal Tracker
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => setActiveTab("sessions")}
                    className={`flex w-full items-center px-3 py-2 rounded-lg ${
                      activeTab === "sessions" ? "bg-primary-700/50 text-white" : "text-primary-100 hover:bg-primary-700/50"
                    } transition-colors font-medium`}
                  >
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Sessions
                  </button>
                </li>
              </ul>
            </div>
            
            <div className="pt-6">
              <button
                onClick={handleLogout}
                className="flex w-full items-center px-3 py-2 rounded-lg text-primary-100 hover:bg-primary-700/50 transition-colors font-medium"
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content - full width on mobile */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard Overview Tab */}
            {activeTab === "overview" && (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 md:mb-8">
                  <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 mb-2 sm:mb-0">
                    Welcome, {user.name}!
                  </h1>
                  <span className="px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium self-start sm:self-auto">
                    Mentee
                  </span>
                </div>
                
                {/* Display mentorship status banner if exists */}
                {mentorshipStatus && (
                  <Card className={`mb-6 overflow-hidden ${
                    mentorshipStatus.status === 'accepted' ? 'bg-green-50' : 'bg-red-50 mentorship-status-banner'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        {mentorshipStatus.status === 'accepted' ? (
                          <>
                            <span className="p-2 bg-green-100 rounded-full mr-0 sm:mr-4 mb-3 sm:mb-0 self-start">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <div>
                              <h3 className="font-semibold text-green-800">Mentorship Request Accepted!</h3>
                              <p className="text-sm text-green-700">You can now start communicating with your mentor.</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="p-2 bg-red-100 rounded-full mr-0 sm:mr-4 mb-3 sm:mb-0 self-start">
                              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </span>
                            <div>
                              <h3 className="font-semibold text-red-800">Mentorship Request Declined</h3>
                              <p className="text-sm text-red-700">Don't worry, you can find other mentors who might be a better fit.</p>
                            </div>
                          </>
                        )}
                        <Button 
                          variant="link" 
                          className="ml-0 sm:ml-auto mt-2 sm:mt-0 self-end sm:self-auto"
                          onClick={() => {
                            setMentorshipStatus(null);
                            localStorage.removeItem('mentorshipStatus');
                          }}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
                  {/* Main Content Column */}
                  <div className="lg:col-span-2 space-y-4 md:space-y-6">
                    {/* Connected Mentors Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>My Mentors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <AcceptedMentees />
                      </CardContent>
                    </Card>

                    {/* Recommended Mentors */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Recommended Mentors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {recommendedMentors.map(mentor => (
                            <div key={mentor.id} className="border border-neutral-200 rounded-xl p-3 md:p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-center space-x-3 md:space-x-4">
                                <img
                                  src={mentor.avatar || "https://ui-avatars.com/api/?name=" + encodeURIComponent(mentor.name)}
                                  alt={mentor.name}
                                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-primary-100"
                                />
                                <div>
                                  <h3 className="font-semibold text-neutral-900">{mentor.name}</h3>
                                  <p className="text-xs md:text-sm text-neutral-600">{mentor.expertise}</p>
                                </div>
                              </div>
                              <div className="mt-3 md:mt-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                                  Match: {Math.round(mentor.compatibilityScore)}%
                                </span>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/mentor/${mentor.id}`)}
                                  className="w-full sm:w-auto"
                                >
                                  View Profile
                                </Button>
                              </div>
                            </div>
                          ))}
                          
                          {recommendedMentors.length === 0 && (
                            <div className="col-span-1 sm:col-span-2 py-6 md:py-8 text-center">
                              <p className="text-neutral-500 mb-4">You don't have any recommended mentors yet.</p>
                              <Button
                                onClick={() => navigate('/mentor-matching')}
                                variant="default"
                              >
                                Find Mentors
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Sidebar */}
                  <div className="space-y-4 md:space-y-6">
                    {/* Progress Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Progress</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium text-neutral-700">Overall Progress</span>
                            <span className="text-sm font-medium text-primary-600">75%</span>
                          </div>
                          <div className="w-full bg-neutral-200 rounded-full h-2.5">
                            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: "75%" }}></div>
                          </div>
                        </div>
                        <Button
                          onClick={() => setShowSkillAssessment(true)}
                          className="w-full"
                          variant="secondary"
                        >
                          Take Skill Assessment
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Achievements Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Achievements</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Achievement achievements={achievements} userLevel={3} />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
            
            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="h-[calc(100vh-150px)] bg-white rounded-xl shadow-md overflow-hidden flex flex-col md:flex-row">
                {/* Chat Sidebar - Full width on mobile, sliding panel */}
                <div className={`w-full md:w-1/4 border-b md:border-b-0 md:border-r border-neutral-200 ${
                  selectedChatId && window.innerWidth < 768 ? 'hidden' : 'flex flex-col'
                }`}>
                  <div className="p-4 bg-primary-50 border-b border-primary-100">
                    <h2 className="text-xl font-bold text-primary-900 mb-2">Your Chats</h2>
                    <div className="relative">
                      <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                    </div>
                    <div className="flex justify-between mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchAllChats}
                        disabled={loadingChats}
                        className="text-xs w-full"
                      >
                        {loadingChats ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                        Refresh
                      </Button>
                    </div>
                  </div>
                  
                  <div className="overflow-y-auto flex-grow">
                    {loadingChats ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                      </div>
                    ) : filteredChats.length > 0 ? (
                      filteredChats.map((chat) => (
                        <div
                          key={chat._id}
                          onClick={() => {
                            handleSelectChat(chat._id);
                          }}
                          className={`p-4 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50 transition-colors ${
                            selectedChatId === chat._id ? "bg-primary-50" : ""
                          }`}
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                              <span className="text-primary-600 font-semibold">
                                {getChatPartnerName(chat).charAt(0)}
                              </span>
                            </div>
                            <div>
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
                </div>
                
                {/* Chat Main Area */}
                <div className={`flex-1 flex flex-col ${
                  !selectedChatId && window.innerWidth < 768 ? 'hidden' : 'flex'
                }`}>
                  <div className="p-4 bg-primary-50 border-b border-primary-100 flex justify-between items-center">
                    {/* Back button on mobile */}
                    {window.innerWidth < 768 && selectedChatId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedChatId(null)}
                        className="mr-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Button>
                    )}
                    
                    <h2 className="text-lg md:text-2xl font-bold text-primary-900">
                      {selectedChatId ? 
                        `Chat with ${filteredChats.find(c => c._id === selectedChatId) ? 
                          getChatPartnerName(filteredChats.find(c => c._id === selectedChatId)) : 
                          "Mentor"}` : 
                        "Chat with Mentor"}
                    </h2>
                    {selectedChatId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleInitiateCall(activeMentor)}
                        className="text-primary-600"
                      >
                        <Phone className="w-4 h-4 mr-1" />
                        <span className="hidden sm:inline">Call</span>
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex-grow overflow-hidden">
                    {selectedChatId ? (
                      <ChatComponent 
                        currentUser={user}
                        chatId={selectedChatId}
                        recipient={activeMentor}
                        onNewMessage={() => {
                          setChatNotifications(0);
                          fetchAllChats(); // Refresh chat list to update unread counts
                        }}
                      />
                    ) : window.innerWidth >= 768 || !filteredChats.length ? (
                      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                        <MessageCircle className="w-16 h-16 text-neutral-300 mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-700 mb-2">
                          {filteredChats.length > 0 ? "Select a Chat" : "No Active Mentor Connection"}
                        </h3>
                        <p className="text-neutral-500 mb-4">
                          {filteredChats.length > 0 
                            ? "Choose a chat from the sidebar or start a new conversation"
                            : "You need to connect with a mentor before you can start chatting."}
                        </p>
                        {!filteredChats.length && (
                          <Button
                            onClick={() => navigate('/mentor-matching')}
                            variant="default"
                          >
                            Find a Mentor
                          </Button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            
            {/* Video Call Tab */}
            {activeTab === "video-call" && (
              <div className="h-[calc(100vh-150px)] bg-white rounded-xl shadow-md overflow-hidden">
                {activeCall ? (
                  <VideoCall
                    callData={activeCall}
                    onEndCall={handleEndCall}
                    currentUser={user}
                  />
                ) : activeMentor ? (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="mb-8">
                      <img
                        src={activeMentor.profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeMentor.name)}`}
                        alt={activeMentor.name}
                        className="w-24 h-24 rounded-full mx-auto mb-4"
                      />
                      <h3 className="text-xl font-semibold">{activeMentor.name}</h3>
                      <p className="text-neutral-500">{activeMentor.title || "Mentor"}</p>
                    </div>
                    
                    <p className="text-lg text-neutral-700 mb-6">Start a video call with your mentor</p>
                    
                    <Button
                      onClick={() => handleInitiateCall(activeMentor)}
                      disabled={isInitiatingCall}
                      className="px-6 py-3 flex items-center justify-center"
                    >
                      {isInitiatingCall ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Initiating Call...
                        </>
                      ) : (
                        <>
                          <Phone className="mr-2 h-5 w-5" />
                          Call {activeMentor.name}
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <svg className="w-16 h-16 text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Active Mentor Connection</h3>
                    <p className="text-neutral-500 mb-4">You need to connect with a mentor before you can start a video call.</p>
                    <Button
                      onClick={() => navigate('/mentor-matching')}
                      variant="default"
                    >
                      Find a Mentor
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {/* Goal Tracking Tab */}
            {activeTab === "goal-tracking" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <h2 className="text-2xl font-bold text-primary-900">Goal Tracker</h2>
                  <p className="text-neutral-500">Track your learning progress and set new goals</p>
                </div>
                <div className="p-6">
                  <GoalTracker 
                    goals={goals} 
                    onGoalsUpdated={fetchGoals}
                    menteeId={user._id}
                  />
                </div>
              </div>
            )}
            
            {/* Sessions Tab */}
            {activeTab === "sessions" && (
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="p-4 bg-primary-50 border-b border-primary-100">
                  <h2 className="text-2xl font-bold text-primary-900">Session Tracker</h2>
                  <p className="text-neutral-500">Track your mentoring sessions and progress</p>
                </div>
                <div className="p-6">
                  <SessionTracker 
                    userId={user._id}
                    userRole="mentee"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Skill Assessment Modal */}
      {showSkillAssessment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full mx-4 shadow-2xl">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-neutral-900 mb-4">Skill Assessment</h2>
              <SkillAssessment
                skills={mockSkills}
                onSave={handleSkillAssessment}
              />
            </div>
            <div className="bg-neutral-50 px-6 py-4 rounded-b-xl flex justify-end space-x-4">
              <Button
                onClick={() => setShowSkillAssessment(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSkillAssessment}
              >
                Save Assessment
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Troubleshooting Modal */}
      {showTroubleshooting && (
        <TroubleshootingModal
          issue={troubleshootingIssue}
          onClose={() => setShowTroubleshooting(false)}
        />
      )}
    </div>
  );
};

export default Dashboard;
