const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");

const router = express.Router();

// @route   POST /api/orders/confirm
//Confirm and create a new order
router.post("/confirm", async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, isPaid } = req.body;

    // Get today's date in IST
    const today = new Date();
    const istOffset = 5.5 * 60 * 60000;
    const todayIST = new Date(today.getTime() + istOffset);
    todayIST.setHours(0, 0, 0, 0);

    // Get the latest order for today to generate a new order number
    const latestOrder = await Order.findOne({
      createdAt: { $gte: todayIST }
    }).sort({ orderNumber: -1 });

    const orderNumber = latestOrder ? latestOrder.orderNumber + 1 : 1;

    // Ensure each item has the required fields
    const processedItems = items.map(item => ({
      ...item,
      type: item.type || 'H', // Default to 'H' if not provided
      totalPrice: item.totalPrice || (item.price * item.quantity) // Calculate if not provided
    }));

    const newOrder = new Order({
      orderId: uuidv4(),
      orderNumber,
      items: processedItems,
      totalAmount,
      paymentMethod,
      isPaid,
    });

    await newOrder.save();
    res.status(201).json({ message: "Order saved successfully", orderId: newOrder.orderId });
  } catch (error) {
    console.error('Order save error:', error);
    res.status(500).json({ message: "Failed to save order", error: error.message });
  }
});

// @route   GET /api/orders
//Get all orders sorted by createdAt in ascending order
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: 1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
});

// @route   GET /api/orders/today
//Get all orders for today
router.get("/today", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const orders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
    }).sort({ createdAt: 1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch today\'s orders error:', error);
    res.status(500).json({ message: "Failed to fetch today's orders", error: error.message });
  }
});

// @route   GET /api/orders/date/:date
//Get orders for a specific date (YYYY-MM-DD)
router.get("/date/:date", async (req, res) => {
  try {
    const dateStr = req.params.date; // Expected format: 'YYYY-MM-DD'

    // Start of the selected date in UTC
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ createdAt: 1 });

    res.status(200).json(orders);
  } catch (error) {
    console.error("Fetch orders by date error:", error);
    res.status(500).json({
      message: "Failed to fetch orders for the given date",
      error: error.message,
    });
  }
});


// @route   DELETE /api/orders/cleanup
//Delete orders older than a specific date (e.g., 30 days)
router.delete("/cleanup", async (req, res) => {
  try {
    const dateToDeleteBefore = new Date();
    dateToDeleteBefore.setDate(dateToDeleteBefore.getDate() - 30);  

    const result = await Order.deleteMany({
      createdAt: { $lt: dateToDeleteBefore },
    });

    res.status(200).json({ message: `${result.deletedCount} orders deleted.` });
  } catch (error) {
    console.error('Cleanup orders error:', error);
    res.status(500).json({ message: "Failed to clean up orders", error: error.message });
  }
});

module.exports = router;