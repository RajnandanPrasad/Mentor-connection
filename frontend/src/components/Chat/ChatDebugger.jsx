import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { Wifi, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * ChatDebugger component for troubleshooting chat connection issues
 */
const ChatDebugger = ({ 
  onClose, 
  socket: externalSocket, 
  userId: externalUserId, 
  isConnected: externalIsConnected,
  onReconnect: externalReconnect,
  mentorId 
}) => {
  // Use either props or context
  const socketContext = useSocket();
  const authContext = useAuth();
  
  const socket = externalSocket || socketContext.socket;
  const isConnected = externalIsConnected !== undefined ? externalIsConnected : socketContext.isConnected;
  const reconnect = externalReconnect || socketContext.reconnect;
  const user = authContext.user;
  const userId = externalUserId || user?._id;
  const token = authContext.token;
  
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState(null);
  const [socketRooms, setSocketRooms] = useState([]);
  
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  
  useEffect(() => {
    // Initial status check when component mounts
    checkServerStatus();
    
    if (socket && socket.connected) {
      checkSocketRooms();
    }
    
    // Clean up any listeners when component unmounts
    return () => {
      if (socket) {
        socket.off('debug-rooms-response');
      }
    };
  }, [socket]);
  
  const checkSocketRooms = () => {
    if (!socket) return;
    
    // Set up a listener for the response
    socket.once('debug-rooms-response', (data) => {
      if (data && data.rooms) {
        setSocketRooms(data.rooms);
        addTestResult('info', `Socket rooms: ${data.rooms.join(', ')}`);
      }
    });
    
    // Request rooms from server
    socket.emit('debug-rooms-request');
  };
  
  const checkServerStatus = async () => {
    try {
      setServerStatus('checking');
      const response = await axios.get(`${apiUrl}/api/health`, { timeout: 5000 });
      setServerStatus('online');
      addTestResult('success', 'Server is online and responsive');
    } catch (error) {
      setServerStatus('offline');
      addTestResult('error', `Server appears to be offline or unreachable: ${error.message}`);
    }
  };
  
  const checkServerConnections = async () => {
    if (!userId) {
      addTestResult('error', 'No user ID available to check connection');
      return;
    }

    setIsLoading(true);
    addTestResult('info', `Checking server connections for user: ${userId}`);
    
    try {
      const response = await axios.get(`${apiUrl}/api/debug/check-user-socket/${userId}`);
      
      if (response.data.isConnected) {
        addTestResult('success', 'Server confirms user is connected ✅');
        addTestResult('info', `Socket ID on server: ${response.data.socketDetails?.id || 'unknown'}`);
        if (response.data.socketDetails?.rooms) {
          addTestResult('info', `Rooms on server: ${JSON.stringify(response.data.socketDetails.rooms)}`);
        }
      } else {
        addTestResult('warning', 'Server shows user is NOT connected');
      }
      
      const connectionsResponse = await axios.get(`${apiUrl}/api/debug/socket-connections`);
      addTestResult('info', `Total tracked connections: ${connectionsResponse.data.totalTrackedUsers}`);
      addTestResult('info', `Active connections: ${connectionsResponse.data.activeConnections}`);
      
      if (connectionsResponse.data.activeUserIds) {
        const userIsListed = connectionsResponse.data.activeUserIds.includes(userId);
        if (userIsListed) {
          addTestResult('success', 'User ID found in active connections list ✅');
        } else {
          addTestResult('warning', 'User ID NOT found in active connections list ❌');
        }
      }
    } catch (error) {
      addTestResult('error', `Failed to check server connections: ${error.message}`);
    }
    
    setIsLoading(false);
  };
  
  const runSocketTest = () => {
    setIsLoading(true);
    setTestResults([]);
    addTestResult('info', 'Starting connection diagnostics...');
    
    // Check if socket instance exists
    if (!socket) {
      addTestResult('error', 'Socket not initialized. This indicates a problem with the SocketContext setup.');
      setIsLoading(false);
      return;
    }
    
    // Check connection status
    addTestResult('info', `Socket connected status: ${isConnected ? 'Connected ✅' : 'Disconnected ❌'}`);
    
    if (socket.id) {
      addTestResult('success', `Socket ID: ${socket.id}`);
    } else {
      addTestResult('warning', 'No socket ID found. This indicates the socket is not fully connected.');
    }
    
    // Check auth data
    if (userId) {
      addTestResult('success', `User ID: ${userId}`);
    } else {
      addTestResult('error', 'User ID missing. Authentication may be incomplete.');
      setIsLoading(false);
      return;
    }
    
    // Check mentor ID
    if (mentorId) {
      addTestResult('info', `Mentor ID: ${mentorId}`);
    } else {
      addTestResult('warning', 'No mentor assigned yet.');
    }
    
    // Check server health
    checkServerStatus();
    
    // Check socket rooms
    checkSocketRooms();
    
    // Check server connections
    checkServerConnections();
  };
  
  const attemptReconnect = () => {
    setIsLoading(true);
    addTestResult('info', 'Attempting to reconnect socket...');
    
    if (reconnect) {
      reconnect();
      
      // Check connection status after a delay
      setTimeout(() => {
        if (isConnected) {
          addTestResult('success', 'Reconnection successful ✅');
          // Attempt to join rooms again
          joinRooms();
        } else {
          addTestResult('error', 'Reconnection failed ❌');
        }
        setIsLoading(false);
      }, 3000);
    } else {
      addTestResult('error', 'Reconnect function not available');
      setIsLoading(false);
    }
  };
  
  const joinRooms = () => {
    if (!socket || !userId) {
      addTestResult('error', 'Cannot join rooms: socket or userId missing');
      return;
    }
    
    try {
      // Join using the join event (supports both formats)
      socket.emit('join', { userId });
      addTestResult('info', `Emitted join event with userId: ${userId}`);
      
      // Join using explicit room name format
      const userRoom = `user_${userId}`;
      socket.emit('join-room', { room: userRoom });
      addTestResult('info', `Emitted join-room event for room: ${userRoom}`);
      
      // Signal that user is online
      socket.emit('user-online', { 
        userId,
        userType: 'mentee',
        timestamp: new Date().toISOString()
      });
      addTestResult('info', 'Emitted user-online event');
      
      // Check rooms after a delay
      setTimeout(() => {
        checkSocketRooms();
      }, 1000);
    } catch (error) {
      addTestResult('error', `Error joining rooms: ${error.message}`);
    }
  };
  
  const checkConnectionWithMentor = async () => {
    if (!socket || !userId || !mentorId) {
      addTestResult('error', 'Cannot check connection: missing socket, userId or mentorId');
      return;
    }
    
    setIsLoading(true);
    addTestResult('info', `Checking connection status between ${userId} and ${mentorId}`);
    
    // Set up listener for results
    socket.once('connection-status-result', (result) => {
      if (result.success) {
        if (result.connected) {
          addTestResult('success', `✅ Active connection exists between user and mentor`);
        } else {
          addTestResult('warning', `❌ No active connection between user and mentor`);
        }
      } else {
        addTestResult('error', `Error checking connection: ${result.error}`);
      }
      setIsLoading(false);
    });
    
    // Set timeout in case server doesn't respond
    setTimeout(() => {
      socket.off('connection-status-result');
      addTestResult('error', 'Connection status check timed out after 5 seconds');
      setIsLoading(false);
    }, 5000);
    
    // Emit the check event
    socket.emit('check-connection-status', {
      userId1: userId,
      userId2: mentorId
    });
  };
  
  const addTestResult = (type, message) => {
    setTestResults(prev => [...prev, { type, message, timestamp: new Date().toISOString() }]);
  };

  // Add a utility function to test notifications
  const testNotification = () => {
    try {
      addTestResult('notification', 'Testing browser notification...');
      
      // Test browser notification
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Test Notification', {
            body: 'This is a test notification from ChatDebugger',
            icon: '/favicon.ico'
          });
          addTestResult('notification', 'Browser notification shown successfully');
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('Test Notification', {
                body: 'This is a test notification from ChatDebugger',
                icon: '/favicon.ico'
              });
              addTestResult('notification', 'Browser notification shown successfully after permission');
            } else {
              addTestResult('notification', `Notification permission: ${permission}`);
            }
          });
        } else {
          addTestResult('notification', 'Notification permission denied by user');
        }
      } else {
        addTestResult('notification', 'Browser does not support notifications');
      }
      
      // Test sound
      addTestResult('notification', 'Testing notification sound...');
      
      // Try to load from the sounds directory first
      const audio = new Audio('/sounds/notification.mp3');
      
      // Add error handling for missing file
      audio.onerror = () => {
        addTestResult('notification', 'Could not load notification.mp3, using fallback');
        
        // Create a simple beep tone as fallback
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.type = 'sine';
          oscillator.frequency.value = 800;
          gainNode.gain.value = 0.3;
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.start();
          
          setTimeout(() => {
            oscillator.stop();
            audioContext.close();
            addTestResult('notification', 'Played fallback sound successfully');
          }, 500);
        } catch (fallbackError) {
          addTestResult('notification', `Error playing fallback sound: ${fallbackError.message}`);
        }
      };
      
      audio.onloadeddata = () => {
        addTestResult('notification', 'Notification sound file loaded successfully');
      };
      
      audio.onended = () => {
        addTestResult('notification', 'Notification sound played successfully');
      };
      
      audio.play().catch(e => {
        addTestResult('notification', `Error playing sound: ${e.message}`);
      });
    } catch (error) {
      addTestResult('notification', `Error testing notification: ${error.message}`);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Chat Connection Diagnostics</h2>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
        </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        <button 
          onClick={checkSocketRooms}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Check Rooms
        </button>
        <button 
          onClick={checkServerStatus}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Check Server
        </button>
        <button 
          onClick={runSocketTest}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Test Socket
        </button>
        <button 
          onClick={attemptReconnect}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Reconnect
        </button>
        <button 
          onClick={joinRooms}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Join Rooms
        </button>
        <button 
          onClick={checkConnectionWithMentor}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
        >
          Check Mentor
        </button>
        <button 
          onClick={testNotification}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm"
        >
          Test Notification
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 border rounded p-2">
          <p className="font-medium mb-1">Socket Status:</p>
          <div className={`flex items-center ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          {socket?.id && <div className="text-xs mt-1">ID: {socket.id}</div>}
          </div>
          
        <div className="bg-gray-50 border rounded p-2">
          <p className="font-medium mb-1">Server Status:</p>
          <div className="flex items-center">
            {serverStatus === 'online' && (
              <><CheckCircle className="w-4 h-4 text-green-500 mr-1" /> <span className="text-green-600">Online</span></>
            )}
            {serverStatus === 'offline' && (
              <><AlertTriangle className="w-4 h-4 text-red-500 mr-1" /> <span className="text-red-600">Offline</span></>
            )}
            {serverStatus === 'checking' && (
              <><Wifi className="w-4 h-4 text-blue-500 mr-1 animate-pulse" /> <span className="text-blue-600">Checking...</span></>
            )}
            {serverStatus === null && <span className="text-gray-400">Unknown</span>}
            </div>
        </div>
      </div>
      
      <div className="border rounded-lg p-4 bg-gray-50 h-60 overflow-y-auto">
        {testResults.length === 0 ? (
          <p className="text-gray-500 italic">Run a test to see results</p>
        ) : (
          <div className="space-y-2">
            {testResults.map((result, index) => (
              <div 
                key={index} 
                className={`p-2 rounded ${
                  result.type === 'error' ? 'bg-red-100 text-red-800' :
                  result.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  result.type === 'success' ? 'bg-green-100 text-green-800' :
                  'bg-blue-100 text-blue-800'
                }`}
              >
                <div className="text-xs opacity-70">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
                <div>{result.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {isLoading && (
        <div className="flex justify-center items-center mt-4">
          <div className="animate-spin h-5 w-5 border-2 border-blue-600 rounded-full border-t-transparent"></div>
          <span className="ml-2">Testing connection...</span>
        </div>
      )}
      
      {socketRooms.length > 0 && (
        <div className="mt-4 text-sm">
          <p className="font-medium">Socket Room Memberships:</p>
          <ul className="list-disc list-inside mt-1">
            {socketRooms.map((room, index) => (
              <li key={index} className="text-gray-700">{room}</li>
            ))}
          </ul>
    </div>
      )}
    </Card>
  );
};

export default ChatDebugger; 