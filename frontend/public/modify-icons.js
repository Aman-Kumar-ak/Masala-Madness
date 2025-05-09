// Simple script to modify PWA icons
// Run this with Node.js: node modify-icons.js

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// Directory where icons are stored
const iconsDir = path.join(__dirname, 'images', 'icons');
// Source logo
const logoPath = path.join(__dirname, 'images', 'm_logo.png');

// Icon sizes from manifest.json
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Settings
const backgroundColor = '#FFFFFF'; // White background
const borderRadius = 15; // percentage (0-50)

async function processIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Calculate border radius based on size
  const radius = (borderRadius / 100) * (size / 2);
  
  // Create rounded rectangle background
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  
  // Fill with background color
  ctx.fillStyle = backgroundColor;
  ctx.fill();
  
  // Load and draw logo centered and scaled to 80% of canvas
  const logo = await loadImage(logoPath);
  const logoSize = size * 0.8;
  const offset = (size - logoSize) / 2;
  ctx.drawImage(logo, offset, offset, logoSize, logoSize);
  
  // Save the icon
  const outputPath = path.join(iconsDir, `icon-${size}X${size}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`Modified icon: icon-${size}X${size}.png`);
}

async function main() {
  // Check if icons directory exists
  if (!fs.existsSync(iconsDir)) {
    console.error(`Icons directory not found: ${iconsDir}`);
    process.exit(1);
  }
  
  // Check if source logo exists
  if (!fs.existsSync(logoPath)) {
    console.error(`Source logo not found: ${logoPath}`);
    process.exit(1);
  }
  
  console.log('Starting icon modification with white background...');
  
  try {
    // Process each icon size
    for (const size of sizes) {
      await processIcon(size);
    }
    
    console.log('All icons modified successfully with white background!');
    console.log('Please restart your PWA to see the changes.');
    
    // Clear browser cache instruction
    console.log('\nIMPORTANT: You may need to clear your browser cache or uninstall/reinstall the PWA to see changes');
    console.log('In Chrome: Settings > Privacy and security > Clear browsing data > Cached images and files');
  } catch (err) {
    console.error('Error modifying icons:', err);
    process.exit(1);
  }
}

main(); 