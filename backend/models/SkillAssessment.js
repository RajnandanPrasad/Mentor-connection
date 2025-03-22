const mongoose = require('mongoose');

const skillAssessmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  skills: [{
    skill: {
      type: String,
      required: true
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 4 // Corresponding to our frontend levels (Beginner to Expert)
    },
    assessedAt: {
      type: Date,
      default: Date.now
    }
  }],
  overallProgress: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('SkillAssessment', skillAssessmentSchema); 