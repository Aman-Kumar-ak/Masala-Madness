const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priceHalf: { type: Number, default: null },
  priceFull: { type: Number, default: null }
});

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true },
  dishes: [dishSchema]
});

module.exports = mongoose.model('DishCategory', categorySchema);