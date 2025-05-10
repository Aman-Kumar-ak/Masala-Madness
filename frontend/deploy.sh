#!/bin/bash

# Function to check if script is executable
check_executable() {
    if [ ! -x "$0" ]; then
        echo "🔒 Making script executable..."
        chmod +x "$0"
    fi
}

# Function to handle errors
handle_error() {
    echo "❌ Error: $1"
    exit 1
}

# Make sure script is executable
check_executable

# Print deployment start message
echo "🚀 Starting deployment process..."

# Check if node is installed
if ! command -v node &> /dev/null; then
    handle_error "Node.js is not installed"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    handle_error "npm is not installed"
fi

# Update version.json
echo "📝 Updating version information..."
node scripts/update-version.js || handle_error "Failed to update version"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --omit=dev || handle_error "Failed to install dependencies"

# Build the project
echo "🔨 Building project..."
NODE_ENV=production npm run build || handle_error "Failed to build project"

# Print deployment completion message
echo "✅ Deployment completed successfully!"
echo "📊 Version information:"
cat public/version.json

# Start the preview server
echo "🚀 Starting preview server..."
npm run preview -- --port 4173 --host

# Optional: Add your deployment commands here
# For example:
# echo "🚀 Deploying to production..."
# npm run deploy 