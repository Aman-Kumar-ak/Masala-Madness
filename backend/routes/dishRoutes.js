const express = require('express');
const router = express.Router();
const DishCategory = require('../models/DishCategory');
const { adminAuth } = require('../middleware/authMiddleware');
const { getDefaultLocation, resolveLocation } = require('../utils/locationUtils');

async function resolveDishLocation(locationId, includeInactive = false) {
  if (locationId) {
    return resolveLocation(locationId, { allowInactive: includeInactive });
  }

  return getDefaultLocation();
}

function validatePricing(priceHalf, priceFull, price) {
  if (price && (priceHalf || priceFull)) {
    return 'Cannot have both single price and half/full prices';
  }

  if (!price && !priceHalf && !priceFull) {
    return 'At least one price must be provided';
  }

  return null;
}

router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const location = await resolveDishLocation(req.query.locationId, includeInactive);

    if (!location) {
      return res.json([]);
    }

    const categories = await DishCategory.find({ location: location._id }).sort({ categoryName: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', adminAuth, async (req, res) => {
  const { categoryName, locationId } = req.body;

  try {
    const location = await resolveDishLocation(locationId);
    if (!location) {
      return res.status(400).json({ error: 'Valid active location is required' });
    }

    const cleanedCategoryName = (categoryName || '').trim().replace(/\s+/g, ' ');
    if (!cleanedCategoryName) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existingCategory = await DishCategory.findOne({
      location: location._id,
      categoryName: { $regex: `^${cleanedCategoryName}$`, $options: 'i' }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists for this location' });
    }

    const newCategory = new DishCategory({
      categoryName: cleanedCategoryName,
      location: location._id,
      dishes: []
    });

    await newCategory.save();
    res.status(201).json({ message: 'Category created', category: newCategory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:categoryId/dish', adminAuth, async (req, res) => {
  const { categoryId } = req.params;
  const { name, priceHalf, priceFull, price } = req.body;

  try {
    const category = await DishCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const pricingError = validatePricing(priceHalf, priceFull, price);
    if (pricingError) {
      return res.status(400).json({ error: pricingError });
    }

    const cleanedName = (name || '').trim().replace(/\s+/g, ' ');
    if (!cleanedName) {
      return res.status(400).json({ error: 'Dish name is required' });
    }

    const duplicateDish = category.dishes.some(
      (dish) => dish.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (duplicateDish) {
      return res.status(400).json({ error: 'Dish already exists in this category' });
    }

    category.dishes.push({
      name: cleanedName,
      priceHalf: price ? null : priceHalf,
      priceFull: price ? null : priceFull,
      price: price || null
    });

    await category.save();
    res.status(201).json({
      message: 'Dish added successfully',
      category
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:categoryId/dish/:dishId', adminAuth, async (req, res) => {
  const { categoryId, dishId } = req.params;
  const { name, priceHalf, priceFull, price } = req.body;

  try {
    const category = await DishCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const dish = category.dishes.id(dishId);
    if (!dish) {
      return res.status(404).json({ message: 'Dish not found' });
    }

    const pricingError = validatePricing(priceHalf, priceFull, price);
    if (pricingError) {
      return res.status(400).json({ error: pricingError });
    }

    const cleanedName = (name || '').trim().replace(/\s+/g, ' ');
    if (!cleanedName) {
      return res.status(400).json({ error: 'Dish name is required' });
    }

    const duplicateDish = category.dishes.some(
      (existingDish) =>
        existingDish._id.toString() !== dishId &&
        existingDish.name.toLowerCase() === cleanedName.toLowerCase()
    );

    if (duplicateDish) {
      return res.status(400).json({ error: 'Dish already exists in this category' });
    }

    dish.name = cleanedName;
    dish.priceHalf = price ? null : priceHalf;
    dish.priceFull = price ? null : priceFull;
    dish.price = price || null;

    await category.save();
    res.json({ message: 'Dish updated successfully', category });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:categoryId/dish/:dishId', adminAuth, async (req, res) => {
  const { categoryId, dishId } = req.params;

  try {
    const category = await DishCategory.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    category.dishes = category.dishes.filter((dish) => dish._id.toString() !== dishId);
    await category.save();
    res.status(200).json({ message: 'Dish deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Server error while deleting dish' });
  }
});

router.delete('/:categoryId', adminAuth, async (req, res) => {
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
