const path = require('path');
const { spawn } = require('child_process');
const serverPath = path.join(__dirname, '..', 'server.js');

console.log('Starting server with enhanced debugging...');

// Set debug environment variable
const env = { ...process.env, DEBUG: 'express:*,mongoose:*' };

// Start the server process
const serverProcess = spawn('node', [serverPath], {
  env,
  stdio: 'inherit'
});

console.log(`Server process started with PID: ${serverProcess.pid}`);

// Handle process exit
serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code: ${code}`);
});

// Handle errors
serverProcess.on('error', (err) => {
  console.error('Failed to start server process:', err);
});

// Handle CTRL+C to cleanly shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
}); 