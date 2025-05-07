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
   CRYPTO_SECRET_KEY=your_secret_key_for_encryption
   ```

4. Start the backend server:
   ```bash
   npm run dev
   ```
   The server will run on http://localhost:5000

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

## API Endpoints

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

## Key Files and Their Purposes

### Backend
- `server.js`: Main server configuration, database connection, and middleware setup
- `models/DishCategory.js`: MongoDB schema for categories and dishes
- `models/PendingOrder.js`: MongoDB schema for pending orders
- `models/UPI.js`: MongoDB schema for UPI addresses
- `routes/dishRoutes.js`: API routes for dishes management
- `routes/pendingOrderRoutes.js`: API routes for order management
- `routes/upiRoutes.js`: API routes for UPI management
- `utils/crypto.js`: Utility for encryption/decryption

### Frontend
- `src/App.jsx`: Main app component with routes
- `src/components/Menu.jsx`: Main menu component that displays categories and dishes
- `src/components/MenuCard.jsx`: Individual dish card component
- `src/components/CartContext.jsx`: Context provider for shopping cart
- `src/pages/Home.jsx`: Main page with menu
- `src/pages/Cart.jsx`: Shopping cart page
- `src/pages/PendingOrders.jsx`: Pending orders management page
- `src/pages/Qr.jsx`: UPI QR code management page
- `src/pages/Admin.jsx`: Admin panel for dishes management
- `src/contexts/RefreshContext.jsx`: Context for real-time updates

## Database Structure

### DishCategory Schema
```javascript
{
  categoryName: String,
  dishes: [{
    name: String,
    priceHalf: Number,
    priceFull: Number,
    price: Number
  }]
}
```

### PendingOrder Schema
```javascript
{
  orderId: String,
  items: [{
    name: String,
    type: String,
    price: Number,
    quantity: Number,
    totalPrice: Number
  }],
  subtotal: Number,
  discountAmount: Number,
  discountPercentage: Number,
  totalAmount: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### UPI Schema
```javascript
{
  name: String,
  upiId: String,
  isDefault: Boolean,
  createdAt: Date
}
```

## Adding Test Data

You can add test data using the provided script:
```bash
cd backend
node scripts/addTestData.js
```

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

1. Date size for very small width dimensions 

## Things to do now

1. Work on Authentication - Login Page 

## Future Features

1. `Adding the Zomato and Swiggy api`
By adding this feature, admin can view the order which are coming from these platfrom.

2. We can use the Din In feature where we will give the QR to the table Numbers, by which customer can scan the QR and order the dishes from sitting in the Restaurant only.