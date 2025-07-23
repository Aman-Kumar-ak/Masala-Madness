
const express = require("express");
const SalesCalendar = require("../models/SalesCalendar");
const Order = require("../models/Order");
const router = express.Router();

// @route   GET /api/orders/monthly-summary
// Get monthly sales totals and order counts from SalesCalendar
router.get('/monthly-summary', async (req, res) => {
  try {
    const months = await SalesCalendar.find({});
    let monthly = [];
    months.forEach(monthDoc => {
      let monthTotal = 0, monthOrders = 0;
      for (const stats of monthDoc.days.values()) {
        monthTotal += stats.totalAmount;
        monthOrders += stats.paidOrderCount;
      }
      monthly.push({
        month: monthDoc.month,
        totalAmount: monthTotal,
        totalOrders: monthOrders
      });
    });
    // Sort months latest first
    monthly.sort((a, b) => b.month.localeCompare(a.month));
    res.json(monthly);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch monthly summary.' });
  }
});

router.get('/sales-summary', async (req, res) => {
  try {
    const months = await SalesCalendar.find({});
    let daily = [];
    // Collect all dates to fetch top items in batch
    let dateMap = [];
    months.forEach(monthDoc => {
      const sortedDays = Array.from(monthDoc.days.entries()).sort((a, b) => b[0].localeCompare(a[0]));
      for (const [day, stats] of sortedDays) {
        const date = `${monthDoc.month}-${day}`;
        daily.push({
          date,
          totalAmount: stats.totalAmount,
          totalOrders: stats.paidOrderCount,
          topItems: [] // Will fill below
        });
        dateMap.push({ month: monthDoc.month, day });
      }
    });
    // For each day, fetch top items from Orders
    await Promise.all(daily.map(async (entry, idx) => {
      const { date } = entry;
      // Get start and end of day in UTC
      const start = new Date(date + 'T00:00:00.000Z');
      const end = new Date(date + 'T23:59:59.999Z');
      const orders = await Order.find({
        createdAt: { $gte: start, $lte: end },
        deleted: { $ne: true },
        isPaid: true
      }).lean();
      const itemsMap = {};
      orders.forEach(order => {
        (order.items || []).forEach(item => {
          if (!itemsMap[item.name]) {
            itemsMap[item.name] = { name: item.name, quantity: 0, total: 0 };
          }
          itemsMap[item.name].quantity += item.quantity || 0;
          itemsMap[item.name].total += (item.quantity || 0) * (item.price || 0);
        });
      });
      entry.topItems = Object.values(itemsMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }));
    // Sort daily by date descending (latest first across months)
    daily.sort((a, b) => b.date.localeCompare(a.date));
    res.json(daily);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sales summary.' });
  }
});

module.exports = router;
