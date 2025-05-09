/**
 * This script identifies and moves unused SVG files to a backup directory
 */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Essential SVG files - these are actively used or referenced in the code
const ESSENTIAL_SVG_FILES = [
  // Main logo
  'm_logo.svg',
  
  // The main icon sizes used (192 and 512 are directly referenced in imageOptimizations.js)
  'icon-192X192.svg',
  'icon-512X512.svg',
  
  // Essential fallbacks for the main used images
  'image-placeholder.svg',
  'logo-placeholder.svg',
  'calendar-placeholder.svg',
  'login-placeholder.svg',
  'qr-placeholder.svg',
  'order-placeholder.svg',
  'receipt-placeholder.svg',
  'admin-placeholder.svg',
  
  // The main fallback icon size used in components
  'icon-placeholder-192X192.svg'
];

// Directories to check
const DIRECTORIES_TO_SCAN = [
  __dirname,                      // images root
  join(__dirname, 'icons'),       // icons directory
  join(__dirname, 'fallbacks')    // fallbacks directory
];

// Function to create backup directory if it doesn't exist
const ensureBackupDirExists = async () => {
  const backupDir = join(__dirname, 'svg-backup');
  try {
    await fs.mkdir(backupDir, { recursive: true });
    console.log(`Created backup directory: ${backupDir}`);
  } catch (error) {
    // Directory may already exist
    console.log(`Backup directory already exists: ${backupDir}`);
  }
  return backupDir;
};

// Function to clean up SVG files
const cleanupUnusedSvgs = async () => {
  const backupDir = await ensureBackupDirExists();
  let movedCount = 0;
  
  for (const dir of DIRECTORIES_TO_SCAN) {
    try {
      // Get all SVG files in the directory
      const files = await fs.readdir(dir);
      const svgFiles = files.filter(file => file.endsWith('.svg'));
      
      for (const file of svgFiles) {
        // Check if the file is not in the essential list
        if (!ESSENTIAL_SVG_FILES.includes(file)) {
          // Move to backup directory
          const sourcePath = join(dir, file);
          const destPath = join(backupDir, file);
          
          try {
            await fs.copyFile(sourcePath, destPath);
            await fs.unlink(sourcePath);
            console.log(`Moved unused SVG: ${file} to backup`);
            movedCount++;
          } catch (error) {
            console.error(`Error moving file ${file}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}: ${error.message}`);
    }
  }
  
  console.log(`Operation complete. Moved ${movedCount} unused SVG files to backup.`);
};

// Run the cleanup
cleanupUnusedSvgs(); 