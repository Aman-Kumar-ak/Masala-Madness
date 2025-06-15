const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userAgent: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  statusHistory: [
    {
      status: { type: String, enum: ['active', 'inactive'], required: true },
      timestamp: { type: Date, default: Date.now },
      reason: { type: String }
    }
  ]
});

// Add index for faster queries
deviceSchema.index({ deviceId: 1, userId: 1 });
deviceSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Device', deviceSchema); 