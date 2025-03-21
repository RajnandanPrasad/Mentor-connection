const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { authMiddleware, authorizeRoles } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Signup Route
router.post("/signup", async (req, res) => {
  try {
    // Add debugging logs
    console.log('Received signup request:', req.body);
    
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
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

    // Generate JWT token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return success with token and user data
    res.status(201).json({
      success: true,
      message: 'User created successfully',
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
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error during signup'
    });
  }
});

// ✅ Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      token,
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
