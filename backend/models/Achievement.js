const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievements: [{
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    icon: String,
    unlocked: {
      type: Boolean,
      default: false
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    unlockedAt: Date
  }],
  level: {
    type: Number,
    default: 1
  },
  totalPoints: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema); 