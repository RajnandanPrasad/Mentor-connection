const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Ensure mentor and mentee are different users
chatSchema.pre("validate", function(next) {
  if (this.mentor.toString() === this.mentee.toString()) {
    next(new Error("Mentor and mentee cannot be the same user"));
  } else {
    next();
  }
});

// Indexes for faster queries
chatSchema.index({ mentor: 1, mentee: 1 }, { unique: true });
chatSchema.index({ status: 1 });
chatSchema.index({ lastMessage: 1 });

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat; 