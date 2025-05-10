@echo off
echo 🚀 Starting deployment process...

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Node.js is not installed
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: npm is not installed
    exit /b 1
)

:: Update version.json
echo 📝 Updating version information...
node scripts/update-version.js
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to update version
    exit /b 1
)

:: Install ALL dependencies (including dev dependencies needed for build)
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to install dependencies
    exit /b 1
)

:: Build the project
echo 🔨 Building project...
set NODE_ENV=production
call npm run build
if %ERRORLEVEL% neq 0 (
    echo ❌ Error: Failed to build project
    exit /b 1
)

:: Print deployment completion message
echo ✅ Deployment completed successfully!
echo 📊 Version information:
type public\version.json

:: Start the preview server
echo 🚀 Starting preview server...
call npm run preview -- --port 4173 --host 