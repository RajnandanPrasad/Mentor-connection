const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads with better error handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = 'uploads/task-attachments';
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, Date.now() + '-' + sanitizedFilename);
  }
});

const upload = multer({
  storage: storage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only allowed file types: jpeg, jpg, png, gif, pdf, doc, docx, txt, zip'));
    }
  }
}).array('attachments', 5);

// Helper function to handle file upload errors
const handleUpload = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum size is 10MB.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ message: 'Too many files. Maximum 5 files allowed.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

// Create a new task
router.post('/', authMiddleware, handleUpload, async (req, res) => {
  try {
    const { title, description, dueDate, priority, menteeId, goalId } = req.body;
    const task = new Task({
      title,
      description,
      dueDate,
      priority,
      mentorId: req.user._id,
      menteeId,
      goalId: goalId || null,
      status: 'pending'
    });
    await task.save();
    
    // If socket.io is available and there's a goalId, emit task created event
    if (req.io && goalId) {
      req.io.to(`user_${menteeId}`).emit('taskCreated', {
        task,
        goalId
      });
    }
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Get all tasks for a mentee
router.get('/mentee/:menteeId', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({
      menteeId: req.params.menteeId,
      mentorId: req.user._id
    })
    .populate('menteeId mentorId', 'name email')
    .populate('goalId', 'title')
    .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Get all tasks assigned by a mentor
router.get('/mentor', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ mentorId: req.user._id })
      .populate('menteeId mentorId', 'name email')
      .populate('goalId', 'title')
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Get tasks for a specific mentor and mentee
router.get('/mentor/:mentorId/mentee/:menteeId', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({
      mentorId: req.params.mentorId,
      menteeId: req.params.menteeId
    })
    .populate('goalId', 'title')
    .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Update task status
router.patch('/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify that the user is the mentor who created the task
    if (task.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    task.status = req.body.status;
    await task.save();
    
    // If the task is linked to a goal and socket is available, emit task updated event
    if (req.io && task.goalId) {
      req.io.to(`user_${task.menteeId}`).emit('taskUpdated', {
        taskId: task._id,
        status: task.status,
        goalId: task.goalId
      });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Update a task (full update)
router.put('/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify that the user is the mentor who created the task
    if (task.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const { title, description, dueDate, priority, status, goalId } = req.body;
    
    // Update task fields
    if (title) task.title = title;
    if (description) task.description = description;
    if (dueDate) task.dueDate = dueDate;
    if (priority) task.priority = priority;
    if (status) task.status = status;
    
    // Handle goalId changes - can be set to null to unlink
    task.goalId = goalId === undefined ? task.goalId : goalId;
    
    await task.save();
    
    // Emit task updated event if socket is available
    if (req.io) {
      req.io.to(`user_${task.menteeId}`).emit('taskUpdated', {
        taskId: task._id,
        updates: req.body,
        goalId: task.goalId
      });
    }
    
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Delete a task
router.delete('/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify that the user is the mentor who created the task
    if (task.mentorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    await task.remove();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task' });
  }
});

// Get task statistics for a mentor
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { mentorId: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalTasks = await Task.countDocuments({ mentorId: req.user._id });
    const totalMentees = await Task.distinct('menteeId', { mentorId: req.user._id });

    res.json({
      statusBreakdown: stats,
      totalTasks,
      totalMentees: totalMentees.length
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ message: 'Error fetching task statistics' });
  }
});

module.exports = router; 