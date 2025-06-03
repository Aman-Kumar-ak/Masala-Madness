const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Device = require('../models/Device');

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

    // Try to verify as JWT token first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const admin = await Admin.findById(decoded.id);
      
      if (!admin || !admin.isActive) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'Invalid token or user disabled.' 
        });
      }
      
      req.user = decoded;
      return next();
    } catch (jwtError) {
      // If JWT verification fails, try device token
      let device = await Device.findOne({ 
        deviceId: token,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!device) {
        // If device exists but is expired or not active, update its status
        device = await Device.findOne({ deviceId: token });
        if (device && (device.isActive !== false || device.expiresAt <= new Date())) {
          device.isActive = false;
          device.statusHistory.push({ status: 'inactive', reason: 'expired or logged out', timestamp: new Date() });
          await device.save();
        }
        return res.status(401).json({ 
          status: 'error', 
          message: 'Invalid or expired device token.' 
        });
      }

      // Update last login time
      device.lastLogin = new Date();
      await device.save();

      // Get admin info
      const admin = await Admin.findById(device.userId);
      if (!admin || !admin.isActive) {
        return res.status(403).json({ 
          status: 'error', 
          message: 'User account is disabled.' 
        });
      }

      req.user = {
        id: admin._id,
        username: admin.username
      };
      next();
    }
  } catch (error) {
    return res.status(403).json({ 
      status: 'error', 
      message: 'Invalid token.' 
    });
  }
};

module.exports = { authenticateToken }; 