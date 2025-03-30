import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { 
  CalendarIcon, 
  ClockIcon, 
  VideoIcon, 
  MessageSquareIcon,
  RotateCw,
  AlertCircle
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Avatar } from './ui/avatar';

const SessionList = ({ userId, userRole, previewMode = false, limit = undefined }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  useEffect(() => {
    if (user && (!userId || userId === user._id)) {
      console.log(`[SessionList] Initializing for ${userRole} with ID: ${user._id}`);
      fetchSessions();
    } else if (userId) {
      console.log(`[SessionList] Initializing for specific ${userRole} with ID: ${userId}`);
      fetchSessions();
    }
  }, [userId, userRole, user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Determine the endpoint based on userRole
      const endpoint = userRole === 'mentor' 
        ? `${apiUrl}/api/sessions/mentor/${userId || user._id}`
        : `${apiUrl}/api/sessions/mentee/${userId || user._id}`;
      
      console.log("[SessionList] Making session API request to:", endpoint);
      console.log("[SessionList] With token:", token ? "Token exists" : "No token");
      
      const response = await axios.get(endpoint, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("[SessionList] Sessions API response:", response.data);
      console.log(`[SessionList] Got ${response.data.length} sessions for ${userRole}`);
      
      if (response.data && Array.isArray(response.data)) {
        setSessions(response.data);
      } else {
        console.error("[SessionList] Invalid session data format:", response.data);
        setError('Received invalid session data format');
      }
    } catch (err) {
      console.error('[SessionList] Error fetching sessions:', err);
      console.error('[SessionList] Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      setError('Failed to load sessions. Please try again later.');
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = (session) => {
    try {
      console.log("[SessionList] Attempting to join session:", session);
      
      // Navigate to the appropriate route based on session type
      if (session.type === 'video') {
        navigate(`/video-call/${session._id}`);
      } else if (session.type === 'chat') {
        navigate(`/chat/${session._id}`);
      } else {
        toast.error('Unknown session type');
      }
    } catch (error) {
      console.error('[SessionList] Error joining session:', error);
      toast.error('Failed to join session');
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, "MMM d, yyyy 'at' h:mm a");
    } catch (error) {
      console.error('[SessionList] Error formatting date:', error);
      return dateString;
    }
  };

  const renderSessionTypeIcon = (type) => {
    if (type === 'video') {
      return <VideoIcon className="h-4 w-4 text-blue-500" />;
    } else if (type === 'chat') {
      return <MessageSquareIcon className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const getFilteredSessions = () => {
    const now = new Date();
    
    if (previewMode && limit) {
      // In preview mode, just return the upcoming active sessions
      const upcomingSessions = sessions
        .filter(session => session.status === 'active' && isAfter(parseISO(session.startTime), now))
        .sort((a, b) => parseISO(a.startTime) - parseISO(b.startTime))
        .slice(0, limit);
        
      return upcomingSessions;
    }
    
    // For full view, filter based on active tab
    switch (activeTab) {
      case 'upcoming':
        return sessions
          .filter(session => session.status === 'active' && isAfter(parseISO(session.startTime), now))
          .sort((a, b) => parseISO(a.startTime) - parseISO(b.startTime));
          
      case 'past':
        return sessions
          .filter(session => session.status === 'completed' || !isAfter(parseISO(session.startTime), now))
          .sort((a, b) => parseISO(b.startTime) - parseISO(a.startTime));
          
      case 'cancelled':
        return sessions
          .filter(session => session.status === 'cancelled')
          .sort((a, b) => parseISO(b.startTime) - parseISO(a.startTime));
          
      case 'all':
      default:
        return sessions.sort((a, b) => parseISO(b.startTime) - parseISO(a.startTime));
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  // Enhanced UI for sessions display
  if (previewMode) {
    const filteredSessions = getFilteredSessions();
    
    return (
      <div>
        {loading ? (
          <div className="animate-pulse p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-10 bg-gray-200 rounded mb-3"></div>
            <div className="h-10 bg-gray-200 rounded mb-3"></div>
          </div>
        ) : error ? (
          <div className="text-red-500 p-4 bg-red-50 rounded-lg flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-4 text-neutral-500">
            {userRole === 'mentor' ? (
              <p>No upcoming sessions scheduled. Create a new session to get started.</p>
            ) : (
              <p>No upcoming sessions scheduled with your mentor yet.</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSessions.map((session) => (
              <div key={session._id} className="p-3 bg-white rounded border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  {renderSessionTypeIcon(session.type)}
                  <span className="font-medium">{session.title}</span>
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {formatDateTime(session.startTime)}
                  </div>
                  
                  <div className="flex items-center mt-1">
                    {userRole === 'mentee' ? (
                      <>
                        <Avatar 
                          src={session.mentor?.profileImage}
                          name={session.mentor?.name || 'Mentor'}
                          alt={session.mentor?.name || 'Mentor'}
                          size="xs"
                          className="mr-1"
                        />
                        With {session.mentor?.name || 'Mentor'}
                      </>
                    ) : (
                      <>
                        <Avatar 
                          src={session.mentee?.profileImage}
                          name={session.mentee?.name || 'Mentee'}
                          alt={session.mentee?.name || 'Mentee'}
                          size="xs"
                          className="mr-1"
                        />
                        With {session.mentee?.name || 'Mentee'}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">My Sessions</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="flex items-center gap-1"
          onClick={() => fetchSessions()}
          disabled={loading}
        >
          <RotateCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="upcoming" value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <div className="animate-pulse p-4 space-y-3">
              <div className="h-20 bg-slate-200 rounded mb-3"></div>
              <div className="h-20 bg-slate-200 rounded mb-3"></div>
              <div className="h-20 bg-slate-200 rounded mb-3"></div>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <div>
                <p className="font-semibold">Error loading sessions</p>
                <p className="text-sm">{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  onClick={fetchSessions}
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : getFilteredSessions().length === 0 ? (
            <Card className="p-8 text-center">
              <div className="flex flex-col items-center">
                <CalendarIcon className="h-16 w-16 text-neutral-300 mb-4" />
                <h3 className="text-xl font-semibold mb-2">No sessions found</h3>
                <p className="text-neutral-500 mb-4">
                  {activeTab === 'upcoming' && userRole === 'mentee' 
                    ? "You don't have any upcoming sessions scheduled with your mentor yet."
                    : activeTab === 'upcoming' && userRole === 'mentor'
                    ? "You don't have any upcoming sessions scheduled. Create a session to get started."
                    : `No ${activeTab} sessions found.`
                  }
                </p>
                
                {userRole === 'mentor' && activeTab === 'upcoming' && (
                  <Button 
                    onClick={() => navigate('/sessions')}
                    className="bg-primary-600 hover:bg-primary-700"
                  >
                    Schedule a Session
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {getFilteredSessions().map(session => (
                <Card key={session._id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {renderSessionTypeIcon(session.type)}
                          <h3 className="font-semibold text-lg">{session.title}</h3>
                          <Badge
                            variant={
                              session.status === 'active' ? 'default' : 
                              session.status === 'completed' ? 'secondary' : 'outline'
                            }
                          >
                            {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                          </Badge>
                        </div>
                        
                        {session.description && (
                          <p className="text-neutral-600 text-sm mb-3">{session.description}</p>
                        )}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-1 gap-x-4 text-sm mt-3">
                          <div className="flex items-center text-neutral-500">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            {format(parseISO(session.startTime), "MMMM d, yyyy")}
                          </div>
                          
                          <div className="flex items-center text-neutral-500">
                            <ClockIcon className="h-4 w-4 mr-2" />
                            {format(parseISO(session.startTime), "h:mm a")}
                          </div>
                          
                          <div className="flex items-center mt-1">
                            {userRole === 'mentee' ? (
                              <>
                                <Avatar 
                                  src={session.mentor?.profileImage}
                                  name={session.mentor?.name || 'Mentor'}
                                  alt={session.mentor?.name || 'Mentor'}
                                  size="sm"
                                  border={true}
                                  borderColor="primary"
                                  className="mr-2"
                                />
                                <span>With {session.mentor?.name || 'Mentor'}</span>
                              </>
                            ) : (
                              <>
                                <Avatar 
                                  src={session.mentee?.profileImage}
                                  name={session.mentee?.name || 'Mentee'}
                                  alt={session.mentee?.name || 'Mentee'}
                                  size="sm"
                                  border={true}
                                  borderColor="primary"
                                  className="mr-2"
                                />
                                <span>With {session.mentee?.name || 'Mentee'}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {session.status === 'active' && isAfter(parseISO(session.startTime), new Date()) && (
                        <div className="flex justify-end mt-4">
                          <Button
                            onClick={() => handleJoinSession(session)}
                            className="bg-primary-600 hover:bg-primary-700"
                          >
                            {session.type === 'video' ? (
                              <>
                                <VideoIcon className="h-4 w-4 mr-2" />
                                Join Video Call
                              </>
                            ) : (
                              <>
                                <MessageSquareIcon className="h-4 w-4 mr-2" />
                                Join Chat Session
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SessionList; 