const mongoose = require("mongoose");

const PendingOrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [
    {
      name: { type: String, required: true },
      type: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
    },
  ],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  totalAmount: { type: Number, default: function() { return this.subtotal - (this.discountAmount || 0); } },
  customCashAmount: { type: Number, default: 0 },
  customOnlineAmount: { type: Number, default: 0 },
  status: { type: String, default: "pending" },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const PendingOrder = mongoose.model("PendingOrder", PendingOrderSchema);
module.exports = PendingOrder; 