const Reservation = require('../models/Reservation');
const Platform = require('../models/Platform');

async function resolvePlatform(slug) {
  if (!slug) return null;
  return Platform.findOne({ slug });
}

// GET /api/bakery/transactions?platformSlug=mamshie-bakery
async function listTransactions(req, res) {
  try {
    const { platformSlug } = req.query;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    const reservations = await Reservation.find({ platform: platform._id })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const summary = reservations.reduce(
      (acc, r) => {
        acc.totalReservations += 1;
        if (r.downPayment?.isPaid) {
          acc.totalDownPaymentsCollected += r.downPayment.amount || 0;
          acc.totalRevenueExpected += r.totalPrice || 0;
        } else {
          acc.pendingCount += 1;
        }
        return acc;
      },
      { totalReservations: 0, totalDownPaymentsCollected: 0, totalRevenueExpected: 0, pendingCount: 0 }
    );

    res.json({ transactions: reservations, summary });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load transactions', error: err.message });
  }
}

module.exports = { listTransactions };