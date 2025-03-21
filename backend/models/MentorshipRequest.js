const mongoose = require("mongoose");

const mentorshipRequestSchema = new mongoose.Schema(
  {
    mentee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    message: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const MentorshipRequest = mongoose.model("MentorshipRequest", mentorshipRequestSchema);
module.exports = MentorshipRequest; 