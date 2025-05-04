const fs = require('fs');
const path = require('path');

// Define the path to the .env file
const envFilePath = path.join(__dirname, '..', '.env');

// Check if the .env file exists
if (!fs.existsSync(envFilePath)) {
  console.error('.env file not found.');
  process.exit(1);
}

// Read the current content of the .env file
const currentEnvContent = fs.readFileSync(envFilePath, 'utf8');

// Define the JWT_SECRET to add
const jwtSecret = '7cSa2Mg5pLkJ9qRtVw3yZbXdFhN6ePm8cA4dE7gHj2LkM5nP';
const frontendUrl = 'http://localhost:5173';

// Check if JWT_SECRET is already present
let newEnvContent = currentEnvContent;

if (!newEnvContent.includes('JWT_SECRET=')) {
  // Add JWT_SECRET if not present
  newEnvContent = `${newEnvContent.trim()}\nJWT_SECRET=${jwtSecret}\n`;
  console.log('Added JWT_SECRET to .env file');
}

if (!newEnvContent.includes('FRONTEND_URL=')) {
  // Add FRONTEND_URL if not present
  newEnvContent = `${newEnvContent.trim()}\nFRONTEND_URL=${frontendUrl}\n`;
  console.log('Added FRONTEND_URL to .env file');
}

// Write the updated content back to the .env file
try {
  fs.writeFileSync(envFilePath, newEnvContent);
  console.log('.env file updated successfully!');
  console.log('Current .env file content:');
  console.log(newEnvContent);
} catch (error) {
  console.error('Error updating .env file:', error);
  process.exit(1);
} 