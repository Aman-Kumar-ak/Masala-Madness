const SalesCalendar = require('../models/SalesCalendar');

/**
 * Decrease the sales amount and paid order count for a given order in SalesCalendar
 * @param {Date} orderDate - The date of the order
 * @param {number} amount - The amount to decrease
 * @param {boolean} isPaid - Whether the order was paid
 */
async function decreaseSalesCalendarAmount(orderDate, amount, isPaid) {
  if (!isPaid) return; // Only update for paid orders
  const year = orderDate.getFullYear();
  const month = String(orderDate.getMonth() + 1).padStart(2, '0');
  const day = String(orderDate.getDate()).padStart(2, '0');
  const monthKey = `${year}-${month}`;
  const dayKey = day;
  const salesCalendar = await SalesCalendar.findOne({ month: monthKey });
  if (!salesCalendar) return;
  const dayData = salesCalendar.days.get(dayKey);
  if (!dayData) return;
  dayData.totalAmount = Math.max(0, (dayData.totalAmount || 0) - amount);
  dayData.paidOrderCount = Math.max(0, (dayData.paidOrderCount || 0) - 1);
  salesCalendar.days.set(dayKey, dayData);
  await salesCalendar.save();
}

module.exports = { decreaseSalesCalendarAmount };
