const express = require("express");
const { v4: uuidv4 } = require("uuid");
const PendingOrder = require("../models/PendingOrder");
const Order = require("../models/Order");

const router = express.Router();

// @route   POST /api/pending-orders
// Create a new pending order
router.post("/", async (req, res) => {
  try {
    const { items, subtotal, discountAmount, discountPercentage, totalAmount, customCashAmount, customOnlineAmount } = req.body;
    const newPendingOrder = new PendingOrder({
      orderId: uuidv4(),
      items,
      subtotal,
      discountAmount: discountAmount || 0,
      discountPercentage: discountPercentage || 0,
      totalAmount: totalAmount || subtotal,
      customCashAmount: customCashAmount || 0,
      customOnlineAmount: customOnlineAmount || 0
    });
    await newPendingOrder.save();
    
    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'new-pending-order', order: newPendingOrder });
    }
    
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
    const discountAmount = req.body.discountAmount || 0;
    const discountPercentage = req.body.discountPercentage || 0;
    const specifiedTotalAmount = req.body.totalAmount;

    // Find existing order
    const existingOrder = await PendingOrder.findOne({ orderId: req.params.orderId });
    if (!existingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    // Merge items: combine existing items with incoming items (simply concatenate here)
    const mergedItems = [...existingOrder.items, ...incomingItems];

    // Recalculate subtotal
    const newSubtotal = mergedItems.reduce((total, item) => total + item.totalPrice, 0);
    
    // Calculate total amount
    const totalAmount = specifiedTotalAmount || (newSubtotal - discountAmount);

    existingOrder.items = mergedItems;
    existingOrder.subtotal = newSubtotal;
    existingOrder.discountAmount = discountAmount;
    existingOrder.discountPercentage = discountPercentage;
    existingOrder.totalAmount = totalAmount;
    existingOrder.updatedAt = new Date();

    const savedOrder = await existingOrder.save();
    
    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'updated-pending-order', order: savedOrder });
    }

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
    const { paymentMethod, isPaid, discountAmount, discountPercentage, totalAmount, customCashAmount, customOnlineAmount } = req.body;

    // Use provided discount values or fallback to the ones in the pending order
    const finalDiscountAmount = discountAmount !== undefined ? discountAmount : (pendingOrder.discountAmount || 0);
    const finalDiscountPercentage = discountPercentage !== undefined ? discountPercentage : (pendingOrder.discountPercentage || 0);
    // Calculate final total amount, using the provided value, or calculate it from subtotal and discount
    const finalTotalAmount = totalAmount !== undefined ? totalAmount : (pendingOrder.totalAmount || subtotal - finalDiscountAmount);

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
      discountAmount: finalDiscountAmount,
      discountPercentage: finalDiscountPercentage,
      totalAmount: finalTotalAmount,
      paymentMethod,
      isPaid,
      customCashAmount: customCashAmount || 0,
      customOnlineAmount: customOnlineAmount || 0,
      createdAt: pendingOrder.createdAt,
      updatedAt: new Date() // set updatedAt explicitly to current date/time
    });

    await newOrder.save({ session });
    console.log(`Confirming order: ${req.params.id}. Pending order ID from object: ${pendingOrder.orderId}`);
    console.log(`Attempting to delete pending order with _id: ${pendingOrder._id}`);
    const deleteResult = await PendingOrder.findOneAndDelete({ orderId: req.params.id }).session(session);
    if (deleteResult) {
      console.log("Pending order deleted successfully:", deleteResult.orderId);
    } else {
      console.log("Pending order not found for deletion or already deleted.");
    }

    await session.commitTransaction();
    session.endSession();
    
    // Emit events for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { 
        type: 'order-confirmed', 
        pendingOrderId: req.params.id,
        newOrder: newOrder
      });
    }

    res.status(201).json({ message: "Order confirmed", orderId: newOrder.orderId });
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
    
    // Update discount-related fields if a discount percentage is set
    if (pendingOrder.discountPercentage > 0) {
      // Check if order still qualifies for discount (could have a minimum subtotal requirement)
      // For now we'll just recalculate based on existing percentage
      pendingOrder.discountAmount = Math.round((pendingOrder.subtotal * pendingOrder.discountPercentage) / 100);
      pendingOrder.totalAmount = pendingOrder.subtotal - pendingOrder.discountAmount;
    } else {
      pendingOrder.totalAmount = pendingOrder.subtotal;
    }
    
    pendingOrder.updatedAt = new Date();

    await pendingOrder.save();
    
    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'pending-order-quantity-changed', order: pendingOrder });
    }

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
      
      // Emit event for real-time updates
      const io = req.app.get('io');
      if (io) {
        io.emit('order-update', { type: 'pending-order-deleted', orderId });
      }
      
      return res.status(200).json({ message: "Last item removed, entire order deleted", order: null });
    }

    pendingOrder.items.splice(idx, 1);

    // Recalculate subtotal
    pendingOrder.subtotal = pendingOrder.items.reduce((total, item) => total + item.totalPrice, 0);
    
    // Update discount-related fields if a discount percentage is set
    if (pendingOrder.discountPercentage > 0) {
      pendingOrder.discountAmount = Math.round((pendingOrder.subtotal * pendingOrder.discountPercentage) / 100);
      pendingOrder.totalAmount = pendingOrder.subtotal - pendingOrder.discountAmount;
    } else {
      pendingOrder.totalAmount = pendingOrder.subtotal;
    }
    
    pendingOrder.updatedAt = new Date();

    await pendingOrder.save();
    
    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'pending-order-item-removed', order: pendingOrder });
    }

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
    
    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'pending-order-deleted', orderId });
    }
    
    res.status(200).json({ message: "Pending order deleted" });
  } catch (error) {
    console.error("Delete pending order error:", error);
    res.status(500).json({ message: "Failed to delete pending order", error: error.message });
  }
});

// @route   PATCH /api/pending-orders/:orderId/manual-discount
// Set manual discount for a pending order
router.patch("/:orderId/manual-discount", async (req, res) => {
  try {
    const { manualDiscount } = req.body;

    const pendingOrder = await PendingOrder.findOne({ orderId: req.params.orderId });

    if (!pendingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    // Update manual discount
    pendingOrder.manualDiscount = manualDiscount;
    pendingOrder.updatedAt = new Date();

    // Recalculate total discount and total amount
    let percentageDiscountAmount = 0;
    // Assuming active discount logic is handled on frontend or fetched separately if needed
    // For simplicity, this backend route will just recalculate based on saved percentageDiscount from frontend
    if (pendingOrder.discountPercentage > 0) {
      percentageDiscountAmount = Math.round((pendingOrder.subtotal * pendingOrder.discountPercentage) / 100);
    }
    
    pendingOrder.discountAmount = percentageDiscountAmount + manualDiscount;
    pendingOrder.totalAmount = pendingOrder.subtotal - pendingOrder.discountAmount;

    const updatedOrder = await pendingOrder.save();
    
    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'updated-pending-order', order: updatedOrder });
    }

    res.status(200).json({ message: "Manual discount updated successfully", order: updatedOrder });
  } catch (error) {
    console.error("Error updating manual discount:", error);
    res.status(500).json({ message: "Failed to update manual discount", error: error.message });
  }
});

// @route   POST /api/pending-orders/:orderId/append-items
// Append new items to a pending order, deduplicating by name, type, and price
router.post("/:orderId/append-items", async (req, res) => {
  try {
    const { items: newItems = [] } = req.body;
    if (!Array.isArray(newItems) || newItems.length === 0) {
      return res.status(400).json({ message: "No items to append" });
    }

    const pendingOrder = await PendingOrder.findOne({ orderId: req.params.orderId });
    if (!pendingOrder) {
      return res.status(404).json({ message: "Pending order not found" });
    }

    // Merge items: keep all existing, append only new unique ones (by name, type, price)
    const existingItems = pendingOrder.items;
    const mergedItems = [...existingItems];
    newItems.forEach(newItem => {
      const exists = existingItems.some(item =>
        item.name === newItem.name &&
        item.type === newItem.type &&
        item.price === newItem.price
      );
      if (!exists) {
        mergedItems.push(newItem);
      }
    });

    // Recalculate subtotal
    const newSubtotal = mergedItems.reduce((total, item) => total + item.totalPrice, 0);
    // Recalculate discount and total
    let discountAmount = pendingOrder.discountAmount || 0;
    let discountPercentage = pendingOrder.discountPercentage || 0;
    if (discountPercentage > 0) {
      discountAmount = Math.round((newSubtotal * discountPercentage) / 100);
    }
    const totalAmount = newSubtotal - discountAmount;

    pendingOrder.items = mergedItems;
    pendingOrder.subtotal = newSubtotal;
    pendingOrder.discountAmount = discountAmount;
    pendingOrder.totalAmount = totalAmount;
    pendingOrder.updatedAt = new Date();

    const savedOrder = await pendingOrder.save();

    // Emit event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'pending-order-items-appended', order: savedOrder });
    }

    res.status(200).json({ message: "Items appended successfully", order: savedOrder });
  } catch (error) {
    console.error("Append items error:", error);
    res.status(500).json({ message: "Failed to append items", error: error.message });
  }
});

module.exports = router;