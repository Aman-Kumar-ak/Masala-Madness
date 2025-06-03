const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Device = require('../models/Device');

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
    // Get the token from the authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
    }

    // First, check if it's a JWT token (they are typically much shorter than device tokens)
    // This helps avoid unnecessary DB queries for JWT tokens
    if (token.length < 100) { // JWT tokens are typically shorter
      try {
        // Verify JWT token synchronously to avoid unnecessary async overhead
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Use lean() for faster query performance since we don't need a full mongoose document
        const admin = await Admin.findById(decoded.id).select('_id username role isActive').lean();
        
        if (!admin) {
          return res.status(401).json({ status: 'error', message: 'Invalid token. User not found.' });
        }
        
        if (!admin.isActive) {
          return res.status(403).json({ status: 'error', message: 'Access denied. Account is disabled.' });
        }
        
        req.user = {
          id: admin._id,
          username: admin.username,
          role: admin.role,
          isActive: admin.isActive
        };
        req.tokenType = 'jwt';
        return next();
      } catch (jwtError) {
        // If JWT verification fails, it might be a device token, continue to device token check
        // No need to log every JWT failure as it adds overhead
      }
    }

    // If not a valid JWT token, check if it's a device token
    // Use projection to only get the fields we need for better performance
    let device = await Device.findOne(
      { deviceId: token, isActive: true },
      'deviceId userId expiresAt lastLogin userAgent'
    );
    
    if (!device) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired token.' });
    }
    
    // Check if device token is expired
    if (device.expiresAt < new Date()) {
      // Deactivate the device token - do this in the background without awaiting
      Device.updateOne(
        { _id: device._id },
        { 
          isActive: false, 
          $push: { statusHistory: { status: 'inactive', reason: 'expired', timestamp: getISTDate() } }
        }
      ).exec(); // Don't await, let it run in background
      
      return res.status(401).json({ status: 'error', message: 'Device token expired.' });
    }
    
    // Get the associated user - use lean() and projection for better performance
    const admin = await Admin.findById(device.userId).select('_id username role isActive').lean();
    
    if (!admin) {
      // Deactivate the device token if user not found - do this in the background
      Device.updateOne(
        { _id: device._id },
        { 
          isActive: false, 
          $push: { statusHistory: { status: 'inactive', reason: 'user not found', timestamp: getISTDate() } }
        }
      ).exec();
      
      return res.status(401).json({ status: 'error', message: 'Invalid token. User not found.' });
    }
    
    if (!admin.isActive) {
      // Deactivate the device token if user is inactive - do this in the background
      Device.updateOne(
        { _id: device._id },
        { 
          isActive: false, 
          $push: { statusHistory: { status: 'inactive', reason: 'user inactive', timestamp: getISTDate() } }
        }
      ).exec();
      
      return res.status(403).json({ status: 'error', message: 'Access denied. Account is disabled.' });
    }
    
    // Set user data in request immediately so we can proceed with the request
    req.user = {
      id: admin._id,
      username: admin.username,
      role: admin.role,
      isActive: admin.isActive
    };
    req.tokenType = 'device';
    req.deviceId = device.deviceId;
    
    // Check if user agent has changed - do this update in the background
    const currentUserAgent = req.headers['user-agent'] || 'unknown';
    if (device.userAgent !== currentUserAgent) {
      // Update the user agent in the background without blocking the request
      Device.updateOne(
        { _id: device._id },
        { 
          userAgent: currentUserAgent,
          $push: { 
            statusHistory: { 
              status: 'active', 
              reason: 'user agent changed', 
              timestamp: getISTDate() 
            }
          }
        }
      ).exec();
    }
    
    // Update last login time and extend expiry (rolling window approach) in the background
    Device.updateOne(
      { _id: device._id },
      { 
        lastLogin: getISTDate(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Extend by 30 days
      }
    ).exec();
    
    // Continue with the request immediately without waiting for the updates
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error during authentication.' });
  }
};

module.exports = { authenticateToken };