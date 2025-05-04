#!/usr/bin/env node
/**
 * Admin Manager - Command Line Utility
 * 
 * This tool provides easy management of admin accounts from the command line.
 * It allows creating, listing, resetting, and deleting admin accounts.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { restoreAdminIfMissing } = require('./admin-recovery-service');

// Load environment variables
dotenv.config();

// Create readline interface for interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Admin model schema
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

// Add password hashing middleware
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function(candidatePassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(candidatePassword, this.password);
};

// Connect to MongoDB
async function connectToMongoDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.');
    return true;
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    return false;
  }
}

// Get Admin model
function getAdminModel() {
  return mongoose.models.Admin || mongoose.model('Admin', adminSchema);
}

// List all admin accounts
async function listAdmins() {
  const Admin = getAdminModel();
  const admins = await Admin.find({}, 'username lastLogin isActive createdAt');
  
  if (admins.length === 0) {
    console.log('No admin accounts found.');
    return;
  }
  
  console.log(`\nFound ${admins.length} admin accounts:\n`);
  admins.forEach((admin, index) => {
    console.log(`${index + 1}. Username: ${admin.username}`);
    console.log(`   Active: ${admin.isActive ? 'Yes' : 'No'}`);
    console.log(`   Created: ${admin.createdAt}`);
    console.log(`   Last Login: ${admin.lastLogin || 'Never'}\n`);
  });
}

// Create a new admin account
async function createAdmin(username, password) {
  const Admin = getAdminModel();
  
  // Check if username already exists
  const existingAdmin = await Admin.findOne({ username });
  if (existingAdmin) {
    console.log(`Admin with username "${username}" already exists.`);
    return false;
  }
  
  // Create new admin
  const newAdmin = new Admin({
    username,
    password,
    isActive: true,
    createdAt: new Date()
  });
  
  await newAdmin.save();
  console.log(`Admin "${username}" created successfully.`);
  return true;
}

// Reset admin password
async function resetPassword(username, newPassword) {
  const Admin = getAdminModel();
  
  // Find admin by username
  const admin = await Admin.findOne({ username });
  if (!admin) {
    console.log(`Admin with username "${username}" not found.`);
    return false;
  }
  
  // Update password
  admin.password = newPassword;
  await admin.save();
  console.log(`Password for "${username}" reset successfully.`);
  return true;
}

// Deactivate admin account
async function deactivateAdmin(username) {
  const Admin = getAdminModel();
  
  // Find admin by username
  const admin = await Admin.findOne({ username });
  if (!admin) {
    console.log(`Admin with username "${username}" not found.`);
    return false;
  }
  
  // Deactivate account
  admin.isActive = false;
  await admin.save();
  console.log(`Admin "${username}" deactivated.`);
  return true;
}

// Activate admin account
async function activateAdmin(username) {
  const Admin = getAdminModel();
  
  // Find admin by username
  const admin = await Admin.findOne({ username });
  if (!admin) {
    console.log(`Admin with username "${username}" not found.`);
    return false;
  }
  
  // Activate account
  admin.isActive = true;
  await admin.save();
  console.log(`Admin "${username}" activated.`);
  return true;
}

// Delete admin account
async function deleteAdmin(username) {
  const Admin = getAdminModel();
  
  // Delete admin by username
  const result = await Admin.deleteOne({ username });
  
  if (result.deletedCount === 0) {
    console.log(`Admin with username "${username}" not found.`);
    return false;
  }
  
  console.log(`Admin "${username}" deleted successfully.`);
  return true;
}

// Reset to default admin
async function resetToDefaultAdmin() {
  const Admin = getAdminModel();
  
  // Delete all existing admins
  await Admin.deleteMany({});
  console.log('All admin accounts deleted.');
  
  // Create default admin
  await createAdmin('admin', 'MasalaMadness2024!');
  console.log('Default admin restored:');
  console.log('Username: admin');
  console.log('Password: MasalaMadness2024!');
  
  return true;
}

// Interactive mode
async function interactiveMode() {
  console.log('\n===== Admin Account Manager =====\n');
  
  console.log('Available commands:');
  console.log('1. list     - List all admin accounts');
  console.log('2. create   - Create a new admin account');
  console.log('3. reset    - Reset admin password');
  console.log('4. activate - Activate admin account');
  console.log('5. deactivate - Deactivate admin account');
  console.log('6. delete   - Delete admin account');
  console.log('7. restore  - Restore default admin account');
  console.log('8. exit     - Exit the application\n');
  
  const promptCommand = () => {
    rl.question('Enter command: ', async (command) => {
      switch (command.toLowerCase()) {
        case 'list':
          await listAdmins();
          promptCommand();
          break;
          
        case 'create':
          rl.question('Enter username: ', (username) => {
            rl.question('Enter password: ', async (password) => {
              await createAdmin(username, password);
              promptCommand();
            });
          });
          break;
          
        case 'reset':
          rl.question('Enter username: ', (username) => {
            rl.question('Enter new password: ', async (password) => {
              await resetPassword(username, password);
              promptCommand();
            });
          });
          break;
          
        case 'activate':
          rl.question('Enter username: ', async (username) => {
            await activateAdmin(username);
            promptCommand();
          });
          break;
          
        case 'deactivate':
          rl.question('Enter username: ', async (username) => {
            await deactivateAdmin(username);
            promptCommand();
          });
          break;
          
        case 'delete':
          rl.question('Enter username: ', async (username) => {
            rl.question(`Are you sure you want to delete "${username}"? (yes/no): `, async (confirm) => {
              if (confirm.toLowerCase() === 'yes') {
                await deleteAdmin(username);
              } else {
                console.log('Delete operation cancelled.');
              }
              promptCommand();
            });
          });
          break;
          
        case 'restore':
          rl.question('This will delete all existing admin accounts. Continue? (yes/no): ', async (confirm) => {
            if (confirm.toLowerCase() === 'yes') {
              await resetToDefaultAdmin();
            } else {
              console.log('Restore operation cancelled.');
            }
            promptCommand();
          });
          break;
          
        case 'exit':
          console.log('Exiting...');
          rl.close();
          mongoose.disconnect();
          break;
          
        default:
          console.log('Unknown command. Please try again.');
          promptCommand();
          break;
      }
    });
  };
  
  promptCommand();
}

// Process command-line arguments
async function processArguments() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // No arguments, run in interactive mode
    await interactiveMode();
    return;
  }
  
  const command = args[0].toLowerCase();
  
  switch (command) {
    case 'list':
      await listAdmins();
      break;
      
    case 'create':
      if (args.length < 3) {
        console.log('Usage: node admin-manager.js create <username> <password>');
        break;
      }
      await createAdmin(args[1], args[2]);
      break;
      
    case 'reset':
      if (args.length < 3) {
        console.log('Usage: node admin-manager.js reset <username> <new-password>');
        break;
      }
      await resetPassword(args[1], args[2]);
      break;
      
    case 'activate':
      if (args.length < 2) {
        console.log('Usage: node admin-manager.js activate <username>');
        break;
      }
      await activateAdmin(args[1]);
      break;
      
    case 'deactivate':
      if (args.length < 2) {
        console.log('Usage: node admin-manager.js deactivate <username>');
        break;
      }
      await deactivateAdmin(args[1]);
      break;
      
    case 'delete':
      if (args.length < 2) {
        console.log('Usage: node admin-manager.js delete <username>');
        break;
      }
      await deleteAdmin(args[1]);
      break;
      
    case 'restore':
      await resetToDefaultAdmin();
      break;
      
    case 'help':
      console.log('Available commands:');
      console.log('node admin-manager.js list');
      console.log('node admin-manager.js create <username> <password>');
      console.log('node admin-manager.js reset <username> <new-password>');
      console.log('node admin-manager.js activate <username>');
      console.log('node admin-manager.js deactivate <username>');
      console.log('node admin-manager.js delete <username>');
      console.log('node admin-manager.js restore');
      console.log('node admin-manager.js help');
      break;
      
    default:
      console.log(`Unknown command: ${command}`);
      console.log('Run "node admin-manager.js help" for usage information.');
      break;
  }
  
  // Close connection when done
  mongoose.disconnect();
  if (rl) rl.close();
}

// Main function
async function main() {
  // Connect to MongoDB
  const connected = await connectToMongoDB();
  if (!connected) {
    console.error('Cannot proceed without MongoDB connection.');
    process.exit(1);
  }
  
  // Check for admin collection and restore if needed
  const adminCount = await getAdminModel().countDocuments().catch(() => 0);
  if (adminCount === 0) {
    console.log('No admin accounts found. Running recovery...');
    await restoreAdminIfMissing();
  }
  
  // Process arguments or run interactive mode
  await processArguments();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  mongoose.disconnect();
  if (rl) rl.close();
  process.exit(1);
}); 