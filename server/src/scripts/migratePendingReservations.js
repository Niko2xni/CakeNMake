require('dotenv').config();
const mongoose = require('mongoose');
const configureDns = require('../config/dns');
const Reservation = require('../models/Reservation');

const apply = process.argv.includes('--apply');

async function run() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
  configureDns();
  await mongoose.connect(process.env.MONGO_URI);

  const filter = {
    $or: [
      { status: 'pending_payment' },
      { 'downPayment.isPaid': false },
    ],
  };

  const pending = await Reservation.find(filter).select('_id designName status downPayment createdAt').lean();

  console.log(`[Migration] Found ${pending.length} reservation(s) with pending payment status.`);

  if (!apply) {
    console.log('[Migration] Dry run only. Pass --apply to perform updates.');
    for (const r of pending) {
      console.log(` - ID: ${r._id} | Cake: ${r.designName || 'Unnamed'} | Status: ${r.status} | Downpayment: ₱${r.downPayment?.amount || 0}`);
    }
    await mongoose.disconnect();
    return;
  }

  const result = await Reservation.updateMany(filter, {
    $set: {
      status: 'confirmed',
      'downPayment.isPaid': true,
      'downPayment.paidAt': new Date(),
      'downPayment.method': 'gcash',
      'downPayment.paymentReference': 'legacy_migration',
    },
  });

  console.log(`[Migration] Successfully updated ${result.modifiedCount} reservation(s) to confirmed.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[Migration] Failed:', err);
  process.exit(1);
});
