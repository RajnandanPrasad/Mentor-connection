const express = require('express');
const router = express.Router();
const SkillAssessment = require('../models/SkillAssessment');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get user's skill assessment
router.get('/', authMiddleware, async (req, res) => {
  try {
    const assessment = await SkillAssessment.findOne({ user: req.user.id });
    res.json(assessment || { skills: [], overallProgress: 0 });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Submit skill assessment
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { skills } = req.body;
    
    let assessment = await SkillAssessment.findOne({ user: req.user.id });
    
    if (!assessment) {
      assessment = new SkillAssessment({
        user: req.user.id,
        skills: []
      });
    }

    // Update skills
    assessment.skills = skills;
    
    // Calculate overall progress
    const totalLevels = skills.length * 4; // 4 is max level
    const currentLevels = skills.reduce((sum, skill) => sum + skill.level, 0);
    assessment.overallProgress = Math.round((currentLevels / totalLevels) * 100);

    await assessment.save();
    res.json(assessment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router; 