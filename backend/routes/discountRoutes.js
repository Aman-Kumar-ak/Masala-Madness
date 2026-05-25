const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount');
const Location = require('../models/Location');

const GLOBAL_DISCOUNT_QUERY = {
  $or: [
    { appliesTo: 'all' },
    { appliesTo: { $exists: false } },
    { location: null },
    { location: { $exists: false } }
  ]
};

async function getDiscountScope(req) {
  const requestedLocationId = req.query?.locationId ?? req.body?.locationId;

  if (!requestedLocationId || requestedLocationId === 'all') {
    return {
      appliesTo: 'all',
      location: null,
      locationName: 'All branches'
    };
  }

  const location = await Location.findById(requestedLocationId).select('_id name').lean();
  if (!location) {
    const error = new Error('Valid location is required for this discount.');
    error.statusCode = 400;
    throw error;
  }

  return {
    appliesTo: 'location',
    location: location._id,
    locationName: location.name
  };
}

function buildScopeQuery(scope) {
  if (scope.appliesTo === 'location') {
    return { appliesTo: 'location', location: scope.location };
  }

  return GLOBAL_DISCOUNT_QUERY;
}

// Get current active discount. Branch-specific discount wins over all-branch fallback.
router.get('/active', async (req, res) => {
  try {
    const scope = await getDiscountScope(req);

    if (scope.appliesTo === 'location') {
      const locationDiscount = await Discount.findOne({
        isActive: true,
        appliesTo: 'location',
        location: scope.location
      }).sort({ createdAt: -1 });

      if (locationDiscount) {
        return res.json(locationDiscount);
      }
    }

    const discount = await Discount.findOne({
      isActive: true,
      ...GLOBAL_DISCOUNT_QUERY
    }).sort({ createdAt: -1 });

    res.json(discount || null);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: 'Error fetching discount', error: error.message });
  }
});

// Get all discounts
router.get('/', async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discounts', error: error.message });
  }
});

// Create new discount
router.post('/', async (req, res) => {
  try {
    const scope = await getDiscountScope(req);
    await Discount.updateMany(buildScopeQuery(scope), { isActive: false });

    const discount = new Discount({
      percentage: req.body.percentage,
      minOrderAmount: req.body.minOrderAmount,
      appliesTo: scope.appliesTo,
      location: scope.location,
      locationName: scope.locationName,
      isActive: true
    });

    await discount.save();
    res.status(201).json(discount);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: 'Error creating discount', error: error.message });
  }
});

// Update discount
router.put('/:id', async (req, res) => {
  try {
    const currentDiscount = await Discount.findById(req.params.id);
    if (!currentDiscount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    const scope = req.body.locationId !== undefined
      ? await getDiscountScope(req)
      : {
        appliesTo: currentDiscount.appliesTo || 'all',
        location: currentDiscount.location || null,
        locationName: currentDiscount.locationName || 'All branches'
      };

    await Discount.updateMany(buildScopeQuery(scope), { isActive: false });

    currentDiscount.percentage = req.body.percentage ?? currentDiscount.percentage;
    currentDiscount.minOrderAmount = req.body.minOrderAmount ?? currentDiscount.minOrderAmount;
    currentDiscount.appliesTo = scope.appliesTo;
    currentDiscount.location = scope.location;
    currentDiscount.locationName = scope.locationName;
    currentDiscount.isActive = true;
    await currentDiscount.save();

    res.json(currentDiscount);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: 'Error updating discount', error: error.message });
  }
});

// Delete discount
router.delete('/:id', async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) {
      return res.status(404).json({ message: 'Discount not found' });
    }

    res.json({ message: 'Discount deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting discount', error: error.message });
  }
});

module.exports = router;
