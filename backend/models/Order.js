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
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true }, // Cash or Online
  isPaid: { type: Boolean, required: true },
  createdAt: {
    type: Date,
    default: () => {
      const istOffset = 5.5 * 60 * 60000;
      return new Date(Date.now() + istOffset);
    },
  },
});

const Order = mongoose.model("Order", OrderSchema);
module.exports = Order;
