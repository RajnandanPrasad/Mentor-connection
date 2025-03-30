const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed"],
      default: "pending",
    },
    mentorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    menteeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      default: null
    },
    completedAt: {
      type: Date,
    },
    attachments: [
      {
        type: String, // URLs to attached files
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Automatically update the updatedAt timestamp
taskSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Update task status based on due date (only if not completed)
taskSchema.pre("save", function (next) {
  if (this.status !== "completed" && this.dueDate < new Date()) {
    this.status = "overdue";
  }
  next();
});

// Set completedAt date when task is marked as completed
taskSchema.pre("save", function (next) {
  if (this.status === "completed" && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

// Index for efficient querying
taskSchema.index({ mentorId: 1, menteeId: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ goalId: 1 });

module.exports = mongoose.model("Task", taskSchema);
