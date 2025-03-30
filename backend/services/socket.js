const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require("../models/Message");
const Connection = require("../models/Connection");

let io;
let connectedUsers = {}; // Add a map to track connected users by ID

const initializeSocket = (server) => {
  console.log('Initializing socket.io server...');
  
  // Reset the connected users map when initializing
  connectedUsers = {};
  
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      console.log('Authenticating socket connection...');
      const token = socket.handshake.auth.token;
      
      if (!token) {
        console.log('No token provided');
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('User not found');
        return next(new Error('User not found'));
      }

      console.log('Socket authenticated for user:', user._id);
      socket.user = user;
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    const userId = socket.user._id.toString();
    
    // Store the socket reference in our map
    connectedUsers[userId] = socket;
    
    // Join user's room for direct messages
    socket.join(`user_${userId}`);
    console.log(`User ${userId} joined their personal room`);
    
    // Add debug event handlers for troubleshooting socket issues
    socket.on('debug-rooms-request', () => {
      try {
        console.log(`[DEBUG] User ${userId} requested their socket rooms`);
        
        // Get the rooms for this socket
        const rooms = Array.from(socket.rooms || []);
        
        // Send the rooms back to the client
        socket.emit('debug-rooms-response', {
          userId,
          rooms,
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });
        
        console.log(`[DEBUG] Sent rooms to user ${userId}: ${rooms.join(', ')}`);
      } catch (error) {
        console.error('[DEBUG] Error in debug-rooms-request:', error);
        socket.emit('debug-rooms-response', {
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Add echo test handler
    socket.on('echo-test', (data) => {
      try {
        console.log(`[DEBUG] Received echo test from user ${userId}:`, data);
        
        // Send response back to the client
        socket.emit(`echo-response-${data.testId}`, {
          received: true,
          serverTime: new Date().toISOString(),
          message: "Echo response from server",
          originalData: data
        });
        
        console.log(`[DEBUG] Sent echo response to user ${userId}`);
      } catch (error) {
        console.error('[DEBUG] Error in echo-test:', error);
      }
    });
    
    // Handle joining personal room
    socket.on("join", (data) => {
      try {
        if (typeof data === 'object' && data.userId) {
          const roomId = data.userId;
      if (roomId === userId) {
        console.log(`User ${userId} joined room ${roomId}`);
        socket.join(`user_${roomId}`);
            // Update the connected users map to ensure this socket is tracked
            connectedUsers[userId] = socket;
            console.log(`Updated connectedUsers map for ${userId}`);
      } else {
        console.log(`User ${userId} tried to join unauthorized room ${roomId}`);
          }
        } else if (data === userId) {
          console.log(`User ${userId} joined room ${data} (legacy format)`);
          socket.join(`user_${data}`);
          // Update the connected users map to ensure this socket is tracked
          connectedUsers[userId] = socket;
        }
      } catch (error) {
        console.error('Error in join event:', error);
      }
    });
    
    // Support explicit room joining for backwards compatibility
    socket.on("join-room", (data) => {
      try {
        console.log('Received join-room event:', data);
        if (data && data.room) {
          const roomName = data.room;
          // Only allow joining user's own room or rooms they should have access to
          if (roomName === `user_${userId}` || roomName.includes(userId)) {
            socket.join(roomName);
            console.log(`User ${userId} joined room ${roomName} via join-room event`);
            
            // Update the connected users map
            connectedUsers[userId] = socket;
          } else {
            console.log(`User ${userId} attempted to join unauthorized room ${roomName}`);
          }
        }
      } catch (error) {
        console.error('Error in join-room event:', error);
      }
    });
    
    // Track when users come online
    socket.on("user-online", (data) => {
      try {
        console.log('Received user-online event:', data);
        if (data && data.userId) {
          // Verify the userId matches the socket user
          if (data.userId === userId) {
            // Update the connected users map
            connectedUsers[userId] = socket;
            console.log(`Updated connectedUsers map for ${userId} via user-online event`);
            
            // Broadcast to interested parties that this user is online
            socket.broadcast.emit('user-status-change', {
              userId: data.userId,
              status: 'online',
              timestamp: data.timestamp || new Date().toISOString()
            });
          } else {
            console.log(`User ${userId} tried to mark another user ${data.userId} as online`);
          }
        }
      } catch (error) {
        console.error('Error in user-online event:', error);
      }
    });
    
    // Handle leaving personal room
    socket.on("leave", (roomId) => {
      if (roomId === userId) {
        console.log(`User ${userId} left room ${roomId}`);
        socket.leave(`user_${roomId}`);
      }
    });
    
    // Handle joining a chat room
    socket.on("joinChat", (chatId) => {
      console.log(`User ${userId} joined chat ${chatId}`);
      socket.join(chatId);
    });
    
    // Handle leaving a chat room
    socket.on("leaveChat", (chatId) => {
      console.log(`User ${userId} left chat ${chatId}`);
      socket.leave(chatId);
    });
    
    // Handle mentor-mentee chat join
    socket.on("joinMentorMenteeChat", async ({ mentorId, menteeId }) => {
      try {
        // Validate that the user is either the mentor or mentee
        if (userId !== mentorId && userId !== menteeId) {
          console.log(`Unauthorized join attempt for mentor-mentee chat: ${mentorId}-${menteeId}`);
          return;
        }
        
        // Check if there's an accepted connection
        const connection = await Connection.findOne({
          mentor: mentorId,
          mentee: menteeId,
          status: "accepted"
        });
        
        if (!connection) {
          console.log(`No accepted connection found for ${mentorId}-${menteeId}`);
          return;
        }
        
        // Create a unique room ID for this mentor-mentee pair
        const chatRoomId = `chat_${mentorId}_${menteeId}`;
        socket.join(chatRoomId);
        console.log(`User ${userId} joined mentor-mentee chat room ${chatRoomId}`);
      } catch (error) {
        console.error("Error joining mentor-mentee chat:", error);
      }
    });
    
    // Mark messages as read
    socket.on("markMessagesRead", async ({ chatId }) => {
      try {
        // Find all unread messages in this chat sent by others
        const unreadMessages = await Message.find({
          chat: chatId,
          sender: { $ne: userId },
          "readBy.user": { $ne: userId }
        });
        
        // Mark messages as read
        await Promise.all(
          unreadMessages.map(msg => 
            Message.findByIdAndUpdate(
              msg._id,
              {
                $push: {
                  readBy: {
                    user: userId,
                    readAt: new Date()
                  }
                }
              }
            )
          )
        );
        
        // Notify the chat room about read messages
        io.to(chatId).emit("messagesRead", {
          chatId,
          userId
        });
        
        console.log(`User ${userId} marked ${unreadMessages.length} messages as read in chat ${chatId}`);
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    });

    // Join group rooms
    socket.on('joinGroup', (groupId) => {
      socket.join(`group_${groupId}`);
    });

    // Leave group room
    socket.on('leaveGroup', (groupId) => {
      socket.leave(`group_${groupId}`);
    });

    // Handle message events
    socket.on('sendMessage', async (data) => {
      try {
        console.log('Received sendMessage event:', data);
        const { recipientId, text, senderName } = data;
        
        if (!recipientId) {
          console.error('Missing recipientId in sendMessage event');
          return;
        }
        
        // Send to recipient
        io.to(`user_${recipientId}`).emit('newMessage', {
        senderId: socket.user._id,
          senderName: senderName || socket.user.name,
          text,
        timestamp: new Date()
      });
        
        console.log(`Sent message from ${socket.user._id} to ${recipientId}`);
      } catch (error) {
        console.error('Error in sendMessage event:', error);
      }
    });

    // Handle direct broadcast to chat room
    socket.on('broadcastToChat', (data) => {
      try {
        console.log('Received broadcastToChat event:', {
          chatId: data.chatId,
          messagePresent: !!data.message
        });
        
        if (!data.chatId || !data.message) {
          console.error('Missing required data in broadcastToChat event');
          return;
        }
        
        // Extract the chat ID properly
        const chatId = typeof data.chatId === 'object' ? data.chatId.chatId || data.chatId : data.chatId;
        
        // Broadcast the message to everyone in the chat room
        console.log(`Broadcasting message to chat room ${chatId}`);
        io.to(chatId).emit('newMessage', data.message);
        
        // Also try an alternate format
        if (typeof chatId === 'string') {
          console.log(`Also broadcasting to chat room in object format`);
          io.to({ chatId }).emit('newMessage', data.message);
        }
      } catch (error) {
        console.error('Error in broadcastToChat event:', error);
      }
    });

    // Handle group message
    socket.on('sendGroupMessage', async (data) => {
      const { groupId, message } = data;
      io.to(`group_${groupId}`).emit('newGroupMessage', {
        senderId: socket.user._id,
        senderName: socket.user.name,
        message,
        groupId,
        timestamp: new Date()
      });
    });

    // Handle typing status
    socket.on('typing', (data) => {
      const { recipientId, isTyping } = data;
      io.to(`user_${recipientId}`).emit('userTyping', {
        userId: socket.user._id,
        isTyping
      });
    });

    // Handle goal updates
    socket.on('goalUpdate', async (data) => {
      try {
        const { goalId, updates, menteeId, mentorId } = data;
        
        console.log(`Goal update received: ${goalId}`);
        
        // Emit to mentee
        if (menteeId) {
          io.to(`user_${menteeId}`).emit('goalUpdated', { 
            goalId, 
            updates 
          });
        }
        
        // Emit to mentor
        if (mentorId) {
          io.to(`user_${mentorId}`).emit('goalUpdated', { 
            goalId, 
            updates,
            menteeId
          });
        }
      } catch (error) {
        console.error('Error handling goal update event:', error);
      }
    });

    // Handle milestone completion
    socket.on('milestoneCompleted', async (data) => {
      try {
        const { goalId, milestoneIndex, menteeId, mentorId } = data;
        
        console.log(`Milestone completion received: ${goalId} - ${milestoneIndex}`);
        
        // Notify both mentee and mentor
        if (menteeId) {
          io.to(`user_${menteeId}`).emit('milestoneUpdate', { 
            goalId, 
            milestoneIndex, 
            completed: true 
          });
        }
        
        if (mentorId) {
          io.to(`user_${mentorId}`).emit('milestoneUpdate', { 
            goalId, 
            milestoneIndex, 
            completed: true,
            menteeId
          });
        }
      } catch (error) {
        console.error('Error handling milestone completion event:', error);
      }
    });

    // Handle new goal creation
    socket.on('newGoalCreated', async (data) => {
      try {
        const { goal, menteeId, mentorId } = data;
        
        console.log(`New goal created: ${goal._id}`);
        
        // Notify both mentee and mentor
        if (menteeId) {
          io.to(`user_${menteeId}`).emit('newGoal', goal);
        }
        
        if (mentorId) {
          io.to(`user_${mentorId}`).emit('newGoal', {
            ...goal,
            fromMenteeId: menteeId
          });
        }
      } catch (error) {
        console.error('Error handling new goal event:', error);
      }
    });

    // Handle mentorship request status updates
    socket.on('requestStatusUpdated', ({ requestId, status, menteeId, rejectionDetails, mentorName }) => {
      try {
        console.log(`Request status updated: ${requestId} - ${status} for mentee ${menteeId}`);
        
        if (!menteeId) {
          console.error('Missing menteeId in requestStatusUpdated event');
          return;
        }
        
        console.log(`Checking for mentee socket: ${menteeId}`);
        const menteeSocket = findUserSocket(menteeId);
        console.log(`Mentee socket found: ${!!menteeSocket}, connected: ${menteeSocket?.connected}`);
        
        // Prepare rejection message with additional details if provided
        let rejectionMessage = 'Your mentorship request has been declined.';
        
        if (status === 'rejected' && rejectionDetails && rejectionDetails.reason) {
          rejectionMessage = `Your mentorship request has been declined by ${mentorName || 'the mentor'}. Reason: "${rejectionDetails.reason}" You may submit a new request to another mentor or try again later.`;
        } else if (status === 'rejected') {
          rejectionMessage = `Your mentorship request has been declined by ${mentorName || 'the mentor'}. You may submit a new request to another mentor or try again later.`;
        }
        
        const notificationMessage = {
          type: 'mentorship_request',
          status: status,
          timestamp: new Date().toISOString(),
          message: status === 'accepted' 
            ? 'Your mentorship request has been accepted! You can now chat with your mentor.'
            : rejectionMessage,
          alertType: status === 'accepted' ? 'success' : 'error',
          priority: 'high',
          actionRequired: status === 'rejected' ? true : false,
          rejectionDetails: status === 'rejected' ? rejectionDetails : null
        };
        
        console.log('Prepared notification message:', notificationMessage);
        
        // Track if notification was sent successfully
        let notificationSent = false;
        
        // First try direct socket emission if available
        if (menteeSocket && menteeSocket.connected) {
          try {
            console.log(`Emitting mentorship notification directly to mentee ${menteeId}`);
            menteeSocket.emit('mentorshipRequestUpdate', notificationMessage);
            notificationSent = true;
            console.log('Direct notification sent successfully');
          } catch (socketError) {
            console.error('Error emitting direct notification:', socketError);
          }
        } else {
          console.log(`Mentee socket not found or not connected, falling back to room emission`);
        }
        
        // Always try room emission as a backup or additional delivery method
        try {
          console.log(`Emitting to room user_${menteeId}`);
          io.to(`user_${menteeId}`).emit('mentorshipRequestUpdate', notificationMessage);
          notificationSent = true;
          console.log('Room notification sent successfully');
        } catch (roomError) {
          console.error('Error emitting to room:', roomError);
        }
        
        // Also emit a general notification that can be picked up by any of the mentee's devices
        try {
          io.to(`user_${menteeId}`).emit('notification', {
            title: status === 'accepted' ? 'Mentorship Request Accepted' : 'Mentorship Request Declined',
            message: notificationMessage.message,
            type: 'mentorship_request',
            status: status
          });
        } catch (generalError) {
          console.error('Error emitting general notification:', generalError);
        }
        
        // Log final status
        if (notificationSent) {
          console.log(`Sent mentorship request ${status} notification to mentee ${menteeId}`);
        } else {
          console.warn(`Failed to send notification to mentee ${menteeId}, will need to check status when they reconnect`);
        }
      } catch (error) {
        console.error('Error handling requestStatusUpdated event:', error);
      }
    });

    // Handle connection updates
    socket.on('connection_updated', (data) => {
      const { connectionId, menteeId, mentorId, status } = data;
      console.log(`Connection updated: ${connectionId} - ${status}`);
      
      // Notify both mentor and mentee
      io.to(`user_${menteeId}`).emit('connectionUpdate', { connectionId, status });
      io.to(`user_${mentorId}`).emit('connectionUpdate', { connectionId, status });
    });

    // Handle chat session end
    socket.on('endChatSession', (data) => {
      try {
        console.log('Received endChatSession event:', data);
        const { chatId, recipientId, endedBy } = data;
        
        if (!recipientId) {
          console.error('Missing recipientId in endChatSession event');
          return;
        }
        
        // Notify the recipient that the chat session has ended
        io.to(`user_${recipientId}`).emit('chatSessionEnded', {
          chatId,
          endedBy: endedBy || socket.user.name,
          timestamp: new Date()
        });
        
        console.log(`Chat session ${chatId} ended by ${socket.user._id}`);
      } catch (error) {
        console.error('Error in endChatSession event:', error);
      }
    });

    // Video Call Signaling
    socket.on('video-offer', async (data) => {
      try {
        console.log('Received video-offer:', { 
          ...data, 
          offer: data.offer ? 'offer object present' : 'no offer',
          callerId: data.callerId,
          recipientId: data.recipientId,
          callId: data.callId,
          fromUserId: socket.user._id
        });
        
        // Validate required fields
        if (!data.recipientId || !data.callerId || !data.callId) {
          console.error('Invalid video offer data:', data);
          socket.emit('video-offer-error', { 
            error: 'Invalid offer data', 
            callId: data.callId || 'unknown'
          });
          return;
        }
        
        // Verify the caller is who they say they are
        if (data.callerId !== socket.user._id) {
          console.error(`User ID mismatch: Socket user ${socket.user._id} trying to send offer as ${data.callerId}`);
          socket.emit('video-offer-error', { 
            error: 'Authentication error', 
            callId: data.callId,
            errorCode: 'AUTH_ERROR'
          });
          return;
        }
        
        // Log connected users for debugging
        const debugInfo = debugSocketConnections();
        console.log('Connected users debug info:', debugInfo);
        
        // Log both socket rooms and connections
        console.log(`Caller ${data.callerId} socket rooms:`, Array.from(socket.rooms || []));
        console.log(`Attempting to find recipient socket for ${data.recipientId}`);
        
        // Verify the recipient exists and is connected
        const recipientSocket = findUserSocket(data.recipientId);
        if (!recipientSocket) {
          console.log(`Recipient ${data.recipientId} not connected, cannot deliver offer`);
          // Try emitting to their room anyway as a fallback
          io.to(`user_${data.recipientId}`).emit('video-offer', data);
          console.log(`Attempted fallback delivery to user_${data.recipientId} room`);
          
          socket.emit('video-offer-error', { 
            error: 'Failed to establish call: Recipient is not online', 
            callId: data.callId,
            errorCode: 'RECIPIENT_OFFLINE',
            debugInfo: {
              connectedUsers: Object.keys(connectedUsers),
              recipientRoom: `user_${data.recipientId}`,
              attemptedFallbackDelivery: true
            }
          });
          return;
        }
        
        // Verify that the users have an active connection
        try {
          const hasConnection = await checkUsersConnection(data.callerId, data.recipientId);
          if (!hasConnection) {
            console.log(`No active connection between users ${data.callerId} and ${data.recipientId}`);
            socket.emit('video-offer-error', { 
              error: 'No active connection with this user', 
              callId: data.callId,
              errorCode: 'NO_CONNECTION'
            });
            return;
          }
        } catch (err) {
          console.error('Error checking connection:', err);
          // Continue anyway to avoid blocking calls due to DB errors
        }
        
        // Forward the offer to the recipient
        console.log(`Forwarding video offer to recipient ${data.recipientId}`);
        
        // Try both direct socket emission and room emission for redundancy
        recipientSocket.emit('video-offer', data);
        io.to(`user_${data.recipientId}`).emit('video-offer', data);
        
        console.log(`Successfully sent video offer to ${data.recipientId}`);
      } catch (error) {
        console.error('Error processing video-offer:', error);
        socket.emit('video-offer-error', { 
          error: 'Server error processing offer', 
          callId: data.callId || 'unknown',
          errorDetails: error.message
        });
      }
    });

    socket.on('video-answer', (data) => {
      try {
        console.log('Received video-answer event:', data);
        const { callId, recipientId, answer } = data;
        
        if (!recipientId) {
          console.error('Missing recipientId in video-answer event');
          return;
        }
        
        // Send the answer back to the caller
        io.to(`user_${recipientId}`).emit('video-answer', {
          callId,
        answer,
          responderId: socket.user._id,
          responderName: socket.user.name
      });
        
        console.log(`Sent video-answer from ${socket.user._id} to ${recipientId}`);
      } catch (error) {
        console.error('Error in video-answer event:', error);
      }
    });

    socket.on('ice-candidate', (data) => {
      try {
        const { callId, candidate, recipientId } = data;
        
        if (!recipientId || !candidate) {
          console.error('Missing required data in ice-candidate event');
          return;
        }
        
        io.to(`user_${recipientId}`).emit('ice-candidate', {
          callId,
        candidate,
        userId: socket.user._id
      });
        
        console.log(`Sent ice-candidate from ${socket.user._id} to ${recipientId}`);
      } catch (error) {
        console.error('Error in ice-candidate event:', error);
      }
    });

    socket.on('join-call', (callId) => {
      try {
      socket.join(`call_${callId}`);
      io.to(`call_${callId}`).emit('user-joined-call', {
        userId: socket.user._id,
        userName: socket.user.name
      });
        console.log(`User ${socket.user._id} joined call room: call_${callId}`);
      } catch (error) {
        console.error('Error in join-call event:', error);
      }
    });

    socket.on('leave-call', (data) => {
      try {
        const { callId, recipientId } = data;
        
        if (!callId) {
          console.error('Missing callId in leave-call event');
          return;
        }
        
      socket.leave(`call_${callId}`);
      io.to(`call_${callId}`).emit('user-left-call', {
        userId: socket.user._id,
        userName: socket.user.name
      });
        
        // Notify the other participant that the call has ended
        if (recipientId) {
          io.to(`user_${recipientId}`).emit('call-ended', {
            callId,
            endedBy: socket.user._id,
            endedByName: socket.user.name
          });
        }
        
        console.log(`User ${socket.user._id} left call: ${callId}`);
      } catch (error) {
        console.error('Error in leave-call event:', error);
      }
    });

    // Task Updates
    socket.on('task-status-update', (data) => {
      const { taskId, status, menteeId } = data;
      io.to(`user_${menteeId}`).emit('taskStatusUpdated', {
        taskId,
        status,
        updatedBy: socket.user.name
      });
    });

    socket.on('task-comment', (data) => {
      const { taskId, comment, menteeId } = data;
      io.to(`user_${menteeId}`).emit('newTaskComment', {
        taskId,
        comment: {
          user: socket.user.name,
          content: comment,
          timestamp: new Date()
        }
      });
    });

    // Add a new event for connection status check
    socket.on('check-connection-status', async (data) => {
      try {
        if (!data.userId1 || !data.userId2) {
          socket.emit('connection-status-result', { 
            success: false, 
            error: 'Missing user IDs'
          });
          return;
        }
        
        const connected = await checkUsersConnection(data.userId1, data.userId2);
        
        socket.emit('connection-status-result', {
          success: true,
          connected,
          users: [data.userId1, data.userId2]
        });
      } catch (error) {
        console.error('Error checking connection status:', error);
        socket.emit('connection-status-result', { 
          success: false, 
          error: 'Server error checking connection'
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove the user from our connected users map
      if (userId && connectedUsers[userId]) {
        delete connectedUsers[userId];
        console.log(`Removed user ${userId} from connected users map`);
      }
    });
  });

  console.log('Socket.io server initialized successfully');
  return io;
};

// Function to find a socket by user ID
function findUserSocket(userId) {
  if (!userId) {
    console.log('findUserSocket called with null/undefined userId');
    return null;
  }
  
  console.log(`Finding socket for user ${userId}`);
  
  // Simple lookup from our map
  const socket = connectedUsers[userId];
  
  if (!socket) {
    console.log(`No socket found for user ${userId} in connectedUsers map`);
    console.log(`Current connected users: ${Object.keys(connectedUsers).join(', ')}`);
    return null;
  }
  
  // Verify the socket is still connected
  if (socket.connected === false) {
    console.log(`Socket for user ${userId} exists but is disconnected`);
    // Remove the disconnected socket from our map
    delete connectedUsers[userId];
    return null;
  }
  
  console.log(`Found active socket for user ${userId}`);
  return socket;
}

// Add an endpoint to debug socket connections
function debugSocketConnections() {
  const connectedUserIds = Object.keys(connectedUsers);
  const activeConnections = connectedUserIds.filter(userId => {
    const socket = connectedUsers[userId];
    return socket && socket.connected;
  });
  
  return {
    totalTrackedUsers: connectedUserIds.length,
    activeConnections: activeConnections.length,
    activeUserIds: activeConnections,
    allTrackedUserIds: connectedUserIds
  };
}

const getIo = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

// Add a helper function to check if users have an active connection
async function checkUsersConnection(userId1, userId2) {
  try {
    // Find connection between the users where status is 'accepted'
    const connection = await Connection.findOne({
      $or: [
        { mentor: userId1, mentee: userId2, status: 'accepted' },
        { mentor: userId2, mentee: userId1, status: 'accepted' }
      ]
    });
    
    return !!connection; // Return true if connection exists
  } catch (error) {
    console.error('Error checking connection status:', error);
    return false; // Default to false on error
  }
}

module.exports = {
  initializeSocket,
  getIo,
  findUserSocket,
  debugSocketConnections
}; 