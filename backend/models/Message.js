const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: function() {
        return !this.group;
      }
    },
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: function() {
        return !this.chat;
      }
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    readBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      readAt: {
        type: Date,
        default: Date.now
      }
    }],
    messageType: {
      type: String,
      enum: ["text", "announcement"],
      default: "text"
    },
    delivered: {
      type: Boolean,
      default: false
    },
    deliveredAt: {
      type: Date
    }
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for checking if message is read by all participants
messageSchema.virtual('isReadByAll').get(function() {
  if (!this.chat) return false;
  
  // For direct messages, we need 2 read receipts (sender and recipient)
  return this.readBy.length === 2;
});

// Virtual for checking if message is delivered
messageSchema.virtual('isDelivered').get(function() {
  return this.delivered;
});

// Ensure message belongs to either a chat or a group
messageSchema.pre("validate", function(next) {
  if (!this.chat && !this.group) {
    next(new Error("Message must belong to either a chat or a group"));
  } else if (this.chat && this.group) {
    next(new Error("Message cannot belong to both chat and group"));
  } else {
    next();
  }
});

// Set delivered status when message is created
messageSchema.pre("save", function(next) {
  if (this.isNew) {
    this.delivered = true;
    this.deliveredAt = new Date();
  }
  next();
});

// Update the last message of the chat when a new message is created
messageSchema.post("save", async function() {
  try {
    if (this.chat) {
      const Chat = mongoose.model("Chat");
      await Chat.findByIdAndUpdate(
        this.chat,
        { 
          lastMessage: this._id,
          updatedAt: new Date()
        }
      );
    }
  } catch (error) {
    console.error("Error updating chat's last message:", error);
  }
});

// Indexes for faster queries
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ "readBy.user": 1 });
messageSchema.index({ delivered: 1 });

const Message = mongoose.model("Message", messageSchema);
module.exports = Message; 