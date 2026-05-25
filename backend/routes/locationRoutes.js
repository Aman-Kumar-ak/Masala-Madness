const express = require('express');
const router = express.Router();
const DishCategory = require('../models/DishCategory');
const DeletedOrder = require('../models/DeletedOrder');
const Location = require('../models/Location');
const LocationArchive = require('../models/LocationArchive');
const Order = require('../models/Order');
const SalesCalendar = require('../models/SalesCalendar');
const User = require('../models/User');
const { authenticateToken, adminAuth } = require('../middleware/authMiddleware');
const { normalizeLocationName } = require('../utils/locationUtils');

function buildCategorySnapshot(categories = []) {
  return categories.map((category) => ({
    originalCategoryId: category._id?.toString() || null,
    categoryName: category.categoryName,
    dishes: (category.dishes || []).map((dish) => ({
      originalDishId: dish._id?.toString() || null,
      name: dish.name,
      priceHalf: dish.priceHalf ?? null,
      priceFull: dish.priceFull ?? null,
      price: dish.price ?? null
    }))
  }));
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'admin';
    const query = includeInactive ? {} : { isActive: true };
    const locations = await Location.find(query).sort({ name: 1 }).lean();
    res.json(locations);
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ message: 'Failed to fetch locations.' });
  }
});

router.post('/', adminAuth, async (req, res) => {
  try {
    const rawName = (req.body.name || '').trim().replace(/\s+/g, ' ');

    if (!rawName) {
      return res.status(400).json({ message: 'Location name is required.' });
    }

    const normalizedName = normalizeLocationName(rawName);
    let location = await Location.findOne({ normalizedName });

    if (location) {
      if (location.isActive) {
        return res.status(400).json({ message: 'Location already exists.' });
      }

      location.name = rawName;
      location.isActive = true;
      location.deletedAt = null;
      location.deletedBy = null;
      location.updatedBy = req.user._id;
      await location.save();

      return res.status(200).json({
        message: 'Location restored successfully.',
        location
      });
    }

    location = await Location.create({
      name: rawName,
      createdBy: req.user._id,
      updatedBy: req.user._id
    });

    return res.status(201).json({
      message: 'Location created successfully.',
      location
    });
  } catch (error) {
    console.error('Create location error:', error);
    res.status(500).json({ message: 'Failed to create location.' });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const rawName = (req.body.name || '').trim().replace(/\s+/g, ' ');

    if (!rawName) {
      return res.status(400).json({ message: 'Location name is required.' });
    }

    const normalizedName = normalizeLocationName(rawName);
    const existingLocation = await Location.findOne({ normalizedName });

    if (existingLocation && existingLocation._id.toString() !== req.params.id) {
      return res.status(400).json({ message: 'Another location already uses this name.' });
    }

    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    location.name = rawName;
    location.updatedBy = req.user._id;
    await location.save();

    await Promise.all([
      Order.updateMany({ location: location._id }, { $set: { locationName: location.name } }),
      DeletedOrder.updateMany({ location: location._id }, { $set: { locationName: location.name } }),
      SalesCalendar.updateMany({ location: location._id }, { $set: { locationName: location.name } })
    ]);

    return res.json({
      message: 'Location updated successfully.',
      location
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ message: 'Failed to update location.' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    if (!location.isActive) {
      return res.status(400).json({ message: 'Location is already archived.' });
    }

    const assignedUsers = await User.countDocuments({ location: location._id });
    if (assignedUsers > 0) {
      return res.status(400).json({
        message: 'Reassign all users from this location before deleting it.'
      });
    }

    const categories = await DishCategory.find({ location: location._id }).lean();
    const categorySnapshot = buildCategorySnapshot(categories);
    const dishCount = categorySnapshot.reduce((sum, category) => sum + category.dishes.length, 0);

    await LocationArchive.findOneAndUpdate(
      { locationId: location._id },
      {
        $set: {
          locationName: location.name,
          normalizedName: location.normalizedName,
          archivedAt: new Date(),
          archivedBy: req.user._id,
          categoryCount: categorySnapshot.length,
          dishCount,
          categories: categorySnapshot
        }
      },
      {
        upsert: true,
        new: true
      }
    );

    location.isActive = false;
    location.deletedAt = new Date();
    location.deletedBy = req.user._id;
    location.updatedBy = req.user._id;
    await location.save();

    return res.json({
      message: 'Location archived successfully. Categories and dishes were preserved in the database backup.'
    });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ message: 'Failed to archive location.' });
  }
});

module.exports = router;
