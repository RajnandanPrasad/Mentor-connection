const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require('http');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const { initializeSocket, debugSocketConnections, findUserSocket } = require('./services/socket');
const tasksRouter = require('./routes/tasks');
const messageRoutes = require('./routes/messages'); // Import the new messages route

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: ["https://mentor-connection-frontend.onrender.com"],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());

// Import routes
const authRoutes = require("./routes/auth");
const mentorRoutes = require("./routes/mentors");
const menteeRoutes = require("./routes/mentees");
const connectionRoutes = require("./routes/connections");
const taskRoutes = require("./routes/tasks");
const groupRoutes = require("./routes/groups");
const chatRoutes = require("./routes/chatRoutes");
const videoCallRoutes = require("./routes/videoCallRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const goalRoutes = require("./routes/goals");

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = initializeSocket(server);

// Add middleware to attach io to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add debug routes for socket connections
// These routes should only be accessible in development 
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/socket-connections', (req, res) => {
    try {
      const debugInfo = debugSocketConnections();
      res.json({
        success: true,
        ...debugInfo,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error in socket debug endpoint:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  app.get('/api/debug/check-user-socket/:userId', (req, res) => {
    try {
      const { userId } = req.params;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const socket = findUserSocket(userId);
      res.json({
        success: true,
        userId,
        isConnected: !!socket,
        socketDetails: socket ? {
          id: socket.id,
          rooms: Array.from(socket.rooms || []),
          connected: socket.connected
        } : null,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error checking user socket:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/mentees", menteeRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/video-calls", videoCallRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/goals", goalRoutes);
app.use('/api/tasks', tasksRouter);
app.use('/api/messages', require('./routes/messages'));
app.use('/api/messages', messageRoutes); // Register the messages API

// Add a health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date(),
    socketServer: !!io
  });
});





// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Function to find an available port
const findAvailablePort = async (startPort) => {
  return new Promise((resolve, reject) => {
    const server = http.createServer();
    
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
  });
};

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    await connectDB();
    console.log('MongoDB Connected Successfully');

    const PORT = process.env.PORT || 5000;
    const availablePort = await findAvailablePort(PORT);
    
    server.listen(availablePort, () => {
      console.log(`✅ Server running on port ${availablePort}`);
      console.log(`📝 API URL: http://localhost:${availablePort}`);
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${availablePort} is busy, trying next port...`);
        startServer();
      } else {
        console.error('Server error:', err);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
