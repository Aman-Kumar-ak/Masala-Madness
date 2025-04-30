const express = require("express");
const { v4: uuidv4 } = require("uuid");
const PendingOrder = require("../models/PendingOrder");
const Order = require("../models/Order");

const router = express.Router();

// @route   POST /api/pending-orders
// Create a new pending order
router.post("/", async (req, res) => {
  try {
    const { items, subtotal } = req.body;
    const newPendingOrder = new PendingOrder({
      orderId: uuidv4(),
      items,
      subtotal,
    });
    await newPendingOrder.save();
    res.status(201).json({ message: "Pending order created successfully", orderId: newPendingOrder.orderId });
  } catch (error) {
    console.error("Create pending order error:", error);
    res.status(500).json({ message: "Failed to create pending order", error: error.message });
  }
});

// @route   GET /api/pending-orders
// Get all pending orders
router.get("/", async (req, res) => {
  try {
    const pendingOrders = await PendingOrder.find().sort({ createdAt: 1 }).lean();
    res.status(200).json(pendingOrders);
  } catch (error) {
    console.error("Fetch pending orders error:", error);
    res.status(500).json({ message: "Failed to fetch pending orders", error: error.message });
  }
});

// @route   PUT /api/pending-orders/:id
// Update a pending order
router.put("/:id", async (req, res) => {
  try {
    const { items, subtotal } = req.body;
    const updatedOrder = await PendingOrder.findByIdAndUpdate(req.params.id, { items, subtotal, updatedAt: new Date() }, { new: true });
    res.status(200).json({ message: "Pending order updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("Update pending order error:", error);
    res.status(500).json({ message: "Failed to update pending order", error: error.message });
  }
});

// @route   POST /api/pending-orders/confirm/:id
// Confirm a pending order and move it to orders
router.post("/confirm/:id", async (req, res) => {
  try {
    const pendingOrder = await PendingOrder.findById(req.params.id);
    if (!pendingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    const { items, subtotal } = pendingOrder;
    const { paymentMethod, isPaid } = req.body;

    const newOrder = new Order({
      orderId: pendingOrder.orderId,
      orderNumber: await Order.countDocuments() + 1,
      items,
      subtotal,
      totalAmount: subtotal, // Assuming no discount for simplicity
      paymentMethod,
      isPaid,
      createdAt: pendingOrder.createdAt,
    });

    await newOrder.save();
    await PendingOrder.findByIdAndDelete(req.params.id);

    res.status(201).json({ message: "Order confirmed and moved to orders", orderId: newOrder.orderId });
  } catch (error) {
    console.error("Confirm pending order error:", error);
    res.status(500).json({ message: "Failed to confirm pending order", error: error.message });
  }
});

module.exports = router; 