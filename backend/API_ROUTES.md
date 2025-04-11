# Masala Madness API Routes Documentation

Base URL: `/api/dish`

## Category Management

### 1. Get All Categories
- **Route:** GET `/`
- **Description:** Retrieves all dish categories with their dishes
- **Response:** List of all categories with their dishes
- **Example Response:**
```json
[
  {
    "_id": "categoryId",
    "categoryName": "Main Course",
    "dishes": [...]
  }
]
```

### 2. Add New Category (Empty)
- **Route:** POST `/`
- **Description:** Creates a new empty category
- **Request Body:**
```json
{
  "categoryName": "Desserts"
}
```
- **Response:** New category object with empty dishes array

### 3. Add Category with Dishes
- **Route:** POST `/add-category`
- **Description:** Creates a new category with initial dishes
- **Request Body:**
```json
{
  "categoryName": "Starters",
  "dishes": [
    {
      "name": "Spring Roll",
      "priceHalf": 100,
      "priceFull": 180
    }
  ]
}
```

## Dish Management

### 4. Add Dish to Category
- **Route:** PUT `/:categoryId/dish`
- **Description:** Adds a new dish to an existing category
- **URL Parameters:** categoryId
- **Request Body:**
```json
{
  "name": "Butter Chicken",
  "priceHalf": 180,
  "priceFull": 320
}
```

### 5. Update Dish
- **Route:** PUT `/:categoryId/dish/:dishId`
- **Description:** Updates an existing dish's information
- **URL Parameters:** 
  - categoryId
  - dishId
- **Request Body:** (all fields optional)
```json
{
  "name": "Butter Chicken",
  "priceHalf": 200,
  "priceFull": 350
}
```

### 6. Delete Dish
- **Route:** DELETE `/:categoryId/dish/:dishId`
- **Description:** Removes a dish from a category
- **URL Parameters:**
  - categoryId
  - dishId
- **Response:** Success message

## Error Handling
All routes include error handling and will return:
- `404` for not found resources
- `400` for invalid requests
- `500` for server errors

Each error response includes an error message in the format:
```json
{
  "error": "Error message description"
}
```
Method	Route	Description
GET	/api/dishes	Fetch all categories with dishes
POST	/api/dishes	Add category without dishes
POST	/api/dishes/add-category	Add category with dishes
PUT	/api/dishes/:categoryId/dish	Add new dish to category
PUT	/api/dishes/:categoryId/dish/:dishId	Update specific dish
DELETE	/api/dishes/:categoryId/dish/:dishId	Delete specific dish
DELETE	/api/dishes/:categoryId	Delete entire category