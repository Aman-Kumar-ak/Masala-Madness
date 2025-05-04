const mongoose = require('mongoose');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// Load environment variables
dotenv.config();

// Login test credentials
const testCredentials = {
  username: 'admin',
  password: 'MasalaMadness2024!'
};

// Function to test login functionality
async function testLogin() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully!');
    
    // Check JWT_SECRET
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is missing in .env file');
      return false;
    } else {
      console.log('JWT_SECRET is configured correctly');
    }
    
    // Find admin by username
    console.log(`Looking for admin user with username: ${testCredentials.username}`);
    const admin = await Admin.findOne({ username: testCredentials.username });
    
    if (!admin) {
      console.error('Admin user not found');
      return false;
    }
    
    console.log('Admin user found:', {
      id: admin._id,
      username: admin.username,
      isActive: admin.isActive
    });
    
    // Verify password
    console.log('Verifying password...');
    const isPasswordValid = await admin.comparePassword(testCredentials.password);
    
    if (!isPasswordValid) {
      console.error('Password verification failed');
      return false;
    }
    
    console.log('Password verified successfully');
    
    // Create JWT token (simulating login success)
    console.log('Creating JWT token...');
    const token = jwt.sign(
      { id: admin._id, username: admin.username },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    console.log('JWT token created successfully');
    
    // Update last login timestamp
    admin.lastLogin = new Date();
    await admin.save();
    console.log('Updated last login timestamp');
    
    return {
      success: true,
      token,
      user: {
        username: admin.username,
        id: admin._id
      }
    };
  } catch (error) {
    console.error('Error testing login:', error);
    return { success: false, error };
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the test
testLogin()
  .then(result => {
    console.log('\nLogin test result:');
    console.log(result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 