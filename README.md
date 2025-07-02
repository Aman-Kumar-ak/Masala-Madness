# Masala Madness

A full-stack restaurant management system built with React and Node.js, designed for restaurant owners to manage orders, menu, and payments.

## Project Structure

```
masala-madness/
├── backend/                 # Backend server
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── scripts/            # Utility scripts
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
└── frontend/               # Frontend application
    ├── src/
    │   ├── components/    # React components
    │   ├── pages/        # Page components
    │   ├── utils/        # Utility functions
    │   ├── contexts/     # Context providers
    │   └── App.jsx       # Main App component
    └── package.json      # Frontend dependencies

```

```
Masala-Madness/
└── frontend/
    ├── node_modules/                # Auto-generated dependencies
    ├── public/                      # Static assets
    │   └── images/                  # Image assets
    ├── src/
    │   ├── components/              # Reusable UI components
    │   │   ├── BackButton.jsx
    │   │   ├── CartContext.jsx
    │   │   ├── CategoryCard.jsx
    │   │   ├── ConfirmationDialog.jsx
    │   │   ├── Menu.jsx
    │   │   ├── MenuCard.jsx
    │   │   ├── MenuManager.jsx
    │   │   ├── MenuModal.jsx
    │   │   ├── NotificationContext.jsx
    │   │   └── Notification.jsx
    │   ├── contexts/                # Context providers
    │   │   └── RefreshContext.jsx
    │   ├── pages/                   # Main route-based pages
    │   │   ├── Admin.jsx
    │   │   ├── Cart.jsx
    │   │   ├── Home.jsx
    │   │   ├── PendingOrders.jsx
    │   │   ├── Qr.jsx
    │   │   └── Orders.jsx
    │   ├── utils/                   # Utility/helper functions
    │   │   ├── api.js
    │   │   └── cryptoUtils.js
    │   ├── App.jsx                  # Main app component with routes
    │   ├── main.jsx                 # Entry point
    │   └── style.css                # Tailwind CSS import and custom styles
    ├── .gitignore
    ├── index.html                   # HTML template
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js           # PostCSS config
    ├── tailwind.config.js          # Tailwind CSS config
    └── vite.config.js              # Vite config

```

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB (with Mongoose)
- Socket.IO for real-time updates
- CORS for cross-origin requests
- Crypto for encryption

### Frontend
- React
- Vite
- Tailwind CSS
- Socket.IO Client
- React Router
- Context API for state management

## Key Features

### Admin Authentication & Recovery
- JWT-based authentication, bcrypt password hashing, and secure token handling
- Multiple admin accounts, password reset, activation/deactivation, and last login tracking
- Automatic and manual admin recovery tools (see [`backend/ADMIN_AUTH_README.md`](backend/ADMIN_AUTH_README.md))
- Default admin credentials are created on first run or after recovery (**change immediately!**)

### Worker Interface
- Dedicated worker pages for home, cart, orders, pending orders, and settings
- Worker dashboard with stats (orders, revenue, etc.), pending orders, and order management

### Menu Management
- Category-based menu organization
- Dynamic dish filtering by category
- Dishes with options for half/full portions or fixed price
- Admin panel for adding/editing/deleting dishes and categories

### Order Processing
- Cart functionality with quantity controls
- Dynamic price calculation with discount support
- Pending orders management interface
- Order history and tracking
- Real-time order updates using Socket.IO

### Payment System
- Multiple payment methods (Cash/Online)
- QR code generation for UPI payments
- Payment confirmation workflow
- Discount calculation based on order total

### UPI Management
- Secure storage of UPI payment addresses
- Multiple UPI IDs management
- Default UPI selection
- QR code generation for payments
- Encryption for secure UPI data storage

### Notification System
- Centralized notification context for success, error, info, and warning messages
- Queue-based, non-overlapping notifications (`NotificationContext.jsx`)

### Offline Support & PWA
- Service worker for caching, offline fallback (`offline.html`), and versioned static/dynamic cache
- Versioning system with `version.json` and update script (`frontend/scripts/update-version.js`)
- User-friendly offline page and auto-reload when back online

### UI & UX
- Responsive design for all device sizes
- Interactive animations and transitions
- Real-time notifications
- Confirmation dialogs for important actions
- Intuitive navigation with back buttons

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB installed and running
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the backend directory with:
   ```
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_secret_key_for_jwt
   FRONTEND_URL=http://localhost:5173
   ```
   See [`backend/ENV_SETUP.md`](backend/ENV_SETUP.md) for details and security recommendations.

4. Start the backend server:
   ```bash
   npm run dev
   ```
   The server will run on http://localhost:5000

#### Admin Authentication & Recovery
- Default admin credentials are created on first run or after recovery:
  - Username: `admin`
  - Password: `MasalaMadness2024!`
- **Change these credentials immediately after your first login!**
- For admin management and recovery, see [`backend/ADMIN_AUTH_README.md`](backend/ADMIN_AUTH_README.md).

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the frontend directory (optional):
   ```
   VITE_API_URL=http://localhost:5000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:5173

#### Versioning
- Use `frontend/scripts/update-version.js` to bump version and update build date in `frontend/public/version.json`.

## API Endpoints

See [`backend/API_ROUTES.md`](backend/API_ROUTES.md) for full details.

### Categories and Dishes
- `GET /api/dishes` - Get all categories with their dishes
- `POST /api/dishes` - Create a new category
- `PUT /api/dishes/:categoryId/dish` - Add a dish to a category
- `PUT /api/dishes/:categoryId/dish/:dishId` - Update a dish
- `DELETE /api/dishes/:categoryId/dish/:dishId` - Delete a dish

### Orders
- `GET /api/pending-orders` - Get all pending orders
- `POST /api/pending-orders` - Create a new pending order
- `PUT /api/pending-orders/:orderId` - Update a pending order
- `DELETE /api/pending-orders/:orderId` - Delete a pending order
- `POST /api/pending-orders/confirm/:orderId` - Confirm payment for a pending order

### UPI Management
- `GET /api/upi` - Get all UPI addresses
- `POST /api/upi` - Add a new UPI address
- `PUT /api/upi/:id` - Update UPI address
- `DELETE /api/upi/:id` - Delete UPI address
- `PUT /api/upi/:id/default` - Set a UPI address as default

### Discounts
- `GET /api/discounts/active` - Get active discount

## Security Recommendations
- Change default admin password after first login
- Use a strong, random value for `JWT_SECRET` in production
- Admin backups are encrypted using a key derived from `JWT_SECRET`
- Use environment-specific .env files and never commit them to version control
- For production:
  - Use a separate database for admin credentials
  - Implement IP-based restrictions for admin login attempts
  - Set up audit logging for all admin actions
  - Configure automated alerts for unauthorized access attempts
  - Use a password manager or secret management service

## Documentation
- For advanced admin/auth features, see [`backend/ADMIN_AUTH_README.md`](backend/ADMIN_AUTH_README.md)
- For API details, see [`backend/API_ROUTES.md`](backend/API_ROUTES.md)
- For environment setup, see [`backend/ENV_SETUP.md`](backend/ENV_SETUP.md)

*This README is up to date as of the latest project changes.*

## Development Notes
- Backend runs on port 5000
- Frontend runs on port 5173
- CORS is enabled for frontend-backend communication
- MongoDB connection is required for the backend to function
- Socket.IO is used for real-time updates

## Troubleshooting

1. If the frontend shows "Error fetching categories":
   - Ensure the backend server is running
   - Check MongoDB connection
   - Verify CORS is properly configured

2. If MongoDB fails to connect:
   - Check if MongoDB service is running
   - Verify the MONGO_URI in .env file
   - Ensure network connectivity

3. If changes don't reflect:
   - Backend: The server auto-restarts with nodemon
   - Frontend: Changes hot-reload automatically

4. If UPI QR codes don't generate:
   - Check internet connection (uses an external QR generation service)
   - Verify UPI addresses are properly formatted

## Note

Order Number is reset on the basis of UTC timing.

## Issue 

Issue Resolved 

## Things to do now

Adding Token System

## Future Features

1. `Adding the Zomato and Swiggy api`
By adding this feature, admin can view the order which are coming from these platfrom.

2. We can use the Din In feature where we will give the QR to the table Numbers, by which customer can scan the QR and order the dishes from sitting in the Restaurant only.