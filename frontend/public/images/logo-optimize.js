/**
 * This script generates optimized SVG logo
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create an SVG logo that references the canonical PNG asset
const createLogoSVG = () => {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <image href="m_logo.png" width="512" height="512" preserveAspectRatio="xMidYMid meet"/>
</svg>`;
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