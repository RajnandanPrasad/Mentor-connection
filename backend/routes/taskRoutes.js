const express = require("express");
const { assignTask, getTasks, updateTaskStatus } = require("../controllers/taskController");
const { protect } = require("../middleware/authMiddleware"); // Authentication check
const Task = require('../models/Task');
const { getIo } = require('../services/socket');

const router = express.Router();

router.post("/assign", protect, assignTask); // Mentor assigns a task
router.get("/", protect, getTasks); // Fetch tasks for a user
router.put("/:taskId/status", protect, updateTaskStatus); // Update task status

// Create a new task
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, menteeId, deadline, priority } = req.body;

    const task = new Task({
      title,
      description,
      mentor: req.user._id,
      mentee: menteeId,
      deadline,
      priority
    });

    await task.save();

    // Notify mentee through socket
    const io = getIo();
    io.to(`user_${menteeId}`).emit('newTask', {
      taskId: task._id,
      title,
      deadline,
      mentor: req.user.name
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Get all tasks for a user
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [{ mentor: req.user._id }, { mentee: req.user._id }]
    })
      .populate('mentor', 'name email')
      .populate('mentee', 'name email')
      .sort({ deadline: 1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Update task status
router.put('/:taskId/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify user is authorized to update the task
    if (task.mentor.toString() !== req.user._id.toString() && 
        task.mentee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    // Notify other participant through socket
    const io = getIo();
    const otherParticipant = task.mentor.toString() === req.user._id.toString() 
      ? task.mentee 
      : task.mentor;
    
    io.to(`user_${otherParticipant}`).emit('taskStatusUpdated', {
      taskId: task._id,
      status
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Error updating task status' });
  }
});

// Add comment to task
router.post('/:taskId/comments', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Verify user is authorized to comment on the task
    if (task.mentor.toString() !== req.user._id.toString() && 
        task.mentee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    task.comments.push({
      user: req.user._id,
      content
    });

    await task.save();

    // Notify other participant through socket
    const io = getIo();
    const otherParticipant = task.mentor.toString() === req.user._id.toString() 
      ? task.mentee 
      : task.mentor;
    
    io.to(`user_${otherParticipant}`).emit('newTaskComment', {
      taskId: task._id,
      comment: {
        user: req.user.name,
        content
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Error adding comment' });
  }
});

module.exports = router;
