const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load current environment variables
dotenv.config();

// Define the path to the .env file
const envFilePath = path.join(__dirname, '..', '.env');

// Check if the .env file exists
if (!fs.existsSync(envFilePath)) {
  console.error('.env file not found. Please create it first.');
  process.exit(1);
}

// Read the current content of the .env file
const currentEnvContent = fs.readFileSync(envFilePath, 'utf8');

// The correct MongoDB URI from our test
const correctMongoUri = 'mongodb+srv://masalamadness:madnessmadness3f1dd12w@masalamadness.dudtd47.mongodb.net/?retryWrites=true&w=majority&appName=MasalaMadness';

// Update the MongoDB URI in the content
let newEnvContent;
if (currentEnvContent.includes('MONGO_URI=')) {
  // Replace the existing MONGO_URI line
  newEnvContent = currentEnvContent.replace(
    /MONGO_URI=.*/,
    `MONGO_URI=${correctMongoUri}`
  );
} else {
  // Add the MONGO_URI line if it doesn't exist
  newEnvContent = `${currentEnvContent.trim()}\nMONGO_URI=${correctMongoUri}\n`;
}

// Write the updated content back to the .env file
try {
  fs.writeFileSync(envFilePath, newEnvContent);
  console.log('.env file updated successfully with the correct MongoDB URI!');
} catch (error) {
  console.error('Error updating .env file:', error);
  process.exit(1);
} 