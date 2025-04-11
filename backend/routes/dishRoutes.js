// Import necessary modules
const express = require('express');
const router = express.Router();
const DishCategory = require('../models/DishCategory');

// Get all categories with dishes
// URL: GET http://localhost:5000/api/dishes
router.get('/', async (req, res) => {
  try {
    const categories = await DishCategory.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new category without dishes
// URL: POST http://localhost:5000/api/dishes
router.post('/', async (req, res) => {
  const { categoryName } = req.body;
  try {
    const newCategory = new DishCategory({ categoryName, dishes: [] });
    await newCategory.save();
    res.status(201).json({ message: "Category created", category: newCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a dish to a existing category
// URL: PUT http://localhost:5000/api/dishes/:categoryId/dish
router.put('/:categoryId/dish', async (req, res) => {
  const { categoryId } = req.params;
  const { name, priceHalf, priceFull } = req.body;
  try {
    const category = await DishCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    category.dishes.push({ name, priceHalf, priceFull });
    await category.save();
    res.status(201).json({ 
      message: 'Dish added successfully', 
      category 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update a dish within a category
// URL: PUT http://localhost:5000/api/dishes/:categoryId/dish/:dishId
router.put('/:categoryId/dish/:dishId', async (req, res) => {
  const { categoryId, dishId } = req.params;
  const { name, priceHalf, priceFull } = req.body;
  try {
    const category = await DishCategory.findById(categoryId);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    const dish = category.dishes.id(dishId);
    if (!dish) return res.status(404).json({ message: 'Dish not found' });
    if (name !== undefined) dish.name = name;
    if (priceHalf !== undefined) dish.priceHalf = priceHalf;
    if (priceFull !== undefined) dish.priceFull = priceFull;
    await category.save();
    res.json({ message: 'Dish updated successfully', category });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a dish from a category
// URL: DELETE http://localhost:5000/api/dishes/:categoryId/dish/:dishId
router.delete('/:categoryId/dish/:dishId', async (req, res) => {
  const { categoryId, dishId } = req.params;
  try {
    const category = await DishCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    category.dishes = category.dishes.filter(dish => dish._id.toString() !== dishId);
    await category.save();
    res.status(200).json({ message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error while deleting dish' });
  }
});

// Delete an entire category
// URL: DELETE http://localhost:5000/api/dishes/:categoryId
router.delete('/:categoryId', async (req, res) => {
  const { categoryId } = req.params;
  try {
    const deletedCategory = await DishCategory.findByIdAndDelete(categoryId);
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting category', details: error.message });
  }
});

module.exports = router;
