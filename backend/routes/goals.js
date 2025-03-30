const express = require('express');
const router = express.Router();
const Goal = require('../models/Goal');
const { authMiddleware } = require('../middleware/authMiddleware');
const { check, validationResult } = require('express-validator');

// @route   GET api/goals/mentee/:menteeId
// @desc    Get all goals for a mentee
// @access  Private
router.get('/mentee/:menteeId', authMiddleware, async (req, res) => {
  try {
    const goals = await Goal.find({ menteeId: req.params.menteeId })
      .sort({ createdAt: -1 });
    
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET api/goals/mentor/:mentorId
// @desc    Get all goals created by a mentor
// @access  Private
router.get('/mentor/:mentorId', authMiddleware, async (req, res) => {
  try {
    const goals = await Goal.find({ mentorId: req.params.mentorId })
      .sort({ createdAt: -1 });
    
    res.json(goals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/goals
// @desc    Create a new goal
// @access  Private
router.post(
  '/',
  [
    authMiddleware,
    [
      check('title', 'Title is required').not().isEmpty(),
      check('dueDate', 'Due date is required').not().isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        title,
        description,
        dueDate,
        priority,
        milestones,
        menteeId,
        mentorId
      } = req.body;

      const newGoal = new Goal({
        title,
        description,
        dueDate,
        priority: priority || 'medium',
        milestones: milestones || [],
        menteeId: menteeId || req.user.id,
        mentorId: mentorId || null,
        createdBy: req.user.id
      });

      const goal = await newGoal.save();
      
      // If socket is available, emit goal creation event
      if (req.io) {
        req.io.to(`user_${menteeId}`).emit('newGoal', goal);
      }

      res.json(goal);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// @route   PUT api/goals/:id
// @desc    Update a goal
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    let goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }

    // Check if user is authorized to update this goal
    if (
      goal.menteeId.toString() !== req.user.id &&
      (goal.mentorId && goal.mentorId.toString() !== req.user.id) &&
      goal.createdBy.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    // Update fields
    const {
      title,
      description,
      dueDate,
      priority,
      milestones,
      status
    } = req.body;

    if (title) goal.title = title;
    if (description) goal.description = description;
    if (dueDate) goal.dueDate = dueDate;
    if (priority) goal.priority = priority;
    if (milestones) goal.milestones = milestones;
    if (status) goal.status = status;

    await goal.save();

    // If socket is available, emit goal update event
    if (req.io) {
      req.io.to(`user_${goal.menteeId}`).emit('goalUpdated', goal);
      if (goal.mentorId) {
        req.io.to(`user_${goal.mentorId}`).emit('goalUpdated', goal);
      }
    }

    res.json(goal);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE api/goals/:id
// @desc    Delete a goal
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const goal = await Goal.findById(req.params.id);

    if (!goal) {
      return res.status(404).json({ msg: 'Goal not found' });
    }

    // Check if user is authorized to delete this goal
    if (
      goal.menteeId.toString() !== req.user.id &&
      (goal.mentorId && goal.mentorId.toString() !== req.user.id) &&
      goal.createdBy.toString() !== req.user.id
    ) {
      return res.status(401).json({ msg: 'User not authorized' });
    }

    await Goal.findByIdAndRemove(req.params.id);

    // If socket is available, emit goal deletion event
    if (req.io) {
      req.io.to(`user_${goal.menteeId}`).emit('goalDeleted', goal._id);
      if (goal.mentorId) {
        req.io.to(`user_${goal.mentorId}`).emit('goalDeleted', goal._id);
      }
    }

    res.json({ msg: 'Goal removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router; 