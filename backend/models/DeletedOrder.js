const mongoose = require("mongoose");

const DeletedOrderSchema = new mongoose.Schema({
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
      type: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      totalPrice: { type: Number, required: true },
      kotNumber: { type: Number, default: null },
    },
  ],
  subtotal: { type: Number, required: true },
  discountAmount: { type: Number, default: 0 },
  discountPercentage: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, required: true },
  isPaid: { type: Boolean, required: true },
  customCashAmount: { type: Number, default: 0 },
  customOnlineAmount: { type: Number, default: 0 },
  kotSequence: { type: Number, default: 0 },
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
});

const DeletedOrder = mongoose.model("DeletedOrder", DeletedOrderSchema);
module.exports = DeletedOrder; 