const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/authMiddleware');
const Session = require('../models/Session');
const mongoose = require('mongoose');

// Helper function to validate MongoDB ID
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// Wrap async route handlers for error handling
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Add a test route to verify the API is working
router.get('/test', (req, res) => {
  res.json({ message: 'Session routes are working properly' });
});

// Get session history for a user
router.get('/history', auth, asyncHandler(async (req, res) => {
  console.log('Fetching session history for user:', req.user._id);
  
  const sessions = await Session.find({
    $or: [{ mentor: req.user._id }, { mentee: req.user._id }]
  })
    .populate('mentor', 'name email profileImage')
    .populate('mentee', 'name email profileImage')
    .sort({ startTime: -1 });

  console.log(`Found ${sessions.length} sessions for user`);
  res.json(sessions);
}));

// Get session statistics
router.get('/stats', auth, asyncHandler(async (req, res) => {
  console.log('Fetching session stats for user:', req.user._id);
  
  const stats = await Session.aggregate([
    {
      $match: {
        $or: [
          { mentor: mongoose.Types.ObjectId(req.user._id) },
          { mentee: mongoose.Types.ObjectId(req.user._id) }
        ],
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$type',
        totalSessions: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        averageDuration: { $avg: '$duration' }
      }
    }
  ]);

  res.json(stats);
}));

// Get upcoming sessions
router.get('/upcoming', auth, asyncHandler(async (req, res) => {
  console.log('Fetching upcoming sessions for user:', req.user._id);
  
  const upcomingSessions = await Session.find({
    $or: [{ mentor: req.user._id }, { mentee: req.user._id }],
    startTime: { $gt: new Date() },
    status: 'active'
  })
    .populate('mentor', 'name email profileImage')
    .populate('mentee', 'name email profileImage')
    .sort({ startTime: 1 });

  res.json(upcomingSessions);
}));

// Add new route to create a session
router.post('/create', auth, asyncHandler(async (req, res) => {
  console.log('Creating new session:', req.body);
  
  // Only mentors can create sessions
  if (req.user.role !== 'mentor') {
    return res.status(403).json({ message: 'Only mentors can schedule sessions' });
  }

  const { menteeId, type, startTime, endTime, title, description } = req.body;

  // Validate required fields
  if (!menteeId || !type || !startTime || !title) {
    return res.status(400).json({ 
      message: 'Mentee ID, session type, start time, and title are required',
      missingFields: [
        !menteeId && 'menteeId',
        !type && 'type',
        !startTime && 'startTime',
        !title && 'title'
      ].filter(Boolean)
    });
  }

  // Validate menteeId format
  if (!isValidObjectId(menteeId)) {
    return res.status(400).json({ message: 'Invalid mentee ID format' });
  }

  // Validate session type
  if (!['chat', 'video'].includes(type)) {
    return res.status(400).json({ message: 'Session type must be either "chat" or "video"' });
  }

  // Create new session
  const session = new Session({
    mentor: req.user._id,
    mentee: menteeId,
    type,
    title,
    description,
    startTime: new Date(startTime),
    endTime: endTime ? new Date(endTime) : null,
    status: 'active',
    metadata: {
      createdBy: req.user._id,
      notes: ''
    }
  });

  await session.save();
  console.log('Session created successfully:', session._id);

  // Notify the mentee about the new session
  if (req.io) {
    req.io.to(menteeId.toString()).emit('sessionScheduled', {
      session,
      mentorName: req.user.name
    });
  }

  res.status(201).json(session);
}));

// Add route to get sessions by mentor ID
router.get('/mentor/:mentorId', auth, asyncHandler(async (req, res) => {
  const { mentorId } = req.params;
  
  console.log('Fetching sessions for mentor:', mentorId);
  
  if (!isValidObjectId(mentorId)) {
    return res.status(400).json({ message: 'Invalid mentor ID format' });
  }

  const sessions = await Session.find({ mentor: mentorId })
    .populate('mentor', 'name email profileImage')
    .populate('mentee', 'name email profileImage')
    .sort({ startTime: -1 });

  console.log(`Found ${sessions.length} sessions for mentor ${mentorId}`);
  res.json(sessions);
}));

// Add route to get sessions by mentee ID
router.get('/mentee/:menteeId', auth, asyncHandler(async (req, res) => {
  const { menteeId } = req.params;
  
  console.log('Fetching sessions for mentee:', menteeId);
  
  if (!isValidObjectId(menteeId)) {
    return res.status(400).json({ message: 'Invalid mentee ID format' });
  }

  const sessions = await Session.find({ mentee: menteeId })
    .populate('mentor', 'name email profileImage')
    .populate('mentee', 'name email profileImage')
    .sort({ startTime: -1 });

  console.log(`Found ${sessions.length} sessions for mentee ${menteeId}`);
  res.json(sessions);
}));

// Add route to update a session
router.put('/:sessionId', auth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { title, description, startTime, endTime, status } = req.body;
  
  console.log('Updating session:', sessionId);
  
  if (!isValidObjectId(sessionId)) {
    return res.status(400).json({ message: 'Invalid session ID format' });
  }
  
  // Find the session
  const session = await Session.findById(sessionId);
  
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }
  
  // Ensure the user is the mentor who created the session
  if (session.mentor.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Only the mentor who created this session can update it' });
  }
  
  // Update fields if provided
  if (title) session.title = title;
  if (description !== undefined) session.description = description;
  if (startTime) session.startTime = new Date(startTime);
  if (endTime) session.endTime = new Date(endTime);
  if (status && ['active', 'completed', 'cancelled'].includes(status)) {
    session.status = status;
  }
  
  await session.save();
  console.log('Session updated successfully:', sessionId);
  
  // Notify the mentee about the session update
  if (req.io) {
    req.io.to(session.mentee.toString()).emit('sessionUpdated', {
      session,
      mentorName: req.user.name
    });
  }
  
  res.json(session);
}));

// Add route to cancel a session
router.put('/:sessionId/cancel', auth, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { reason } = req.body;
  
  console.log('Cancelling session:', sessionId);
  
  if (!isValidObjectId(sessionId)) {
    return res.status(400).json({ message: 'Invalid session ID format' });
  }
  
  // Find the session
  const session = await Session.findById(sessionId);
  
  if (!session) {
    return res.status(404).json({ message: 'Session not found' });
  }
  
  // Ensure the user is either the mentor or mentee
  if (session.mentor.toString() !== req.user._id.toString() && 
      session.mentee.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'You do not have permission to cancel this session' });
  }
  
  // Update session status
  session.status = 'cancelled';
  if (reason) {
    session.metadata = {
      ...session.metadata,
      cancellationReason: reason,
      cancelledBy: req.user._id,
      cancelledAt: new Date()
    };
  }
  
  await session.save();
  console.log('Session cancelled successfully:', sessionId);
  
  // Notify the other party about the cancellation
  if (req.io) {
    const notifyUserId = session.mentor.toString() === req.user._id.toString() 
      ? session.mentee.toString() 
      : session.mentor.toString();
      
    req.io.to(notifyUserId).emit('sessionCancelled', {
      session,
      cancelledByName: req.user.name
    });
  }
  
  res.json(session);
}));

// Get session count for a mentor
router.get('/count/mentor/:mentorId', auth, asyncHandler(async (req, res) => {
  const { mentorId } = req.params;
  
  console.log('Getting session count for mentor:', mentorId);
  
  if (!isValidObjectId(mentorId)) {
    return res.status(400).json({ message: 'Invalid mentor ID format' });
  }
  
  const count = await Session.countDocuments({ 
    mentor: mentorId,
    status: 'completed' 
  });
  
  res.json({ count });
}));

// Error handling middleware for this router
router.use((err, req, res, next) => {
  console.error('Session route error:', err);
  res.status(500).json({ 
    message: 'An error occurred while processing your request',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router; 