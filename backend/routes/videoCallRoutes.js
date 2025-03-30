const express = require('express');
const router = express.Router();
const { authMiddleware: auth } = require('../middleware/authMiddleware');
const VideoCall = require('../models/VideoCall');
const Session = require('../models/Session');
const { getIo } = require('../services/socket');

// Schedule a video call
router.post('/schedule', auth, async (req, res) => {
  try {
    const { menteeId, startTime, notes } = req.body;
    
    const videoCall = new VideoCall({
      mentor: req.user._id,
      mentee: menteeId,
      startTime,
      meetingLink: `meeting-${Date.now()}`, // In production, generate a proper meeting link
      notes
    });

    await videoCall.save();

    // Create a session record
    const session = new Session({
      type: 'video',
      mentor: req.user._id,
      mentee: menteeId,
      startTime,
      metadata: {
        meetingLink: videoCall.meetingLink,
        notes
      }
    });

    await session.save();

    // Notify mentee through socket
    const io = getIo();
    io.to(`user_${menteeId}`).emit('newVideoCall', {
      callId: videoCall._id,
      startTime,
      mentor: req.user.name
    });

    res.status(201).json(videoCall);
  } catch (error) {
    console.error('Error scheduling video call:', error);
    res.status(500).json({ message: 'Error scheduling video call' });
  }
});

// Get all video calls for a user
router.get('/', auth, async (req, res) => {
  try {
    const videoCalls = await VideoCall.find({
      $or: [{ mentor: req.user._id }, { mentee: req.user._id }]
    })
      .populate('mentor', 'name email')
      .populate('mentee', 'name email')
      .sort({ startTime: -1 });

    res.json(videoCalls);
  } catch (error) {
    console.error('Error fetching video calls:', error);
    res.status(500).json({ message: 'Error fetching video calls' });
  }
});

// Update video call status
router.put('/:callId/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const videoCall = await VideoCall.findById(req.params.callId);

    if (!videoCall) {
      return res.status(404).json({ message: 'Video call not found' });
    }

    // Verify user is part of the call
    if (videoCall.mentor.toString() !== req.user._id.toString() && 
        videoCall.mentee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    videoCall.status = status;
    if (status === 'completed' || status === 'cancelled') {
      videoCall.endTime = new Date();
    }

    await videoCall.save();

    // Update session status
    const session = await Session.findOne({
      type: 'video',
      mentor: videoCall.mentor,
      mentee: videoCall.mentee,
      startTime: videoCall.startTime
    });

    if (session) {
      session.status = status;
      if (status === 'completed' || status === 'cancelled') {
        session.endTime = new Date();
      }
      await session.save();
    }

    // Notify other participant through socket
    const io = getIo();
    const otherParticipant = videoCall.mentor.toString() === req.user._id.toString() 
      ? videoCall.mentee 
      : videoCall.mentor;
    
    io.to(`user_${otherParticipant}`).emit('videoCallStatusUpdated', {
      callId: videoCall._id,
      status
    });

    res.json(videoCall);
  } catch (error) {
    console.error('Error updating video call status:', error);
    res.status(500).json({ message: 'Error updating video call status' });
  }
});

module.exports = router; 