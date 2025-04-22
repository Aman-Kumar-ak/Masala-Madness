const express = require("express");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");

const router = express.Router();

// Cache orders for 30 seconds
const ordersCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds

const clearCacheEntry = (key) => {
  setTimeout(() => ordersCache.delete(key), CACHE_DURATION);
};

// Helper function to get date range
const getDateRange = (dateStr) => {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
  return { startOfDay, endOfDay };
};

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

    // Get latest order number efficiently using index
    const latestOrder = await Order.findOne({
      createdAt: { $gte: todayUTC, $lt: tomorrowUTC }
    })
    .select('orderNumber')
    .sort({ orderNumber: -1 })
    .lean();

    const orderNumber = latestOrder ? latestOrder.orderNumber + 1 : 1;

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

    // Clear relevant cache entries
    const todayKey = todayUTC.toISOString().split('T')[0];
    ordersCache.delete(todayKey);

    res.status(201).json({ 
      message: "Order saved successfully", 
      orderId: newOrder.orderId,
      orderNumber
    });
  } catch (error) {
    console.error('Order save error:', error);
    res.status(500).json({ message: "Failed to save order", error: error.message });
  }
});

// @route   GET /api/orders
//Get all orders sorted by createdAt in ascending order
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: 1 }).lean();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
});

// @route   GET /api/orders/today
//Get all orders for today with stats
router.get("/today", async (req, res) => {
  try {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setDate(todayUTC.getDate() + 1);
    
    const cacheKey = todayUTC.toISOString().split('T')[0];
    
    if (ordersCache.has(cacheKey)) {
      return res.status(200).json(ordersCache.get(cacheKey));
    }

    const [stats, orders] = await Promise.all([
      Order.calculateStats(todayUTC, tomorrowUTC),
      Order.find({
        createdAt: { $gte: todayUTC, $lt: tomorrowUTC }
      })
      .select('-__v')
      .sort({ createdAt: 1 })
      .lean()
    ]);

    const result = { stats, orders };
    ordersCache.set(cacheKey, result);
    clearCacheEntry(cacheKey);

    res.status(200).json(result);
  } catch (error) {
    console.error('Fetch today\'s orders error:', error);
    res.status(500).json({ message: "Failed to fetch today's orders", error: error.message });
  }
});

// @route   GET /api/orders/date/:date
//Get orders for a specific date (YYYY-MM-DD) with stats
router.get("/date/:date", async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDateRange(req.params.date);
    const cacheKey = req.params.date;

    if (ordersCache.has(cacheKey)) {
      return res.status(200).json(ordersCache.get(cacheKey));
    }

    const [stats, orders] = await Promise.all([
      Order.calculateStats(startOfDay, endOfDay),
      Order.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
      .select('-__v')
      .sort({ createdAt: 1 })
      .lean()
    ]);

    const result = { stats, orders };
    ordersCache.set(cacheKey, result);
    clearCacheEntry(cacheKey);

    res.status(200).json(result);
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

    // Clear all cache after cleanup
    ordersCache.clear();

    res.status(200).json({ 
      message: `${result.deletedCount} orders deleted.`,
      deletedBefore: dateToDeleteBefore
    });
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

    const cacheKey = `revenue_${todayUTC.toISOString().split('T')[0]}`;
    
    if (ordersCache.has(cacheKey)) {
      return res.json(ordersCache.get(cacheKey));
    }

    const stats = await Order.calculateStats(todayUTC, tomorrowUTC);
    ordersCache.set(cacheKey, stats);
    clearCacheEntry(cacheKey);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching today\'s stats:', error);
    res.status(500).json({ message: 'Error fetching today\'s stats' });
  }
});

// @route   GET /api/orders/excel/:date
// Download Excel of orders for a specific date (YYYY-MM-DD)
router.get("/excel/:date", async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDateRange(req.params.date);

    const [ordersStats, orders] = await Promise.all([
      Order.calculateStats(startOfDay, endOfDay),
      Order.find({
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
      .sort({ createdAt: 1 })
      .lean()
    ]);

    // Ensure stats have default values if undefined
    const stats = {
      totalOrders: ordersStats?.totalOrders || 0,
      totalPaidOrders: ordersStats?.totalPaidOrders || 0,
      totalRevenue: ordersStats?.totalRevenue || 0,
      avgOrderValue: ordersStats?.avgOrderValue || 0
    };

    // Prepare Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Orders");

    // Define columns
    worksheet.columns = [
      { header: "OrderNumber", key: "orderNumber", width: 12 },
      { header: "Date", key: "date", width: 12 },
      { header: "Time (IST)", key: "time", width: 15 },
      { header: "Dishes", key: "dishes", width: 30 },
      { header: "Type(H/F)", key: "types", width: 10 },
      { header: "Dishes Price", key: "dishPrice", width: 15 },
      { header: "Total Dish(each Price)", key: "totalDish", width: 20 },
      { header: "Total Order Amount", key: "totalAmount", width: 18 },
      { header: "Mode of Payment", key: "paymentMethod", width: 15 },
      { header: "Status", key: "status", width: 15 },
    ];

    // Process orders in batches for better memory usage
    const BATCH_SIZE = 100;
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);
      
      batch.forEach(order => {
        const dateObj = new Date(order.createdAt);
        worksheet.addRow({
          orderNumber: order.orderNumber,
          date: dateObj.toLocaleDateString('en-IN'),
          time: dateObj.toLocaleTimeString('en-IN', { 
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
          }),
          dishes: order.items.map(i => `${i.name} x${i.quantity}`).join(", "),
          types: order.items.map(i => i.type).join(", "),
          dishPrice: order.items.map(i => i.price).join(", "),
          totalDish: order.items.map(i => i.totalPrice).join(", "),
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          status: order.isPaid ? "Successful" : "Failed"
        });
      });
    }

    // Add summary section with proper null checks
    worksheet.addRow({});
    worksheet.addRow({
      orderNumber: "Summary Statistics"
    });
    
    worksheet.addRow({
      orderNumber: "Total Orders",
      totalAmount: stats.totalOrders
    });
    worksheet.addRow({
      orderNumber: "Paid Orders",
      totalAmount: stats.totalPaidOrders
    });
    worksheet.addRow({
      orderNumber: "Total Revenue",
      totalAmount: stats.totalRevenue
    });
    worksheet.addRow({
      orderNumber: "Avg. Order Value",
      totalAmount: Math.round(stats.avgOrderValue || 0)
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=orders_${req.params.date}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Excel export error:", error);
    res.status(500).json({ message: "Failed to generate Excel", error: error.message });
  }
});

module.exports = router;