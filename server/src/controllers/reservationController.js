const Reservation = require('../models/Reservation');
const Conversation = require('../models/Conversation');
const { serializeConversation } = require('./conversationController');
const mongoose = require('mongoose');

async function recordDownPayment(req, res) {
  const { amount, method, reference } = req.body || {};
  if (!mongoose.isValidObjectId(req.params.id) || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0
    || !Number.isSafeInteger(Math.round(amount * 100)) || Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
    || !['gcash', 'cash', 'bank_transfer', 'other'].includes(method)
    || typeof reference !== 'string' || !reference.trim() || reference.length > 200) {
    return res.status(400).json({ message: 'Enter a valid amount, payment method, and receipt or reference (up to 200 characters).' });
  }
  try {
    const reservation = await Reservation.findOne({ _id: req.params.id, platform: req.platformId });
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });
    if (reservation.downPayment?.isPaid) return res.status(409).json({ message: 'This down payment has already been recorded.' });
    if (Math.round(amount * 100) !== Math.round(reservation.downPayment.amount * 100)) return res.status(400).json({ message: 'Amount must match the required down payment.' });
    const updated = await Reservation.findOneAndUpdate({ _id: reservation._id, platform: req.platformId, 'downPayment.isPaid': false, status: reservation.status }, {
      $set: { 'downPayment.isPaid': true, 'downPayment.paidAt': new Date(), 'downPayment.paymentReference': reference.trim(),
        'downPayment.method': method, 'downPayment.recordedBy': req.user._id,
        ...(reservation.status === 'pending_payment' ? { status: 'confirmed' } : {}) },
    }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'Order changed. Refresh before recording payment.' });
    const io = req.app?.get ? req.app.get('io') : null;
    io?.to(`platform:${req.platformId}`).emit('reservation:updated', updated);
    return res.json(updated);
  } catch (error) { return res.status(500).json({ message: 'Could not record down payment.' }); }
}

async function openChat(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid reservation ID.' });
    const reservation = await Reservation.findOne({ _id: req.params.id, platform: req.platformId });
    if (!reservation) return res.status(404).json({ message: 'Reservation not found.' });
    const key = { customer: reservation.user, platform: reservation.platform };
    let conversation;
    try {
      conversation = await Conversation.findOneAndUpdate(key, { $setOnInsert: { ...key, reservation: reservation._id } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    } catch (error) {
      if (error.code !== 11000) throw error;
      conversation = await Conversation.findOne(key);
    }
    await conversation.populate('customer', 'displayName email photoURL');
    await conversation.populate('platform', 'name slug');
    return res.json({ conversation: serializeConversation(conversation, req.user) });
  } catch (error) {
    return res.status(500).json({ message: 'Could not open customer chat.' });
  }
}

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

    const allowed = ['confirmed', 'in_production', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const reservation = await Reservation.findOneAndUpdate(
      { _id: req.params.id, platform: req.platformId },
      { status },
      { new: true }
    );

    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
    const io = req.app?.get ? req.app.get('io') : null;
    io?.to(`platform:${req.platformId}`).emit('reservation:updated', reservation);
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
}

module.exports = { listReservations, getReservation, updateStatus, openChat, recordDownPayment };
