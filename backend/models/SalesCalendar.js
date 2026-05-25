const mongoose = require('mongoose');

const DaySchema = new mongoose.Schema({
  totalAmount: { type: Number, default: 0 },
  paidOrderCount: { type: Number, default: 0 },
}, { _id: false });

const SalesCalendarSchema = new mongoose.Schema({
  month: { type: String, required: true }, // e.g. "2025-07"
  location: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  locationName: {
    type: String,
    default: null,
    trim: true
  },
  days: { type: Map, of: DaySchema, default: {} }, // key: "01", "02", ...
});

SalesCalendarSchema.index({ month: 1, location: 1 }, { unique: true });

module.exports = mongoose.model('SalesCalendar', SalesCalendarSchema);
