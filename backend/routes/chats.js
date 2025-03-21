const express = require("express");
const router = express.Router();
const { authMiddleware: auth } = require("../middleware/authMiddleware");
const Chat = require("../models/Chat");
const Message = require("../models/Message");
const User = require("../models/User");
const { getIo } = require("../services/socket");

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

      // Emit socket event for read receipts
      req.io.to(req.params.chatId).emit("messagesRead", {
        chatId: req.params.chatId,
        userId: req.user._id
      });
    }

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages" });
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

    // Emit socket event for new message
    req.io.to(req.params.chatId).emit("newMessage", populatedMessage);

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
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

module.exports = router; 