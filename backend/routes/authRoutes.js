const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/authMiddleware');
const SecretCode = require('../models/SecretCode');

// Helper to get current IST date
function getISTDate() {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60000);
}

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password, rememberDevice, deviceToken } = req.body;

    // Find user by username (mobile number for workers/new admins, or specific username for main admin)
    const user = await User.findOne({
      $or: [
        { username: username },
        { mobileNumber: username }
      ]
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is disabled.' });
    }
    
    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Update last login
    user.lastLogin = getISTDate();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Handle device token if remember device is enabled
    let newDeviceToken = null;
    if (rememberDevice) {
      if (deviceToken) {
        // Update existing device token in user's devices array
        const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceToken);
        if (deviceIndex !== -1) {
          user.devices[deviceIndex].lastLogin = getISTDate();
          user.devices[deviceIndex].isActive = true;
          newDeviceToken = deviceToken;
        }
      } else {
        // Create new device token in user's devices array
        const newDevice = {
          deviceId: require('crypto').randomBytes(32).toString('hex'),
          lastLogin: getISTDate(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          isActive: true,
          userAgent: req.headers['user-agent'],
          createdAt: getISTDate(),
          statusHistory: [{ status: 'active', timestamp: getISTDate(), reason: 'login' }]
        };
        user.devices.push(newDevice);
        newDeviceToken = newDevice.deviceId;
      }
      await user.save();
    }

    res.json({
      token,
      deviceToken: newDeviceToken,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify token is valid (used for auth persistence)
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Fetch the full user object (excluding password)
    const user = await User.findById(req.user._id || req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ 
      user: user // This will include role, name, etc.
    });
  } catch (error) {
    console.error('Verify user error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const tokenType = req.tokenType;
    if (tokenType === 'device') {
      // Deactivate device in user's devices array
      const user = await User.findById(req.user._id || req.user.id);
      const deviceIndex = user.devices.findIndex(d => d.deviceId === token);
      if (deviceIndex !== -1) {
        user.devices[deviceIndex].isActive = false;
        user.devices[deviceIndex].statusHistory.push({ status: 'inactive', reason: 'explicit logout', timestamp: getISTDate() });
        await user.save();
        console.log(`[Device Auth] Device deactivated (logout): deviceId=${token.substring(0, 8)}...`);
      }
    } else {
      console.log(`[Auth] JWT token logout`);
    }
    return res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// Get all devices for the current user
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);
    const devices = user.devices.sort((a, b) => b.lastLogin - a.lastLogin);
    const formattedDevices = devices.map(device => ({
      deviceId: device.deviceId,
      lastLogin: device.lastLogin,
      isActive: device.isActive,
      expiresAt: device.expiresAt,
      userAgent: device.userAgent,
      createdAt: device.createdAt,
      isCurrent: req.tokenType === 'device' && req.deviceId === device.deviceId
    }));
    return res.status(200).json({ status: 'success', devices: formattedDevices });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch devices' });
  }
});

// Revoke a specific device
router.post('/revoke-device', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      return res.status(400).json({ status: 'error', message: 'Device ID is required' });
    }
    const user = await User.findById(req.user._id || req.user.id);
    const deviceIndex = user.devices.findIndex(d => d.deviceId === deviceId);
    if (deviceIndex === -1) {
      return res.status(404).json({ status: 'error', message: 'Device not found or already revoked' });
    }
    user.devices[deviceIndex].isActive = false;
    user.devices[deviceIndex].statusHistory.push({ status: 'inactive', reason: 'manually revoked', timestamp: getISTDate() });
    await user.save();
    const isCurrentDevice = req.tokenType === 'device' && req.deviceId === deviceId;
    return res.status(200).json({ status: 'success', message: 'Device revoked successfully', isCurrentDevice });
  } catch (error) {
    console.error('Error revoking device:', error);
    return res.status(500).json({ status: 'error', message: 'Failed to revoke device' });
  }
});

// Change password route
router.post('/change-password', authenticateToken, async (req, res) => {
  console.log('Password change attempt');
  
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }
    
    // Find the admin by ID from the token
    const admin = await User.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'Admin not found'
      });
    }
    
    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    console.log('Password changed successfully');
    
    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while changing password'
    });
  }
});

// Verify current password route
router.post('/verify-password', authenticateToken, async (req, res) => {
  console.log('Password verification attempt');
  
  try {
    const { password } = req.body;
    
    // Validate input
    if (!password) {
      return res.status(400).json({
        status: 'error',
        message: 'Password is required'
      });
    }
    
    // Find the admin by ID from the token
    const admin = await User.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({
        status: 'error',
        message: 'Admin not found'
      });
    }
    
    // Verify current password
    const isMatch = await admin.comparePassword(password);
    
    if (isMatch) {
      console.log('Password verified successfully');
      return res.status(200).json({
        status: 'success',
        message: 'Password is correct'
      });
    } else {
      console.log('Password verification failed');
      return res.status(401).json({
        status: 'error',
        message: 'Password is incorrect'
      });
    }
  } catch (error) {
    console.error('Error verifying password:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while verifying password'
    });
  }
});

// Register new user (admin only)
router.post('/register', adminAuth, async (req, res) => {
  try {
    const { name, mobileNumber, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { username: mobileNumber },
        { mobileNumber: mobileNumber }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      username: mobileNumber, // Use mobile number as username
      password,
      name,
      mobileNumber,
      role,
      assignedBy: req.user._id
    });

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({})
      .select('-password')
      .populate('assignedBy', 'name username')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user (admin only)
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, mobileNumber, password, role, isActive } = req.body;
    const updates = {};

    if (name) updates.name = name;
    if (mobileNumber) {
      updates.mobileNumber = mobileNumber;
      updates.username = mobileNumber; // Update username to match mobile number
    }
    if (password) updates.password = password;
    if (role) updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all devices with user info (admin only)
router.get('/devices/all', adminAuth, async (req, res) => {
  try {
    const devices = await User.find({})
      .populate('devices.userId', 'name role')
      .sort({ 'devices.lastLogin': -1 });
    res.json(devices);
  } catch (error) {
    console.error('Get all devices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update device status (admin only)
router.put('/devices/:id', adminAuth, async (req, res) => {
  try {
    const { isActive } = req.body;
    // Find the user who owns this device
    const user = await User.findOne({ 'devices.deviceId': req.params.id });
    if (!user) {
      return res.status(404).json({ message: 'User with this device not found' });
    }
    const deviceIndex = user.devices.findIndex(d => d.deviceId === req.params.id);
    if (deviceIndex === -1) {
      return res.status(404).json({ message: 'Device not found' });
    }
    user.devices[deviceIndex].isActive = isActive;
    user.devices[deviceIndex].statusHistory.push({ status: isActive ? 'active' : 'inactive', reason: isActive ? 'admin enabled' : 'admin disabled', timestamp: getISTDate() });
    await user.save();
    res.json({ message: 'Device updated', device: user.devices[deviceIndex] });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Delete a user
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    // Prevent an admin from deleting their own account
    if (req.user.userId === id) {
      return res.status(403).json({ message: 'You cannot delete your own account.' });
    }
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    // No need to delete devices separately, as they're embedded
    res.status(200).json({ message: 'User and associated devices deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Secret Code Initialization/Update route (Admin only, can be used to set or reset)
router.post('/secret-code/initialize', adminAuth, async (req, res) => {
  try {
    const { secretCode } = req.body;
    const currentUserId = req.user._id; // User initiating the action

    if (!secretCode) {
      return res.status(400).json({ message: 'Secret code is required.' });
    }

    let existingSecretCode = await SecretCode.findOne();

    if (existingSecretCode) {
      // If code exists, update it
      existingSecretCode.secretCode = secretCode; // Mongoose pre-save hook will hash this
      existingSecretCode.updatedBy = currentUserId;
      existingSecretCode.lastUsedAt = getISTDate(); // Update last used time to current time for clarity
      existingSecretCode.lastUsedBy = currentUserId;
      
      // Ensure auditTrail is an array before pushing
      if (!existingSecretCode.auditTrail || !Array.isArray(existingSecretCode.auditTrail)) {
        existingSecretCode.auditTrail = [];
      }
      existingSecretCode.auditTrail.push({
        timestamp: getISTDate(),
        action: 'Secret code updated',
        changedBy: currentUserId,
      });
      await existingSecretCode.save();
      return res.status(200).json({
        status: 'success',
        message: 'Secret access code updated successfully.',
      });
    } else {
      // If no code exists, create a new one
      const newSecretCode = new SecretCode({
        secretCode: secretCode, // Mongoose pre-save hook will hash this
        createdBy: currentUserId,
        lastUsedAt: getISTDate(),
        lastUsedBy: currentUserId,
        auditTrail: [
          {
            timestamp: getISTDate(),
            action: 'Secret code initialized',
            changedBy: currentUserId,
          },
        ],
      });
      await newSecretCode.save();
      return res.status(201).json({
        status: 'success',
        message: 'Secret access code initialized successfully.',
      });
    }
  } catch (error) {
    console.error('Error initializing/updating secret code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Secret Code Verification route
router.post('/secret-code/verify', authenticateToken, async (req, res) => {
  try {
    const { secretCode, usedWhere, currentUserId } = req.body;

    if (!secretCode) {
      return res.status(400).json({ message: 'Secret code is required.' });
    }

    const secretCodeDoc = await SecretCode.findOne();

    if (!secretCodeDoc) {
      return res.status(404).json({ message: 'Secret code not set up. Please initialize it.' });
    }

    const isMatch = await secretCodeDoc.compareSecretCode(secretCode);

    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect secret code. Please try again.' });
    }

    // Update lastUsedAt, lastUsedBy, and lastUsedWhere
    secretCodeDoc.lastUsedAt = getISTDate();
    secretCodeDoc.lastUsedBy = currentUserId; // Store the user who used it
    secretCodeDoc.lastUsedWhere = usedWhere; // Store where it was used (e.g., QR, Settings)
    await secretCodeDoc.save();

    return res.status(200).json({
      status: 'success',
      message: 'Secret code verified successfully.',
    });
  } catch (error) {
    console.error('Error verifying secret code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Secret Code Change route (requires current secret code verification)
router.put('/secret-code/change', adminAuth, async (req, res) => {
  try {
    const { currentSecretCode, newSecretCode } = req.body;
    const currentUserId = req.user._id;

    if (!currentSecretCode || !newSecretCode) {
      return res.status(400).json({ message: 'Current and new secret codes are required.' });
    }

    const secretCodeDoc = await SecretCode.findOne();

    if (!secretCodeDoc) {
      return res.status(404).json({ message: 'Secret code not set up. Please initialize it first.' });
    }

    // Verify current secret code
    const isMatch = await secretCodeDoc.compareSecretCode(currentSecretCode);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect current secret code.' });
    }

    // Update the secret code
    secretCodeDoc.secretCode = newSecretCode; // Mongoose pre-save hook will hash this
    secretCodeDoc.updatedBy = currentUserId;
    secretCodeDoc.auditTrail.push({
      timestamp: getISTDate(),
      action: 'Secret code changed',
      changedBy: currentUserId,
    });
    await secretCodeDoc.save();

    return res.status(200).json({
      status: 'success',
      message: 'Secret code changed successfully.',
    });
  } catch (error) {
    console.error('Error changing secret code:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 