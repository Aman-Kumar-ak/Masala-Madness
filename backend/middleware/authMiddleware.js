const jwt = require('jsonwebtoken');
// const Admin = require('../models/Admin'); // Remove old Admin model
const User = require('../models/User');

// Helper to get current IST date (reused from authRoutes.js)
function getISTDate() {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(now.getTime() + istOffset - now.getTimezoneOffset() * 60000);
}

// Middleware to verify JWT token or device token
const authenticateToken = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    // If no token is provided
    if (!token) {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Access denied. No token provided.' 
      });
    }

    // Check token type - JWT tokens are typically longer than device tokens
    // This optimization prevents unnecessary database queries
    const isLikelyJWT = token.length > 100;
    
    if (isLikelyJWT) {
      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Use User model instead of Admin
        const user = await User.findById(decoded.userId || decoded.id);
        
        if (!user || !user.isActive) {
          return res.status(403).json({ 
            status: 'error', 
            message: 'Invalid token or user disabled.' 
          });
        }
        // Attach user info to req.user
        req.user = user;
        req.tokenType = 'jwt';
        return next();
      } catch (jwtError) {
        // JWT verification failed, continue to device token check
      }
    }

    // Try as device token
    const userAgent = req.headers['user-agent'] || 'unknown';
    // Find user with an active device token
    const user = await User.findOne({
      'devices.deviceId': token,
      'devices.isActive': true,
      'devices.expiresAt': { $gt: new Date() }
    });
    if (!user) {
      // Try to find user with this device token (even if inactive/expired)
      const userWithDevice = await User.findOne({ 'devices.deviceId': token });
      if (userWithDevice) {
        const device = userWithDevice.devices.find(d => d.deviceId === token);
        if (device) {
          let reason = 'invalid';
          if (device.isActive || device.expiresAt > new Date()) {
            reason = device.expiresAt <= new Date() ? 'expired' : 'logged out';
          } else if (device.expiresAt <= new Date()) {
            reason = 'expired';
          } else if (!device.isActive) {
            reason = 'inactive';
          }
          device.isActive = false;
          device.statusHistory.push({
            status: 'inactive',
            reason,
            timestamp: getISTDate()
          });
          await userWithDevice.save();
        }
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid or expired device token.'
      });
    }
    // Find the device in user's devices array
    const device = user.devices.find(d => d.deviceId === token);
    if (!device) {
      return res.status(401).json({ status: 'error', message: 'Device not found.' });
    }
    // Update last login time and record user agent if changed
    const currentDate = getISTDate();
    device.lastLogin = currentDate;
    if (device.userAgent !== userAgent) {
      device.statusHistory.push({
        status: 'active',
        reason: 'user agent changed',
        timestamp: currentDate
      });
      device.userAgent = userAgent;
    }
    // Extend expiry date on active use - rolling window approach
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + 30); // 30 days from now
    device.expiresAt = newExpiryDate;
    await user.save();
    if (!user.isActive) {
      device.isActive = false;
      device.statusHistory.push({
        status: 'inactive',
        reason: 'user account disabled',
        timestamp: currentDate
      });
      await user.save();
      return res.status(403).json({
        status: 'error',
        message: 'User account is disabled.'
      });
    }
    req.user = user;
    req.tokenType = 'device';
    req.deviceId = device.deviceId;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(403).json({ 
      status: 'error', 
      message: 'Invalid token.' 
    });
  }
};

// Middleware to check if user is admin
const adminAuth = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Middleware to check if user is worker
const workerAuth = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {
      if (!req.user || req.user.role !== 'worker') {
        return res.status(403).json({ message: 'Access denied. Worker privileges required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

module.exports = {
  authenticateToken,
  adminAuth,
  workerAuth,
  auth: authenticateToken // Alias for routes expecting 'auth'
};