const express = require("express");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");

const router = express.Router();

// @route   POST /api/orders/confirm
//Confirm and create a new order
router.post("/confirm", async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, isPaid } = req.body;

    // Get current time in UTC
    const now = new Date();

    // Get the latest order for today in UTC
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setDate(todayUTC.getDate() + 1);

    const latestOrder = await Order.findOne({
      createdAt: { $gte: todayUTC, $lt: tomorrowUTC }
    }).sort({ orderNumber: -1 });

    // Get the latest order from yesterday in UTC
    const yesterdayUTC = new Date(todayUTC);
    yesterdayUTC.setDate(todayUTC.getDate() - 1);
    const lastOrderOfYesterday = await Order.findOne({
      createdAt: { $lt: todayUTC, $gte: yesterdayUTC }
    }).sort({ orderNumber: -1 });

    // Generate new order number
    let orderNumber;
    if (!latestOrder) {
      orderNumber = lastOrderOfYesterday ? 1 : 1;
    } else {
      orderNumber = latestOrder.orderNumber + 1;
    }

    const processedItems = items.map(item => ({
      ...item,
      type: item.type || 'H',
      totalPrice: item.totalPrice || (item.price * item.quantity)
    }));

    const newOrder = new Order({
      orderId: uuidv4(),
      orderNumber,
      items: processedItems,
      totalAmount,
      paymentMethod,
      isPaid,
      createdAt: now // Store the current time in UTC
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
// routes/orderRoutes.js
// @route   GET /api/orders/today-revenue
// Get today's revenue based on paid orders
router.get('/today-revenue', async (req, res) => {
  try {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setDate(todayUTC.getDate() + 1);

    // Fetch today's orders that are paid
    const todayOrders = await Order.find({
      createdAt: { $gte: todayUTC, $lt: tomorrowUTC },
      isPaid: true // Only include paid orders
    });

    // Calculate total revenue from paid orders
    const totalRevenue = todayOrders.reduce((sum, order) => sum + order.totalAmount, 0);

    res.json({ totalRevenue });
  } catch (error) {
    console.error('Error fetching today\'s revenue:', error);
    res.status(500).json({ message: 'Error fetching today\'s revenue' });
  }
});

module.exports = router;

// @route   GET /api/orders/excel/:date
// Download Excel of orders for a specific date (YYYY-MM-DD)
router.get("/excel/:date", async (req, res) => {
  try {
    const dateStr = req.params.date; // Expected format: 'YYYY-MM-DD'
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);

    // Fetch all orders for the specified date (both paid and unpaid)
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ createdAt: 1 });

    // Prepare Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Define columns
    worksheet.columns = [
      { header: "OrderNumber", key: "orderNumber", width: 12 },
      { header: "Date", key: "date", width: 12 },
      { header: "Time", key: "time", width: 10 },
      { header: "Dishes", key: "dishes", width: 30 },
      { header: "Type(H/F)", key: "types", width: 10 },
      { header: "Dishes Price", key: "dishPrice", width: 15 },
      { header: "Total Dish(each Price)", key: "totalDish", width: 20 },
      { header: "Total Order Amount", key: "totalAmount", width: 18 },
      { header: "Mode of Payment", key: "paymentMethod", width: 15 },
      { header: "Successful/Failed", key: "status", width: 15 },
    ];

    let totalOfDay = 0; // Initialize total amount for paid orders
    orders.forEach(order => {
      const dateObj = new Date(order.createdAt);
      const date = dateObj.toISOString().slice(0, 10);
      const time = dateObj.toTimeString().slice(0, 8);
      const dishes = order.items.map(i => i.name + ' x' + i.quantity).join(", ");
      const types = order.items.map(i => i.type).join(", ");
      const dishPrice = order.items.map(i => i.price).join(", ");
      const totalDish = order.items.map(i => i.totalPrice).join(", ");
      
      // Only sum amounts from paid orders for total calculation
      if (order.isPaid) {
        totalOfDay += order.totalAmount;
      }

      worksheet.addRow({
        orderNumber: order.orderNumber,
        date,
        time,
        dishes,
        types,
        dishPrice,
        totalDish,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        status: order.isPaid ? "Successful" : "Failed"
      });
    });

    // Add summary row for total amount
    worksheet.addRow({}); // Empty row
    worksheet.addRow({
      orderNumber: "",
      date: "",
      time: "",
      dishes: "",
      types: "",
      dishPrice: "",
      totalDish: "",
      totalAmount: `Total: ${totalOfDay}`, // Total of paid orders
      paymentMethod: "",
      status: ""
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orders_${dateStr}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Failed to generate Excel", error: error.message });
  }
});

module.exports = router;