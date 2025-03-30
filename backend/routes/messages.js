const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");
const Message = require("../models/Message");
const { getIo } = require("../services/socket");

// ✅ Send a message
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { sender, receiver, text } = req.body;

    if (!sender || !receiver || !text) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const message = new Message({ sender, receiver, text });
    await message.save();

    // Emit real-time message to receiver
    const io = getIo();
    if (io) {
      io.to(`user_${receiver}`).emit("newMessage", message);
    }

    res.status(201).json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    next(error); // ✅ Pass error to next middleware
  }
});

// ✅ Get messages between two users
router.get("/:userId/:otherUserId", authMiddleware, async (req, res, next) => {
  try {
    const { userId, otherUserId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId },
      ],
    }).sort("createdAt");

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    next(error); // ✅ Pass error to next middleware
  }
});

module.exports = router;
