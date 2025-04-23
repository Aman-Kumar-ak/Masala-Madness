const mongoose = require('mongoose');

const DiscountSchema = new mongoose.Schema({
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  minOrderAmount: {
    type: Number,
    required: true,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Discount = mongoose.model('Discount', DiscountSchema);
module.exports = Discount;