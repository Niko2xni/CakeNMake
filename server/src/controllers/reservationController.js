const Reservation = require('../models/Reservation');
const Platform = require('../models/Platform');

async function resolvePlatform(slug) {
  if (!slug) return null;
  return Platform.findOne({ slug });
}

// GET /api/bakery/reservations?platformSlug=mamshie-bakery&status=confirmed
async function listReservations(req, res) {
  try {
    const { platformSlug, status } = req.query;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    const filter = { platform: platform._id };
    if (status && status !== 'all') filter.status = status;

    const reservations = await Reservation.find(filter)
      .populate('user', 'name email')
      .populate('design', 'thumbnailUrl')
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reservations', error: err.message });
  }
}

// GET /api/bakery/reservations/:id?platformSlug=mamshie-bakery
async function getReservation(req, res) {
  try {
    const { platformSlug } = req.query;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    const reservation = await Reservation.findOne({ _id: req.params.id, platform: platform._id })
      .populate('user', 'name email')
      .populate('design');

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reservation', error: err.message });
  }
}

// PATCH /api/bakery/reservations/:id/status   body: { status, platformSlug }
async function updateStatus(req, res) {
  try {
    const { status, platformSlug } = req.body;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    const allowed = ['pending_payment', 'confirmed', 'in_production', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, platform: platform._id },
      { status },
      { new: true }
    );

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
}

module.exports = { listReservations, getReservation, updateStatus };