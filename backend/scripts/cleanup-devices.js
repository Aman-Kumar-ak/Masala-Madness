// This script is deprecated. Device data is now stored in the users collection as an embedded array.

const mongoose = require('mongoose');
const Device = require('../models/Device');
require('dotenv').config();

async function cleanupExpiredDevices() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const result = await Device.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    console.log(`Cleaned up ${result.deletedCount} expired device tokens`);
  } catch (error) {
    console.error('Error cleaning up devices:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run cleanup
cleanupExpiredDevices(); 