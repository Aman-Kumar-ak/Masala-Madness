const mongoose = require("mongoose");
const { getLocationIdValue } = require('../utils/locationUtils');

const LEGACY_ORDER_COLLECTION = 'old_orders';
const LOCATION_ORDER_COLLECTION_PREFIX = 'orders_';

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  orderNumber: {
    type: Number,
    required: true,
  },
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  locationName: {
    type: String,
    default: null,
    trim: true
  },
  items: [
    {
      name: { type: String, required: true },
      type: { type: String, required: true }, // H or F
      price: { type: Number, required: true }, // Original price per unit
      quantity: { type: Number, required: true },
      totalPrice: { type: Number, required: true }, // price * quantity
      kotNumber: { type: Number, default: null }, // NEW: which KOT this item was printed on
    },
  ],
  subtotal: { type: Number, required: true }, // Original amount before discount
  discountAmount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  manualDiscount: { type: Number, default: 0 }, // Manual discount amount
  totalAmount: { type: Number, required: true }, // Final amount after discount
  paymentMethod: { type: String, required: true }, // Cash or Online
  isPaid: { type: Boolean, required: true },
  customCashAmount: { type: Number, default: 0 },
  customOnlineAmount: { type: Number, default: 0 },
  kotSequence: { type: Number, default: 0 }, // NEW: tracks latest KOT number
  kotPrintCount: { type: Number, default: 0 }, // Tracks number of KOT prints
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
  confirmedBy: {
    type: String,
    default: null,
  },
  deleted: {
    type: Boolean,
    default: false,
  },
});

// Add compound indexes for better query performance
OrderSchema.index({ createdAt: 1, isPaid: 1 });
OrderSchema.index({ orderNumber: 1, createdAt: 1 });
OrderSchema.index({ isPaid: 1, totalAmount: 1 });
OrderSchema.index({ location: 1, createdAt: 1 });

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Optimized static methods for revenue calculations with retries
OrderSchema.statics.calculateStats = async function (startDate, endDate, locationId = null, retryCount = 3) {
  const cacheKey = `stats_${startDate.toISOString()}_${endDate.toISOString()}`;
  const locationObjectId = locationId
    ? new mongoose.Types.ObjectId(locationId)
    : null;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const stats = await this.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lt: endDate },
            deleted: { $ne: true },
            ...(locationObjectId ? { location: locationObjectId } : {})
          }
        },
        {
          $facet: {
            orderStats: [
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalPaidOrders: { 
                    $sum: { $cond: [{ $eq: ["$isPaid", true] }, 1, 0] }
                  },
                  totalRevenue: { 
                    $sum: { $cond: [{ $eq: ["$isPaid", true] }, "$totalAmount", 0] }
                  }
                }
              }
            ],
            paidOrderStats: [
              {
                $match: { isPaid: true }
              },
              {
                $group: {
                  _id: null,
                  avgOrderValue: { $avg: "$totalAmount" }
                }
              }
            ]
          }
        }
      ]).allowDiskUse(true)  // Allow disk usage for large datasets
        .exec();  // Explicitly call exec() for better error handling

      const orderStats = stats[0].orderStats[0] || { 
        totalOrders: 0, 
        totalPaidOrders: 0, 
        totalRevenue: 0 
      };
      const paidOrderStats = stats[0].paidOrderStats[0] || { avgOrderValue: 0 };

      return {
        totalOrders: orderStats.totalOrders,
        totalPaidOrders: orderStats.totalPaidOrders,
        totalRevenue: orderStats.totalRevenue,
        avgOrderValue: paidOrderStats.avgOrderValue || 0
      };
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);
      
      // If this was the last attempt, throw the error
      if (attempt === retryCount) {
        console.error('All retry attempts failed');
        throw error;
      }

      // If connection error, wait before retrying
      if (error.name === 'MongoError' || error.code === 'ECONNRESET') {
        const waitTime = Math.min(100 * Math.pow(2, attempt), 2000); // Exponential backoff
        await delay(waitTime);
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }
};

function getLocationOrderCollectionName(locationLike) {
  const locationId = getLocationIdValue(locationLike);
  if (!locationId) {
    throw new Error('Location is required to resolve the order collection.');
  }

  return `${LOCATION_ORDER_COLLECTION_PREFIX}${locationId}`;
}

function getLocationOrderModel(locationLike) {
  const collectionName = getLocationOrderCollectionName(locationLike);
  const modelName = `Order_${collectionName}`;

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  return mongoose.model(modelName, OrderSchema, collectionName);
}

function getLegacyOrderModel() {
  const modelName = 'LegacyOrder';

  if (mongoose.models[modelName]) {
    return mongoose.models[modelName];
  }

  return mongoose.model(modelName, OrderSchema, LEGACY_ORDER_COLLECTION);
}

async function ensureOrderCollectionReady(locationLike) {
  const orderModel = getLocationOrderModel(locationLike);

  try {
    await orderModel.createCollection();
  } catch (error) {
    if (error?.codeName !== 'NamespaceExists' && error?.code !== 48) {
      console.warn(`Unable to create order collection ${orderModel.collection.name}:`, error.message);
    }
  }

  try {
    await orderModel.syncIndexes();
  } catch (error) {
    console.warn(`Unable to sync order indexes for ${orderModel.collection.name}:`, error.message);
  }

  return orderModel;
}

async function ensureOrderCollectionsReady(locations = []) {
  const uniqueLocations = new Map();

  locations.forEach((location) => {
    const locationId = getLocationIdValue(location);
    if (locationId && !uniqueLocations.has(locationId)) {
      uniqueLocations.set(locationId, location);
    }
  });

  await Promise.all(Array.from(uniqueLocations.values()).map((location) => ensureOrderCollectionReady(location)));
}

module.exports = {
  OrderSchema,
  LEGACY_ORDER_COLLECTION,
  getLocationOrderCollectionName,
  getLocationOrderModel,
  getLegacyOrderModel,
  ensureOrderCollectionReady,
  ensureOrderCollectionsReady
};
