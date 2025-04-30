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

To implement the feature where customers can place an order without paying immediately, and later pay after consuming their meal, you can follow these steps:
1. Database Changes
Order Status: Add a status field to your orders table to track whether an order is "paid" or "unpaid".
Timestamp: Include fields for the order creation time and payment time to track when the order was placed and when it was paid.
2. Backend Changes
Order Creation: Modify the order creation endpoint to allow orders to be created with a status of "unpaid".
Order Update: Create an endpoint to update the order status from "unpaid" to "paid" when the customer decides to pay.
Pending Orders: Create an endpoint to fetch all unpaid orders for the admin to view and modify.
3. Frontend Changes
Pending Orders Page:
Create a new page to display all unpaid orders. This page should allow the admin to modify the order (add/remove dishes).
Include functionality to select a payment method and confirm payment, which will update the order status to "paid".
Cart Page:
Reuse the existing cart page to display the order details when the customer is ready to pay.
Allow the admin to select between "Cash" or "QR" for payment and confirm the payment, updating the order status.
4. Workflow
Order Placement: Customers place an order, which is saved with a status of "unpaid".
Admin View: Admin can view and modify unpaid orders on the Pending Orders page.
Payment Confirmation: When the customer is ready to pay, the admin can confirm the payment on the cart page, updating the order status to "paid".
5. Implementation Steps
Step 1: Update the database schema to include the necessary fields for order status and timestamps.
Step 2: Implement the backend logic to handle order creation, status updates, and fetching unpaid orders.
Step 3: Develop the frontend components for the Pending Orders page and update the Cart page to handle payment confirmation.
6. Testing
Ensure that orders can be placed as unpaid and later updated to paid.
Verify that the admin can modify unpaid orders and confirm payments correctly.
Test the entire workflow to ensure smooth operation from order placement to payment confirmation.
By following these steps, you can implement the feature to handle pending payments effectively. If you need help with specific parts of the implementation, feel free to ask!


To ensure that the newer data is displayed first when querying from MongoDB, you need to sort the results by a timestamp field in descending order. This can be achieved by modifying the query to include a sort operation.
Here's how you can implement this:
1. Ensure Timestamp Field Exists
Make sure your MongoDB documents have a timestamp field, such as createdAt, which records when the document was created. If this field doesn't exist, you'll need to add it and ensure it's populated when new documents are created.
2. Modify the Query
When querying the database, use the sort method to order the results by the timestamp field in descending order. This will ensure that the newest documents appear first.
Example Code
Here's an example of how you might modify a query in a Node.js application using Mongoose:
Apply to orderRoutes....
Steps to Implement
Add a Timestamp Field: Ensure each document has a createdAt field. You can use Mongoose's timestamps option to automatically add createdAt and updatedAt fields to your schema.
Update Queries: Modify your queries to include the sort method, ordering by createdAt in descending order.
Test: Verify that the data is being returned in the correct order by running your application and checking the output.

we can proceed like - we can create one pending table in that while placing the order when the admin is choosen for add to pending in cart. That order will be added in pending table after reviewing and modification of items when customer is ready for the payment and admin confirms the payment payment successful in cart(when the customer is ready we check for the pending order table after clicking on checkout this has to redirect to cart page itself to do the payment). That order will be be added to order table in the db and deleted from the pending table.
Making sure no duplicate orders generate in the table of same table.
Frontend - In home page there will be section for Pending order payment, in which there will be orders whose payment status is un-paid. All the orders are arrange in the order of creation time(after pressing the add to pending). All the pending orders can be modified because customer can buy more items to eat, making sure to update the amount after modification. 

To implement the feature as described, we'll follow a structured approach. Here's a detailed plan to create a pending order system:

### 1. **Database Design**
- **Pending Orders Table**: Create a new table `pending_orders` with fields such as `order_id`, `items`, `subtotal`, `created_at`, `updated_at`, and `status`.
- **Orders Table**: Ensure the existing `orders` table can accommodate fields for `payment_status` and `payment_time`.

### 2. **Backend Implementation**
- **Create Pending Order**: Implement an API endpoint to add an order to the `pending_orders` table when the admin chooses "Add to Pending" in the cart.
- **Fetch Pending Orders**: Implement an API endpoint to retrieve all pending orders for display on the frontend.
- **Update Pending Order**: Implement an API endpoint to modify items in a pending order.
- **Confirm Payment**: Implement an API endpoint to move an order from `pending_orders` to `orders` when payment is confirmed, and delete it from `pending_orders`.

### 3. **Frontend Implementation**
- **Pending Orders Page**: 
  - Create a new page to list all pending orders, allowing the admin to modify them.
  - Include functionality to update the order total after modifications.

- **Cart Page**: 
  - Update the cart page to handle the transition from pending to confirmed payment.
  - Ensure the cart page can fetch and display pending order details when the customer is ready to pay.

- **Home Page Section**: 
  - Add a section on the home page to display pending orders, sorted by creation time.
  - Provide a link or button to navigate to the Pending Orders page for detailed management.

### 4. **Workflow**
- **Order Placement**: When an order is placed and marked as pending, it is added to the `pending_orders` table.
- **Admin Management**: Admin can view and modify pending orders on the Pending Orders page.
- **Payment Confirmation**: When the customer is ready to pay, the admin confirms the payment on the cart page, moving the order to the `orders` table and removing it from `pending_orders`.

### 5. **Implementation Steps**
- **Step 1**: Update the database schema to include the `pending_orders` table.
- **Step 2**: Implement the backend logic for creating, fetching, updating, and confirming pending orders.
- **Step 3**: Develop the frontend components for the Pending Orders page and update the Cart page for payment confirmation.
- **Step 4**: Add the Pending Orders section to the home page.

### 6. **Testing**
- Test the entire workflow to ensure orders can be placed as pending, modified, and confirmed correctly.
- Verify that no duplicate orders are created and that the transition from pending to confirmed is smooth.

By following this plan, you can implement the pending order feature effectively. If you need help with specific parts of the implementation, such as code snippets or API design, feel free to ask!


4. We can also give the option to admin that he/she want to recieve alert on various events like - removing element

## Future Features

1. `Adding the Zomato and Swiggy api`
By adding this feature, admin can view the order which are coming from these platfrom.

2. We can use the Din In feature where we will give the QR to the table Numbers, by which customer can scan the QR and order the dishes from sitting in the Restaurant only.

Make the original price and discount amount with percent has to be in one line space because of less space in floating cart. give spaces and better. Change the floating cart to light color