const mongoose = require('mongoose');

const DaySchema = new mongoose.Schema({
  totalAmount: { type: Number, default: 0 },
  paidOrderCount: { type: Number, default: 0 },
}, { _id: false });

const SalesCalendarSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // e.g. "2025-07"
  days: { type: Map, of: DaySchema, default: {} }, // key: "01", "02", ...
});

module.exports = mongoose.model('SalesCalendar', SalesCalendarSchema);
