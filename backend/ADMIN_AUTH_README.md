# Admin Authentication System

## Overview

This document provides comprehensive information about the admin authentication system implemented in Masala Madness. The system is designed to be robust against accidental collection deletions and includes multiple recovery mechanisms.

## Default Admin Credentials

When the system is first installed or after running recovery scripts, the default admin credentials are:

- **Username:** admin
- **Password:** MasalaMadness2024!

**⚠️ IMPORTANT:** Change these credentials immediately after your first login!

## Features

### 1. Robust Authentication
- JWT-based authentication with secure token handling
- Password encryption using bcrypt with salting
- Token expiration and renewal mechanisms
- Protected API routes

### 2. Admin Account Management
- Multiple admin accounts support
- Account activation/deactivation
- Password reset functionality
- Last login tracking

### 3. Auto-Recovery System
- Automatic detection of deleted admin collection
- Background monitoring service
- Encrypted backup of admin credentials
- Recovery mechanisms if the database is compromised

## Recovery Mechanisms

The system implements multiple layers of recovery to ensure admin access is never completely lost:

### 1. Server-Side Automatic Recovery
The server automatically checks for and restores the admin collection during startup and periodically while running.

### 2. Command-Line Recovery Tools
Several scripts are provided for managing admin accounts:

- **Admin Manager:** Interactive tool for complete admin account management
- **Reset Admin Password:** Quick script to reset the admin password to default
- **Admin Recovery Service:** Background service that monitors the admin collection

### 3. Frontend Recovery Instructions
The login page displays recovery instructions if the system detects authentication issues.

## Recovering from Deleted Admin Collection

If the admin collection is accidentally deleted, follow these steps:

### Option 1: Automatic Recovery (Preferred)
1. Restart the server - the system will automatically detect and restore the default admin account
2. Log in with the default credentials: 
   - Username: admin
   - Password: MasalaMadness2024!

### Option 2: Manual Recovery 
Run the reset-admin-password script:
```bash
cd backend
node scripts/reset-admin-password.js
```

### Option 3: Admin Manager Tool
Use the interactive admin management tool:
```bash
cd backend
node scripts/admin-manager.js
```
Then select the "restore" option to reset to default admin credentials.

## Admin Manager Tool Usage

The admin manager tool provides a command-line interface for managing admin accounts.

### Interactive Mode
```bash
node scripts/admin-manager.js
```

### Command-Line Mode
```bash
# List all admin accounts
node scripts/admin-manager.js list

# Create a new admin account
node scripts/admin-manager.js create <username> <password>

# Reset admin password
node scripts/admin-manager.js reset <username> <new-password>

# Activate an admin account
node scripts/admin-manager.js activate <username>

# Deactivate an admin account
node scripts/admin-manager.js deactivate <username>

# Delete an admin account
node scripts/admin-manager.js delete <username>

# Restore default admin account (warning: deletes all existing admins)
node scripts/admin-manager.js restore
```

## Background Recovery Service

The system includes a background service that continuously monitors the admin collection. If it detects that the collection has been deleted or emptied, it automatically restores the default admin account.

To manually start this service (though it's typically integrated with the main server):
```bash
node scripts/admin-recovery-service.js
```

## Security Considerations

1. **JWT Secret:** The system uses the JWT_SECRET environment variable for token signing. Ensure this is set to a secure random value in production.

2. **Password Security:** All passwords are hashed using bcrypt with a high work factor. Raw passwords are never stored.

3. **Backup Encryption:** Admin backups are encrypted using a key derived from the JWT_SECRET.

4. **Production Deployment:** In production, consider:
   - Using a separate database for admin credentials
   - Implementing IP-based restrictions for admin login attempts
   - Setting up audit logging for all admin actions
   - Configuring automated alerts for unauthorized access attempts

## Troubleshooting

### Problem: Cannot log in with default credentials
Solution: Run the reset-admin-password script to restore the default credentials.

### Problem: "Admin collection not found" error
Solution: This usually indicates a database connection issue. Check your MongoDB connection string in the .env file.

### Problem: JWT Token errors
Solution: Ensure the JWT_SECRET is properly set in your .env file and has not changed since tokens were issued.

### Problem: Login fails without clear error message
Solution: Check the server logs for more detailed information. Run the server with the DEBUG environment variable set for additional logging:
```bash
DEBUG=express:*,mongoose:* node server.js
``` 