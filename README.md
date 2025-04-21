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

Total Revenue showing all the payment which is being Sucessful/Failed

## Things to do now

1. We can work on adding Discount on the given order with the specific details like - discount of 20% over 300
2. Work on Design part of the Project

## Future Features

1. `Adding the Zomato and Swiggy api`
By adding this feature, admin can view the order which are coming from these platfrom.

2. We can use the Din In feature where we will give the QR to the table Numbers, by which customer can scan the QR and order the dishes from sitting in the Restaurant only.

