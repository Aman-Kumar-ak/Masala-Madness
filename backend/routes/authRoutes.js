const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { authenticateToken } = require('../middleware/authMiddleware');

// Admin login
router.post('/login', async (req, res) => {
  console.log('Login attempt:', { 
    username: req.body.username,
    body: req.body,
    headers: req.headers['content-type'],
    ip: req.ip 
  });
  
  try {
    const { username, password } = req.body;
    
    // Additional validation to catch missing credentials
    if (!username || !password) {
      console.log('Login failed: Missing credentials');
      return res.status(400).json({ 
        status: 'error', 
        message: 'Username and password are required' 
      });
    }
    
    // Find the admin by username
    const admin = await Admin.findOne({ username });
    
    // If admin not found
    if (!admin) {
      console.log(`Login failed: User not found - ${username}`);
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }
    
    // Compare password
    const passwordMatches = await admin.comparePassword(password);
    
    // If password doesn't match
    if (!passwordMatches) {
      console.log(`Login failed: Invalid password for user - ${username}`);
      return res.status(401).json({ 
        status: 'error', 
        message: 'Invalid credentials' 
      });
    }
    
    // If admin account is not active
    if (!admin.isActive) {
      console.log(`Login failed: Account disabled - ${username}`);
      return res.status(403).json({ 
        status: 'error', 
        message: 'Account is disabled. Please contact support.' 
      });
    }
    
    // Create JWT token
    console.log(`Creating JWT token for user ${username}`);
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();
    console.log(`Login successful for user ${username}`);
    
    return res.status(200).json({ 
      status: 'success', 
      token,
      user: {
        username: admin.username,
        id: admin._id
      }
    });
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
  console.log('Token verification successful for user:', req.user.username);
  return res.status(200).json({ 
    status: 'success',
    user: {
      username: req.user.username,
      id: req.user.id
    }
  });
});

// Logout route (client-side only - just for completeness)
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  return res.status(200).json({ 
    status: 'success', 
    message: 'Logged out successfully' 
  });
});

// Change password route
router.post('/change-password', authenticateToken, async (req, res) => {
  console.log('Password change attempt for user:', req.user.username);
  
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
    
    console.log('Password changed successfully for user:', req.user.username);
    
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
  console.log('Password verification attempt for user:', req.user.username);
  
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
      console.log('Password verified successfully for user:', req.user.username);
      return res.status(200).json({
        status: 'success',
        message: 'Password is correct'
      });
    } else {
      console.log('Password verification failed for user:', req.user.username);
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