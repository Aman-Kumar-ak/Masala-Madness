const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price_half: {
    type: Number,
    required: true,
  },
  price_full: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model('Dish', dishSchema);
