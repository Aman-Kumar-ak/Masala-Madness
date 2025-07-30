
const express = require("express");
const ExcelJS = require("exceljs");
const { v4: uuidv4 } = require("uuid");
const Order = require("../models/Order");
const DeletedOrder = require("../models/DeletedOrder");
const { adminAuth } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const SIGNED_URL_SECRET = process.env.SIGNED_URL_SECRET || 'supersecretkey';

// @route   DELETE /api/orders/all
// Delete all orders and all sales calendar data
router.delete('/all', require('../middleware/authMiddleware').authenticateToken, async (req, res) => {
  try {
    // Only allow admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admin can delete all data.' });
    }
    const Order = require('../models/Order');
    const DeletedOrder = require('../models/DeletedOrder');
    const SalesCalendar = require('../models/SalesCalendar');
    await Order.deleteMany({});
    await DeletedOrder.deleteMany({});
    await SalesCalendar.deleteMany({});
    res.status(200).json({ message: 'All sales and orders data deleted.' });
  } catch (err) {
    console.error('Delete all sales/orders error:', err);
    res.status(500).json({ message: 'Failed to delete all sales and orders.' });
  }
});

const router = express.Router();

// ...existing code...
// @route   GET /api/orders/sales-summary/dates
// Get all available sales dates (YYYY-MM-DD)
router.get('/sales-summary/dates', async (req, res) => {
  try {
    const orders = await Order.find({ deleted: { $ne: true } }).select('createdAt').lean();
    const datesSet = new Set();
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().slice(0, 10);
      datesSet.add(date);
    });
    // Sort dates descending (most recent first)
    const dates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    res.json(dates);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales dates.' });
  }
});

// @route   GET /api/orders/sales-summary
// Get sales summary for a specific date (YYYY-MM-DD), only PAID orders
router.get('/sales-summary', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query param required.' });
    }
    const { startOfDay, endOfDay } = getDateRange(date);
    // Only include paid orders
    const orders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      deleted: { $ne: true },
      isPaid: true
    }).lean();
    let totalAmount = 0;
    let totalOrders = 0;
    const items = {};
    orders.forEach(order => {
      totalAmount += order.totalAmount || 0;
      totalOrders += 1;
      (order.items || []).forEach(item => {
        if (!items[item.name]) {
          items[item.name] = { name: item.name, quantity: 0, total: 0 };
        }
        items[item.name].quantity += item.quantity || 0;
        items[item.name].total += (item.quantity || 0) * (item.price || 0);
      });
    });
    const topItems = Object.values(items).sort((a, b) => b.quantity - a.quantity).slice(0, 5);
    res.json({ date, totalAmount, totalOrders, topItems });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales summary for date.' });
  }
});

// @route   GET /api/orders/monthly-summary
// Get monthly sales summary from SalesCalendar collection
router.get('/monthly-summary', async (req, res) => {
  try {
    const SalesCalendar = require('../models/SalesCalendar');
    const months = await SalesCalendar.find({}).lean();
    const result = months.map(monthDoc => {
      let totalAmount = 0;
      let totalOrders = 0;
      if (monthDoc.days) {
        for (const day of Object.values(monthDoc.days)) {
          totalAmount += day.totalAmount || 0;
          totalOrders += day.paidOrderCount || 0;
        }
      }
      return {
        month: monthDoc.month,
        totalAmount,
        totalOrders
      };
    });
    // Sort with latest/ongoing month on top
    result.sort((a, b) => b.month.localeCompare(a.month));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly summary.' });
  }
});

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
    const { orderId, items, totalAmount, subtotal, discountAmount, discountPercentage, manualDiscount, paymentMethod, isPaid, customCashAmount, customOnlineAmount, confirmedBy, printKOT } = req.body;
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
      let processedItems = (items || []).map(item => ({
        ...item,
        type: item.type || 'H',
        totalPrice: item.totalPrice || (item.price * item.quantity)
      }));
      let kotSequence = 0;
      let kotPrintCount = 0;
      if (printKOT) {
        kotSequence = 1;
        kotPrintCount = 1;
        processedItems = processedItems.map(item => ({ ...item, kotNumber: 1 }));
      }
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
        kotSequence,
        kotPrintCount,
        createdAt: now,
        updatedAt: now,
        confirmedBy: confirmedBy || null,
      });
      await order.save();
    }

    // Update SalesCalendar for paid orders
    if (order.isPaid) {
      try {
        const SalesCalendar = require('../models/SalesCalendar');
        const orderDate = new Date(order.createdAt);
        const monthKey = orderDate.toISOString().slice(0, 7); // "YYYY-MM"
        const dayKey = orderDate.toISOString().slice(8, 10);  // "DD"
        await SalesCalendar.findOneAndUpdate(
          { month: monthKey },
          {
            $inc: {
              [`days.${dayKey}.totalAmount`]: order.totalAmount,
              [`days.${dayKey}.paidOrderCount`]: 1,
            }
          },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Failed to update SalesCalendar:', err);
      }
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
//Get all orders sorted by createdAt in ascending order (exclude deleted)
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find({ deleted: { $ne: true } }).sort({ updatedAt: -1 }).lean();
    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: "Failed to fetch orders", error: error.message });
  }
});

// @route   GET /api/orders/today
//Get all orders for today with stats (exclude deleted)
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
        createdAt: { $gte: todayUTC, $lt: tomorrowUTC },
        deleted: { $ne: true }
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
//Get orders for a specific date (YYYY-MM-DD) with stats (exclude deleted)
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
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        deleted: { $ne: true }
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

// @route   GET /api/orders/deleted/:date
// Get only deleted orders for a specific date (YYYY-MM-DD)
router.get("/deleted/:date", async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDateRange(req.params.date);
    const deletedOrders = await DeletedOrder.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).sort({ updatedAt: -1 }).lean();
    res.status(200).json(deletedOrders);
  } catch (error) {
    console.error("Fetch deleted orders by date error:", error);
    res.status(500).json({
      message: "Failed to fetch deleted orders for the given date",
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

// Generate a signed Excel download link (valid for 5 minutes)
router.get('/excel-link/:date', require('../middleware/authMiddleware').authenticateToken, (req, res) => {
  const userId = req.user._id.toString();
  const date = req.params.date;
  const expires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
  const signature = crypto.createHmac('sha256', SIGNED_URL_SECRET)
    .update(userId + date + expires)
    .digest('hex');
  // Always use https:// to avoid mixed content errors
  const baseUrl = 'https://' + req.get('host');
  const url = `${baseUrl}/api/orders/excel/${date}?user=${userId}&expires=${expires}&sig=${signature}`;
  res.json({ url });
});

// @route   GET /api/orders/excel/:date
// Download Excel of orders for a specific date (YYYY-MM-DD)
router.get("/excel/:date", async (req, res, next) => {
  // Allow two ways: (1) Signed URL (for app/native), (2) adminAuth (for browser)
  const { user, expires, sig } = req.query;
  if (user && expires && sig) {
    // Signed URL flow
    const now = Date.now();
    if (now > Number(expires)) {
      return res.status(403).json({ message: 'Download link expired.' });
    }
    const expectedSig = crypto.createHmac('sha256', SIGNED_URL_SECRET)
      .update(user + req.params.date + expires)
      .digest('hex');
    if (sig !== expectedSig) {
      return res.status(403).json({ message: 'Invalid signature.' });
    }
    // Optionally, you could check user exists here
  } else {
    // Fallback: require adminAuth for browser use
    return require('../middleware/authMiddleware').adminAuth(req, res, () => downloadExcelHandler(req, res).catch(next));
  }
  // If here, allow download
  return downloadExcelHandler(req, res).catch(next);
});

// Extracted Excel download logic for reuse
async function downloadExcelHandler(req, res) {
  const { startOfDay, endOfDay } = getDateRange(req.params.date);
  const [ordersStats, orders] = await Promise.all([
    Order.calculateStats(startOfDay, endOfDay),
    Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
    .sort({ createdAt: 1 })
    .lean()
  ]);
  const stats = {
    totalOrders: ordersStats?.totalOrders || 0,
    totalPaidOrders: ordersStats?.totalPaidOrders || 0,
    totalRevenue: ordersStats?.totalRevenue || 0,
    avgOrderValue: ordersStats?.avgOrderValue || 0
  };
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Orders");
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
  worksheet.addRow({});
  worksheet.addRow({ orderNumber: "Summary Statistics" });
  worksheet.addRow({ orderNumber: "Total Orders", totalAmount: stats.totalOrders });
  worksheet.addRow({ orderNumber: "Paid Orders", totalAmount: stats.totalPaidOrders });
  worksheet.addRow({ orderNumber: "Total Revenue", totalAmount: stats.totalRevenue });
  worksheet.addRow({ orderNumber: "Avg. Order Value", totalAmount: Math.round(stats.avgOrderValue || 0) });
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
}

// @route   DELETE /api/orders/:orderId
// Move the order to DeletedOrder collection and remove from Order collection
router.delete('/:orderId', require('../middleware/authMiddleware').authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    // Find the order to get its date and orderNumber before deletion
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    // Role-based authorization
    if (req.user.role === 'admin') {
      // Admin can delete any order
      // proceed
    } else if (req.user.role === 'worker') {
      // Worker can only delete unpaid orders
      if (order.isPaid) {
        return res.status(403).json({ message: 'Access denied. Workers can only delete unpaid (pending) orders.' });
      }
    } else {
      return res.status(403).json({ message: 'Access denied.' });
    }
    const orderDate = new Date(order.createdAt);
    const startOfDay = new Date(orderDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(orderDate);
    endOfDay.setHours(23, 59, 59, 999);
    const deletedOrderNumber = order.orderNumber;
    // Move to DeletedOrder collection
    await DeletedOrder.create({
      ...order.toObject(),
      deletedBy: req.user?.name || req.user?.username,
      deletedAt: new Date(),
    });
    // Remove from Order collection
    await Order.deleteOne({ orderId });

    // Decrease amount from SalesCalendar if paid order
    const { decreaseSalesCalendarAmount } = require('../utils/salesCalendarUtils');
    await decreaseSalesCalendarAmount(order.createdAt, order.totalAmount, order.isPaid);
    // Resequence orderNumbers for non-deleted orders on the same day with higher orderNumber
    const nonDeletedOrders = await Order.find({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      orderNumber: { $gt: deletedOrderNumber }
    }).sort({ orderNumber: 1 });
    for (let i = 0; i < nonDeletedOrders.length; i++) {
      nonDeletedOrders[i].orderNumber = deletedOrderNumber + i;
      await nonDeletedOrders[i].save();
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
        orderId: orderId,
      });
    }
    res.status(200).json({ 
      message: "Order moved to deleted orders and order numbers resequenced successfully",
      orderId: orderId
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

// @route   POST /api/orders/:orderId/add-items
// Add new items to a pending order, optionally print KOT
router.post('/:orderId/add-items', async (req, res) => {
  try {
    const { newItems, printKOT } = req.body; // newItems: array of items to add
    if (!Array.isArray(newItems) || newItems.length === 0) {
      return res.status(400).json({ message: 'newItems array required' });
    }
    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    // Add new items to the order
    order.items.push(...newItems);
    order.updatedAt = new Date();
    let kotNumber = null;
    if (printKOT) {
      // Increment kotPrintCount and kotSequence
      order.kotPrintCount = (order.kotPrintCount || 0) + 1;
      order.kotSequence = (order.kotSequence || 0) + 1;
      kotNumber = order.kotPrintCount;
      // Mark new items with the new KOT number
      for (let i = order.items.length - newItems.length; i < order.items.length; i++) {
        order.items[i].kotNumber = order.kotSequence;
      }
    }
    await order.save();
    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'order-updated', order });
    }
    res.status(200).json({ 
      message: 'Items added successfully', 
      kotNumber, 
      newItems: printKOT ? order.items.slice(-newItems.length) : [],
      order
    });
  } catch (error) {
    console.error('Add items to order error:', error);
    res.status(500).json({ message: 'Failed to add items to order', error: error.message });
  }
});

// @route   DELETE /api/orders/deleted/permanent/:orderId
router.delete('/deleted/permanent/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await DeletedOrder.deleteOne({ orderId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Deleted order not found' });
    }
    res.status(200).json({ message: 'Deleted order permanently removed', orderId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to permanently delete order', error: error.message });
  }
});

// @route   DELETE /api/orders/deleted/permanent/all/:date
router.delete('/deleted/permanent/all/:date', async (req, res) => {
  try {
    const { startOfDay, endOfDay } = getDateRange(req.params.date);
    const result = await DeletedOrder.deleteMany({
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });
    res.status(200).json({ message: 'All deleted orders for date permanently removed', deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Failed to permanently delete all deleted orders', error: error.message });
  }
});

module.exports = router;