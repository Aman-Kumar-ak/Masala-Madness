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
  appliesTo: {
    type: String,
    enum: ['all', 'location'],
    default: 'all'
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    default: null,
    index: true
  },
  locationName: {
    type: String,
    default: 'All branches',
    trim: true
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
