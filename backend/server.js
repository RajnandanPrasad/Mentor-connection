const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require('http');
const { initializeSocket } = require('./services/socket');
const path = require('path');
const mentorRoutes = require('./routes/mentorRoutes');
const mentorsRoutes = require('./routes/mentors');
const fs = require('fs');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import Routes
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chats");
const groupRoutes = require("./routes/groups");
const connectionRoutes = require("./routes/connections");
const skillRoutes = require("./routes/skills");
const achievementRoutes = require("./routes/achievements");
const preferenceRoutes = require("./routes/preferences");

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/mentors", mentorsRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/connections", connectionRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/achievements", achievementRoutes);
app.use("/api/preferences", preferenceRoutes);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  dbName: "mentorconnect",
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected to:", mongoose.connection.name))
  .catch((error) => console.log("❌ MongoDB Connection Error:", error));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads', 'mentor-images');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const PORT = process.env.PORT || 5000;

// Handle server startup with port retry logic
const startServer = (retryCount = 0) => {
  server.listen(PORT)
    .on('error', (error) => {
      if (error.code === 'EADDRINUSE' && retryCount < 3) {
        console.log(`⚠️ Port ${PORT} is busy, trying port ${PORT + 1}`);
        server.close();
        const newPort = PORT + 1 + retryCount;
        process.env.PORT = newPort;
        startServer(retryCount + 1);
      } else {
        console.error('❌ Server error:', error);
        process.exit(1);
      }
    })
    .on('listening', () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
};

startServer();
