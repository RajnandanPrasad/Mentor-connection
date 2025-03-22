const express = require('express');
const router = express.Router();
const UserPreference = require('../models/UserPreference');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get user preferences
router.get('/', authMiddleware, async (req, res) => {
  try {
    let preferences = await UserPreference.findOne({ user: req.user.id });
    
    if (!preferences) {
      preferences = new UserPreference({
        user: req.user.id,
        preferredSkills: [],
        interests: [],
        availability: [],
        experienceLevel: 1
      });
      await preferences.save();
    }

    res.json(preferences);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Update user preferences
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { preferredSkills, interests, availability, experienceLevel, preferredMentorshipStyle } = req.body;

    const preferences = await UserPreference.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          preferredSkills,
          interests,
          availability,
          experienceLevel,
          preferredMentorshipStyle
        }
      },
      { new: true, upsert: true }
    );

    res.json(preferences);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get recommended mentors
router.get('/recommended-mentors', authMiddleware, async (req, res) => {
  try {
    const userPrefs = await UserPreference.findOne({ user: req.user.id });
    if (!userPrefs) {
      return res.status(404).json({ msg: 'User preferences not found' });
    }

    // Find mentors
    const mentors = await User.find({ role: 'mentor' }).select('-password');
    const mentorPrefs = await UserPreference.find({
      user: { $in: mentors.map(m => m._id) }
    });

    // Calculate compatibility scores
    const recommendedMentors = mentors.map(mentor => {
      const mentorPref = mentorPrefs.find(p => p.user.toString() === mentor._id.toString());
      if (!mentorPref) return { mentor, score: 0 };

      let score = 0;

      // Skills match
      const skillMatch = mentorPref.preferredSkills.filter(skill => 
        userPrefs.preferredSkills.includes(skill)
      ).length;
      score += skillMatch * 10;

      // Interest match
      const interestMatch = mentorPref.interests.filter(interest =>
        userPrefs.interests.includes(interest)
      ).length;
      score += interestMatch * 5;

      // Experience level compatibility
      const expDiff = Math.abs(mentorPref.experienceLevel - userPrefs.experienceLevel);
      score += Math.max(0, 20 - expDiff * 4);

      return {
        mentor,
        score: Math.min(100, score)
      };
    });

    // Sort by score and return top 5
    const topMentors = recommendedMentors
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json(topMentors);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 