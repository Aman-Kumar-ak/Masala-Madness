const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');

// Get all dishes
router.get('/', async (req, res) => {
  const dishes = await Dish.find();
  res.json(dishes);
});

// Add a new dish
router.post('/', async (req, res) => {
  const { name, price_half, price_full } = req.body;

  const newDish = new Dish({ name, price_half, price_full });
  await newDish.save();
  res.status(201).json(newDish);
});

// Delete a dish
router.delete('/:id', async (req, res) => {
  await Dish.findByIdAndDelete(req.params.id);
  res.json({ message: 'Dish deleted successfully' });
});

module.exports = router;
