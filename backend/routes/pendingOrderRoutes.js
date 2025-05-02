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
    const pendingOrders = await PendingOrder.find().sort({ createdAt: -1 }).lean();
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
  const session = await PendingOrder.startSession();
  session.startTransaction();
  try {
    const pendingOrder = await PendingOrder.findOne({ orderId: req.params.id }).session(session);
    if (!pendingOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Pending order not found" });
    }

    const { items, subtotal } = pendingOrder;
    const { paymentMethod, isPaid } = req.body;

    const startOfDay = new Date(pendingOrder.createdAt);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(pendingOrder.createdAt);
    endOfDay.setUTCHours(23, 59, 59, 999);
    
    const dailyOrderCount = await Order.countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).session(session);
    
    const newOrder = new Order({
      orderId: pendingOrder.orderId,
      orderNumber: dailyOrderCount + 1,
      items,
      subtotal,
      totalAmount: subtotal, // Assuming no discount for simplicity
      paymentMethod,
      isPaid,
      createdAt: pendingOrder.createdAt,
      updatedAt: new Date() // set updatedAt explicitly to current date/time
    });

    await newOrder.save({ session });
    await PendingOrder.findOneAndDelete({ orderId: req.params.id }).session(session);

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({ message: "Order confirmed and moved to orders", orderId: newOrder.orderId });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Confirm pending order error:", error);
    res.status(500).json({ message: "Failed to confirm pending order", error: error.message });
  }
});


// @route   PATCH /api/pending-orders/:orderId/item-quantity
// Update quantity of a specific item in a pending order
router.patch("/:orderId/item-quantity", async (req, res) => {
  try {
    const { itemIndex, delta } = req.body;
    if (typeof itemIndex !== "number" || typeof delta !== "number") {
      return res.status(400).json({ message: "Invalid request body" });
    }

    const pendingOrder = await PendingOrder.findOne({ orderId: req.params.orderId });
    if (!pendingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    if (itemIndex < 0 || itemIndex >= pendingOrder.items.length) {
      return res.status(400).json({ message: "Invalid item index" });
    }

    const item = pendingOrder.items[itemIndex];
    const newQuantity = item.quantity + delta;
    if (newQuantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    item.quantity = newQuantity;
    item.totalPrice = item.price * item.quantity;

    // Recalculate subtotal
    pendingOrder.subtotal = pendingOrder.items.reduce((total, i) => total + i.totalPrice, 0);
    pendingOrder.updatedAt = new Date();

    await pendingOrder.save();

    res.status(200).json({ message: "Item quantity updated", order: pendingOrder });
  } catch (error) {
    console.error("Update item quantity error:", error);
    res.status(500).json({ message: "Failed to update item quantity", error: error.message });
  }
});


// @route   DELETE /api/pending-orders/:orderId/item/:itemIndex
// Remove a specific item from a pending order
router.delete("/:orderId/item/:itemIndex", async (req, res) => {
  try {
    const { orderId, itemIndex } = req.params;
    const idx = parseInt(itemIndex, 10);
    if (isNaN(idx)) {
      return res.status(400).json({ message: "Invalid item index" });
    }

    const pendingOrder = await PendingOrder.findOne({ orderId });
    if (!pendingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    if (idx < 0 || idx >= pendingOrder.items.length) {
      return res.status(400).json({ message: "Item index out of bounds" });
    }

    // If only one item, delete the entire order
    if (pendingOrder.items.length === 1) {
      await PendingOrder.deleteOne({ orderId });
      return res.status(200).json({ message: "Last item removed, entire order deleted", order: null });
    }

    pendingOrder.items.splice(idx, 1);

    // Recalculate subtotal
    pendingOrder.subtotal = pendingOrder.items.reduce((total, item) => total + item.totalPrice, 0);
    pendingOrder.updatedAt = new Date();

    await pendingOrder.save();

    res.status(200).json({ message: "Item removed", order: pendingOrder });
  } catch (error) {
    console.error("Remove item error:", error);
    res.status(500).json({ message: "Failed to remove item", error: error.message });
  }
});

// @route DELETE /api/pending-orders/:orderId
// Delete full pending order
router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const deleted = await PendingOrder.deleteOne({ orderId });
    if (deleted.deletedCount === 0) {
      return res.status(404).json({ message: "Pending order not found" });
    }
    res.status(200).json({ message: "Pending order deleted" });
  } catch (error) {
    console.error("Delete pending order error:", error);
    res.status(500).json({ message: "Failed to delete pending order", error: error.message });
  }
});

module.exports = router;