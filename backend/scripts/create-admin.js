const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('../models/Admin');

// Load environment variables
dotenv.config();

// Function to create admin user
async function createAdminUser() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully!');
    
    // Check if admin user already exists
    const adminCount = await Admin.countDocuments();
    console.log(`Found ${adminCount} admin users in the database.`);
    
    if (adminCount > 0) {
      console.log('Admin user already exists. Skipping creation.');
      
      // Optional: List existing admin users
      const admins = await Admin.find({}, 'username lastLogin isActive createdAt');
      console.log('Existing admin users:');
      console.log(admins);
      
      // Delete all admin users if needed (uncomment to reset admin accounts)
      // await Admin.deleteMany({});
      // console.log('Deleted all admin users.');
    } else {
      // Create new admin user
      const defaultAdmin = new Admin({
        username: 'admin',
        password: 'MasalaMadness2024!',
        isActive: true,
        createdAt: new Date()
      });
      
      // Save to database
      await defaultAdmin.save();
      console.log('Admin user created successfully:');
      console.log({
        username: defaultAdmin.username,
        id: defaultAdmin._id,
        created: defaultAdmin.createdAt
      });
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the function
createAdminUser()
  .then(() => {
    console.log('Admin user creation process completed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 