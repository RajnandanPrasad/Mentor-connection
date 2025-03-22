const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Review = require('../models/Review');
const { authMiddleware } = require('../middleware/authMiddleware');
const User = require('../models/User');
const fs = require('fs');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create uploads directory if it doesn't exist
    const dir = 'uploads/mentor-images';
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

// Get single mentor profile (public route)
router.get('/:mentorId', async (req, res) => {
  try {
    const mentor = await User.findOne({
      _id: req.params.mentorId,
      role: "mentor"
    }).select("-password");

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    res.json(mentor);
  } catch (error) {
    console.error('Error fetching mentor profile:', error);
    res.status(500).json({ message: 'Error fetching mentor profile' });
  }
});

// Protected routes below this line
router.use(authMiddleware);

// Get mentor reviews
router.get('/:mentorId/reviews', async (req, res) => {
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

// Upload mentor image
router.post('/:mentorId/upload-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const mentor = await User.findOne({
      _id: req.params.mentorId,
      role: "mentor"
    });

    if (!mentor) {
      return res.status(404).json({ message: 'Mentor not found' });
    }

    // Check if user is the mentor
    if (mentor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to upload images' });
    }

    const imageUrl = `/uploads/mentor-images/${req.file.filename}`;
    mentor.profileImage = imageUrl;
    await mentor.save();

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Error uploading image' });
  }
});

// Create a new review
router.post('/:mentorId/reviews', async (req, res) => {
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

// Update a review
router.put('/:mentorId/reviews/:reviewId', async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the review author
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    const { rating, comment } = req.body;
    review.rating = rating;
    review.comment = comment;
    await review.save();

    // Update mentor's average rating
    const mentor = await User.findOne({
      _id: req.params.mentorId,
      role: "mentor"
    });
    const reviews = await Review.find({ mentorId: req.params.mentorId });
    const averageRating = reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;
    mentor.mentorProfile.rating = averageRating;
    await mentor.save();

    // Populate the user data before sending the response
    await review.populate('userId', 'name profileImage');

    res.json({
      ...review.toObject(),
      newRating: averageRating
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Error updating review' });
  }
});

// Delete a review
router.delete('/:mentorId/reviews/:reviewId', async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is the review author
    if (review.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.deleteOne();

    // Update mentor's average rating and total reviews
    const mentor = await User.findOne({
      _id: req.params.mentorId,
      role: "mentor"
    });
    const reviews = await Review.find({ mentorId: req.params.mentorId });
    const averageRating = reviews.length > 0
      ? reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length
      : 0;
    
    mentor.mentorProfile.rating = averageRating;
    mentor.mentorProfile.totalReviews = reviews.length;
    await mentor.save();

    res.json({ message: 'Review deleted successfully', newRating: averageRating });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Error deleting review' });
  }
});

module.exports = router; 