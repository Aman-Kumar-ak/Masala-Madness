const express = require('express');
const router = express.Router();
const Discount = require('../models/Discount');

// Get current active discount
router.get('/active', async (req, res) => {
  try {
    const discount = await Discount.findOne({ isActive: true })
      .sort({ createdAt: -1 });
    res.json(discount || null);
  } catch (error) {
    res.status(500).json({ message: "Error fetching discount", error: error.message });
  }
});

// Get all discounts
router.get('/', async (req, res) => {
  try {
    const discounts = await Discount.find().sort({ createdAt: -1 });
    res.json(discounts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching discounts", error: error.message });
  }
});

// Create new discount
router.post('/', async (req, res) => {
  try {
    // Always deactivate all other discounts
    await Discount.updateMany({}, { isActive: false });
    // Always set new discount as active
    const discount = new Discount({
      ...req.body,
      isActive: true
    });
    await discount.save();
    res.status(201).json(discount);
  } catch (error) {
    res.status(500).json({ message: "Error creating discount", error: error.message });
  }
});

// Update discount (no more isActive toggle from UI, but keep for completeness)
router.put('/:id', async (req, res) => {
  try {
    // If this discount is being updated, always keep it active and others inactive
    await Discount.updateMany({}, { isActive: false });
    const discount = await Discount.findByIdAndUpdate(
      req.params.id,
      { ...req.body, isActive: true },
      { new: true }
    );
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    res.json(discount);
  } catch (error) {
    res.status(500).json({ message: "Error updating discount", error: error.message });
  }
});

// Delete discount
router.delete('/:id', async (req, res) => {
  try {
    const discount = await Discount.findByIdAndDelete(req.params.id);
    if (!discount) {
      return res.status(404).json({ message: "Discount not found" });
    }
    // After deletion, set all discounts to inactive (no active discount)
    await Discount.updateMany({}, { isActive: false });
    res.json({ message: "Discount deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting discount", error: error.message });
  }
});

module.exports = router;