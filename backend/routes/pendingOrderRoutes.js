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

// @route   PUT /api/pending-orders/:orderId
// Update a pending order
router.put("/:orderId", async (req, res) => {
  try {
    const incomingItems = req.body.items || [];
    const incomingSubtotal = req.body.subtotal || 0;

    // Find existing order
    const existingOrder = await PendingOrder.findOne({ orderId: req.params.orderId });
    if (!existingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    // Merge items: combine existing items with incoming items (simply concatenate here)
    const mergedItems = [...existingOrder.items, ...incomingItems];

    // Recalculate subtotal
    const newSubtotal = mergedItems.reduce((total, item) => total + item.totalPrice, 0);

    existingOrder.items = mergedItems;
    existingOrder.subtotal = newSubtotal;
    existingOrder.updatedAt = new Date();

    const savedOrder = await existingOrder.save();

    res.status(200).json({ message: "Pending order updated successfully", order: savedOrder });
  } catch (error) {
    console.error("Update pending order error:", error);
    res.status(500).json({ message: "Failed to update pending order", error: error.message });
  }
});

// @route   POST /api/pending-orders/confirm/:id
// Confirm a pending order and move it to orders
router.post("/confirm/:id", async (req, res) => {
  try {
    const pendingOrder = await PendingOrder.findOne({ orderId: req.params.id });
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
    await PendingOrder.findOneAndDelete({ orderId: req.params.id });

    res.status(201).json({ message: "Order confirmed and moved to orders", orderId: newOrder.orderId });
  } catch (error) {
    console.error("Confirm pending order error:", error);
    res.status(500).json({ message: "Failed to confirm pending order", error: error.message });
  }
});

module.exports = router; 