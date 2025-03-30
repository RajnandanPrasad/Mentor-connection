const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const Connection = require('../models/Connection');
const Chat = require('../models/Chat');
const { getIo } = require('../services/socket');
const MentorshipRequest = require('../models/MentorshipRequest');
const mongoose = require('mongoose');
const User = require('../models/User');

// ✅ Get mentor's connections
router.get('/mentor/:mentorId', authMiddleware, async (req, res) => {
  try {
    console.log('Fetching connections for mentor:', req.params.mentorId);
    console.log('User making request:', req.user._id);
    console.log('Request query params:', req.query);

    // Verify that this is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.mentorId)) {
      console.error('Invalid mentor ID format');
      return res.status(400).json({ message: 'Invalid mentor ID format' });
    }

    // First check if any connections exist at all for this mentor (regardless of status)
    const allConnections = await Connection.find({
      mentor: req.params.mentorId
    });
    
    console.log(`Found ${allConnections.length} total connections (any status) for mentor`);
    
    if (allConnections.length === 0) {
      console.log('No connections found at all for this mentor');
    } else {
      // Log the status of each connection
      const statusCounts = {};
      allConnections.forEach(conn => {
        statusCounts[conn.status] = (statusCounts[conn.status] || 0) + 1;
      });
      console.log('Connection status counts:', statusCounts);
    }

    const connections = await Connection.find({
      mentor: req.params.mentorId,
      status: 'accepted'
    })
    .populate('mentee', 'name email profileImage skills goals')
    .sort('-createdAt');

    console.log(`Found ${connections.length} accepted connections for mentor`);
    
    if (connections.length === 0) {
      console.log('No accepted connections found. Checking for pending connection creation...');
      // Check for any pending connection creation by looking at recently accepted requests
      const pendingConnections = await MentorshipRequest.find({
        mentor: req.params.mentorId,
        status: 'accepted',
        updatedAt: { $gte: new Date(Date.now() - 300000) } // Accepted in the last 5 minutes
      }).populate('mentee', 'name email profileImage skills goals');
      
      console.log(`Found ${pendingConnections.length} recently accepted requests`);
      
      if (pendingConnections.length > 0) {
        // Create connections for these if they don't exist yet
        for (const request of pendingConnections) {
          const existingConnection = await Connection.findOne({
            mentor: req.params.mentorId,
            mentee: request.mentee._id
          });
          
          if (!existingConnection) {
            console.log(`Creating missing connection for accepted request with mentee ${request.mentee._id}`);
            const newConnection = new Connection({
              mentor: req.params.mentorId,
              mentee: request.mentee._id,
              status: 'accepted',
              startDate: new Date()
            });
            await newConnection.save();
            console.log('Created new connection:', newConnection._id);
          } else {
            console.log(`Found existing connection ${existingConnection._id} with status ${existingConnection.status}`);
            
            // Update connection status if it's not already accepted
            if (existingConnection.status !== 'accepted') {
              console.log(`Updating connection ${existingConnection._id} status to accepted`);
              existingConnection.status = 'accepted';
              existingConnection.startDate = existingConnection.startDate || new Date();
              await existingConnection.save();
            }
          }
        }
        
        // Try fetching connections again
        const refreshedConnections = await Connection.find({
          mentor: req.params.mentorId,
          status: 'accepted'
        })
        .populate('mentee', 'name email profileImage skills goals')
        .sort('-createdAt');
        
        console.log(`After refresh: Found ${refreshedConnections.length} connections`);
        res.json(refreshedConnections);
        return;
      }
      
      // Check for pending connections that should be updated to accepted
      const pendingConnectionsExist = await Connection.find({
        mentor: req.params.mentorId,
        status: 'pending'
      });
      
      if (pendingConnectionsExist.length > 0) {
        console.log(`Found ${pendingConnectionsExist.length} pending connections that might need updating`);
        
        // Look for accepted mentorship requests for these connections
        for (const pendingConn of pendingConnectionsExist) {
          const acceptedRequest = await MentorshipRequest.findOne({
            mentor: req.params.mentorId,
            mentee: pendingConn.mentee,
            status: 'accepted'
          });
          
          if (acceptedRequest) {
            console.log(`Found accepted request for pending connection ${pendingConn._id}, updating to accepted`);
            pendingConn.status = 'accepted';
            pendingConn.startDate = pendingConn.startDate || new Date();
            await pendingConn.save();
          }
        }
        
        // Try fetching connections again
        const refreshedConnections = await Connection.find({
          mentor: req.params.mentorId,
          status: 'accepted'
        })
        .populate('mentee', 'name email profileImage skills goals')
        .sort('-createdAt');
        
        console.log(`After pending check: Found ${refreshedConnections.length} connections`);
        res.json(refreshedConnections);
        return;
      }
    }
    
    res.json(connections);
  } catch (error) {
    console.error('Error fetching mentor connections:', error);
    res.status(500).json({ message: 'Error fetching mentor connections', error: error.toString() });
  }
});

// ✅ Get user's connections (both as mentor and mentee)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const connections = await Connection.find({
      $or: [{ mentor: req.user._id }, { mentee: req.user._id }]
    })
    .populate('mentor', 'name email profileImage mentorProfile')
    .populate('mentee', 'name email profileImage skills goals')
    .sort('-createdAt');

    res.json(connections);
  } catch (error) {
    console.error('Error fetching connections:', error);
    res.status(500).json({ message: 'Error fetching connections' });
  }
});

// ✅ Get connection history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {
      $or: [{ mentor: req.user._id }, { mentee: req.user._id }]
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

// ✅ Update connection status
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

      // ✅ Create a chat for the connection if it doesn't exist
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

    // Notify mentee about the update
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

// ✅ Create a new connection request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { mentee, status, requestMessage } = req.body;

    // Check if a connection already exists
    const existingConnection = await Connection.findOne({
      mentor: req.user._id,
      mentee: mentee,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingConnection) {
      return res.status(400).json({
        message: existingConnection.status === 'pending'
          ? 'Connection request is already pending'
          : 'Connection already exists'
      });
    }

    // Create a new connection
    const connection = new Connection({
      mentor: req.user._id,
      mentee: mentee,
      status: status || 'pending',
      requestMessage
    });

    await connection.save();
    await connection.populate('mentor', 'name email mentorProfile');
    await connection.populate('mentee', 'name email');

    // ✅ Create a chat for accepted connections
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
      }
    }

    res.status(201).json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ message: 'Error creating connection' });
  }
});

// ✅ End a connection
router.post('/:connectionId/end', authMiddleware, async (req, res) => {
  try {
    const connection = await Connection.findOne({
      _id: req.params.connectionId,
      $or: [{ mentor: req.user._id }, { mentee: req.user._id }],
      status: 'accepted'
    });

    if (!connection) {
      return res.status(404).json({ message: 'Active connection not found' });
    }

    connection.status = 'ended';
    connection.endDate = new Date();
    await connection.save();

    // ✅ Archive the chat
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

// ✅ Check if user is connected before allowing chat
router.get('/check/:userId/:chatId', authMiddleware, async (req, res) => {
  try {
    const { userId, chatId } = req.params;

    const chat = await Chat.findById(chatId).populate('mentor mentee');

    if (!chat) {
      return res.status(404).json({ isConnected: false, message: "Chat not found" });
    }

    // Check if the user is part of the chat (mentor or mentee)
    const isConnected =
      chat.mentor._id.toString() === userId ||
      chat.mentee._id.toString() === userId;

    res.json({ isConnected });
  } catch (error) {
    console.error('Error checking connection:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ✅ Create or repair connection between mentor and mentee
router.post('/repair', authMiddleware, async (req, res) => {
  try {
    const { mentorId, menteeId } = req.body;
    
    if (!mentorId || !menteeId) {
      return res.status(400).json({ message: 'Both mentorId and menteeId are required' });
    }
    
    console.log('Attempting to repair connection between mentor:', mentorId, 'and mentee:', menteeId);
    console.log('Repair request from user:', req.user._id);
    
    // Check if user is authorized - either the mentor or an admin
    if (req.user._id.toString() !== mentorId && req.user.role !== 'admin') {
      console.log('Authorization failed: user is not the mentor or an admin');
      return res.status(403).json({ message: 'Not authorized to create this connection' });
    }
    
    // Check if users exist
    const mentor = await User.findById(mentorId);
    const mentee = await User.findById(menteeId);
    
    if (!mentor) {
      console.log('Mentor not found with ID:', mentorId);
      return res.status(404).json({ message: 'Mentor not found' });
    }
    
    if (!mentee) {
      console.log('Mentee not found with ID:', menteeId);
      return res.status(404).json({ message: 'Mentee not found' });
    }
    
    console.log('Found mentor:', mentor.name);
    console.log('Found mentee:', mentee.name);
    
    // Check if connection already exists
    let connection = await Connection.findOne({
      mentor: mentorId,
      mentee: menteeId
    });
    
    if (connection) {
      console.log('Found existing connection with status:', connection.status);
      
      // Update existing connection to accepted
      if (connection.status !== 'accepted') {
        console.log('Updating connection status to accepted');
        connection.status = 'accepted';
        connection.startDate = connection.startDate || new Date();
        await connection.save();
        console.log('Updated existing connection to accepted:', connection._id);
      } else {
        console.log('Connection already exists and is accepted:', connection._id);
      }
    } else {
      // No connection exists, create a new one
      console.log('No connection found, creating new connection');
      connection = new Connection({
        mentor: mentorId,
        mentee: menteeId,
        status: 'accepted',
        startDate: new Date()
      });
      await connection.save();
      console.log('Created new connection:', connection._id);
    }
    
    // Check if a mentorship request exists and update it
    const mentorshipRequest = await MentorshipRequest.findOne({
      mentor: mentorId,
      mentee: menteeId
    });
    
    if (mentorshipRequest) {
      console.log('Found mentorship request with status:', mentorshipRequest.status);
      if (mentorshipRequest.status !== 'accepted') {
        console.log('Updating mentorship request to accepted');
        mentorshipRequest.status = 'accepted';
        await mentorshipRequest.save();
        console.log('Updated mentorship request to accepted:', mentorshipRequest._id);
      }
    } else {
      console.log('No mentorship request found');
      // Create a new request and mark it as accepted if none exists
      try {
        const newRequest = new MentorshipRequest({
          mentor: mentorId,
          mentee: menteeId,
          status: 'accepted',
          message: 'Connection created manually',
          createdAt: new Date()
        });
        await newRequest.save();
        console.log('Created new mentorship request with accepted status:', newRequest._id);
      } catch (reqError) {
        console.error('Error creating new mentorship request:', reqError);
        // Continue even if request creation fails
      }
    }
    
    // Create chat if needed
    const existingChat = await Chat.findOne({
      mentor: mentorId,
      mentee: menteeId,
      status: 'active'
    });
    
    if (!existingChat) {
      console.log('No active chat found, creating new chat');
      const newChat = new Chat({
        mentor: mentorId,
        mentee: menteeId,
        status: 'active'
      });
      await newChat.save();
      console.log('Created new chat:', newChat._id);
    } else {
      console.log('Chat already exists:', existingChat._id);
    }
    
    // Reload the connection with populated data
    const updatedConnection = await Connection.findById(connection._id)
      .populate('mentor', 'name email profileImage')
      .populate('mentee', 'name email profileImage');

    if (!updatedConnection) {
      console.log('Warning: Could not find the connection after saving');
    }

    // Notify both users via socket
    const io = getIo();
    if (io) {
      console.log('Emitting socket events for connection update');
      
      // Emit to mentor
      io.to(`user_${mentorId}`).emit('connectionUpdate', {
        connection: updatedConnection || connection,
        type: 'connection_repaired'
      });
      
      // Emit to mentee
      io.to(`user_${menteeId}`).emit('connectionUpdate', {
        connection: updatedConnection || connection,
        type: 'connection_repaired'
      });
    } else {
      console.log('Socket not available for notification');
    }
    
    // Return the connection
    res.status(200).json({
      message: 'Connection repaired successfully',
      connection: updatedConnection || connection 
    });
  } catch (error) {
    console.error('Error repairing connection:', error);
    res.status(500).json({ message: 'Error repairing connection', error: error.toString() });
  }
});

module.exports = router;
