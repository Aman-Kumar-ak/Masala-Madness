const mongoose = require('mongoose');

const archivedDishSchema = new mongoose.Schema(
  {
    originalDishId: {
      type: String,
      default: null
    },
    name: {
      type: String,
      required: true
    },
    priceHalf: {
      type: Number,
      default: null
    },
    priceFull: {
      type: Number,
      default: null
    },
    price: {
      type: Number,
      default: null
    }
  },
  { _id: false }
);

const archivedCategorySchema = new mongoose.Schema(
  {
    originalCategoryId: {
      type: String,
      default: null
    },
    categoryName: {
      type: String,
      required: true
    },
    dishes: {
      type: [archivedDishSchema],
      default: []
    }
  },
  { _id: false }
);

const locationArchiveSchema = new mongoose.Schema(
  {
    locationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Location',
      required: true,
      unique: true,
      index: true
    },
    locationName: {
      type: String,
      required: true
    },
    normalizedName: {
      type: String,
      required: true,
      index: true
    },
    archivedAt: {
      type: Date,
      default: Date.now
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    categoryCount: {
      type: Number,
      default: 0
    },
    dishCount: {
      type: Number,
      default: 0
    },
    categories: {
      type: [archivedCategorySchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LocationArchive', locationArchiveSchema);
