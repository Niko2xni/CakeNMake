require('dotenv').config();
const connectDB = require('../config/db');
const Reservation = require('../models/Reservation');
const Platform = require('../models/Platform');

async function seed() {
  await connectDB();

  const platform = await Platform.findOne({ slug: 'mamshie-bakery' });
  if (!platform) {
    console.error('No Platform found — run seedPlatform.js first.');
    process.exit(1);
  }

  // user/design use placeholder ObjectIds since no real User/Design documents
  // exist yet. populate() will just return null for these, which the frontend
  // already handles ("Unknown customer"). Swap in real IDs once you have them.
  const day = 24 * 60 * 60 * 1000;
  const sampleReservations = [
    {
      platform: platform._id,
      user: new mongoose.Types.ObjectId(),
      design: new mongoose.Types.ObjectId(),
      pickupDate: new Date(Date.now() + 3 * day),
      totalPrice: 2700,
      downPayment: { amount: 1350, isPaid: true, paymentReference: 'pm_test_001', paidAt: new Date() },
      status: 'confirmed',
    },
    {
      platform: platform._id,
      user: new mongoose.Types.ObjectId(),
      design: new mongoose.Types.ObjectId(),
      pickupDate: new Date(Date.now() + 5 * day),
      totalPrice: 3700,
      downPayment: { amount: 1850, isPaid: true, paymentReference: 'pm_test_002', paidAt: new Date() },
      status: 'in_production',
    },
    {
      platform: platform._id,
      user: new mongoose.Types.ObjectId(),
      design: new mongoose.Types.ObjectId(),
      pickupDate: new Date(Date.now() + day),
      totalPrice: 1700,
      downPayment: { amount: 850, isPaid: true, paymentReference: 'pm_test_004', paidAt: new Date(), method: 'gcash' },
      status: 'confirmed',
    },
    {
      platform: platform._id,
      user: new mongoose.Types.ObjectId(),
      design: new mongoose.Types.ObjectId(),
      pickupDate: new Date(Date.now() - 2 * day),
      totalPrice: 2700,
      downPayment: { amount: 1350, isPaid: true, paymentReference: 'pm_test_003', paidAt: new Date() },
      blueprintUrl: 'https://example.com/sample-blueprint.pdf',
      status: 'completed',
    },
  ];

  await Reservation.insertMany(sampleReservations);
  console.log(`Created ${sampleReservations.length} sample reservations.`);
  process.exit(0);
}

seed();