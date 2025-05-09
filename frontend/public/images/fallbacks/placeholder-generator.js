/**
 * This file generates SVG placeholder images for different types of content
 */
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the fallbacks directory exists
const fallbacksDir = __dirname;
if (!existsSync(fallbacksDir)) {
  mkdirSync(fallbacksDir, { recursive: true });
}

// Create a generic image placeholder
const createImagePlaceholder = (width, height, label) => {
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="#f3f4f6" />
    <rect x="0" y="0" width="${width}" height="${height}" fill="none" stroke="#d1d5db" stroke-width="4" />
    <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${Math.min(width, height) / 10}" fill="#6b7280" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  
  return svg;
};

// Create various icon placeholders
const createIconPlaceholder = (size, fill = '#ea580c') => {
  const dimensions = size.split('X').map(Number);
  const width = dimensions[0];
  const height = dimensions[1] || width;
  
  const svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${width}" height="${height}" fill="${fill}" />
    <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height) / 3}" fill="#ffffff" fill-opacity="0.8" />
    <path d="M${width/2 - width/8},${height/2 - height/8} L${width/2 + width/8},${height/2} L${width/2 - width/8},${height/2 + height/8} Z" fill="#ffffff" />
  </svg>`;
  
  return svg;
};

// Generate all the placeholders
const generatePlaceholders = () => {
  // Generic image placeholder
  writeFileSync(
    join(fallbacksDir, 'image-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Image')
  );
  
  // Type-specific placeholders
  writeFileSync(
    join(fallbacksDir, 'logo-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Logo')
  );
  
  writeFileSync(
    join(fallbacksDir, 'calendar-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Calendar')
  );
  
  writeFileSync(
    join(fallbacksDir, 'login-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Login')
  );
  
  writeFileSync(
    join(fallbacksDir, 'qr-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'QR Code')
  );
  
  writeFileSync(
    join(fallbacksDir, 'order-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Order')
  );
  
  writeFileSync(
    join(fallbacksDir, 'receipt-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Receipt')
  );
  
  writeFileSync(
    join(fallbacksDir, 'admin-placeholder.svg'), 
    createImagePlaceholder(200, 200, 'Admin')
  );
  
  // Icon placeholders for different sizes
  const iconSizes = ['72X72', '96X96', '128X128', '144X144', '152X152', '192X192', '384X384', '512X512'];
  
  iconSizes.forEach(size => {
    writeFileSync(
      join(fallbacksDir, `icon-placeholder-${size}.svg`), 
      createIconPlaceholder(size)
    );
  });
  
  console.log('All placeholders generated successfully!');
};

// Execute the function
generatePlaceholders(); 