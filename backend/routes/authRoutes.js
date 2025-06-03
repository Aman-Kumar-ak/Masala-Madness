const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Device = require('../models/Device');
const { authenticateToken } = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');

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
    let { username, password, rememberDevice, deviceToken } = req.body;
    if (rememberDevice === undefined) rememberDevice = true; // Default to true
    const logDeviceToken = deviceToken ? deviceToken.substring(0, 8) + '...' : '[none]'; // Log only part of the token for security
    console.log(`Login attempt: { username: '${username}', rememberDevice: ${rememberDevice}, deviceToken: ${logDeviceToken} }`);
    
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
    admin.lastLogin = getISTDate();
    await admin.save();

    const response = { 
      status: 'success', 
      token,
      user: {
        username: admin.username,
        id: admin._id
      }
    };

    // If remember device is requested, handle device token logic
    if (rememberDevice) {
      const userAgent = req.headers['user-agent'] || 'unknown';
      const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let device;
      
      if (deviceToken) {
        // Try to find an existing valid device
        device = await Device.findOne({
          deviceId: deviceToken,
          userId: admin._id,
          isActive: true,
          expiresAt: { $gt: new Date() }
        });
        
        if (device) {
          // Check if user agent has changed significantly
          const userAgentChanged = device.userAgent !== userAgent;
          
          // Update device information
          device.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
          device.lastLogin = getISTDate();
          device.isActive = true;
          
          // Record user agent change in history if needed
          if (userAgentChanged) {
            device.statusHistory.push({ 
              status: 'active', 
              reason: 'user agent changed on login', 
              timestamp: getISTDate() 
            });
            device.userAgent = userAgent; // Update to new user agent
          } else {
            device.statusHistory.push({ 
              status: 'active', 
              reason: 'login', 
              timestamp: getISTDate() 
            });
          }
          
          await device.save();
          response.deviceToken = device.deviceId;
          console.log(`[Device Auth] Existing device login: deviceId=${device.deviceId.substring(0, 8)}...`);
        }
      }
      
      if (!device) {
        // Create a new device token with improved security
        const deviceId = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

        device = new Device({
          deviceId,
          userId: admin._id,
          expiresAt,
          userAgent,
          isActive: true,
          lastLogin: getISTDate(),
          createdAt: getISTDate(),
          statusHistory: [{ 
            status: 'active', 
            reason: 'new device login', 
            timestamp: getISTDate() 
          }]
        });
        await device.save();
        response.deviceToken = deviceId;
        console.log(`[Device Auth] New device registered: deviceId=${deviceId.substring(0, 8)}...`);
      }
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
  // If this is a device token verification, also generate a fresh JWT token
  // This helps with smoother transitions between pages
  let response = {
    status: 'success',
    user: {
      username: req.user.username,
      id: req.user.id
    }
  };
  
  // If this was a device token auth, generate a fresh JWT token for the session
  if (req.tokenType === 'device') {
    const token = jwt.sign(
      { id: req.user.id, username: req.user.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    response.token = token;
  }
  
  return res.status(200).json(response);
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