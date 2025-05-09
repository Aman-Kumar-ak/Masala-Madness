/**
 * This script generates optimized SVG logo
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create an SVG logo
const createLogoSVG = () => {
  // A simple "M" logo in SVG format
  const svg = `<svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="#fff7ed" />
    <path d="M40,40 L60,40 L100,120 L140,40 L160,40 L160,160 L140,160 L140,80 L100,160 L60,80 L60,160 L40,160 Z" fill="#ea580c" />
  </svg>`;
  
  return svg;
};

// Generate optimized logo
const generateOptimizedLogo = async () => {
  try {
    // Generate SVG
    const svg = createLogoSVG();
    
    // Write the SVG version
    await fs.writeFile(join(__dirname, 'm_logo.svg'), svg);
    
    console.log('Generated optimized logo: m_logo.svg');
  } catch (error) {
    console.error('Error generating logo:', error);
  }
};

// Run the script
generateOptimizedLogo(); 