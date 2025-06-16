const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./User'); // Assuming User model is in ./User

const SecretCodeSchema = new mongoose.Schema({
  secretCode: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastUsedAt: {
    type: Date,
  },
  lastUsedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastUsedWhere: {
    type: String, // e.g., 'QR', 'Settings'
  },
  passwordHistory: [
    {
      secretCode: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash the secret code before saving
SecretCodeSchema.pre('save', async function (next) {
  if (this.isModified('secretCode')) {
    this.secretCode = await bcrypt.hash(this.secretCode, 10);
  }
  next();
});

// Method to compare secret code
SecretCodeSchema.methods.compareSecretCode = async function (candidateSecretCode) {
  return await bcrypt.compare(candidateSecretCode, this.secretCode);
};

// Ensure only one document exists
SecretCodeSchema.statics.getSecretCode = async function () {
  let secretCode = await this.findOne();
  if (!secretCode) {
    // This scenario should be handled by the initialization route
    // For now, we will return null and let the route handle creation
    return null;
  }
  return secretCode;
};

// Update updatedAt field on every save
SecretCodeSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const SecretCode = mongoose.model('SecretCode', SecretCodeSchema);

module.exports = SecretCode; 