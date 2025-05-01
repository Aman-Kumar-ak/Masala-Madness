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