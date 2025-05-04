const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

// Get MongoDB URI from env, fall back to default if not found
const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/masala-madness';

console.log(`[INFO] Attempting to connect to MongoDB at: ${uri}`);

// Function to test the MongoDB connection
async function testMongoConnection() {
  try {
    // Set timeout to 5 seconds
    const connectOptions = {
      serverSelectionTimeoutMS: 5000,
    };
    
    // Try to connect
    await mongoose.connect(uri, connectOptions);
    
    console.log('[SUCCESS] Connected to MongoDB successfully!');
    
    // Try to create a test document
    const TestModel = mongoose.model('ConnectionTest', new mongoose.Schema({
      test: String,
      createdAt: { type: Date, default: Date.now }
    }));
    
    await TestModel.create({ test: 'Connection test' });
    console.log('[SUCCESS] Successfully created a test document');
    
    // Clean up - delete the test collection
    await mongoose.connection.db.dropCollection('connectiontests');
    console.log('[INFO] Cleaned up test data');
    
    return true;
  } catch (error) {
    console.error('[ERROR] MongoDB connection failed:');
    console.error(error);
    
    // Provide helpful troubleshooting info
    console.log('\n[TROUBLESHOOTING]');
    console.log('1. Make sure MongoDB is installed and running');
    console.log('2. Check that the MongoDB connection string is correct in your .env file');
    console.log('3. If using a remote MongoDB instance, ensure network connectivity');
    console.log('4. Check for any authentication issues if using a secured MongoDB instance');
    
    return false;
  } finally {
    // Close the connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('[INFO] Disconnected from MongoDB');
    }
  }
}

// Run the test
testMongoConnection().then(success => {
  if (success) {
    console.log('\n[RESULT] MongoDB connection test passed!');
    process.exit(0);
  } else {
    console.log('\n[RESULT] MongoDB connection test failed!');
    process.exit(1);
  }
}); 