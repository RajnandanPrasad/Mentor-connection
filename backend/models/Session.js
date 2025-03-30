const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['chat', 'video'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  mentee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number // in seconds
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Calculate duration before saving
sessionSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000);
  }
  next();
});

// Indexes for efficient querying
sessionSchema.index({ mentor: 1, mentee: 1, type: 1 });
sessionSchema.index({ startTime: 1 });
sessionSchema.index({ status: 1 });

module.exports = mongoose.model('Session', sessionSchema); 