const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Middleware to verify JWT token
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
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if the admin still exists and is active
    const admin = await Admin.findById(decoded.id);
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Invalid token or user disabled.' 
      });
    }
    
    // Attach the user info to the request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 'error', 
        message: 'Token expired. Please login again.' 
      });
    }
    
    return res.status(403).json({ 
      status: 'error', 
      message: 'Invalid token.' 
    });
  }
};

module.exports = { authenticateToken }; 