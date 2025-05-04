const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

// Load environment variables
dotenv.config();

// New password for admin
const newPassword = 'MasalaMadness2024!';

// Function to reset admin password
async function resetAdminPassword() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully!');
    
    // Find admin user
    const admin = await Admin.findOne({ username: 'admin' });
    
    if (!admin) {
      console.error('Admin user not found. Creating a new admin user...');
      
      // Create new admin user
      const newAdmin = new Admin({
        username: 'admin',
        password: newPassword,
        isActive: true,
        createdAt: new Date()
      });
      
      await newAdmin.save();
      console.log('New admin user created with username: admin');
      return true;
    }
    
    // Update the password directly
    admin.password = newPassword;
    admin.isActive = true;
    
    // Save the changes
    await admin.save();
    console.log('Admin password reset successfully!');
    console.log('New credentials:');
    console.log('Username: admin');
    console.log(`Password: ${newPassword}`);
    
    // Optional: verify the new password
    console.log('\nVerifying the new password...');
    const verifyAdmin = await Admin.findOne({ username: 'admin' });
    const isPasswordValid = await verifyAdmin.comparePassword(newPassword);
    console.log(`Password verification: ${isPasswordValid ? 'Successful' : 'Failed'}`);
    
    return true;
  } catch (error) {
    console.error('Error resetting admin password:', error);
    return false;
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
resetAdminPassword()
  .then(success => {
    console.log('\nPassword reset completed:', success ? 'Successfully' : 'Failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 