const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io;

const initializeSocket = (server) => {
  io = socketIo(server, {
    cors: {
      origin: "http://localhost:5173", // Your frontend URL
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.name);

    // Join personal room for direct messages
    socket.join(`user_${socket.user._id}`);

    // Join group rooms
    socket.on('joinGroup', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    // Leave group room
    socket.on('leaveGroup', (groupId) => {
      socket.leave(`group_${groupId}`);
    });

    // Handle direct message
    socket.on('sendDirectMessage', async (data) => {
      const { recipientId, message } = data;
      io.to(`user_${recipientId}`).emit('newDirectMessage', {
        senderId: socket.user._id,
        senderName: socket.user.name,
        message,
        timestamp: new Date()
      });
    });

    // Handle group message
    socket.on('sendGroupMessage', async (data) => {
      const { groupId, message } = data;
      io.to(`group_${groupId}`).emit('newGroupMessage', {
        senderId: socket.user._id,
        senderName: socket.user.name,
        message,
        groupId,
        timestamp: new Date()
      });
    });

    // Handle typing status
    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      io.to(`user_${recipientId}`).emit('userTyping', {
        userId: socket.user._id,
        isTyping
      });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.name);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIo
}; 