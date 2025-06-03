const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Device = require('../models/Device');
const { authenticateToken } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

// Admin login
router.post('/login', async (req, res) => {
  try {
    let { username, password, rememberDevice } = req.body;
    if (rememberDevice === undefined) rememberDevice = true; // Default to true
    console.log('Login attempt:', { username, rememberDevice });
    
    if (!username || !password) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Username and password are required' 
      });
    }
    
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }
    
    const passwordMatches = await admin.comparePassword(password);
    
    if (!passwordMatches) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }
    
    if (!admin.isActive) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Account is disabled. Please contact support.' 
      });
    }
    
    // Create JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();

    const response = { 
      status: 'success', 
      token,
      user: {
        username: admin.username,
        id: admin._id
      }
    };

    // If remember device is requested, create a device token
    if (rememberDevice) {
      const deviceId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      const device = new Device({
        deviceId,
        userId: admin._id,
        expiresAt,
        userAgent: req.headers['user-agent'] || 'unknown'
      });

      await device.save();
      response.deviceToken = deviceId;
      console.log('Device token created and saved:', deviceId);
    } else {
      console.log('Device not remembered for this login.');
    }
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error' 
    });
  }
});

// Verify token is valid (used for auth persistence)
router.get('/verify', authenticateToken, (req, res) => {
  console.log('Token verification successful');
  return res.status(200).json({ 
    status: 'success',
    user: {
      username: req.user.username,
      id: req.user.id
    }
  });
});

// Logout route
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const deviceId = req.headers['authorization']?.split(' ')[1];
    
    // If it's a device token, deactivate it
    if (deviceId) {
      await Device.findOneAndUpdate(
        { deviceId },
        { isActive: false }
      );
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
    const admin = await Admin.findById(req.user.id);
    
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
    const admin = await Admin.findById(req.user.id);
    
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

module.exports = router; 