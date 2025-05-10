import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the current date in IST
const getISTDate = () => {
  const date = new Date();
  // Add 5 hours and 30 minutes for IST
  date.setHours(date.getHours() + 5);
  date.setMinutes(date.getMinutes() + 30);
  return date.toISOString().replace('Z', '+05:30');
};

// Read the current version.json
const versionPath = join(__dirname, '..', 'public', 'version.json');
let versionInfo;

try {
  const currentVersion = JSON.parse(readFileSync(versionPath, 'utf8'));
  // Increment the patch version
  const [major, minor, patch] = currentVersion.version.split('.');
  const newVersion = `${major}.${minor}.${parseInt(patch) + 1}`;
  
  versionInfo = {
    version: newVersion,
    buildDate: getISTDate(),
    timezone: 'IST'
  };
} catch (error) {
  // If version.json doesn't exist or is invalid, start with 1.0.0
  versionInfo = {
    version: '1.0.0',
    buildDate: getISTDate(),
    timezone: 'IST'
  };
}

// Write the updated version.json
writeFileSync(versionPath, JSON.stringify(versionInfo, null, 2));

console.log('Version updated successfully:');
console.log('Version:', versionInfo.version);
console.log('Build Date:', versionInfo.buildDate);
console.log('Timezone:', versionInfo.timezone); 