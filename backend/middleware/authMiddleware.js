const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ✅ Authentication Middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization");
    console.log("Checking token:", token); // Debug log

    if (!token) {
      console.log("No token provided"); // Debug log
      return res.status(401).json({ message: "Access Denied. No token provided." });
    }

    const decoded = jwt.verify(token.replace("Bearer ", ""), process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Debug log

    req.user = await User.findById(decoded.id).select("-password");
    console.log("Found user:", req.user); // Debug log
    
    if (!req.user) {
      console.log("User not found"); // Debug log
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (error) {
    console.error("Auth error:", error); // Debug log
    res.status(401).json({ message: "Invalid Token" });
  }
};

// ✅ Role-based Authorization Middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access Denied. Insufficient permissions." });
    }
    next();
  };
};

module.exports = { authMiddleware, authorizeRoles };
