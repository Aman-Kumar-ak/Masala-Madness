# Authentication System Setup

## Overview

Masala Madness now includes a secure admin-only authentication system to protect sensitive routes and features. This system prevents unauthorized access and secures admin functionalities.

## Features

- **Admin-only login**: Only authorized administrators can access protected sections
- **JWT-based authentication**: Secure token-based authentication
- **Password encryption**: All passwords are securely hashed using bcrypt
- **Protected routes**: Admin-only pages are protected from unauthorized access
- **Automatic token refresh**: Long-lived sessions with secure token management
- **Session persistence**: Remember login state between browser sessions

## Setup Instructions

### 1. Install Dependencies

Navigate to the backend directory and run:

```bash
# Install required dependencies
npm install bcryptjs jsonwebtoken --save
```

Or simply run the provided script:

```bash
bash scripts/install-auth-deps.sh
```

### 2. Environment Configuration

Create or update your `.env` file in the backend directory:

```
MONGO_URI=mongodb://localhost:27017/masala-madness
JWT_SECRET=your_secure_random_string
FRONTEND_URL=http://localhost:5173
```

The JWT_SECRET should be a long, random string to ensure security. Never share this value.

### 3. Initial Login Credentials

When you first start the application, an admin user will be automatically created:

- **Username:** admin
- **Password:** MasalaMadness2024!

**IMPORTANT**: Change this password immediately after your first login for security.

## Authentication Flow

1. User navigates to `/login`
2. User provides admin credentials
3. Backend validates credentials and issues JWT token
4. Token is stored in browser localStorage
5. Protected routes check for valid token
6. If token is invalid or expired, user is redirected to login

## Protected Routes

The following routes are now protected by admin authentication:

- `/admin` - Admin dashboard
- `/orders` - Order management
- `/pending-orders` - Pending order management
- `/qr` - QR code administration

## API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
  - Request body: `{ username, password }`
  - Response: `{ status, token, user }`
  
- `GET /api/auth/verify` - Verify token validity
  - Headers: `Authorization: Bearer <token>`
  - Response: `{ status, user }`
  
- `POST /api/auth/logout` - Logout (client-side only)

## Security Considerations

1. The JWT_SECRET is crucial for security - use a strong, random value
2. All passwords are hashed before storage using bcrypt with high work factor
3. Admin accounts are stored in a separate collection from regular user data
4. Access tokens expire after 8 hours
5. All authentication requests are logged for security monitoring

## Troubleshooting

- If login fails with no error message, check MongoDB connection
- "Token expired" error means you need to log in again
- If you forget admin password, a reset can be performed via MongoDB directly

## Next Steps

- Consider implementing two-factor authentication for enhanced security
- Set up password rotation policies
- Implement IP-based restrictions for admin access
- Configure rate limiting to prevent brute force attacks 