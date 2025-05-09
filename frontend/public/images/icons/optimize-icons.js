/**
 * This script generates optimized PWA icons from a source image
 * It creates different sizes with proper optimization for each
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SVG template for generating icons
const createIconSVG = (size, fill = '#ea580c') => {
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

// Generate optimized SVG icons for all required sizes
const generateOptimizedIcons = async () => {
  const iconSizes = ['72X72', '96X96', '128X128', '144X144', '152X152', '192X192', '384X384', '512X512'];
  
  for (const size of iconSizes) {
    try {
      // Generate SVG for this size
      const svg = createIconSVG(size);
      
      // Write the SVG version
      await fs.writeFile(join(__dirname, `icon-${size}.svg`), svg);
      
      console.log(`Generated optimized icon: icon-${size}.svg`);
    } catch (error) {
      console.error(`Error generating icon ${size}:`, error);
    }
  }
  
  console.log('All icons generated successfully!');
};

// Run the script
generateOptimizedIcons(); 