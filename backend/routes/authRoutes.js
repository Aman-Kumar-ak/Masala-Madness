const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Device = require('../models/Device');
const { authenticateToken } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/authMiddleware');

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
      ],
      isActive: true 
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
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
        // Update existing device token
        const device = await Device.findOne({ deviceId: deviceToken });
        if (device) {
          device.lastLogin = getISTDate();
          device.isActive = true;
          await device.save();
          newDeviceToken = deviceToken;
        }
      } else {
        // Create new device token
        const device = new Device({
          deviceId: require('crypto').randomBytes(32).toString('hex'),
          userId: user._id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          userAgent: req.headers['user-agent']
        });
        await device.save();
        newDeviceToken = device.deviceId;
      }
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
    const tokenType = req.tokenType; // From our enhanced middleware
    
    // Handle logout based on token type
    if (tokenType === 'device') {
      // If it's a device token, deactivate it
      const device = await Device.findOneAndUpdate(
        { deviceId: token },
        { 
          isActive: false, 
          $push: { 
            statusHistory: { 
              status: 'inactive', 
              reason: 'explicit logout', 
              timestamp: getISTDate() 
            } 
          } 
        },
        { new: true } // Return the updated document
      );
      
      if (device) {
        console.log(`[Device Auth] Device deactivated (logout): deviceId=${token.substring(0, 8)}...`);
      }
    } else {
      // For JWT tokens, we don't need to do anything server-side
      // The client will remove the token from storage
      console.log(`[Auth] JWT token logout`);
    }
    
    return res.status(200).json({ 
      status: 'success', 
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// Add a new route to get all devices for the current user
router.get('/devices', authenticateToken, async (req, res) => {
  try {
    // Find all devices for the current user
    const devices = await Device.find({ 
      userId: req.user.id 
    }).sort({ lastLogin: -1 }); // Sort by most recently used
    
    // Format the response to include only necessary information
    const formattedDevices = devices.map(device => ({
      id: device._id,
      deviceId: device.deviceId,
      lastLogin: device.lastLogin,
      isActive: device.isActive,
      expiresAt: device.expiresAt,
      userAgent: device.userAgent,
      createdAt: device.createdAt,
      isCurrent: req.tokenType === 'device' && req.deviceId === device.deviceId
    }));
    
    return res.status(200).json({
      status: 'success',
      devices: formattedDevices
    });
  } catch (error) {
    console.error('Error fetching devices:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to fetch devices'
    });
  }
});

// Add a route to revoke a specific device
router.post('/revoke-device', authenticateToken, async (req, res) => {
  try {
    const { deviceId } = req.body;
    
    if (!deviceId) {
      return res.status(400).json({
        status: 'error',
        message: 'Device ID is required'
      });
    }
    
    // Find and update the device
    const device = await Device.findOneAndUpdate(
      { 
        deviceId,
        userId: req.user.id // Ensure the device belongs to the current user
      },
      { 
        isActive: false,
        $push: { 
          statusHistory: { 
            status: 'inactive', 
            reason: 'manually revoked', 
            timestamp: getISTDate() 
          } 
        }
      },
      { new: true }
    );
    
    if (!device) {
      return res.status(404).json({
        status: 'error',
        message: 'Device not found or already revoked'
      });
    }
    
    // If the user is revoking their current device, we should indicate this
    const isCurrentDevice = req.tokenType === 'device' && req.deviceId === deviceId;
    
    return res.status(200).json({
      status: 'success',
      message: 'Device revoked successfully',
      isCurrentDevice
    });
  } catch (error) {
    console.error('Error revoking device:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to revoke device'
    });
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
    const devices = await Device.find({})
      .populate('userId', 'name role')
      .sort({ createdAt: -1 });
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
    const device = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive } },
      { new: true }
    );
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }
    res.json({ message: 'Device updated', device });
  } catch (error) {
    console.error('Update device error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 