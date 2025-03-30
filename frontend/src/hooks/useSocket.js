import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { token, user } = useAuth();

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    // Initialize socket connection
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join', user._id);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [token, user]);

  return {
    socket: socketRef.current
  };
}; 