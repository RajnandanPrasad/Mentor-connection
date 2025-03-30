import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { toast } from 'react-hot-toast';

const SocketContext = React.createContext();

const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const MAX_RECONNECT_ATTEMPTS = 5;

  useEffect(() => {
    if (!token) return;

    setConnectionStatus('connecting');
    setConnectionError(null);

    if (socket) {
      socket.disconnect();
    }

    const newSocket = io(apiUrl, {
      auth: {
        token
      },
      reconnection: true,
      reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnectionStatus('connected');
      setConnectionError(null);
      setReconnectAttempts(0);
      toast.success("Connection established successfully");
    });

    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setConnectionStatus('error');
      setConnectionError(`Connection error: ${err.message}`);
      toast.error(`Connection error: ${err.message}`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnectionStatus('disconnected');
      
      if (reason === 'io server disconnect') {
        toast.warning("Disconnected from server. Attempting to reconnect...");
        newSocket.connect();
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
      setReconnectAttempts(attemptNumber);
      setConnectionStatus('connecting');
      
      if (attemptNumber === 1) {
        toast.info("Connection lost. Attempting to reconnect...");
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
      setConnectionError(null);
      toast.success("Reconnected successfully");
    });

    newSocket.on('reconnect_error', (err) => {
      console.error('Reconnection error:', err);
      setConnectionError(`Reconnection error: ${err.message}`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Failed to reconnect after maximum attempts');
      setConnectionStatus('failed');
      setConnectionError('Failed to reconnect after maximum attempts');
      toast.error("Failed to establish connection. Please refresh the page.");
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, apiUrl]);

  const reconnect = useCallback(() => {
    if (socket) {
      setConnectionStatus('connecting');
      socket.connect();
      toast.info("Attempting to reconnect...");
    }
  }, [socket]);

  const value = {
    socket,
    isConnected: connectionStatus === 'connected',
    connectionStatus,
    connectionError,
    reconnectAttempts,
    reconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;

export { SocketContext, SocketProvider }; 