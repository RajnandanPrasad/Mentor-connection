const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const User = require("../models/User");
const MentorshipRequest = require("../models/MentorshipRequest");
const Chat = require("../models/Chat");
const { getIo } = require('../services/socket');
const Connection = require("../models/Connection");
const Review = require("../models/Review");

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
    console.log('Updating request status:', {
      requestId: req.params.requestId,
      status: req.body.status,
      mentorId: req.user._id
    });

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
    console.log('Request updated:', request);

    // If request is accepted, create a connection and chat
    if (status === 'accepted') {
      console.log('Creating connection for accepted request');
      
      // Check if connection already exists
      const existingConnection = await Connection.findOne({
        mentor: req.user._id,
        mentee: request.mentee._id
      });

      let connection;
      if (!existingConnection) {
        // Create a connection
        connection = new Connection({
          mentor: req.user._id,
          mentee: request.mentee._id,
          status: 'accepted',
          requestMessage: request.message,
          startDate: new Date()
        });
        await connection.save();
        console.log('New connection created:', connection._id);

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
            mentee: request.mentee._id,
            status: 'active'
          });
          await newChat.save();
          console.log('New chat created:', newChat._id);
        }

        // Notify the mentee about the accepted request
        const io = getIo();
        if (io) {
          // Emit connection update event to both mentor and mentee
          io.to(`user_${request.mentee._id}`).emit('requestAccepted', {
            request,
            connection
          });
          
          io.to(`user_${req.user._id}`).emit('connectionUpdate', {
            connection,
            type: 'new_connection'
          });
          
          io.to(`user_${request.mentee._id}`).emit('connectionUpdate', {
            connection,
            type: 'new_connection'
          });
          
          console.log('Socket notifications sent for connection update');
        }
      } else {
        connection = existingConnection;
        console.log('Connection already exists:', existingConnection._id);
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
    console.log('Received mentorship request:', {
      mentorId: req.params.id,
      menteeId: req.user._id,
      message: req.body.message
    });

    // Check if user is trying to request themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot request mentorship from yourself" });
    }

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

    // Check for existing requests
    const existingRequest = await MentorshipRequest.findOne({
      mentee: req.user._id,
      mentor: mentor._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      console.log('Found existing request:', existingRequest);
      return res.status(400).json({ 
        message: existingRequest.status === 'pending' 
          ? "You already have a pending request with this mentor" 
          : "You are already connected with this mentor" 
      });
    }

    // Check if there was a previous rejected request
    const previousRequest = await MentorshipRequest.findOne({
      mentee: req.user._id,
      mentor: mentor._id,
      status: 'rejected'
    });

    if (previousRequest) {
      // Update the existing request instead of creating a new one
      previousRequest.status = 'pending';
      previousRequest.message = req.body.message || "I would like to request mentorship";
      previousRequest.createdAt = new Date();
      await previousRequest.save();
      await previousRequest.populate('mentee', 'name email profileImage');
      
      console.log('Updated previous request to pending:', previousRequest);

      // Emit socket event to notify mentor
      if (global.io) {
        global.io.to(`user_${mentor._id}`).emit('newMentorshipRequest', {
          request: previousRequest,
          mentee: previousRequest.mentee
        });
        console.log('Socket event emitted to mentor:', mentor._id);
      }

      return res.status(200).json({ 
        message: "Mentorship request sent successfully", 
        request: previousRequest 
      });
    }

    // Create new request
    const request = new MentorshipRequest({
      mentee: req.user._id,
      mentor: mentor._id,
      message: req.body.message || "I would like to request mentorship"
    });

    console.log('Creating new request:', request);
    await request.save();
    await request.populate('mentee', 'name email profileImage');

    console.log('Request created successfully:', request);

    // Emit socket event to notify mentor
    if (global.io) {
      global.io.to(`user_${mentor._id}`).emit('newMentorshipRequest', {
        request,
        mentee: request.mentee
      });
      console.log('Socket event emitted to mentor:', mentor._id);
    }

    res.status(201).json({ 
      message: "Mentorship request sent successfully", 
      request 
    });
  } catch (error) {
    console.error("Error sending request:", error);
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "You already have a pending request with this mentor" 
      });
    }
    res.status(500).json({ 
      message: "Error sending request", 
      error: error.message 
    });
  }
});

router.get('/:mentorId/reviews', authMiddleware,async (req, res) => {
  try {
    const reviews = await Review.find({ mentorId: req.params.mentorId })
      .populate('userId', 'name profileImage')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Error fetching reviews' });
  }
});


router.post('/:mentorId/reviews', authMiddleware,async (req, res) => {
  try {
    const mentor = await User.findOne({
      _id: req.params.mentorId,
      role: "mentor"
    });

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Check if user is a mentee
    if (req.user.role !== 'mentee') {
      return res.status(403).json({ message: 'Only mentees can write reviews' });
    }

    // Check if user has already reviewed this mentor
    const existingReview = await Review.findOne({
      mentorId: req.params.mentorId,
      userId: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this mentor' });
    }

    const { rating, comment } = req.body;
    const review = new Review({
      mentorId: req.params.mentorId,
      userId: req.user._id,
      rating,
      comment
    });

    await review.save();

    // Update mentor's average rating and total reviews
    const reviews = await Review.find({ mentorId: req.params.mentorId });
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    
    mentor.mentorProfile.rating = averageRating;
    mentor.mentorProfile.totalReviews = reviews.length;
    await mentor.save();

    // Populate the user data before sending the response
    await review.populate('userId', 'name profileImage');

    res.status(201).json({
      ...review.toObject(),
      newRating: averageRating
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Error creating review' });
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