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

// Create a new connection
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mentee, status, requestMessage } = req.body;
    
    console.log('Creating connection with data:', {
      mentor: req.user._id,
      mentee,
      status,
      requestMessage
    });

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      mentor: req.user._id,
      mentee: mentee,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingConnection) {
      console.log('Existing connection found:', existingConnection);
      return res.status(400).json({
        message: existingConnection.status === 'pending'
          ? 'Connection request is already pending'
          : 'Connection already exists'
      });
    }

    // Create new connection
    const connection = new Connection({
      mentor: req.user._id,
      mentee: mentee,
      status: status || 'pending',
      requestMessage
    });

    await connection.save();
    
    // Populate mentor and mentee details
    await connection.populate('mentor', 'name email mentorProfile');
    await connection.populate('mentee', 'name email');

    console.log('New connection created:', connection);

    // Create a chat for accepted connections
    if (status === 'accepted') {
      const existingChat = await Chat.findOne({
        mentor: req.user._id,
        mentee: mentee,
        status: 'active'
      });

      if (!existingChat) {
        const newChat = new Chat({
          mentor: req.user._id,
          mentee: mentee
        });
        await newChat.save();
        console.log('New chat created:', newChat);
      }
    }

    res.status(201).json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ message: 'Error creating connection', error: error.message });
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