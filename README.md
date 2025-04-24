# Masala Madness

A full-stack restaurant menu management system built with React and Node.js.

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
    │   └── App.jsx       # Main App component
    └── package.json      # Frontend dependencies

```

```
Masala-Madness/
└── frontend/
    ├── node_modules/                # Auto-generated dependencies
    ├── public/                      # (Optional: Vite can use a public folder)
    ├── src/
    │   ├── components/              # Reusable UI components
    │   │   ├── BackButton.jsx
    │   │   ├── CartContext.jsx
    │   │   ├── CategoryCard.jsx
    │   │   ├── ConfirmationDialog.jsx
    │   │   ├── Menu.jsx
    │   │   ├── MenuCard.jsx
    │   │   ├── MenuManager.jsx
    │   │   └── Notification.jsx
    │   ├── pages/                   # Main route-based pages
    │   │   ├── Admin.jsx
    │   │   ├── Cart.jsx
    │   │   ├── Home.jsx
    │   │   └── Orders.jsx
    │   ├── utils/                   # Utility/helper functions
    │   │   ├── api.js
    │   │   └── fetchCategories.js
    │   ├── App.jsx                  # Main app component with routes
    │   ├── main.jsx                 # Entry point
    │   └── style.css                # Tailwind CSS import and custom styles
    ├── .gitignore
    ├── index.html                   # HTML template
    ├── package.json
    ├── package-lock.json
    ├── postcss.config.js           # PostCSS config (or .cjs depending on setup)
    ├── tailwind.config.js          # Tailwind CSS config
    └── vite.config.js              # Vite config

```

## Technology Stack

### Backend
- Node.js
- Express.js
- MongoDB (with Mongoose)
- CORS for cross-origin requests

### Frontend
- React
- Vite
- Tailwind CSS
- Fetch API for data fetching

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

3. Start the development server:
   ```bash
   npm run dev
   ```
   The frontend will be available at http://localhost:5173

## API Endpoints

### Categories and Dishes

- `GET /api/dishes` - Get all categories with their dishes
- `POST /api/dishes` - Create a new category
  ```json
  {
    "categoryName": "Category Name"
  }
  ```
- `PUT /api/dishes/:categoryId/dish` - Add a dish to a category
  ```json
  {
    "name": "Dish Name",
    "priceHalf": 25,
    "priceFull": 45
  }
  ```

## Key Files and Their Purposes

### Backend
- `server.js`: Main server configuration, database connection, and middleware setup
- `models/DishCategory.js`: MongoDB schema for categories and dishes
- `routes/dishRoutes.js`: API route handlers
- `scripts/addTestData.js`: Utility script to add test data

### Frontend
- `src/components/Menu.jsx`: Main menu component that displays categories and dishes
- `src/components/MenuCard.jsx`: Individual dish card component
- `src/utils/fetchCategories.js`: API integration for fetching menu data
- `src/utils/api.js`: API configuration and base URL
- `src/pages/Home.jsx`: Main page component

## Database Structure

### DishCategory Schema
```javascript
{
  categoryName: String,
  dishes: [{
    name: String,
    priceHalf: Number,
    priceFull: Number
  }]
}
```

## Adding Test Data

You can add test data using the provided script:
```bash
cd backend
node scripts/addTestData.js
```

## Features
- Category-based menu organization
- Dynamic category filtering
- Responsive design
- Quantity controls for each dish
- Add to cart functionality (UI only)

## Development Notes
- Backend runs on port 5000
- Frontend runs on port 5173
- CORS is enabled for frontend-backend communication
- MongoDB connection is required for the backend to function

## Troubleshooting

1. If the frontend shows "Error fetching categories":
   - Ensure the backend server is running
   - Check MongoDB connection
   - Verify CORS is properly configured

2. If MongoDB fails to connect:
   - Check if MongoDB service is running
   - Verify the MONGO_URL in .env file
   - Ensure network connectivity

3. If changes don't reflect:
   - Backend: The server auto-restarts with nodemon
   - Frontend: Changes hot-reload automatically

## Note

Order Number is reset on the basis of UTC timinig.

## Issue 

In orders.jsx, In order Management while choosing the date from calendar there is a option of clear button. While pressing that all the orders is disappearning. We have to fix that.

## Things to do now

1. We can work on adding Discount on the given order with the specific details like - discount of 20% over 300
2. Work on Design part of the Project
3. We have to add one feature in which customer give the order but not want to pay right now. After eating they pay the amount. So we have to add something like pending money/order payment.
We can do like creating one page of Pending in which all the order will be shown which are un-paid, in that admin can modify the dishes like adding or removing. When the user ready to pay. We can use the same page of cart where that all dishes will be there with modified dishes. On that, admin can select b/w the Cash/QR for confirm payment or again put them in pending. Make sure until the customer not paying the money that will be considered as unpaid. When the customer will paid the money it will be change to the paid. In database same Order number when it was listed as the unpaid with time, it will change into the paid with the timing of paying the money. The database will be arrange on the basis of time.

4. We can also give the option to admin that he/she want to recieve alert on various events like - removing element

## Future Features

1. `Adding the Zomato and Swiggy api`
By adding this feature, admin can view the order which are coming from these platfrom.

2. We can use the Din In feature where we will give the QR to the table Numbers, by which customer can scan the QR and order the dishes from sitting in the Restaurant only.

Make the original price and discount amount with percent has to be in one line space because of less space in floating cart. give spaces and better. Change the floating cart to light color