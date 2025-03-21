const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Connection = require('../models/Connection');
const Chat = require('../models/Chat');
const { getIo } = require('../services/socket');

// Get user's connections (both as mentor and mentee)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [
        { mentor: req.user._id },
        { mentee: req.user._id }
      ]
    })
    .populate('mentor', 'name email mentorProfile')
    .populate('mentee', 'name email')
    .sort('-createdAt');

    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Error fetching connections' });
  }
});

// Get connection history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {
      $or: [
        { mentor: req.user._id },
        { mentee: req.user._id }
      ]
    };

    if (status) {
      query.status = status;
    }

    const connections = await Connection.find(query)
      .populate('mentor', 'name email mentorProfile')
      .populate('mentee', 'name email')
      .sort('-createdAt');

    res.json(connections);
  } catch (error) {
    console.error('Error fetching connection history:', error);
    res.status(500).json({ message: 'Error fetching connection history' });
  }
});

// Update connection status
router.put('/:connectionId', authMiddleware, async (req, res) => {
  try {
    const { status, responseMessage } = req.body;
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      mentor: req.user._id
    });

    if (!connection) {
      return res.status(404).json({ message: 'Connection not found' });
    }

    connection.status = status;
    connection.responseMessage = responseMessage;

    if (status === 'accepted') {
      connection.startDate = new Date();
      
      // Create a chat for the connection if it doesn't exist
      const existingChat = await Chat.findOne({
        mentor: connection.mentor,
        mentee: connection.mentee,
        status: 'active'
      });

      if (!existingChat) {
        const newChat = new Chat({
          mentor: connection.mentor,
          mentee: connection.mentee
        });
        await newChat.save();
      }
    } else if (status === 'rejected') {
      connection.endDate = new Date();
    }

    await connection.save();
    await connection.populate('mentor', 'name email mentorProfile');
    await connection.populate('mentee', 'name email');

    // Notify the mentee about the status update
    const io = getIo();
    io.to(`user_${connection.mentee}`).emit('connectionUpdate', {
      connection,
      type: status
    });

    res.json(connection);
  } catch (error) {
    console.error('Error updating connection:', error);
    res.status(500).json({ message: 'Error updating connection' });
  }
});

// Request a connection with a mentor
router.post('/request/:mentorId', authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;

    // Check if there's an existing active connection
    const existingConnection = await Connection.findOne({
      mentor: req.params.mentorId,
      mentee: req.user._id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingConnection) {
      return res.status(400).json({
        message: existingConnection.status === 'pending'
          ? 'You already have a pending request with this mentor'
          : 'You are already connected with this mentor'
      });
    }

    const connection = new Connection({
      mentor: req.params.mentorId,
      mentee: req.user._id,
      requestMessage: message
    });

    await connection.save();
    await connection.populate('mentor', 'name email mentorProfile');
    await connection.populate('mentee', 'name email');

    // Notify the mentor about the new request
    const io = getIo();
    io.to(`user_${req.params.mentorId}`).emit('newConnectionRequest', {
      connection
    });

    res.status(201).json(connection);
  } catch (error) {
    console.error('Error requesting connection:', error);
    res.status(500).json({ message: 'Error requesting connection' });
  }
});

// End a connection
router.post('/:connectionId/end', authMiddleware, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      $or: [
        { mentor: req.user._id },
        { mentee: req.user._id }
      ],
      status: 'accepted'
    });

    if (!connection) {
      return res.status(404).json({ message: 'Active connection not found' });
    }

    connection.status = 'ended';
    connection.endDate = new Date();
    await connection.save();

    // Archive the chat
    await Chat.findOneAndUpdate(
      {
        mentor: connection.mentor,
        mentee: connection.mentee,
        status: 'active'
      },
      { status: 'archived' }
    );

    // Notify the other party
    const io = getIo();
    const notifyUserId = connection.mentor.equals(req.user._id)
      ? connection.mentee
      : connection.mentor;

    io.to(`user_${notifyUserId}`).emit('connectionEnded', {
      connectionId: connection._id
    });

    res.json(connection);
  } catch (error) {
    console.error('Error ending connection:', error);
    res.status(500).json({ message: 'Error ending connection' });
  }
});

module.exports = router; 