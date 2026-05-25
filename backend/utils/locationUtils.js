const mongoose = require('mongoose');
const Location = require('../models/Location');

const DEFAULT_LOCATION_NAME = 'Keshavpuram';

function normalizeLocationName(name = '') {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

function getLocationIdValue(locationLike) {
  if (!locationLike) {
    return null;
  }
  if (typeof locationLike === 'string') {
    return locationLike;
  }
  if (locationLike instanceof mongoose.Types.ObjectId) {
    return locationLike.toString();
  }
  return locationLike._id?.toString?.() || locationLike.id || locationLike.toString?.() || null;
}

async function getDefaultLocation() {
  return Location.findOne({ normalizedName: normalizeLocationName(DEFAULT_LOCATION_NAME) });
}

async function resolveLocation(locationId, { allowInactive = false, fallbackToDefault = false } = {}) {
  let location = null;

  if (locationId) {
    if (typeof locationId === 'string' && !mongoose.Types.ObjectId.isValid(locationId)) {
      return null;
    }
    location = await Location.findById(locationId);
  } else if (fallbackToDefault) {
    location = await getDefaultLocation();
  }

  if (!location) {
    return null;
  }

  if (!allowInactive && !location.isActive) {
    return null;
  }

  return location;
}

module.exports = {
  DEFAULT_LOCATION_NAME,
  getDefaultLocation,
  getLocationIdValue,
  normalizeLocationName,
  resolveLocation
};
