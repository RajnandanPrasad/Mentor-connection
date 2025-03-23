import { io } from 'socket.io-client';

let socket = null;

export const initSocket = (token) => {
  if (!socket) {
    socket = io(import.meta.env.VITE_API_URL, {
      auth: { token }
    });
  }
  return socket;
};

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