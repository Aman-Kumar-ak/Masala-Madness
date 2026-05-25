const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const Order = require('../models/Order');
const DeletedOrder = require('../models/DeletedOrder');
const SalesCalendar = require('../models/SalesCalendar');
const { adminAuth, authenticateToken } = require('../middleware/authMiddleware');
const { getDefaultLocation, getLocationIdValue, resolveLocation } = require('../utils/locationUtils');

const SIGNED_URL_SECRET = process.env.SIGNED_URL_SECRET || 'supersecretkey';
const ordersCache = new Map();
const CACHE_DURATION = 30 * 1000;

const clearCacheEntry = (key) => {
  setTimeout(() => ordersCache.delete(key), CACHE_DURATION);
};

const buildCacheKey = (prefix, locationId) => `${prefix}:${locationId || 'default'}`;

const getDateRange = (dateStr) => {
  const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
  const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
  return { startOfDay, endOfDay };
};

async function getLocationFromRequest(req, options = {}) {
  const {
    allowInactive = false,
    fallbackToDefault = true,
    queryKey = 'locationId',
    bodyKey = 'locationId',
    preferUserLocation = false
  } = options;

  const candidateLocationIds = [];

  if (preferUserLocation && req.user?.location) {
    candidateLocationIds.push(getLocationIdValue(req.user.location));
  }

  if (req.query?.[queryKey]) {
    candidateLocationIds.push(req.query[queryKey]);
  }

  if (req.body?.[bodyKey]) {
    candidateLocationIds.push(req.body[bodyKey]);
  }

  if (!preferUserLocation && req.user?.location) {
    candidateLocationIds.push(getLocationIdValue(req.user.location));
  }

  for (const candidateId of candidateLocationIds) {
    if (!candidateId) {
      continue;
    }

    const resolvedLocation = await resolveLocation(candidateId, { allowInactive });
    if (resolvedLocation) {
      return resolvedLocation;
    }
  }

  if (fallbackToDefault) {
    return getDefaultLocation();
  }

  return null;
}

function buildLocationQuery(locationId, extraQuery = {}) {
  return {
    ...extraQuery,
    ...(locationId ? { location: locationId } : {})
  };
}

function clearLocationScopedCaches(date, locationId) {
  const dateKey = typeof date === 'string' ? date : new Date(date).toISOString().split('T')[0];
  const scopedLocationId = getLocationIdValue(locationId);

  [
    buildCacheKey('sales-summary-dates', scopedLocationId),
    buildCacheKey('monthly-summary', scopedLocationId),
    buildCacheKey(dateKey, scopedLocationId),
    buildCacheKey(`revenue_${dateKey}`, scopedLocationId)
  ].forEach((key) => ordersCache.delete(key));
}

async function updateSalesCalendarForLocation({
  locationId,
  locationName,
  orderDate,
  amountDelta = 0,
  orderCountDelta = 0
}) {
  if (!locationId || (amountDelta === 0 && orderCountDelta === 0)) {
    return;
  }

  const monthKey = orderDate.toISOString().slice(0, 7);
  const dayKey = orderDate.toISOString().slice(8, 10);
  const update = {
    $setOnInsert: {
      month: monthKey,
      location: locationId,
      locationName: locationName || null
    },
    $set: {
      locationName: locationName || null
    },
    $inc: {
      [`days.${dayKey}.totalAmount`]: amountDelta,
      [`days.${dayKey}.paidOrderCount`]: orderCountDelta
    }
  };

  try {
    await SalesCalendar.updateOne(
      { month: monthKey, location: locationId },
      update,
      { upsert: true }
    );
  } catch (error) {
    if (error?.code === 11000) {
      await SalesCalendar.updateOne(
        { month: monthKey, location: locationId },
        update,
        { upsert: false }
      );
      return;
    }

    console.error('Sales calendar update failed:', error);
  }
}

async function downloadExcelHandler(req, res) {
  const location = await getLocationFromRequest(req, {
    allowInactive: true,
    fallbackToDefault: true
  });

  const { startOfDay, endOfDay } = getDateRange(req.params.date);
  const locationId = location?._id || null;

  const [ordersStats, orders] = await Promise.all([
    Order.calculateStats(startOfDay, endOfDay, locationId),
    Order.find(
      buildLocationQuery(locationId, {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        deleted: { $ne: true }
      })
    )
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
  const worksheet = workbook.addWorksheet('Orders');

  worksheet.columns = [
    { header: 'OrderNumber', key: 'orderNumber', width: 12 },
    { header: 'Location', key: 'locationName', width: 18 },
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Time (IST)', key: 'time', width: 15 },
    { header: 'Dishes', key: 'dishes', width: 30 },
    { header: 'Type(H/F)', key: 'types', width: 10 },
    { header: 'Dishes Price', key: 'dishPrice', width: 15 },
    { header: 'Total Dish(each Price)', key: 'totalDish', width: 20 },
    { header: 'Subtotal', key: 'subtotal', width: 15 },
    { header: 'Discount(%)', key: 'discountPercentage', width: 12 },
    { header: 'Discount Amount', key: 'discountAmount', width: 15 },
    { header: 'Final Amount', key: 'totalAmount', width: 15 },
    { header: 'Mode of Payment', key: 'paymentMethod', width: 15 },
    { header: 'Status', key: 'status', width: 15 }
  ];

  orders.forEach((order) => {
    const dateObj = new Date(order.createdAt);
    worksheet.addRow({
      orderNumber: order.orderNumber,
      locationName: order.locationName || location?.name || '',
      date: dateObj.toLocaleDateString('en-IN'),
      time: dateObj.toLocaleTimeString('en-IN', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Kolkata'
      }),
      dishes: order.items.map((item) => `${item.name} x${item.quantity}`).join(', '),
      types: order.items.map((item) => item.type).join(', '),
      dishPrice: order.items.map((item) => item.price).join(', '),
      totalDish: order.items.map((item) => item.totalPrice).join(', '),
      subtotal: order.subtotal || order.totalAmount,
      discountPercentage: order.discountPercentage || 0,
      discountAmount: order.discountAmount || 0,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.isPaid ? 'Successful' : 'Failed'
    });
  });

  worksheet.addRow({});
  worksheet.addRow({ orderNumber: 'Summary Statistics' });
  worksheet.addRow({ orderNumber: 'Total Orders', totalAmount: stats.totalOrders });
  worksheet.addRow({ orderNumber: 'Paid Orders', totalAmount: stats.totalPaidOrders });
  worksheet.addRow({ orderNumber: 'Total Revenue', totalAmount: stats.totalRevenue });
  worksheet.addRow({ orderNumber: 'Avg. Order Value', totalAmount: Math.round(stats.avgOrderValue || 0) });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=orders_${req.params.date}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
}

router.delete('/all', authenticateToken, async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Only admin can delete all data.' });
    }

    const location = await getLocationFromRequest(req, { preferUserLocation: true });
    if (!location) {
      return res.status(400).json({ message: 'Valid location is required.' });
    }

    await Promise.all([
      Order.deleteMany({ location: location._id }),
      DeletedOrder.deleteMany({ location: location._id }),
      SalesCalendar.deleteMany({ location: location._id })
    ]);

    clearLocationScopedCaches(new Date(), location._id);

    res.status(200).json({ message: `All sales and orders deleted for ${location.name}.` });
  } catch (error) {
    console.error('Delete all sales/orders error:', error);
    res.status(500).json({ message: 'Failed to delete all sales and orders.' });
  }
});

router.get('/sales-summary/dates', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req);
    const locationId = location?._id || null;
    const cacheKey = buildCacheKey('sales-summary-dates', locationId);

    if (ordersCache.has(cacheKey)) {
      return res.json(ordersCache.get(cacheKey));
    }

    const orders = await Order.find(
      buildLocationQuery(locationId, { deleted: { $ne: true } })
    )
      .select('createdAt')
      .lean();

    const datesSet = new Set();
    orders.forEach((order) => {
      datesSet.add(new Date(order.createdAt).toISOString().slice(0, 10));
    });

    const dates = Array.from(datesSet).sort((a, b) => b.localeCompare(a));
    ordersCache.set(cacheKey, dates);
    clearCacheEntry(cacheKey);
    res.json(dates);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales dates.' });
  }
});

router.get('/sales-summary', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'Date query param required.' });
    }

    const location = await getLocationFromRequest(req);
    const locationId = location?._id || null;
    const { startOfDay, endOfDay } = getDateRange(date);

    const orders = await Order.find(
      buildLocationQuery(locationId, {
        createdAt: { $gte: startOfDay, $lte: endOfDay },
        deleted: { $ne: true },
        isPaid: true
      })
    ).lean();

    let totalAmount = 0;
    let totalOrders = 0;
    const items = {};

    orders.forEach((order) => {
      totalAmount += order.totalAmount || 0;
      totalOrders += 1;
      (order.items || []).forEach((item) => {
        if (!items[item.name]) {
          items[item.name] = { name: item.name, quantity: 0, total: 0 };
        }
        items[item.name].quantity += item.quantity || 0;
        items[item.name].total += (item.quantity || 0) * (item.price || 0);
      });
    });

    const topItems = Object.values(items)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({ date, totalAmount, totalOrders, topItems });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales summary for date.' });
  }
});

router.get('/monthly-summary', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req);
    const locationId = location?._id || null;
    const cacheKey = buildCacheKey('monthly-summary', locationId);

    if (ordersCache.has(cacheKey)) {
      return res.json(ordersCache.get(cacheKey));
    }

    const months = await SalesCalendar.find(buildLocationQuery(locationId)).lean();
    const result = months.map((monthDoc) => {
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

    result.sort((a, b) => b.month.localeCompare(a.month));
    ordersCache.set(cacheKey, result);
    clearCacheEntry(cacheKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly summary.' });
  }
});

router.post('/confirm', authenticateToken, async (req, res) => {
  try {
    let {
      orderId,
      items,
      totalAmount,
      subtotal,
      discountAmount,
      discountPercentage,
      manualDiscount,
      paymentMethod,
      isPaid,
      customCashAmount,
      customOnlineAmount,
      confirmedBy,
      printKOT
    } = req.body;

    const now = new Date();
    let order;
    let location;
    let previousPaidState = false;
    let previousTotalAmount = 0;

    if (orderId) {
      order = await Order.findOne({ orderId });
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const requestLocationId = getLocationIdValue(req.user?.location);
      if (requestLocationId && order.location?.toString() !== requestLocationId) {
        return res.status(403).json({ message: 'Access denied for this location.' });
      }

      location = await resolveLocation(order.location, { allowInactive: true, fallbackToDefault: true });
      previousPaidState = order.isPaid === true;
      previousTotalAmount = order.totalAmount || 0;

      if (items && items.length > 0) {
        const calculatedSubtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
          subtotal = calculatedSubtotal;
        }
      }

      order.items = items || order.items;
      order.subtotal = subtotal !== undefined ? subtotal : order.subtotal;
      order.discountAmount = discountAmount !== undefined ? discountAmount : order.discountAmount;
      order.discountPercentage = discountPercentage !== undefined ? discountPercentage : order.discountPercentage;
      order.manualDiscount = manualDiscount !== undefined ? manualDiscount : order.manualDiscount;
      order.paymentMethod = paymentMethod || order.paymentMethod;
      order.isPaid = isPaid !== undefined ? isPaid : order.isPaid;
      order.customCashAmount = customCashAmount !== undefined ? customCashAmount : order.customCashAmount;
      order.customOnlineAmount = customOnlineAmount !== undefined ? customOnlineAmount : order.customOnlineAmount;
      order.totalAmount = order.subtotal - order.discountAmount;
      order.location = location?._id || order.location;
      order.locationName = location?.name || order.locationName;

      if (confirmedBy) {
        order.confirmedBy = confirmedBy;
      }

      order.updatedAt = now;
      await order.save();

      if (!previousPaidState && order.isPaid) {
        await updateSalesCalendarForLocation({
          locationId: order.location,
          locationName: order.locationName,
          orderDate: order.createdAt,
          amountDelta: order.totalAmount,
          orderCountDelta: 1
        });
      } else if (previousPaidState && !order.isPaid) {
        await updateSalesCalendarForLocation({
          locationId: order.location,
          locationName: order.locationName,
          orderDate: order.createdAt,
          amountDelta: -previousTotalAmount,
          orderCountDelta: -1
        });
      } else if (previousPaidState && order.isPaid && Math.abs(previousTotalAmount - order.totalAmount) > 0.01) {
        await updateSalesCalendarForLocation({
          locationId: order.location,
          locationName: order.locationName,
          orderDate: order.createdAt,
          amountDelta: order.totalAmount - previousTotalAmount,
          orderCountDelta: 0
        });
      }
    } else {
      location = await getLocationFromRequest(req, { preferUserLocation: true });
      if (!location) {
        return res.status(400).json({ message: 'Valid location is required.' });
      }

      const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const tomorrowUTC = new Date(todayUTC);
      tomorrowUTC.setDate(todayUTC.getDate() + 1);

      const latestOrder = await Order.findOne({
        location: location._id,
        createdAt: { $gte: todayUTC, $lt: tomorrowUTC }
      })
        .select('orderNumber')
        .sort({ orderNumber: -1 })
        .lean();

      const orderNumber = latestOrder ? latestOrder.orderNumber + 1 : 1;
      let processedItems = (items || []).map((item) => ({
        ...item,
        type: item.type || 'H',
        totalPrice: item.totalPrice || item.price * item.quantity
      }));

      let kotSequence = 0;
      let kotPrintCount = 0;

      if (printKOT) {
        kotSequence = 1;
        kotPrintCount = 1;
        processedItems = processedItems.map((item) => ({ ...item, kotNumber: 1 }));
      }

      const calculatedSubtotal = processedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (Math.abs(calculatedSubtotal - (subtotal || totalAmount)) > 0.01) {
        subtotal = calculatedSubtotal;
        totalAmount = calculatedSubtotal - (discountAmount || 0);
      }

      order = new Order({
        orderId: uuidv4(),
        orderNumber,
        location: location._id,
        locationName: location.name,
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
        confirmedBy: confirmedBy || null
      });

      await order.save();

      if (order.isPaid) {
        await updateSalesCalendarForLocation({
          locationId: order.location,
          locationName: order.locationName,
          orderDate: order.createdAt,
          amountDelta: order.totalAmount,
          orderCountDelta: 1
        });
      }
    }

    clearLocationScopedCaches(order.createdAt || now, order.location);

    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', { type: 'order-updated', order });
    }

    return res.status(201).json({
      message: 'Order saved successfully',
      order
    });
  } catch (error) {
    console.error('Order save error:', error);
    res.status(500).json({ message: 'Failed to save order', error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req);
    const orders = await Order.find(
      buildLocationQuery(location?._id, { deleted: { $ne: true } })
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(orders);
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ message: 'Failed to fetch orders', error: error.message });
  }
});

router.get('/today', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req);
    const locationId = location?._id || null;
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setDate(todayUTC.getDate() + 1);

    const cacheKey = buildCacheKey(todayUTC.toISOString().split('T')[0], locationId);
    if (ordersCache.has(cacheKey)) {
      return res.status(200).json(ordersCache.get(cacheKey));
    }

    const [stats, orders] = await Promise.all([
      Order.calculateStats(todayUTC, tomorrowUTC, locationId),
      Order.find(
        buildLocationQuery(locationId, {
          createdAt: { $gte: todayUTC, $lt: tomorrowUTC },
          deleted: { $ne: true }
        })
      )
        .select('-__v')
        .sort({ updatedAt: -1 })
        .lean()
    ]);

    const result = { stats, orders };
    ordersCache.set(cacheKey, result);
    clearCacheEntry(cacheKey);
    res.status(200).json(result);
  } catch (error) {
    console.error("Fetch today's orders error:", error);
    res.status(500).json({ message: "Failed to fetch today's orders", error: error.message });
  }
});

router.get('/date/:date', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req);
    const locationId = location?._id || null;
    const { startOfDay, endOfDay } = getDateRange(req.params.date);
    const cacheKey = buildCacheKey(req.params.date, locationId);

    if (ordersCache.has(cacheKey)) {
      return res.status(200).json(ordersCache.get(cacheKey));
    }

    const [stats, orders] = await Promise.all([
      Order.calculateStats(startOfDay, endOfDay, locationId),
      Order.find(
        buildLocationQuery(locationId, {
          createdAt: { $gte: startOfDay, $lte: endOfDay },
          deleted: { $ne: true }
        })
      )
        .select('-__v')
        .sort({ updatedAt: -1 })
        .lean()
    ]);

    const result = { stats, orders };
    ordersCache.set(cacheKey, result);
    clearCacheEntry(cacheKey);
    res.status(200).json(result);
  } catch (error) {
    console.error('Fetch orders by date error:', error);
    res.status(500).json({
      message: 'Failed to fetch orders for the given date',
      error: error.message
    });
  }
});

router.get('/deleted/:date', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req, { allowInactive: true });
    const { startOfDay, endOfDay } = getDateRange(req.params.date);

    const deletedOrders = await DeletedOrder.find(
      buildLocationQuery(location?._id, {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
    )
      .sort({ updatedAt: -1 })
      .lean();

    res.status(200).json(deletedOrders);
  } catch (error) {
    console.error('Fetch deleted orders by date error:', error);
    res.status(500).json({
      message: 'Failed to fetch deleted orders for the given date',
      error: error.message
    });
  }
});

router.delete('/cleanup', adminAuth, async (req, res) => {
  try {
    const location = await getLocationFromRequest(req, { preferUserLocation: true });
    const dateToDeleteBefore = new Date();
    dateToDeleteBefore.setDate(dateToDeleteBefore.getDate() - 30);

    const result = await Order.deleteMany(
      buildLocationQuery(location?._id, {
        createdAt: { $lt: dateToDeleteBefore }
      })
    );

    ordersCache.clear();
    res.status(200).json({
      message: `${result.deletedCount} orders deleted.`,
      deletedBefore: dateToDeleteBefore
    });
  } catch (error) {
    console.error('Cleanup orders error:', error);
    res.status(500).json({ message: 'Failed to clean up orders', error: error.message });
  }
});

router.get('/today-revenue', async (req, res) => {
  try {
    const location = await getLocationFromRequest(req);
    const locationId = location?._id || null;
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowUTC = new Date(todayUTC);
    tomorrowUTC.setDate(todayUTC.getDate() + 1);

    const cacheKey = buildCacheKey(`revenue_${todayUTC.toISOString().split('T')[0]}`, locationId);
    if (ordersCache.has(cacheKey)) {
      return res.json(ordersCache.get(cacheKey));
    }

    const stats = await Order.calculateStats(todayUTC, tomorrowUTC, locationId);
    ordersCache.set(cacheKey, stats);
    clearCacheEntry(cacheKey);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching today's stats:", error);
    res.status(500).json({ message: "Error fetching today's stats" });
  }
});

router.get('/excel-link/:date', authenticateToken, async (req, res) => {
  const location = await getLocationFromRequest(req, { preferUserLocation: true });
  if (!location) {
    return res.status(400).json({ message: 'Valid location is required.' });
  }

  const userId = req.user._id.toString();
  const date = req.params.date;
  const locationId = location._id.toString();
  const expires = Date.now() + 5 * 60 * 1000;
  const signature = crypto
    .createHmac('sha256', SIGNED_URL_SECRET)
    .update(userId + date + locationId + expires)
    .digest('hex');

  const baseUrl = 'https://' + req.get('host');
  const url = `${baseUrl}/api/orders/excel/${date}?user=${userId}&locationId=${locationId}&expires=${expires}&sig=${signature}`;
  res.json({ url });
});

router.get('/excel/:date', async (req, res, next) => {
  const { user, locationId, expires, sig } = req.query;

  if (user && locationId && expires && sig) {
    const now = Date.now();
    if (now > Number(expires)) {
      return res.status(403).json({ message: 'Download link expired.' });
    }

    const expectedSig = crypto
      .createHmac('sha256', SIGNED_URL_SECRET)
      .update(user + req.params.date + locationId + expires)
      .digest('hex');

    if (sig !== expectedSig) {
      return res.status(403).json({ message: 'Invalid signature.' });
    }
  } else {
    return adminAuth(req, res, () => downloadExcelHandler(req, res).catch(next));
  }

  return downloadExcelHandler(req, res).catch(next);
});

router.delete('/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requestLocationId = getLocationIdValue(req.user?.location);
    if (requestLocationId && order.location?.toString() !== requestLocationId) {
      return res.status(403).json({ message: 'Access denied for this location.' });
    }

    if (req.user.role === 'worker' && order.isPaid) {
      return res.status(403).json({ message: 'Access denied. Workers can only delete unpaid (pending) orders.' });
    }

    const orderDate = new Date(order.createdAt);
    const startOfDay = new Date(orderDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(orderDate);
    endOfDay.setHours(23, 59, 59, 999);
    const deletedOrderNumber = order.orderNumber;

    await DeletedOrder.create({
      ...order.toObject(),
      deletedBy: req.user?.name || req.user?.username,
      deletedAt: new Date()
    });

    await Order.deleteOne({ orderId });

    await updateSalesCalendarForLocation({
      locationId: order.location,
      locationName: order.locationName,
      orderDate: order.createdAt,
      amountDelta: order.isPaid ? -order.totalAmount : 0,
      orderCountDelta: order.isPaid ? -1 : 0
    });

    const nonDeletedOrders = await Order.find({
      location: order.location,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      orderNumber: { $gt: deletedOrderNumber }
    }).sort({ orderNumber: 1 });

    for (let index = 0; index < nonDeletedOrders.length; index += 1) {
      nonDeletedOrders[index].orderNumber = deletedOrderNumber + index;
      await nonDeletedOrders[index].save();
    }

    clearLocationScopedCaches(orderDate, order.location);

    const io = req.app.get('io');
    if (io) {
      io.emit('order-update', {
        type: 'order-deleted',
        orderId
      });
    }

    res.status(200).json({
      message: 'Order moved to deleted orders and order numbers resequenced successfully',
      orderId
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Failed to delete order', error: error.message });
  }
});

router.post('/:orderId/mark-kot', authenticateToken, async (req, res) => {
  try {
    const { itemIndexes } = req.body;
    if (!Array.isArray(itemIndexes) || itemIndexes.length === 0) {
      return res.status(400).json({ message: 'itemIndexes array required' });
    }

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requestLocationId = getLocationIdValue(req.user?.location);
    if (requestLocationId && order.location?.toString() !== requestLocationId) {
      return res.status(403).json({ message: 'Access denied for this location.' });
    }

    const newKOT = (order.kotSequence || 0) + 1;
    itemIndexes.forEach((index) => {
      if (order.items[index] && order.items[index].kotNumber == null) {
        order.items[index].kotNumber = newKOT;
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

router.post('/:orderId/add-items', authenticateToken, async (req, res) => {
  try {
    const { newItems, printKOT } = req.body;
    if (!Array.isArray(newItems) || newItems.length === 0) {
      return res.status(400).json({ message: 'newItems array required' });
    }

    const order = await Order.findOne({ orderId: req.params.orderId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const requestLocationId = getLocationIdValue(req.user?.location);
    if (requestLocationId && order.location?.toString() !== requestLocationId) {
      return res.status(403).json({ message: 'Access denied for this location.' });
    }

    order.items.push(...newItems);
    order.subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const previousTotalAmount = order.totalAmount;
    order.totalAmount = order.subtotal - order.discountAmount;
    order.updatedAt = new Date();

    let kotNumber = null;
    if (printKOT) {
      order.kotPrintCount = (order.kotPrintCount || 0) + 1;
      order.kotSequence = (order.kotSequence || 0) + 1;
      kotNumber = order.kotPrintCount;

      for (let index = order.items.length - newItems.length; index < order.items.length; index += 1) {
        order.items[index].kotNumber = order.kotSequence;
      }
    }

    await order.save();

    if (order.isPaid && Math.abs(previousTotalAmount - order.totalAmount) > 0.01) {
      await updateSalesCalendarForLocation({
        locationId: order.location,
        locationName: order.locationName,
        orderDate: order.createdAt,
        amountDelta: order.totalAmount - previousTotalAmount,
        orderCountDelta: 0
      });
    }

    clearLocationScopedCaches(order.createdAt, order.location);

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

router.delete('/deleted/permanent/:orderId', adminAuth, async (req, res) => {
  try {
    const location = await getLocationFromRequest(req, {
      allowInactive: true,
      preferUserLocation: true
    });
    const { orderId } = req.params;

    const result = await DeletedOrder.deleteOne(
      buildLocationQuery(location?._id, { orderId })
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Deleted order not found' });
    }

    res.status(200).json({ message: 'Deleted order permanently removed', orderId });
  } catch (error) {
    res.status(500).json({ message: 'Failed to permanently delete order', error: error.message });
  }
});

router.delete('/deleted/permanent/all/:date', adminAuth, async (req, res) => {
  try {
    const location = await getLocationFromRequest(req, {
      allowInactive: true,
      preferUserLocation: true
    });
    const { startOfDay, endOfDay } = getDateRange(req.params.date);

    const result = await DeletedOrder.deleteMany(
      buildLocationQuery(location?._id, {
        createdAt: { $gte: startOfDay, $lte: endOfDay }
      })
    );

    res.status(200).json({
      message: 'All deleted orders for date permanently removed',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to permanently delete all deleted orders', error: error.message });
  }
});

module.exports = router;
