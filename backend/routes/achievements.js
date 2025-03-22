const express = require('express');
const router = express.Router();
const Achievement = require('../models/Achievement');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get user's achievements
router.get('/', authMiddleware, async (req, res) => {
  try {
    let achievements = await Achievement.findOne({ user: req.user.id });
    
    if (!achievements) {
      achievements = new Achievement({
        user: req.user.id,
        achievements: [
          {
            title: 'First Steps',
            description: 'Complete your first mentoring session',
            icon: '🎯',
            unlocked: false,
            progress: 0
          },
          {
            title: 'Skill Master',
            description: 'Complete 5 skill assessments',
            icon: '⭐',
            unlocked: false,
            progress: 0
          },
          {
            title: 'Network Builder',
            description: 'Connect with 3 mentors',
            icon: '🤝',
            unlocked: false,
            progress: 0
          }
        ]
      });
      await achievements.save();
    }

    res.json(achievements);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Update achievement progress
router.put('/:achievementId', authMiddleware, async (req, res) => {
  try {
    const { progress } = req.body;
    const achievementId = req.params.achievementId;

    const userAchievements = await Achievement.findOne({ user: req.user.id });
    
    if (!userAchievements) {
      return res.status(404).json({ msg: 'Achievements not found' });
    }

    const achievement = userAchievements.achievements.id(achievementId);
    if (!achievement) {
      return res.status(404).json({ msg: 'Achievement not found' });
    }

    achievement.progress = progress;
    if (progress >= 100 && !achievement.unlocked) {
      achievement.unlocked = true;
      achievement.unlockedAt = Date.now();
      userAchievements.totalPoints += 100;
      userAchievements.level = Math.floor(userAchievements.totalPoints / 300) + 1;
    }

    await userAchievements.save();
    res.json(userAchievements);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 