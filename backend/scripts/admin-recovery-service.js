/**
 * Admin Recovery Service
 * 
 * This script provides a persistent service to monitor and recover the admin collection
 * if it gets deleted. It can be run as a separate process alongside the main server.
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables
dotenv.config();

// Path to store backup credentials
const BACKUP_PATH = path.join(__dirname, '..', 'data', 'admin_backup.enc');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Encryption key derived from JWT_SECRET for secure storage
function getEncryptionKey() {
  const jwtSecret = process.env.JWT_SECRET || 'default-secret-key-not-secure';
  return crypto.createHash('sha256').update(jwtSecret).digest('hex').substring(0, 32);
}

// Function to encrypt sensitive data
function encryptData(data) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

// Function to decrypt sensitive data
function decryptData(encryptedData) {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error.message);
    return null;
  }
}

// Function to backup admin credentials
async function backupAdminCredentials() {
  try {
    // Define the Admin model schema without requiring the model file
    const adminSchema = new mongoose.Schema({
      username: String,
      password: String,
      lastLogin: Date,
      isActive: Boolean,
      createdAt: Date
    });
    
    // Get the model only if it doesn't exist to avoid model overwrite errors
    const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
    
    // Find all admin users
    const admins = await Admin.find({});
    
    if (admins.length === 0) {
      console.log('No admin users found to backup');
      return false;
    }
    
    // Store admin data (excluding hashed passwords which we can't recover)
    const backupData = admins.map(admin => ({
      username: admin.username,
      isActive: admin.isActive,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
      timestamp: new Date().toISOString()
    }));
    
    // Encrypt and save the backup
    const encryptedData = encryptData(backupData);
    fs.writeFileSync(BACKUP_PATH, encryptedData);
    
    console.log(`Admin credentials backed up successfully to ${BACKUP_PATH}`);
    return true;
  } catch (error) {
    console.error('Error backing up admin credentials:', error);
    return false;
  }
}

// Function to restore admin user if collection is missing
async function restoreAdminIfMissing() {
  try {
    // Define the default admin credentials
    const defaultAdmin = {
      username: 'admin',
      password: 'MasalaMadness2024!',
      isActive: true,
      createdAt: new Date()
    };
    
    // Define the Admin model schema
    const adminSchema = new mongoose.Schema({
      username: {
        type: String,
        required: true,
        unique: true,
        trim: true
      },
      password: {
        type: String,
        required: true
      },
      lastLogin: {
        type: Date,
        default: null
      },
      isActive: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    });
    
    // Add the password hashing middleware
    adminSchema.pre('save', async function(next) {
      // Only hash the password if it's modified (or new)
      if (!this.isModified('password')) return next();
      
      try {
        // For this script we'll need to import bcrypt directly
        const bcrypt = require('bcryptjs');
        // Generate a salt
        const salt = await bcrypt.genSalt(12);
        // Hash the password using the new salt
        this.password = await bcrypt.hash(this.password, salt);
        next();
      } catch (error) {
        next(error);
      }
    });
    
    // Register the model (use existing or create new)
    const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
    
    // Check if the Admin collection exists and has documents
    let adminCount = 0;
    try {
      adminCount = await Admin.countDocuments();
    } catch (error) {
      // If the collection doesn't exist, this might throw an error
      console.log('Admin collection might not exist yet, creating it...');
    }
    
    if (adminCount === 0) {
      console.log('No admin users found. Restoring admin account...');
      
      // Create a new admin user with default credentials
      const newAdmin = new Admin(defaultAdmin);
      await newAdmin.save();
      
      console.log('Default admin account created successfully:');
      console.log({
        username: newAdmin.username,
        id: newAdmin._id
      });
      
      // Create a backup of the new admin
      await backupAdminCredentials();
      
      return true;
    } else {
      console.log(`Found ${adminCount} existing admin users.`);
      // Create a backup of the existing admins
      await backupAdminCredentials();
      return false;
    }
  } catch (error) {
    console.error('Error restoring admin user:', error);
    return false;
  }
}

// Function to monitor admin collection and perform recovery
async function monitorAndRecover() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully.');
    
    // First check if Admin collection exists and restore if needed
    const restored = await restoreAdminIfMissing();
    
    // If we didn't need to restore, just create a backup
    if (!restored) {
      await backupAdminCredentials();
    }
    
    // Set up a periodic check to monitor admin collection
    const checkInterval = 1000 * 60 * 5; // 5 minutes
    
    console.log(`Admin recovery service is now running. Checking every ${checkInterval/1000/60} minutes.`);
    
    // Continuous monitoring loop
    setInterval(async () => {
      try {
        // Get the Admin model if it exists
        const Admin = mongoose.models.Admin;
        
        if (!Admin) {
          console.log('Admin model not found. Creating...');
          await restoreAdminIfMissing();
          return;
        }
        
        // Check if collection still has documents
        const count = await Admin.countDocuments().catch(() => 0);
        
        if (count === 0) {
          console.log('Admin collection is empty. Restoring...');
          await restoreAdminIfMissing();
        } else {
          // Regular backup for safety
          await backupAdminCredentials();
        }
      } catch (error) {
        console.error('Error during periodic check:', error);
        // Try to restore in case of errors
        await restoreAdminIfMissing();
      }
    }, checkInterval);
    
  } catch (error) {
    console.error('Error in monitor and recover process:', error);
    process.exit(1);
  }
}

// Run as standalone script
if (require.main === module) {
  monitorAndRecover().catch(error => {
    console.error('Fatal error in admin recovery service:', error);
    process.exit(1);
  });
}

// Export functions for use in other scripts
module.exports = {
  backupAdminCredentials,
  restoreAdminIfMissing,
  monitorAndRecover
}; 