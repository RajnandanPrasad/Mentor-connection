const mongoose = require('mongoose');

const userPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  preferredSkills: [{
    type: String
  }],
  interests: [{
    type: String
  }],
  availability: [{
    day: String,
    slots: [String]
  }],
  experienceLevel: {
    type: Number,
    min: 1,
    max: 5
  },
  preferredMentorshipStyle: {
    type: String,
    enum: ['structured', 'flexible', 'project-based', 'casual']
  }
}, { timestamps: true });

module.exports = mongoose.model('UserPreference', userPreferenceSchema); 