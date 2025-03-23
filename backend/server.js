const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require('http');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');
const socketIo = require("socket.io");

dotenv.config();

const app = express();

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === "production" 
    ? "https://mentor-connect-og82.onrender.com"
    : "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const mentorImagesDir = path.join(uploadsDir, 'mentor-images');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(mentorImagesDir)) {
  fs.mkdirSync(mentorImagesDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadsDir));

// Import Routes
const authRoutes = require("./routes/auth");
const mentorRoutes = require("./routes/mentors");
const taskRoutes = require("./routes/tasks");
const chatRoutes = require("./routes/chats");
const groupRoutes = require("./routes/groups");
const connectionRoutes = require("./routes/connections");
const skillRoutes = require("./routes/skills");
const achievementRoutes = require("./routes/achievements");
const preferenceRoutes = require("./routes/preferences");

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/preferences", preferenceRoutes);

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server with CORS
const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join', (userId) => {
    if (userId) {
      console.log('User joined room:', userId);
      socket.join(`user_${userId}`);
    }
  });

  socket.on('joinChat', (chatId) => {
    if (chatId) {
      console.log('User joined chat:', chatId);
      socket.join(`chat_${chatId}`);
    }
  });

  socket.on('leaveChat', (chatId) => {
    if (chatId) {
      console.log('User left chat:', chatId);
      socket.leave(`chat_${chatId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to other modules
global.io = io;

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Connect to MongoDB and start server
console.log('Starting server...');
connectDB()
  .then(() => {
    console.log('MongoDB connection successful');
    
    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });

    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log(`⚠️ Port ${port} is busy, trying port ${port + 1}`);
        server.close();
        server.listen(port + 1);
      } else {
        console.error('❌ Server error:', error);
      }
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  });
