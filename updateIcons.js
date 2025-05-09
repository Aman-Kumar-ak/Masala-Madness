const fs = require('fs');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');

// Directory where icons are stored
const iconsDir = path.join(__dirname, 'frontend', 'public', 'images', 'icons');

// Icon sizes from manifest.json
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Source logo to use
const sourceLogo = path.join(__dirname, 'frontend', 'public', 'images', 'm_logo.png');

// Settings
const bgColor = '#FFFFFF'; // White background
const borderRadius = 15; // percentage

async function generateIcon(size) {
  // Create canvas with the specified size
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Clear canvas
  ctx.clearRect(0, 0, size, size);
  
  // Calculate border radius based on size
  const radius = (borderRadius / 100) * (size / 2);
  
  // Create rounded rectangle path
  ctx.beginPath();
  ctx.moveTo(0 + radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, 0 + radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(0 + radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, 0 + radius);
  ctx.quadraticCurveTo(0, 0, 0 + radius, 0);
  ctx.closePath();
  
  // Fill background
  ctx.fillStyle = bgColor;
  ctx.fill();
  
  // Load and draw logo centered and scaled to 80% of canvas
  const logo = await loadImage(sourceLogo);
  const logoSize = size * 0.8;
  const xOffset = (size - logoSize) / 2;
  const yOffset = (size - logoSize) / 2;
  ctx.drawImage(logo, xOffset, yOffset, logoSize, logoSize);
  
  // Save the generated icon
  const outputPath = path.join(iconsDir, `icon-${size}X${size}.png`);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`Generated: icon-${size}X${size}.png`);
}

async function main() {
  // Make sure icons directory exists
  if (!fs.existsSync(iconsDir)) {
    console.error(`Icons directory not found: ${iconsDir}`);
    return;
  }
  
  console.log('Starting icon generation with white background...');
  
  // Generate all icon sizes
  for (const size of sizes) {
    await generateIcon(size);
  }
  
  console.log('All icons generated successfully!');
}

main().catch(err => {
  console.error('Error generating icons:', err);
}); 