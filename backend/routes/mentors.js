const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const User = require("../models/User");
const MentorshipRequest = require("../models/MentorshipRequest");
const Chat = require("../models/Chat");

// Get all verified mentors
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { 
      search, 
      skills, 
      experienceRange, 
      hourlyRate, 
      availability, 
      rating,
      expertise 
    } = req.query;
    
    console.log("Received query parameters:", req.query);
    
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

    // Add skills filter
    if (skills) {
      const skillsArray = skills.split(',').map(skill => skill.trim());
      query["mentorProfile.skills"] = { $in: skillsArray };
    }

    // Add experience range filter
    if (experienceRange) {
      const [min, max] = experienceRange.split('-').map(Number);
      query.$or = [
        // Check experience field
        {
          "mentorProfile.experience": {
            ...(min && { $gte: min.toString() }),
            ...(max && { $lte: max.toString() })
          }
        },
        // Check experienceLevel field
        {
          "mentorProfile.experienceLevel": {
            $in: ['beginner', 'intermediate', 'expert'].filter(level => {
              if (min <= 2) return level === 'beginner';
              if (min <= 5) return level === 'intermediate';
              return level === 'expert';
            })
          }
        }
      ];
    }

    // Add hourly rate filter
    if (hourlyRate) {
      const [min, max] = hourlyRate.split('-').map(Number);
      query["mentorProfile.hourlyRate"] = {};
      if (min) query["mentorProfile.hourlyRate"].$gte = min;
      if (max) query["mentorProfile.hourlyRate"].$lte = max;
    }

    // Add availability filter
    if (availability === 'true') {
      query["mentorProfile.availability"] = true;
    }

    // Add rating filter
    if (rating) {
      query["mentorProfile.rating"] = { $gte: parseFloat(rating) };
    }

    // Add expertise filter
    if (expertise) {
      query["mentorProfile.expertise"] = { $regex: expertise, $options: "i" };
    }

    console.log("Final MongoDB query:", JSON.stringify(query, null, 2));

    // First, check if there are any mentors at all
    const totalMentors = await User.countDocuments({ role: "mentor" });
    console.log("Total mentors in database:", totalMentors);

    const mentors = await User.find(query)
      .select("-password")
      .sort({ "mentorProfile.rating": -1 });

    console.log(`Found ${mentors.length} mentors matching query`);
    console.log("First mentor data:", mentors[0] ? JSON.stringify(mentors[0], null, 2) : "No mentors found");

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