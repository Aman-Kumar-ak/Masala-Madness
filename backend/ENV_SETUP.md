# Environment Setup

To run this application securely, you need to create a `.env` file in the backend directory with the following variables:

```
MONGO_URI=mongodb://localhost:27017/masala-madness
JWT_SECRET=7cSa2Mg5pLkJ9qRtVw3yZbXdFhN6ePm8cA4dE7gHj2LkM5nP
FRONTEND_URL=http://localhost:5173
```

## Variables Explanation

- `MONGO_URI`: Your MongoDB connection string. If your database is hosted elsewhere, update this URL accordingly.
- `JWT_SECRET`: A secure random string used to sign JWT tokens. You should change this to a different value in production.
- `FRONTEND_URL`: The URL where your frontend is hosted, for CORS configuration.

## Security Recommendations

1. Use a strong, random value for JWT_SECRET in production
2. Consider using environment-specific .env files (.env.development, .env.production)
3. Never commit your .env files to version control
4. For production, consider using a password manager or secret management service

## Initial Login Credentials

When you first start the application, an admin user will be automatically created if none exists:

- **Username:** admin
- **Password:** MasalaMadness2024!

Please change this password after your first login for security purposes. 