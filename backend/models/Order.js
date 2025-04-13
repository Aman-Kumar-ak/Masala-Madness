const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
  },
  items: [
    {
      dishId: { type: String, required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  isPaid: { type: Boolean, required: true },
  createdAt: {
    type: Date,
    default: () => {
      const istOffset = 5.5 * 60 * 60000;
      return new Date(Date.now() + istOffset);
    },
  },
});

const Order = mongoose.model("Order", OrderSchema); // ✅ Mongoose model
module.exports = Order; // ✅ Export the model only
