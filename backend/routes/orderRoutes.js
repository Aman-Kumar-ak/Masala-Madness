const express = require("express");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");

const router = express.Router();

// Cache orders for 30 seconds5
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
// Confirm and create a new order or add to pending
router.post("/confirm", async (req, res) => {
  try {
    const { orderId, items, totalAmount, subtotal, discountAmount, discountPercentage, manualDiscount, paymentMethod, isPaid, customCashAmount, customOnlineAmount, confirmedBy } = req.body;
    const now = new Date();
    // If orderId is provided, update existing order (for confirming a pending order)
    let order;
    if (orderId) {
      order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      // Update fields
      order.items = items || order.items;
      order.subtotal = subtotal !== undefined ? subtotal : order.subtotal;
      order.totalAmount = totalAmount !== undefined ? totalAmount : order.totalAmount;
      order.discountAmount = discountAmount !== undefined ? discountAmount : order.discountAmount;
      order.discountPercentage = discountPercentage !== undefined ? discountPercentage : order.discountPercentage;
      order.manualDiscount = manualDiscount !== undefined ? manualDiscount : order.manualDiscount;
      order.paymentMethod = paymentMethod || order.paymentMethod;
      order.isPaid = isPaid !== undefined ? isPaid : order.isPaid;
      order.customCashAmount = customCashAmount !== undefined ? customCashAmount : order.customCashAmount;
      order.customOnlineAmount = customOnlineAmount !== undefined ? customOnlineAmount : order.customOnlineAmount;
      if (confirmedBy) order.confirmedBy = confirmedBy;
      order.updatedAt = now;
      await order.save();
    } else {
      // New order (pending or confirmed)
      // Get the latest order for today in UTC
      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setDate(todayUTC.getDate() + 1);
      const latestOrder = await Order.findOne({
        createdAt: { $gte: todayUTC, $lt: tomorrowUTC }
      })
      .select('orderNumber')
      .sort({ orderNumber: -1 })
      .lean();
      const orderNumber = latestOrder ? latestOrder.orderNumber + 1 : 1;
      const processedItems = (items || []).map(item => ({
        ...item,
        type: item.type || 'H',
        totalPrice: item.totalPrice || (item.price * item.quantity)
      }));
      order = new Order({
        orderId: uuidv4(),
        orderNumber,
        items: processedItems,
        subtotal: subtotal || totalAmount,
        totalAmount,
        discountAmount: discountAmount || 0,
        discountPercentage: discountPercentage || 0,
        manualDiscount: manualDiscount || 0,
        paymentMethod,
        isPaid: isPaid || false,
        customCashAmount: customCashAmount || 0,
        customOnlineAmount: customOnlineAmount || 0,
        createdAt: now,
        updatedAt: now,
        confirmedBy: confirmedBy || null,
      });
      await order.save();
    }
    // Clear relevant cache entries
    const todayKey = now.toISOString().split('T')[0];
    ordersCache.delete(todayKey);

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      console.log('Emitting order-update', order.orderId);
      io.emit('order-update', { type: 'order-updated', order });
    }

    return res.status(201).json({ 
      message: "Order saved successfully", 
      order
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
    const orders = await Order.find().sort({ updatedAt: -1 }).lean();
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
      .sort({ updatedAt: -1 })
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
      .sort({ updatedAt: -1 })
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
      { header: "Subtotal", key: "subtotal", width: 15 },
      { header: "Discount(%)", key: "discountPercentage", width: 12 },
      { header: "Discount Amount", key: "discountAmount", width: 15 },
      { header: "Final Amount", key: "totalAmount", width: 15 },
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
            second: '2-digit',
            timeZone: 'Asia/Kolkata'
          }),
          dishes: order.items.map(i => `${i.name} x${i.quantity}`).join(", "),
          types: order.items.map(i => i.type).join(", "),
          dishPrice: order.items.map(i => i.price).join(", "),
          totalDish: order.items.map(i => i.totalPrice).join(", "),
          subtotal: order.subtotal || order.totalAmount,
          discountPercentage: order.discountPercentage || 0,
          discountAmount: order.discountAmount || 0,
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

// @route   DELETE /api/orders/:orderId
// Delete a specific order by ID
router.delete("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Find the order to get its details before deletion
    const order = await Order.findOne({ orderId }).lean();
    
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    
    // Get the date of the order
    const orderDate = new Date(order.createdAt);
    const startOfDay = new Date(orderDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(orderDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Delete the order
    await Order.deleteOne({ orderId });
    
    // Get all remaining orders for that day to renumber them
    const remainingOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      orderNumber: { $gt: order.orderNumber }
    }).sort({ orderNumber: 1 });
    
    // Update order numbers for all subsequent orders
    const updatePromises = remainingOrders.map((remainingOrder, index) => {
      return Order.updateOne(
        { _id: remainingOrder._id },
        { $set: { orderNumber: order.orderNumber + index } }
      );
    });
    
    // Execute all updates
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    // Invalidate cache for the order's date
    const dateCacheKey = orderDate.toISOString().split('T')[0];
    ordersCache.delete(dateCacheKey);
    
    // Also invalidate revenue cache if exists
    const revenueCacheKey = `revenue_${dateCacheKey}`;
    ordersCache.delete(revenueCacheKey);
    
    // Emit socket event for live deletion
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', {
        type: 'order-deleted',
        orderId: order.orderId,
        orderNumber: order.orderNumber
      });
    }

    res.status(200).json({ 
      message: "Order deleted successfully",
      deletedOrder: {
        orderId: order.orderId,
        orderNumber: order.orderNumber
      },
      ordersResequenced: updatePromises.length
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: "Failed to delete order", error: error.message });
  }
});

// @route   POST /api/orders/:orderId/mark-kot
// Mark selected items as printed on a new KOT and increment kotSequence
router.post('/:orderId/mark-kot', async (req, res) => {
  try {
    const { itemIndexes } = req.body; // Array of item indexes to mark as printed
    if (!Array.isArray(itemIndexes) || itemIndexes.length === 0) {
      return res.status(400).json({ message: 'itemIndexes array required' });
    }
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const newKOT = (order.kotSequence || 0) + 1;
    itemIndexes.forEach(idx => {
      if (order.items[idx] && order.items[idx].kotNumber == null) {
        order.items[idx].kotNumber = newKOT;
      }
    });
    order.kotSequence = newKOT;
    await order.save();
    res.status(200).json({ message: 'KOT marked', kotNumber: newKOT, order });
  } catch (error) {
    console.error('Mark KOT error:', error);
    res.status(500).json({ message: 'Failed to mark KOT', error: error.message });
  }
});

module.exports = router;