const express = require("express");
const router = express.Router();
const { authMiddleware: auth } = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIo } = require("../services/socket");
const Connection = require('../models/Connection');

// Test endpoint to verify the chat API is working
router.get("/test", async (req, res) => {
  try {
    res.json({ 
      message: "Chat API is working",
      timestamp: new Date().toISOString(),
      status: "success"
    });
  } catch (error) {
    console.error("Error in test endpoint:", error);
    res.status(500).json({ message: "Error in test endpoint" });
  }
});

// Get a specific chat
router.get("/:chatId", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId)
      .populate("mentor", "name email")
      .populate("mentee", "name email")
      .populate("lastMessage");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is authorized to view this chat
    if (chat.mentor.toString() !== req.user._id.toString() && 
        chat.mentee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this chat" });
    }

    res.json(chat);
  } catch (error) {
    console.error("Error fetching chat:", error);
    res.status(500).json({ message: "Error fetching chat" });
  }
});

// Get all chats for a user
router.get("/", auth, async (req, res) => {
  try {
    console.log("Fetching chats for user:", req.user._id);
    const chats = await Chat.find({
      $or: [{ mentor: req.user._id }, { mentee: req.user._id }],
    })
      .populate("mentor", "name email")
      .populate("mentee", "name email")
      .populate("lastMessage")
      .sort({ updatedAt: -1 });

    console.log("Found chats:", chats.length);
    res.json(chats);
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json({ message: "Error fetching chats" });
  }
});

// Get messages for a specific chat
router.get("/:chatId/messages", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is authorized to view this chat
    if (chat.mentor.toString() !== req.user._id.toString() && 
        chat.mentee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to view this chat" });
    }

    const messages = await Message.find({ chat: req.params.chatId })
      .populate("sender", "name email")
      .populate("readBy.user", "name email")
      .sort({ createdAt: 1 });

    // Mark messages as read
    const unreadMessages = messages.filter(
      msg => 
        msg.sender.toString() !== req.user._id.toString() && 
        !msg.readBy.some(read => read.user.toString() === req.user._id.toString())
    );

    if (unreadMessages.length > 0) {
      await Promise.all(
        unreadMessages.map(msg =>
          Message.findByIdAndUpdate(
            msg._id,
            {
              $push: {
                readBy: {
                  user: req.user._id,
                  readAt: new Date()
                }
              }
            }
          )
        )
      );

      // Emit socket event for read receipts if socket.io is available
      if (req.io) {
        req.io.to(req.params.chatId).emit("messagesRead", {
          chatId: req.params.chatId,
          userId: req.user._id
        });
      } else {
        // Try getting io from the global context
        try {
          const { getIo } = require("../services/socket");
          const io = getIo();
          io.to(req.params.chatId).emit("messagesRead", {
            chatId: req.params.chatId,
            userId: req.user._id
          });
        } catch (socketError) {
          console.error("Socket notification error (non-critical):", socketError);
          // Continue anyway - messages are marked as read in database
        }
      }
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error: error.message });
  }
});

// Send a message in a chat
router.post("/:chatId/messages", auth, async (req, res) => {
  try {
    console.log("Sending message to chat:", req.params.chatId);
    console.log("Message content:", req.body.content);

    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Check if user is authorized to send messages in this chat
    if (chat.mentor.toString() !== req.user._id.toString() && 
        chat.mentee.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to send messages in this chat" });
    }

    const newMessage = new Message({
      chat: req.params.chatId,
      sender: req.user._id,
      content: req.body.content,
      readBy: [{ user: req.user._id }] // Mark as read by sender
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("sender", "name email")
      .populate("readBy.user", "name email");

    // Update chat's lastMessage field
    chat.lastMessage = newMessage._id;
    await chat.save();

    // Emit socket event for new message if socket.io is available
    if (req.io) {
      req.io.to(req.params.chatId).emit("newMessage", populatedMessage);
    } else {
      // Try getting io from the global context
      try {
        const { getIo } = require("../services/socket");
        const io = getIo();
        io.to(req.params.chatId).emit("newMessage", populatedMessage);
      } catch (socketError) {
        console.error("Socket notification error (non-critical):", socketError);
        // Continue anyway - message is saved in database
      }
    }

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error: error.message });
  }
});

// Create a new chat
router.post("/", auth, async (req, res) => {
  try {
    console.log("Creating new chat with body:", req.body);

    const { mentorId } = req.body;
    const mentor = await User.findById(mentorId);
    
    if (!mentor || mentor.role !== "mentor") {
      return res.status(400).json({ message: "Invalid mentor" });
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      mentor: mentorId,
      mentee: req.user._id
    });

    if (existingChat) {
      return res.json(existingChat);
    }

    const newChat = new Chat({
      mentor: mentorId,
      mentee: req.user._id,
      status: "active"
    });

    await newChat.save();

    const populatedChat = await Chat.findById(newChat._id)
      .populate("mentor", "name email")
      .populate("mentee", "name email");

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json({ message: "Error creating chat" });
  }
});

// Archive a chat
router.put("/:chatId/archive", auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    // Verify user is part of the chat
    if (chat.mentor.toString() !== req.user.id && chat.mentee.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    chat.status = "archived";
    await chat.save();

    res.json(chat);
  } catch (error) {
    console.error("Error archiving chat:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Add chat initialization endpoint for mentors
router.post("/initialize", auth, async (req, res) => {
  try {
    console.log("Chat initialization request received:", {
      userId: req.user._id,
      userRole: req.user.role,
      menteeId: req.body.menteeId,
      body: req.body
    });

    // Verify the user is a mentor
    if (req.user.role !== "mentor") {
      console.log("Chat initialization rejected: User is not a mentor");
      return res.status(403).json({ 
        message: "Only mentors can initialize chats",
        success: false
      });
    }
    
    const { menteeId } = req.body;
    
    if (!menteeId) {
      console.log("Chat initialization rejected: No mentee ID provided");
      return res.status(400).json({ 
        message: "Mentee ID is required",
        success: false
      });
    }
    
    // Find the mentee
    const mentee = await User.findById(menteeId);
    console.log("Mentee lookup result:", mentee ? "Found" : "Not found");
    
    if (!mentee || mentee.role !== "mentee") {
      console.log("Chat initialization rejected: Mentee not found or not a mentee");
      return res.status(404).json({ 
        message: "Mentee not found",
        success: false
      });
    }
    
    // First, ensure there is an accepted connection
    const connection = await Connection.findOne({
      mentor: req.user._id,
      mentee: menteeId,
      status: "accepted"
    });
    
    if (!connection) {
      console.log(`No accepted connection found between mentor ${req.user._id} and mentee ${menteeId}, checking for pending connection`);
      
      // Check if there's a pending connection we can accept
      const pendingConnection = await Connection.findOne({
        mentor: req.user._id,
        mentee: menteeId
      });
      
      if (pendingConnection) {
        console.log(`Found ${pendingConnection.status} connection, updating to accepted`);
        pendingConnection.status = "accepted";
        pendingConnection.startDate = pendingConnection.startDate || new Date();
        await pendingConnection.save();
        console.log("Connection accepted:", pendingConnection._id);
      } else {
        console.log("No connection found, creating new connection");
        
        // Create a new connection
        const newConnection = new Connection({
          mentor: req.user._id,
          mentee: menteeId,
          status: "accepted",
          startDate: new Date(),
          requestMessage: "Connection created automatically via chat initialization"
        });
        
        await newConnection.save();
        console.log("Created new connection:", newConnection._id);
      }
    } else {
      console.log(`Verified accepted connection exists between mentor ${req.user._id} and mentee ${menteeId}`);
    }
    
    // Check if chat already exists
    const existingChat = await Chat.findOne({
      mentor: req.user._id,
      mentee: menteeId,
    });
    
    if (existingChat) {
      console.log(`Chat already exists between mentor ${req.user._id} and mentee ${menteeId}`, {
        chatId: existingChat._id
      });
      
      // Return the existing chat
      const populatedChat = await Chat.findById(existingChat._id)
        .populate("mentor", "name email")
        .populate("mentee", "name email")
        .populate("lastMessage");
      
      console.log("Returning existing chat:", populatedChat._id);
      return res.json(populatedChat);
    }
    
    console.log(`Creating new chat between mentor ${req.user._id} and mentee ${menteeId}`);
    
    // Create a new chat
    const newChat = new Chat({
      mentor: req.user._id,
      mentee: menteeId,
      status: "active"
    });
    
    await newChat.save();
    console.log("New chat created with ID:", newChat._id);
    
    // Populate the chat for response
    const populatedChat = await Chat.findById(newChat._id)
      .populate("mentor", "name email")
      .populate("mentee", "name email");
      
    // Use socket.io to notify the mentee about the new chat
    try {
      const io = getIo();
      console.log(`Emitting chatInitialized event to user_${menteeId}`);
      io.to(`user_${menteeId}`).emit('chatInitialized', {
        chatId: newChat._id,
        mentor: {
          _id: req.user._id,
          name: req.user.name
        }
      });
    } catch (socketError) {
      console.error("Socket error when emitting chatInitialized:", socketError);
      // Continue anyway since this is just a notification
    }
    
    console.log("Chat initialization successful:", populatedChat._id);
    res.status(201).json(populatedChat);
  } catch (error) {
    console.error("Error initializing chat:", error);
    res.status(500).json({ 
      message: "Error initializing chat", 
      error: error.message,
      success: false
    });
  }
});

module.exports = router; 