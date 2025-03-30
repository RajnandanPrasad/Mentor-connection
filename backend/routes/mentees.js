const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Connection = require('../models/Connection');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const dir = 'uploads/mentee-images';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
    }
  }
});

// Get single mentee profile
router.get('/:menteeId', async (req, res) => {
  try {
    const mentee = await User.findOne({
      _id: req.params.menteeId,
      role: "mentee"
    }).select("-password");

    if (!mentee) {
      return res.status(404).json({ message: 'Mentee not found' });
    }

    res.json(mentee);
  } catch (error) {
    console.error('Error fetching mentee profile:', error);
    res.status(500).json({ message: 'Error fetching mentee profile' });
  }
});

// Protected routes below this line
router.use(authMiddleware);

// Update mentee profile
router.put('/:menteeId', async (req, res) => {
  try {
    const mentee = await User.findOne({
      _id: req.params.menteeId,
      role: "mentee"
    });

    if (!mentee) {
      return res.status(404).json({ message: 'Mentee not found' });
    }

    // Check if user is the mentee
    if (mentee._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this profile' });
    }

    console.log('Updating mentee profile:', req.body);

    // Update basic fields
    const { name, email, bio, contact } = req.body;
    if (name) mentee.name = name;
    if (email) mentee.email = email;
    if (bio) mentee.bio = bio;
    if (contact) mentee.contact = contact;

    // Update menteeProfile fields
    if (req.body.menteeProfile) {
      mentee.menteeProfile = {
        ...mentee.menteeProfile || {},
        ...req.body.menteeProfile
      };

      // Ensure interests is an array
      if (typeof mentee.menteeProfile.interests === 'string') {
        mentee.menteeProfile.interests = mentee.menteeProfile.interests
          .split(',')
          .map(interest => interest.trim())
          .filter(Boolean);
      }

      // Ensure experienceLevel is a number
      if (mentee.menteeProfile.experienceLevel) {
        mentee.menteeProfile.experienceLevel = 
          Number(mentee.menteeProfile.experienceLevel);
      }
    }

    await mentee.save();
    
    // Remove sensitive information before sending response
    const response = mentee.toObject();
    delete response.password;
    
    res.json(response);
  } catch (error) {
    console.error('Error updating mentee profile:', error);
    res.status(500).json({ message: 'Error updating mentee profile', error: error.message });
  }
});

// Upload mentee profile image
router.post('/:menteeId/profile-image', upload.single('profileImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const mentee = await User.findOne({
      _id: req.params.menteeId,
      role: "mentee"
    });

    if (!mentee) {
      return res.status(404).json({ message: 'Mentee not found' });
    }

    // Check if user is the mentee
    if (mentee._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to upload images for this profile' });
    }

    const imageUrl = `/uploads/mentee-images/${req.file.filename}`;
    mentee.profileImage = imageUrl;
    await mentee.save();

    res.json({ 
      success: true,
      imageUrl,
      message: 'Profile image updated successfully' 
    });
  } catch (error) {
    console.error('Error uploading mentee profile image:', error);
    res.status(500).json({ message: 'Error uploading profile image', error: error.message });
  }
});

// Get mentee's mentors - return all accepted mentor connections
router.get('/:menteeId/mentors', async (req, res) => {
  try {
    // Check if user is authorized
    if (req.params.menteeId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this mentee\'s mentors' });
    }

    // Find all connections where this user is the mentee and status is accepted
    const connections = await Connection.find({
      mentee: req.params.menteeId,
      status: 'accepted'
    }).populate('mentor', 'name email profileImage mentorProfile');

    const mentors = connections.map(connection => ({
      _id: connection.mentor._id,
      name: connection.mentor.name,
      email: connection.mentor.email,
      profileImage: connection.mentor.profileImage,
      mentorProfile: connection.mentor.mentorProfile,
      connectionId: connection._id,
      startDate: connection.startDate
    }));

    res.json(mentors);
  } catch (error) {
    console.error('Error fetching mentee\'s mentors:', error);
    res.status(500).json({ message: 'Error fetching mentors', error: error.message });
  }
});

module.exports = router; 