const Reservation = require('../models/Reservation');
const pricing = require('./pricingService');
const { processReservationConfirmationEmail } = require('./reservationEmailService');

async function deliverConfirmation(reservation, emailSender) {
  if (!reservation || !emailSender) return;
  await emailSender(reservation).catch((err) => {
    console.error('[ReservationEmail] Error during confirmation delivery:', err.message);
  });
}

async function ensureCheckoutReservation(blueprint, { emailSender = processReservationConfirmationEmail } = {}) {
  if (!blueprint.customer || blueprint.status !== 'ready') return null;
  const existing = await Reservation.findOne({ blueprint: blueprint._id });
  if (existing) {
    await deliverConfirmation(existing, emailSender);
    return existing;
  }
  const snapshot = blueprint.orderPricingSnapshot || {
    ...pricing.buildQuote(blueprint.designSnapshot, await pricing.getActivePriceBook(blueprint.platform)),
    calculatedAt: new Date(),
  };
  const key = { blueprint: blueprint._id };
  const confirmationCreatedAt = new Date();
  try {
    const reservation = await Reservation.findOneAndUpdate(key, { $setOnInsert: {
      ...key, user: blueprint.customer, platform: blueprint.platform,
      designName: blueprint.designName, checkoutMode: 'simulated',
      pickupDate: blueprint.deliveryDate, totalPrice: snapshot.totalMinor / 100,
      pricingSnapshot: { ...snapshot, lineItems: snapshot.lineItems.map((item) => ({ ...item, unit: item.unit || 'item' })) },
      downPayment: { amount: Math.ceil(snapshot.totalMinor / 200), isPaid: false },
      status: 'pending_payment',
      confirmationEmail: { status: 'pending', attempts: 0, nextAttemptAt: confirmationCreatedAt },
    } }, { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true });

    await deliverConfirmation(reservation, emailSender);

    return reservation;
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Reservation.findOne(key);
  }
}
module.exports = { ensureCheckoutReservation };
