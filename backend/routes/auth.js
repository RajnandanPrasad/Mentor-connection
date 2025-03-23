const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");
const rateLimit = require('express-rate-limit');
const passwordValidator = require('password-validator');

const router = express.Router();

// Password validation schema
const passwordSchema = new passwordValidator();
passwordSchema
  .is().min(8)                                    // Minimum length 8
  .is().max(100)                                  // Maximum length 100
  .has().uppercase()                              // Must have uppercase letters
  .has().lowercase()                              // Must have lowercase letters
  .has().digits(2)                                // Must have at least 2 digits
  .has().not().spaces()                           // Should not have spaces
  .has().symbols(2);                              // Must have at least 2 special characters

// Rate limiting for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // 15 attempts
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true // Don't count successful requests
});

// Token verification endpoint
router.get("/verify-token", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ valid: false, message: "User not found" });
    }

    // Get session ID from request headers
    const sessionId = req.headers['x-session-id'];
    
    // Return user data with session ID
    res.json({ 
      valid: true, 
      user,
      sessionId // Include session ID in response
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

// ✅ Signup Route
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Password validation
    const passwordValidation = passwordSchema.validate(password, { list: true });
    if (passwordValidation.length > 0) {
      return res.status(400).json({
        message: "Password does not meet requirements",
        errors: passwordValidation
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if user already exists
    if (await User.findOne({ email })) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user object with basic fields
    const userData = {
      name,
      email,
      password,
      role
    };

    // Add mentor profile if role is mentor
    if (role === "mentor") {
      const { mentorData } = req.body;
      
      console.log("Received mentorData:", mentorData); // Debug log

      // Validate mentorData exists
      if (!mentorData) {
        return res.status(400).json({
          message: "Mentor profile data is required",
          errors: { submit: "Mentor profile data is missing" }
        });
      }

      // Validate individual mentor fields
      const mentorErrors = {};
      
      if (!mentorData.title?.trim()) {
        mentorErrors.title = "Professional title is required";
      }
      if (!mentorData.bio?.trim()) {
        mentorErrors.bio = "Bio is required";
      }
      if (!mentorData.experienceLevel) {
        mentorErrors.experienceLevel = "Experience level is required";
      }

      // If there are any validation errors, return them
      if (Object.keys(mentorErrors).length > 0) {
        return res.status(400).json({
          message: "Please fill in all required mentor fields",
          errors: mentorErrors
        });
      }

      userData.mentorProfile = {
        title: mentorData.title.trim(),
        bio: mentorData.bio.trim(),
        experienceLevel: mentorData.experienceLevel,
        location: mentorData.location?.trim() || "",
        isVerified: false,
        availability: true,
        rating: 0,
        totalReviews: 0
      };
    }

    // Create and save user
    const newUser = new User(userData);
    await newUser.save();

    // Generate JWT token with longer expiration
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    // Return success with token and user data
    res.status(201).json({
      message: "User registered successfully!",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        ...(newUser.mentorProfile && { mentorProfile: newUser.mentorProfile })
      }
    });

  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json({ 
      message: "Server error during signup", 
      error: error.message 
    });
  }
});

// ✅ Login Route with rate limiting
router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT with longer expiration
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token expires in 7 days
    );

    // Generate session ID
    const sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);

    res.json({
      token,
      sessionId,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ...(user.mentorProfile && { mentorProfile: user.mentorProfile })
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error during login", error: error.message });
  }
});

// ✅ Mentor Dashboard (Only mentors can access)
router.get("/mentor-dashboard", authMiddleware, authorizeRoles("mentor"), async (req, res) => {
  res.json({ message: "Welcome to the Mentor Dashboard", user: req.user });
});

// ✅ Mentee Dashboard (Only mentees can access)
router.get("/mentee-dashboard", authMiddleware, authorizeRoles("mentee"), async (req, res) => {
  res.json({ message: "Welcome to the Mentee Dashboard", user: req.user });
});

module.exports = router;
