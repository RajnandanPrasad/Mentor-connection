import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { 
  CalendarIcon, 
  ClockIcon, 
  VideoIcon, 
  MessageSquareIcon, 
  PencilIcon, 
  TrashIcon,
  XIcon,
  CheckIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const SessionScheduler = ({ userId, userRole, mentees = [], previewMode = false, limit = undefined }) => {
  const { user, token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedMentee, setSelectedMentee] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'video',
    startTime: '',
    endTime: '',
  });
  const [errors, setErrors] = useState({});
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // For debugging
  console.log("SessionScheduler component rendered with:", {
    userId,
    userRole,
    mentees: mentees?.length || 0,
    previewMode,
    limit
  });

  useEffect(() => {
    if (user && user._id) {
      console.log("Fetching sessions for mentor:", user._id);
      fetchSessions();
    } else {
      console.log("No user data available to fetch sessions");
      setLoading(false);
    }
  }, [user]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      console.log("Making API request to:", `${apiUrl}/api/sessions/mentor/${user._id}`);
      console.log("With token:", token ? "Token exists" : "No token");
      
      const response = await axios.get(`${apiUrl}/api/sessions/mentor/${user._id}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("Sessions API response:", response.data);
      
      // Filter to only show active (not completed or cancelled) sessions
      const activeSessions = response.data.filter(session => session.status === 'active');
      
      // Sort by start time, nearest first
      const sortedSessions = activeSessions.sort((a, b) => 
        new Date(a.startTime) - new Date(b.startTime)
      );
      
      // Apply limit if in preview mode
      const limitedSessions = previewMode && limit ? sortedSessions.slice(0, limit) : sortedSessions;
      
      setSessions(limitedSessions);
      console.log("Sessions state set with", limitedSessions.length, "sessions");
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load scheduled sessions');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.type) {
      newErrors.type = 'Session type is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    } else {
      try {
        const startDate = new Date(formData.startTime);
        if (isAfter(new Date(), startDate)) {
          newErrors.startTime = 'Start time must be in the future';
        }
      } catch (error) {
        console.error("Error validating start time:", error);
        newErrors.startTime = 'Invalid date format';
      }
    }
    
    if (formData.endTime && formData.startTime) {
      try {
        const startDate = new Date(formData.startTime);
        const endDate = new Date(formData.endTime);
        
        if (isAfter(startDate, endDate)) {
          newErrors.endTime = 'End time must be after start time';
        }
      } catch (error) {
        console.error("Error validating end time:", error);
        newErrors.endTime = 'Invalid date format';
      }
    }
    
    if (!selectedMentee) {
      newErrors.mentee = 'Please select a mentee';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectChange = (name, value) => {
    if (name === 'mentee') {
      setSelectedMentee(value);
      console.log("Selected mentee changed to:", value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      console.log("Form validation failed with errors:", errors);
      return;
    }
    
    try {
      setLoading(true);
      
      const sessionData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        startTime: formData.startTime,
        endTime: formData.endTime || null,
        menteeId: selectedMentee
      };
      
      console.log("Submitting session data:", sessionData);
      
      let response;
      
      if (selectedSession) {
        // Update existing session
        console.log("Updating existing session:", selectedSession._id);
        response = await axios.put(
          `${apiUrl}/api/sessions/${selectedSession._id}`, 
          sessionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log("Session update response:", response.data);
        toast.success('Session updated successfully');
      } else {
        // Create new session
        console.log("Creating new session");
        response = await axios.post(
          `${apiUrl}/api/sessions/create`, 
          sessionData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log("Session creation response:", response.data);
        toast.success('Session scheduled successfully');
      }
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        type: 'video',
        startTime: '',
        endTime: '',
      });
      setSelectedSession(null);
      setShowForm(false);
      
      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error('Error scheduling session:', error.response?.data || error.message);
      toast.error('Failed to schedule session: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (session) => {
    console.log("Editing session:", session);
    setSelectedSession(session);
    setSelectedMentee(session.mentee._id);
    
    try {
      setFormData({
        title: session.title,
        description: session.description || '',
        type: session.type,
        startTime: format(new Date(session.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: session.endTime ? format(new Date(session.endTime), "yyyy-MM-dd'T'HH:mm") : '',
      });
    } catch (error) {
      console.error("Error formatting session dates:", error);
      
      // Fallback approach with direct ISO string
      setFormData({
        title: session.title,
        description: session.description || '',
        type: session.type,
        startTime: session.startTime,
        endTime: session.endTime || '',
      });
    }
    
    setShowForm(true);
  };

  const handleCancel = async (sessionId) => {
    if (!window.confirm('Are you sure you want to cancel this session?')) {
      return;
    }
    
    try {
      setLoading(true);
      console.log("Cancelling session:", sessionId);
      
      await axios.put(
        `${apiUrl}/api/sessions/${sessionId}/cancel`, 
        { reason: 'Cancelled by mentor' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Session cancelled successfully');
      
      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error('Error cancelling session:', error);
      toast.error('Failed to cancel session');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    try {
      const date = parseISO(dateString);
      return format(date, 'MMM dd, yyyy h:mm a');
    } catch (error) {
      console.error("Date formatting error:", error, "for date string:", dateString);
      return 'Invalid date';
    }
  };

  const renderSessionTypeIcon = (type) => {
    if (type === 'video') {
      return <VideoIcon className="h-5 w-5 text-blue-500" />;
    } else {
      return <MessageSquareIcon className="h-5 w-5 text-green-500" />;
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'video',
      startTime: '',
      endTime: '',
    });
    setSelectedSession(null);
    setErrors({});
  };

  console.log("Rendering SessionScheduler with sessions:", sessions.length);
  if (previewMode) {
    console.log("In preview mode with limit:", limit);
  }

  // In preview mode, show a simplified version
  if (previewMode) {
    return (
      <div>
        {loading ? (
          <div className="flex justify-center p-4">
            <svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            No upcoming sessions scheduled
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
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
                    <img 
                      src={session.mentee?.profileImage || `https://ui-avatars.com/api/?name=${session.mentee?.name ? encodeURIComponent(session.mentee.name) : 'Mentee'}`} 
                      alt={session.mentee?.name || 'Mentee'}
                      className="h-4 w-4 rounded-full mr-1"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = `https://ui-avatars.com/api/?name=M&background=random`;
                      }}
                    />
                    With {session.mentee?.name || 'Mentee'}
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Session Scheduler</h2>
        <div>
          {!showForm && (
            <Button 
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="bg-primary-600 hover:bg-primary-700"
            >
              Schedule New Session
            </Button>
          )}
          {showForm && (
            <Button 
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
              variant="outline"
              className="text-gray-500"
            >
              <XIcon className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
        </div>
      </div>
      
      {showForm && (
        <Card className="border border-gray-200">
          <CardHeader className="bg-gray-50 border-b border-gray-200">
            <CardTitle className="text-lg">
              {selectedSession ? 'Edit Session' : 'Schedule New Session'}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Session Title <span className="text-red-500">*</span></Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter session title"
                  className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter session details or agenda"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Session Type <span className="text-red-500">*</span></Label>
                  <Select>
                    <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select type">
                        {formData.type === 'video' && 'Video Call'}
                        {formData.type === 'chat' && 'Chat Session'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="video" 
                        selected={formData.type === 'video'}
                        onSelect={() => handleSelectChange('type', 'video')}
                      >
                        <div className="flex items-center">
                          <VideoIcon className="h-4 w-4 mr-2 text-blue-500" />
                          Video Call
                        </div>
                      </SelectItem>
                      <SelectItem 
                        value="chat" 
                        selected={formData.type === 'chat'}
                        onSelect={() => handleSelectChange('type', 'chat')}
                      >
                        <div className="flex items-center">
                          <MessageSquareIcon className="h-4 w-4 mr-2 text-green-500" />
                          Chat Session
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-red-500 text-sm mt-1">{errors.type}</p>}
                </div>
                
                <div>
                  <Label htmlFor="mentee">Mentee <span className="text-red-500">*</span></Label>
                  <Select>
                    <SelectTrigger className={errors.mentee ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select mentee">
                        {selectedMentee && mentees.find(m => m._id === selectedMentee)?.name}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {mentees.length > 0 ? (
                        mentees.map(mentee => (
                          <SelectItem 
                            key={mentee._id} 
                            value={mentee._id}
                            selected={selectedMentee === mentee._id}
                            onSelect={() => handleSelectChange('mentee', mentee._id)}
                          >
                            {mentee.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-gray-500 text-sm">No mentees available</div>
                      )}
                    </SelectContent>
                  </Select>
                  {errors.mentee && <p className="text-red-500 text-sm mt-1">{errors.mentee}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time <span className="text-red-500">*</span></Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={handleChange}
                    className={errors.startTime ? 'border-red-500' : ''}
                  />
                  {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
                </div>
                
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={handleChange}
                    className={errors.endTime ? 'border-red-500' : ''}
                  />
                  {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  {loading ? (
                    <>
                      <span className="mr-2">
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </span>
                      {selectedSession ? 'Updating...' : 'Scheduling...'}
                    </>
                  ) : (
                    <>
                      {selectedSession ? 'Update Session' : 'Schedule Session'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      
      <div>
        <h3 className="text-lg font-medium mb-3">Upcoming Sessions</h3>
        {loading && sessions.length === 0 ? (
          <div className="flex justify-center p-4">
            <svg className="animate-spin h-6 w-6 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        ) : sessions.length === 0 ? (
          <Card className="bg-gray-50 border border-dashed border-gray-200">
            <CardContent className="flex flex-col items-center justify-center p-6">
              <CalendarIcon className="h-12 w-12 text-gray-400 mb-2" />
              <p className="text-gray-500 text-center">No upcoming sessions scheduled</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowForm(true);
                }}
                variant="outline"
                className="mt-4"
              >
                Schedule your first session
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(session => {
              try {
                const isPastSession = isAfter(new Date(), new Date(session.startTime));
                
                return (
                  <Card 
                    key={session._id} 
                    className={`border ${isPastSession ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {renderSessionTypeIcon(session.type)}
                            <h4 className="text-lg font-medium ml-2">{session.title}</h4>
                          </div>
                          
                          <div className="flex flex-col space-y-1 text-sm text-gray-500 mt-1">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              <span>{formatDateTime(session.startTime)}</span>
                            </div>
                            
                            {session.endTime && (
                              <div className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-2" />
                                <span>Until {formatDateTime(session.endTime)}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center mt-1">
                              <img 
                                src={session.mentee?.profileImage || `https://ui-avatars.com/api/?name=${session.mentee?.name ? encodeURIComponent(session.mentee.name) : 'Mentee'}`} 
                                alt={session.mentee?.name || 'Mentee'}
                                className="h-5 w-5 rounded-full mr-2"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = `https://ui-avatars.com/api/?name=M&background=random`;
                                }}
                              />
                              <span>With {session.mentee?.name || 'Mentee'}</span>
                            </div>
                          </div>
                          
                          {session.description && (
                            <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                              {session.description}
                            </p>
                          )}
                          
                          {isPastSession && (
                            <div className="flex items-center mt-2 text-yellow-700 bg-yellow-100 px-2 py-1 rounded text-xs">
                              <AlertTriangleIcon className="h-3 w-3 mr-1" />
                              This session's start time has passed
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleEdit(session)}
                            size="sm"
                            variant="outline"
                            className="flex items-center"
                          >
                            <PencilIcon className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            onClick={() => handleCancel(session._id)}
                            size="sm"
                            variant="outline"
                            className="flex items-center text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          >
                            <TrashIcon className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden sm:inline">Cancel</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              } catch (error) {
                console.error("Error rendering session card:", error, "Session:", session);
                return null;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionScheduler; 