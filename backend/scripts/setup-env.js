const fs = require('fs');
const path = require('path');

// Define the path to the .env file
const envFilePath = path.join(__dirname, '..', '.env');

// Check if the .env file already exists
if (fs.existsSync(envFilePath)) {
  console.log('.env file already exists. Skipping creation.');
  process.exit(0);
}

// Define the content of the .env file
const envContent = `MONGO_URI=mongodb://localhost:27017/masala-madness
JWT_SECRET=7cSa2Mg5pLkJ9qRtVw3yZbXdFhN6ePm8cA4dE7gHj2LkM5nP
FRONTEND_URL=http://localhost:5173
`;

// Write the content to the .env file
try {
  fs.writeFileSync(envFilePath, envContent);
  console.log('.env file created successfully!');
  console.log('Content:');
  console.log(envContent);
} catch (error) {
  console.error('Error creating .env file:', error);
  process.exit(1);
} 