import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { toast } from 'react-hot-toast';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import api from '../services/api';

const SessionTracker = ({ role = 'mentor' }) => {
  const [sessions, setSessions] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeFilter, setTimeFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { socket } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    fetchSessions();
    setupSocketListeners();
    
    // Refresh sessions every 5 minutes
    const intervalId = setInterval(fetchSessions, 300000);
    
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [sessions, timeFilter, typeFilter]);

  const applyFilters = () => {
    let filtered = [...sessions];
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const today = new Date();
      
      switch(timeFilter) {
        case 'today':
          filtered = filtered.filter(session => {
            const sessionDate = parseISO(session.startTime);
            return sessionDate.getDate() === today.getDate() &&
                  sessionDate.getMonth() === today.getMonth() &&
                  sessionDate.getFullYear() === today.getFullYear();
          });
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          filtered = filtered.filter(session => {
            const sessionDate = parseISO(session.startTime);
            return sessionDate >= weekAgo;
          });
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          filtered = filtered.filter(session => {
            const sessionDate = parseISO(session.startTime);
            return sessionDate >= monthAgo;
          });
          break;
      }
    }
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(session => session.type === typeFilter);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => {
      return new Date(b.startTime) - new Date(a.startTime);
    });
    
    setFilteredSessions(filtered);
  };

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let url;
      if (role === 'mentor') {
        url = `/api/sessions/mentor/${user._id}`;
      } else {
        url = `/api/sessions/mentee/${user._id}`;
      }
      
      const response = await api.get(url);
      
      if (!response.data || !Array.isArray(response.data)) {
        throw new Error('Invalid session data received');
      }
      
      setSessions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to fetch session history: ' + (error.message || 'Unknown error'));
      toast.error('Failed to load sessions');
      setLoading(false);
    }
  };

  const setupSocketListeners = () => {
    if (!socket) return;
    
    socket.on('sessionUpdate', (updatedSession) => {
      setSessions(prevSessions => {
        // Check if the session already exists
        const sessionExists = prevSessions.some(session => session._id === updatedSession._id);
        
        if (sessionExists) {
          // Update existing session
          return prevSessions.map(session =>
            session._id === updatedSession._id ? updatedSession : session
          );
        } else {
          // Add new session
          return [...prevSessions, updatedSession];
        }
      });
      
      toast.success('Session information updated');
    });
    
    socket.on('sessionEnded', (sessionId) => {
      setSessions(prevSessions =>
        prevSessions.map(session =>
          session._id === sessionId 
            ? { ...session, status: 'completed', endTime: new Date().toISOString() } 
            : session
        )
      );
    });
  };

  const calculateSessionStats = () => {
    if (!sessions.length) return { total: 0, totalTime: 0, videoCount: 0, chatCount: 0 };
    
    const stats = {
      total: sessions.length,
      totalTime: 0,
      videoCount: 0,
      chatCount: 0
    };
    
    sessions.forEach(session => {
      // Count by type
      if (session.type === 'video') stats.videoCount++;
      if (session.type === 'chat') stats.chatCount++;
      
      // Calculate total time in minutes
      if (session.startTime && (session.endTime || session.status === 'completed')) {
        const start = parseISO(session.startTime);
        const end = session.endTime ? parseISO(session.endTime) : new Date();
        const duration = differenceInMinutes(end, start);
        stats.totalTime += duration > 0 ? duration : 0;
      }
    });
    
    return stats;
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error && sessions.length === 0) {
    return (
      <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
        <p className="mb-4">{error}</p>
        <button 
          onClick={fetchSessions} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    );
  }

  const stats = calculateSessionStats();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Session History</h2>
        <button 
          onClick={fetchSessions} 
          className="text-blue-500 hover:text-blue-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      {/* Session Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-blue-50">
          <div className="text-sm text-gray-500">Total Sessions</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4 bg-green-50">
          <div className="text-sm text-gray-500">Total Hours</div>
          <div className="text-2xl font-bold">{Math.round(stats.totalTime / 60 * 10) / 10}</div>
        </Card>
        <Card className="p-4 bg-purple-50">
          <div className="text-sm text-gray-500">Video Calls</div>
          <div className="text-2xl font-bold">{stats.videoCount}</div>
        </Card>
        <Card className="p-4 bg-yellow-50">
          <div className="text-sm text-gray-500">Chat Sessions</div>
          <div className="text-2xl font-bold">{stats.chatCount}</div>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time Period">
                {timeFilter === 'all' && 'All Time'}
                {timeFilter === 'today' && 'Today'}
                {timeFilter === 'week' && 'Last 7 Days'}
                {timeFilter === 'month' && 'Last 30 Days'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                value="all" 
                selected={timeFilter === 'all'}
                onSelect={() => setTimeFilter('all')}
              >
                All Time
              </SelectItem>
              <SelectItem 
                value="today" 
                selected={timeFilter === 'today'}
                onSelect={() => setTimeFilter('today')}
              >
                Today
              </SelectItem>
              <SelectItem 
                value="week" 
                selected={timeFilter === 'week'}
                onSelect={() => setTimeFilter('week')}
              >
                Last 7 Days
              </SelectItem>
              <SelectItem 
                value="month" 
                selected={timeFilter === 'month'}
                onSelect={() => setTimeFilter('month')}
              >
                Last 30 Days
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Select>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Session Type">
                {typeFilter === 'all' && 'All Types'}
                {typeFilter === 'video' && 'Video Calls'}
                {typeFilter === 'chat' && 'Chat Sessions'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                value="all" 
                selected={typeFilter === 'all'}
                onSelect={() => setTypeFilter('all')}
              >
                All Types
              </SelectItem>
              <SelectItem 
                value="video" 
                selected={typeFilter === 'video'}
                onSelect={() => setTypeFilter('video')}
              >
                Video Calls
              </SelectItem>
              <SelectItem 
                value="chat" 
                selected={typeFilter === 'chat'}
                onSelect={() => setTypeFilter('chat')}
              >
                Chat Sessions
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Sessions List */}
      {filteredSessions.length > 0 ? (
    <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session._id} className="p-4 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
                  <div className="flex items-center">
                    <span className={`mr-2 flex-shrink-0 h-3 w-3 rounded-full ${
                      session.type === 'video' ? 'bg-purple-500' : 'bg-yellow-500'
                    }`}></span>
              <h3 className="font-semibold">
                {session.type === 'video' ? 'Video Call' : 'Chat Session'}
              </h3>
                  </div>
                  
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {session.duration ? 
                          `${Math.round(session.duration / 60)} minutes` : 
                          session.endTime ? 
                            `${differenceInMinutes(parseISO(session.endTime), parseISO(session.startTime))} minutes` : 
                            'In progress'
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {format(parseISO(session.startTime), 'MMM d, yyyy')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {format(parseISO(session.startTime), 'h:mm a')}
                      </span>
                    </div>
                    
                    <div className="flex items-center text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>
                        {role === 'mentor' ? 
                          session.mentee?.name || 'Unknown Mentee' : 
                          session.mentor?.name || 'Unknown Mentor'
                        }
                      </span>
                    </div>
                  </div>
                  
                  {session.notes && (
                    <p className="mt-2 text-sm text-gray-600 border-t pt-2">
                      {session.notes}
                    </p>
                  )}
            </div>
                
                <div className="flex flex-col items-end">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    session.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {session.status === 'completed' ? 'Completed' : 'In Progress'}
                  </span>
                  
                  {session.recording && (
                    <a 
                      href={session.recording} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-2 text-blue-500 hover:text-blue-700 text-sm flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      View Recording
                    </a>
                  )}
            </div>
          </div>
        </Card>
      ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600">No sessions found for the selected filters</p>
          {typeFilter !== 'all' || timeFilter !== 'all' ? (
            <button 
              onClick={() => { setTypeFilter('all'); setTimeFilter('all'); }} 
              className="mt-2 text-blue-500 hover:text-blue-700"
            >
              Clear Filters
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SessionTracker; 