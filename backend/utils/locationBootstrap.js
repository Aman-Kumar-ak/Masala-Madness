const DishCategory = require('../models/DishCategory');
const DeletedOrder = require('../models/DeletedOrder');
const Location = require('../models/Location');
const Order = require('../models/Order');
const SalesCalendar = require('../models/SalesCalendar');
const User = require('../models/User');
const { DEFAULT_LOCATION_NAME, normalizeLocationName } = require('./locationUtils');

async function ensureLocationIndexes() {
  try {
    await SalesCalendar.collection.dropIndex('month_1');
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') {
      console.warn('Unable to drop legacy SalesCalendar month index:', error.message);
    }
  }
}

async function ensureDefaultLocationAndMigrateData() {
  await ensureLocationIndexes();

  const defaultLocation = await Location.findOneAndUpdate(
    { normalizedName: normalizeLocationName(DEFAULT_LOCATION_NAME) },
    {
      $setOnInsert: {
        name: DEFAULT_LOCATION_NAME,
        normalizedName: normalizeLocationName(DEFAULT_LOCATION_NAME),
        isActive: true
      }
    },
    {
      new: true,
      upsert: true
    }
  );

  const locationId = defaultLocation._id;

  await Promise.all([
    User.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: locationId } }
    ),
    DishCategory.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: locationId } }
    ),
    Order.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: locationId, locationName: defaultLocation.name } }
    ),
    DeletedOrder.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: locationId, locationName: defaultLocation.name } }
    ),
    SalesCalendar.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: locationId, locationName: defaultLocation.name } }
    )
  ]);

  await Promise.allSettled([
    Location.syncIndexes(),
    SalesCalendar.syncIndexes(),
    User.syncIndexes(),
    DishCategory.syncIndexes(),
    Order.syncIndexes(),
    DeletedOrder.syncIndexes()
  ]);

  return defaultLocation;
}

module.exports = {
  ensureDefaultLocationAndMigrateData
};
