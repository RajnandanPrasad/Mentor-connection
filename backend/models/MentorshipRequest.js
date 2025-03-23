const mongoose = require("mongoose");

const mentorshipRequestSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    message: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  { timestamps: true }
);

// Remove the old index if it exists
mentorshipRequestSchema.index({ mentor: 1, mentee: 1, status: 1 });

// Pre-save middleware to check for existing pending or accepted requests
mentorshipRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    const existingRequest = await this.constructor.findOne({
      mentor: this.mentor,
      mentee: this.mentee,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      const error = new Error(
        existingRequest.status === 'pending'
          ? 'You already have a pending request with this mentor'
          : 'You are already connected with this mentor'
      );
      error.code = 11000; // Set duplicate key error code
      next(error);
    }
  }
  next();
});

const MentorshipRequest = mongoose.model("MentorshipRequest", mentorshipRequestSchema);
module.exports = MentorshipRequest; 