import io from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (socket) return socket;

  socket = io('http://localhost:5000', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinChat = (chatId) => {
  if (socket) {
    socket.emit('joinChat', chatId);
  }
};

export const leaveChat = (chatId) => {
  if (socket) {
    socket.emit('leaveChat', chatId);
  }
}; 