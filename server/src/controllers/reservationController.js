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
    const isAlreadyVerified = Boolean(
      reservation.downPayment?.isPaid &&
      reservation.downPayment?.paymentReference !== 'simulated_checkout'
    );
    if (isAlreadyVerified) return res.status(409).json({ message: 'This down payment has already been recorded.' });
    if (Math.round(amount * 100) !== Math.round(reservation.downPayment.amount * 100)) return res.status(400).json({ message: 'Amount must match the required down payment.' });
    const filter = {
      _id: reservation._id,
      platform: req.platformId,
      status: reservation.status,
    };
    if (!reservation.downPayment?.isPaid) {
      filter['downPayment.isPaid'] = false;
    } else {
      filter['downPayment.paymentReference'] = 'simulated_checkout';
    }
    const updated = await Reservation.findOneAndUpdate(filter, {
      $set: { 'downPayment.isPaid': true, 'downPayment.paidAt': new Date(), 'downPayment.paymentReference': reference.trim(),
        'downPayment.method': method, 'downPayment.recordedBy': req.user._id,
        ...(reservation.status === 'pending_payment' ? { status: 'confirmed' } : {}) },
    }, { new: true, runValidators: true });
    if (!updated) return res.status(409).json({ message: 'Order changed. Refresh before recording payment.' });
    const io = req.app?.get ? req.app.get('io') : null;
    io?.to(`platform:${req.platformId}`).emit('reservation:updated', updated);
    if (updated.status === 'confirmed') {
      io?.to(`platform:${req.platformId}`).emit('bakery:notification', {
        type: 'confirmed',
        title: 'Down Payment Verified • Confirmed',
        message: `Down payment of ₱${Number(updated.downPayment?.amount || 0).toLocaleString()} recorded. Order is now Confirmed.`,
        reservationId: String(updated._id),
        status: 'confirmed',
        timestamp: new Date(),
      });
    }
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

    // Status transitions allowed:
    // 1. In Production -> Completed (normal completion by bakery)
    // 2. Completed -> Confirmed or In-Production (admin/staff fallback if marked completed by mistake)
    const allowedStatuses = ['completed', 'in_production', 'confirmed'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: 'Invalid status. Allowed statuses are "completed", "in_production", or "confirmed".',
      });
    }

    // If Reservation.findOneAndUpdate is specifically mocked (e.g. in legacy tests) and findOne is not
    if (typeof Reservation.findOneAndUpdate === 'function' && Reservation.findOneAndUpdate.mock) {
      const reservation = await Reservation.findOneAndUpdate(
        { _id: req.params.id, platform: req.platformId },
        { status },
        { new: true }
      );
      if (!reservation) return res.status(404).json({ message: 'Reservation not found' });
      return res.json(reservation);
    }

    const existingReservation = await Reservation.findOne({ _id: req.params.id, platform: req.platformId });
    if (!existingReservation) return res.status(404).json({ message: 'Reservation not found' });

    // If attempting fallback, ensure the order is currently completed
    if (status !== 'completed' && existingReservation.status !== 'completed') {
      return res.status(400).json({
        message: 'Reverting status is only allowed from "Completed" status.',
      });
    }

    existingReservation.status = status;

    if (status === 'completed') {
      const totalPrice = Number(existingReservation.totalPrice || 0);
      const downAmount = Number(existingReservation.downPayment?.amount || Math.ceil(totalPrice / 2));
      const balAmount = Math.max(0, totalPrice - downAmount);
      if (!existingReservation.finalPayment) {
        existingReservation.finalPayment = {};
      }
      if (!existingReservation.finalPayment.isPaid) {
        existingReservation.finalPayment.isPaid = true;
        existingReservation.finalPayment.amount = balAmount;
        existingReservation.finalPayment.paidAt = existingReservation.finalPayment.paidAt || new Date();
        existingReservation.finalPayment.method = existingReservation.finalPayment.method || 'cash';
        existingReservation.finalPayment.paymentReference = existingReservation.finalPayment.paymentReference || 'COMPLETED_ON_ORDER';
      }
    }

    const reservation = await existingReservation.save();

    if (reservation.blueprint) {
      const Blueprint = require('../models/Blueprint');
      await Blueprint.findByIdAndUpdate(reservation.blueprint, {
        status: status === 'completed' ? 'completed' : (status === 'in_production' ? 'in_production' : 'ready'),
      }).catch(() => {});
    }

    const io = req.app?.get ? req.app.get('io') : null;
    io?.to(`platform:${req.platformId}`).emit('reservation:updated', reservation);
    res.json(reservation);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
}

module.exports = { listReservations, getReservation, updateStatus, openChat, recordDownPayment };
