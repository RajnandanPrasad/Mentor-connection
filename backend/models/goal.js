const mongoose = require("mongoose");

const GoalSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  dueDate: {
    type: Date,
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'needs-review'],
    default: 'not-started'
  },
  progress: {
    type: Number,
    default: 0
  },
  milestones: [
    {
      title: {
        type: String,
        required: true
      },
      completed: {
        type: Boolean,
        default: false
      },
      completedAt: {
        type: Date
      }
    }
  ],
  menteeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update timestamps
GoalSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware to update progress when milestones change
GoalSchema.pre('save', function(next) {
  if (this.milestones && this.milestones.length > 0) {
    const completedCount = this.milestones.filter(m => m.completed).length;
    this.progress = Math.round((completedCount / this.milestones.length) * 100);
  } else {
    this.progress = 0;
  }
  next();
});

module.exports = mongoose.model('Goal', GoalSchema);
