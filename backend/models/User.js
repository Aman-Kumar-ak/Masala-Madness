const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'worker'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastLogin: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  devices: [
    {
      deviceId: {
        type: String,
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
    }
  ]
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(12);
    // Hash the password using the new salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to get public profile (excluding sensitive data)
userSchema.methods.getPublicProfile = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User; 