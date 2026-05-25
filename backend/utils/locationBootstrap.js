const mongoose = require('mongoose');
const DishCategory = require('../models/DishCategory');
const DeletedOrder = require('../models/DeletedOrder');
const Location = require('../models/Location');
const { ensureOrderCollectionsReady, getLegacyOrderModel } = require('../models/Order');
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

async function archiveLegacyOrdersCollection() {
  const db = mongoose.connection.db;
  const legacyCollections = await db.listCollections({ name: 'orders' }).toArray();
  if (legacyCollections.length === 0) {
    return false;
  }

  const archivedCollections = await db.listCollections({ name: 'old_orders' }).toArray();
  if (archivedCollections.length > 0) {
    console.warn('Legacy orders archive already exists. Merging any leftover orders collection data into old_orders.');
  }

  try {
    if (archivedCollections.length === 0) {
      await db.collection('orders').rename('old_orders');
      console.log('Legacy orders collection renamed to old_orders.');
      return true;
    }
  } catch (error) {
    console.warn('Unable to rename legacy orders collection directly, falling back to document migration:', error.message);
  }

  const sourceCollection = db.collection('orders');
  const archiveCollection = db.collection('old_orders');
  const legacyOrders = await sourceCollection.find({}).toArray();

  if (legacyOrders.length === 0) {
    try {
      await sourceCollection.drop();
    } catch (error) {
      if (error?.codeName !== 'NamespaceNotFound' && error?.code !== 26) {
        console.warn('Unable to drop empty legacy orders collection:', error.message);
      }
    }
    return false;
  }

  const batchSize = 500;
  for (let index = 0; index < legacyOrders.length; index += batchSize) {
    const batch = legacyOrders.slice(index, index + batchSize);
    await archiveCollection.bulkWrite(
      batch.map((doc) => {
        const { _id, ...legacyOrder } = doc;
        return {
        updateOne: {
          filter: { orderId: legacyOrder.orderId },
          update: { $setOnInsert: legacyOrder },
          upsert: true
        }
        };
      }),
      { ordered: false }
    );
  }

  await sourceCollection.deleteMany({});
  try {
    await sourceCollection.drop();
  } catch (error) {
    if (error?.codeName !== 'NamespaceNotFound' && error?.code !== 26) {
      console.warn('Unable to drop migrated legacy orders collection:', error.message);
    }
  }

  try {
    const LegacyOrder = getLegacyOrderModel();
    await LegacyOrder.createCollection();
    await LegacyOrder.syncIndexes();
  } catch (error) {
    console.warn('Unable to sync legacy order indexes after migration:', error.message);
  }

  console.log(`Migrated ${legacyOrders.length} legacy order document(s) into old_orders.`);
  return true;
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

  await archiveLegacyOrdersCollection();

  const activeLocations = await Location.find({ isActive: true }).select('_id').lean();

  await Promise.all([
    User.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: defaultLocation._id } }
    ),
    DishCategory.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: defaultLocation._id } }
    ),
    DeletedOrder.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: defaultLocation._id, locationName: defaultLocation.name } }
    ),
    SalesCalendar.updateMany(
      { $or: [{ location: { $exists: false } }, { location: null }] },
      { $set: { location: defaultLocation._id, locationName: defaultLocation.name } }
    )
  ]);

  await ensureOrderCollectionsReady(activeLocations);

  await Promise.allSettled([
    Location.syncIndexes(),
    SalesCalendar.syncIndexes(),
    User.syncIndexes(),
    DishCategory.syncIndexes(),
    DeletedOrder.syncIndexes()
  ]);

  return defaultLocation;
}

module.exports = {
  ensureDefaultLocationAndMigrateData
};
