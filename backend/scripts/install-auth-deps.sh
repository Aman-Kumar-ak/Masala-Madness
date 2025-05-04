#!/bin/bash

# Change to the backend directory if this script is run from elsewhere
cd "$(dirname "$0")/.." || exit

# Display message
echo "Installing authentication dependencies for Masala Madness..."

# Install dependencies
npm install bcryptjs jsonwebtoken --save

echo "Dependencies installed successfully!"
echo ""
echo "Don't forget to set up your .env file with JWT_SECRET as described in ENV_SETUP.md"
echo ""
echo "Initial admin credentials:"
echo "Username: admin"
echo "Password: MasalaMadness2024!"
echo ""
echo "Please change this password after first login." 