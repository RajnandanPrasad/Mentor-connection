import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (!token || !user) {
      // Disconnect and reset socket if user is not authenticated
      if (socket) {
        console.log('Disconnecting socket due to missing auth');
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Initialize socket connection
    let socketUrl = import.meta.env.VITE_SOCKET_URL;
    
    // If VITE_SOCKET_URL is not defined, try to use the API URL as fallback
    if (!socketUrl) {
      socketUrl = import.meta.env.VITE_API_URL || '';
      console.log('VITE_SOCKET_URL not defined, falling back to API URL:', socketUrl);
    }
    
    // If still no URL, use localhost as a last resort
    if (!socketUrl) {
      socketUrl = 'http://localhost:5000';
      console.warn('No socket URL defined in environment, using localhost as fallback');
    }
    
    console.log('Initializing socket connection to:', socketUrl);
    
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000 // Increase timeout to give more time for connection
    });

    newSocket.on('connect', () => {
      console.log('Socket connected successfully with ID:', newSocket.id);
      setIsConnected(true);
      setReconnectAttempts(0);
      
      // If this was a reconnection, show a toast
      if (isReconnecting) {
        toast.success('Connection restored');
        setIsReconnecting(false);
      }
      
      // Join user's personal room for targeted events
      newSocket.emit('join', { userId: user._id });
      console.log('Joined user room:', user._id);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
      
      // Only show toast on first connection error
      if (!isReconnecting && reconnectAttempts === 0) {
        toast.error('Connection lost. Attempting to reconnect...');
        setIsReconnecting(true);
      }
      
      setReconnectAttempts(prev => prev + 1);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket reconnection attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
      setIsReconnecting(true);
    });

    newSocket.on('reconnect_failed', () => {
      console.log('Socket reconnection failed');
      toast.error('Failed to reconnect. Please refresh the page.');
      setIsReconnecting(false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // Only show toast for unexpected disconnects
      if (reason !== 'io client disconnect') {
        toast.error('Connection lost. Attempting to reconnect...');
        setIsReconnecting(true);
      }
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket) {
        // Leave user's room
        if (user && user._id) {
          newSocket.emit('leave', { userId: user._id });
        }
        newSocket.disconnect();
      }
    };
  }, [token, user]);

  // Manually reconnect function that can be called from components
  const reconnect = () => {
    if (socket) {
      console.log('Manually reconnecting socket...');
      
      // Create a function to test the connection
      const testConnection = () => {
        if (!socket) return;
        
        // If we already have a socket ID, we're likely connected
        if (socket.id) {
          console.log('Socket appears to be connected with ID:', socket.id);
          setIsConnected(true);
          setIsReconnecting(false);
          toast.success('Connection verified');
          return true;
        }
        
        // If not, try a simple echo test
        const testId = Date.now();
        console.log('Testing socket connection with testId:', testId);
        
        // Set up a one-time listener for the echo response
        socket.once(`echo-response-${testId}`, (response) => {
          console.log('Received echo response:', response);
          setIsConnected(true);
          setIsReconnecting(false);
          toast.success('Connection verified');
        });
        
        // Send the echo test
        socket.emit('echo-test', { testId, timestamp: new Date().toISOString() });
        
        // Set a timeout to check if we got a response
        setTimeout(() => {
          // If we're still reconnecting, the echo test failed
          if (isReconnecting) {
            console.log('Echo test failed, attempting full reconnection');
            // Try a full disconnect/reconnect cycle
            socket.disconnect();
            setTimeout(() => {
              socket.connect();
            }, 1000);
          }
        }, 2000);
      };
      
      // Try the connection test first
      toast.loading('Testing connection...', { id: 'reconnect-test' });
      setIsReconnecting(true);
      
      // First try just checking if we're actually connected
      testConnection();
      
      // Set a timeout to force reconnect if testing doesn't work
      setTimeout(() => {
        if (isReconnecting) {
          console.log('Connection test timed out, forcing reconnect');
          socket.disconnect();
          socket.connect();
          toast.loading('Reconnecting...', { id: 'reconnect-test' });
        } else {
          toast.dismiss('reconnect-test');
        }
      }, 3000);
    } else {
      console.error('Cannot reconnect: Socket not initialized');
      toast.error('Connection error: Please refresh the page');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, isReconnecting, reconnect }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext; 