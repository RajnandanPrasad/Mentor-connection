const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const User = require("../models/User");
const MentorshipRequest = require("../models/MentorshipRequest");
const Chat = require("../models/Chat");

// Get all verified mentors
router.get("/", async (req, res) => {
  try {
    const { search, title, experienceLevel, rating } = req.query;
    
    // Base query to find mentors
    let query = {
      role: "mentor"
    };

    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { "mentorProfile.title": { $regex: search, $options: "i" } },
        { "mentorProfile.bio": { $regex: search, $options: "i" } }
      ];
    }

    // Add title filter
    if (title) {
      query["mentorProfile.title"] = { $regex: title, $options: "i" };
    }

    // Add experience level filter
    if (experienceLevel) {
      query["mentorProfile.experienceLevel"] = experienceLevel;
    }

    // Add rating filter
    if (rating) {
      query["mentorProfile.rating"] = { $gte: parseFloat(rating) };
    }

    console.log("Mentor search query:", query);

    const mentors = await User.find(query)
      .select("-password")
      .sort({ "mentorProfile.rating": -1 });

    console.log(`Found ${mentors.length} mentors`);

    res.json(mentors);
  } catch (error) {
    console.error("Error in /mentors route:", error);
    res.status(500).json({ message: "Error fetching mentors", error: error.message });
  }
});

// Get mentor's pending requests
router.get("/requests", authMiddleware, async (req, res) => {
  try {
    const requests = await MentorshipRequest.find({
      mentor: req.user._id,
      status: "pending"
    })
    .populate("mentee", "name email")
    .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    console.error("Error fetching requests:", error);
    res.status(500).json({ message: "Error fetching requests", error: error.message });
  }
});

// Update request status
router.put("/requests/:requestId", authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const request = await MentorshipRequest.findOne({
      _id: req.params.requestId,
      mentor: req.user._id
    }).populate('mentee');

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    request.status = status;
    await request.save();

    // If request is accepted, create a chat
    if (status === 'accepted') {
      // Check if chat already exists
      const existingChat = await Chat.findOne({
        mentor: req.user._id,
        mentee: request.mentee._id,
        status: "active"
      });

      if (!existingChat) {
        // Create new chat
        const newChat = new Chat({
          mentor: req.user._id,
          mentee: request.mentee._id
        });
        await newChat.save();
      }
    }

    res.json(request);
  } catch (error) {
    console.error("Error updating request:", error);
    res.status(500).json({ message: "Error updating request", error: error.message });
  }
});

// Get mentor by ID
router.get("/:id", async (req, res) => {
  try {
    const mentor = await User.findOne({
      _id: req.params.id,
      role: "mentor"
    }).select("-password");

    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    res.json(mentor);
  } catch (error) {
    res.status(500).json({ message: "Error fetching mentor", error: error.message });
  }
});

// Request mentorship (protected route)
router.post("/:id/request", authMiddleware, async (req, res) => {
  try {
    const mentor = await User.findOne({
      _id: req.params.id,
      role: "mentor"
    });

    if (!mentor) {
      return res.status(404).json({ message: "Mentor not found" });
    }

    if (!mentor.mentorProfile.availability) {
      return res.status(400).json({ message: "This mentor is currently unavailable" });
    }

    // Check if there's already a pending request
    const existingRequest = await MentorshipRequest.findOne({
      mentee: req.user._id,
      mentor: mentor._id,
      status: "pending"
    });

    if (existingRequest) {
      return res.status(400).json({ message: "You already have a pending request with this mentor" });
    }

    // Create new request
    const request = new MentorshipRequest({
      mentee: req.user._id,
      mentor: mentor._id,
      message: req.body.message || "I would like to request mentorship"
    });

    await request.save();
    res.json({ message: "Mentorship request sent successfully", request });
  } catch (error) {
    console.error("Error sending request:", error);
    res.status(500).json({ message: "Error sending request", error: error.message });
  }
});

// Update mentor profile (protected route)
router.put("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user || user.role !== "mentor") {
      return res.status(403).json({ message: "Not authorized" });
    }

    user.mentorProfile = {
      ...user.mentorProfile,
      ...req.body
    };

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error: error.message });
  }
});

module.exports = router; 