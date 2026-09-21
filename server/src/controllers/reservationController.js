const Reservation = require('../models/Reservation');

// GET /api/bakery/reservations?status=confirmed
async function listReservations(req, res) {
  try {
    const { status } = req.query;

    const filter = { platform: req.platformId };
    if (status && status !== 'all') filter.status = status;

    const reservations = await Reservation.find(filter)
      .populate('user', 'displayName email')
      .populate('design', 'thumbnail')
      .sort({ createdAt: -1 });

    res.json(reservations);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reservations', error: err.message });
  }
}

// GET /api/bakery/reservations/:id
async function getReservation(req, res) {
  try {
    const reservation = await Reservation.findOne({ _id: req.params.id, platform: req.platformId })
      .populate('user', 'displayName email')
      .populate('design');

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load reservation', error: err.message });
  }
}

// PATCH /api/bakery/reservations/:id/status   body: { status }
async function updateStatus(req, res) {
  try {
    const { status } = req.body;

    const allowed = ['pending_payment', 'confirmed', 'in_production', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, platform: req.platformId },
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
