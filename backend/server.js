const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require('http');
const { initializeSocket } = require('./services/socket');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initializeSocket(server);

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend-vercel-url.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Import Routes
const authRoutes = require("./routes/auth");
const mentorRoutes = require("./routes/mentors");
const chatRoutes = require("./routes/chats");
const groupRoutes = require("./routes/groups");
const connectionRoutes = require("./routes/connections");

// Use Routes
app.use("/api/auth", authRoutes);
app.use("/api/mentors", mentorRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/connections", connectionRoutes);

// Add this route to test API connectivity
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is connected!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  dbName: "mentorconnect", // ✅ Ensure correct database is used
  useNewUrlParser: true,   // ✅ Best practice for MongoDB connection
  useUnifiedTopology: true
})
  .then(() => console.log("✅ MongoDB Connected to:", mongoose.connection.name))
  .catch((error) => console.log("❌ MongoDB Connection Error:", error));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
