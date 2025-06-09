const mongoose = require("mongoose");

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
  items: [
    {
      name: { type: String, required: true },
      type: { type: String, required: true }, // H or F
      price: { type: Number, required: true }, // Original price per unit
      quantity: { type: Number, required: true },
      totalPrice: { type: Number, required: true }, // price * quantity
    },
  ],
  subtotal: { type: Number, required: true }, // Original amount before discount
  discountAmount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true }, // Final amount after discount
  paymentMethod: { type: String, required: true }, // Cash or Online
  isPaid: { type: Boolean, required: true },
  customCashAmount: { type: Number, default: 0 },
  customOnlineAmount: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
  updatedAt: {
    type: Date,
    default: () => new Date(),
  },
});

// Add compound indexes for better query performance
OrderSchema.index({ createdAt: 1, isPaid: 1 });
OrderSchema.index({ orderNumber: 1, createdAt: 1 });
OrderSchema.index({ isPaid: 1, totalAmount: 1 });

// Helper function to delay execution
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Optimized static methods for revenue calculations with retries
OrderSchema.statics.calculateStats = async function (startDate, endDate, retryCount = 3) {
  const cacheKey = `stats_${startDate.toISOString()}_${endDate.toISOString()}`;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const stats = await this.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lt: endDate }
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

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
