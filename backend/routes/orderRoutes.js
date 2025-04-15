const express = require("express");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");

const router = express.Router();

// @route   POST /api/orders/confirm
//Confirm and create a new order
router.post("/confirm", async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, isPaid } = req.body;

    // Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60000; // IST is UTC+5:30
    const todayIST = new Date(now.getTime() + istOffset);
    todayIST.setHours(0, 0, 0, 0);
    todayIST.setHours(todayIST.getHours() - 5.5); // Adjust back to UTC for MongoDB

    // Get the latest order for today in UTC
    const latestOrder = await Order.findOne({
      createdAt: { $gte: new Date() } // This will be in UTC
    }).sort({ orderNumber: -1 });

    // Get the latest order from yesterday
    const yesterdayIST = new Date(todayIST);
    yesterdayIST.setDate(yesterdayIST.getDate() - 1);
    const lastOrderOfYesterday = await Order.findOne({
      createdAt: { $lt: todayIST, $gte: yesterdayIST }
    }).sort({ orderNumber: -1 });

    // Generate new order number
    let orderNumber;
    if (!latestOrder) {
      // If no orders today, check if there were orders yesterday
      if (lastOrderOfYesterday) {
        // If there were orders yesterday, reset to 1
        orderNumber = 1;
      } else {
        // If no orders at all, start with 1
        orderNumber = 1;
      }
    } else {
      // If there are orders today, increment from the latest
      orderNumber = latestOrder.orderNumber + 1;
    }

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

// Get today's total revenue
router.get('/today-revenue', async (req, res) => {
  try {
    // Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60000; // IST is UTC+5:30
    const todayIST = new Date(now.getTime() + istOffset);
    todayIST.setHours(0, 0, 0, 0);
    todayIST.setHours(todayIST.getHours() - 5.5); // Adjust back to UTC for MongoDB

    const tomorrowIST = new Date(todayIST);
    tomorrowIST.setDate(tomorrowIST.getDate() + 1);

    const todayOrders = await Order.find({
      createdAt: { $gte: todayIST, $lt: tomorrowIST }
    });

    const totalRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({ totalRevenue });
  } catch (error) {
    console.error('Error fetching today\'s revenue:', error);
    res.status(500).json({ message: 'Error fetching today\'s revenue' });
  }
});

module.exports = router;