const Reservation = require('../models/Reservation');
const pricing = require('./pricingService');

async function ensureCheckoutReservation(blueprint) {
  if (!blueprint.customer || blueprint.status !== 'ready') return null;
  const existing = await Reservation.findOne({ blueprint: blueprint._id });
  if (existing) return existing;
  const snapshot = blueprint.orderPricingSnapshot || {
    ...pricing.buildQuote(blueprint.designSnapshot, await pricing.getActivePriceBook(blueprint.platform)),
    calculatedAt: new Date(),
  };
  const key = { blueprint: blueprint._id };
  try {
    return await Reservation.findOneAndUpdate(key, { $setOnInsert: {
      ...key, user: blueprint.customer, platform: blueprint.platform,
      designName: blueprint.designName, checkoutMode: 'simulated',
      pickupDate: blueprint.deliveryDate, totalPrice: snapshot.totalMinor / 100,
      pricingSnapshot: { ...snapshot, lineItems: snapshot.lineItems.map((item) => ({ ...item, unit: item.unit || 'item' })) },
      downPayment: { amount: Math.ceil(snapshot.totalMinor / 200), isPaid: false },
      status: 'pending_payment',
    } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Reservation.findOne(key);
  }
}
module.exports = { ensureCheckoutReservation };
