const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: { type: String, required: true },
  priceHalf: { 
    type: Number, 
    default: null,
    validate: {
      validator: function(v) {
        return this.price === null || v === null;
      },
      message: 'Cannot have both single price and half/full prices'
    }
  },
  priceFull: { 
    type: Number, 
    default: null,
    validate: {
      validator: function(v) {
        return this.price === null || v === null;
      },
      message: 'Cannot have both single price and full price'
    }
  },
  price: { 
    type: Number, 
    default: null,
    validate: {
      validator: function(v) {
        return (this.priceHalf === null && this.priceFull === null) || v === null;
      },
      message: 'Cannot have both single price and half/full prices'
    }
  }
});

const categorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true },
  dishes: [dishSchema]
});

module.exports = mongoose.model('DishCategory', categorySchema);