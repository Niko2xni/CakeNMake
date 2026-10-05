const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Reservation = require('../models/Reservation');
const Blueprint = require('../models/Blueprint');
const SupportRequest = require('../models/SupportRequest');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole, requirePlatformMembership } = require('../middleware/authorize');
const { effectiveRestriction, publishMessage } = require('../services/moderationService');
const { httpError } = require('../services/conversationAccessService');

const router = express.Router();
router.use(authenticate, loadAppUser);
const staff = [requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), requirePlatformMembership];
const customer = requireRole('customer');
const handler = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    if (!error.status) console.error('Moderation request failed:', error.message);
    res.status(error.code === 11000 ? 409 : error.status || 500).json({ code: error.code || 'MODERATION_FAILED', message: error.code === 11000 ? 'A request is already open. Refresh to view it.' : error.status ? error.message : 'Could not complete this request. Please retry.' });
  }
};
function id(value) { if (!mongoose.isValidObjectId(value)) throw httpError(400, 'INVALID_ID', 'Invalid record ID.'); return value; }
function text(value, max = 1000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw httpError(400, 'INVALID_TEXT', `Enter text between 1 and ${max} characters.`);
  return value.trim();
}
function customerView(user) {
  return { _id: user._id, displayName: user.displayName, email: user.email, restriction: effectiveRestriction(user), restrictionVersionId: user.restriction?.id || null, moderationHistory: user.moderationHistory || [] };
}
function notify(req, customerId) {
  req.app.get('io')?.to(`user:${customerId}`).emit('moderation:updated');
  const platform = req.platformId || req.user.platform;
  if (platform) req.app.get('io')?.to(`platform:${platform}`).emit('moderation:updated');
}

router.get('/overview', ...staff, handler(async (req, res) => {
  const conversations = await Conversation.find({ platform: req.platformId }).select('_id');
  const flags = await Message.find({ conversation: { $in: conversations.map((row) => row._id) }, moderation: 'held' }).populate('sender', 'displayName email').sort({ createdAt: 1 }).limit(100);
  const customers = await User.find({ role: 'customer' }).select('displayName email restriction moderationHistory').sort({ displayName: 1 });
  const requests = await SupportRequest.find({ status: { $ne: 'resolved' } }).populate('customer', 'displayName email').sort({ updatedAt: 1 }).limit(100);
  res.json({ flags, customers: customers.map(customerView), requests });
}));

router.post('/messages/:id/review', ...staff, handler(async (req, res) => {
  const decision = req.body.decision;
  if (!['release', 'reject'].includes(decision)) throw httpError(400, 'INVALID_DECISION', 'Choose release or confirm abuse.');
  const reason = text(req.body.reason);
  const candidate = await Message.findById(id(req.params.id));
  if (!candidate) throw httpError(404, 'NOT_FOUND', 'Message not found.');
  const conversation = await Conversation.findOne({ _id: candidate.conversation, platform: req.platformId });
  if (!conversation) throw httpError(403, 'FORBIDDEN', 'You cannot review this message.');
  const message = await Message.findOneAndUpdate({ _id: candidate._id, moderation: 'held' }, { $set: {
    moderation: decision === 'release' ? 'approved' : 'rejected', reviewedBy: req.user._id, reviewedAt: new Date(), reviewReason: reason,
  }, $push: { moderationHistory: { action: decision, reason, at: new Date(), staff: req.user._id } } }, { new: true }).populate('sender', 'displayName photoURL');
  if (!message) throw httpError(409, 'ALREADY_REVIEWED', 'This message has already been reviewed. Refresh the queue.');
  if (decision === 'release') {
    await Conversation.updateOne({ _id: conversation._id }, { $inc: { bakeryUnreadCount: 1 } });
    // Only replace the preview if this released message is newer than its current activity.
    await Conversation.updateOne({ _id: conversation._id, lastMessageAt: { $lte: message.createdAt } }, { $set: { lastMessageAt: message.createdAt, lastMessagePreview: message.text.slice(0, 160) } });
  }
  publishMessage(req.app.get('io'), conversation, message);
  notify(req, conversation.customer);
  res.json({ message });
}));

router.post('/messages/:id/flag', ...staff, handler(async (req, res) => {
  const candidate = await Message.findById(id(req.params.id));
  if (!candidate || candidate.senderRole !== 'customer' || !await Conversation.exists({ _id: candidate.conversation, platform: req.platformId })) throw httpError(404, 'NOT_FOUND', 'Customer message not found.');
  const reason = text(req.body.reason);
  const updated = await Message.findOneAndUpdate({ _id: candidate._id, moderation: { $nin: ['held', 'rejected'] } }, { $set: { moderation: 'held', flagReason: reason, flaggedBy: req.user._id, reviewedBy: null, reviewedAt: null, reviewReason: '' }, $push: { moderationHistory: { action: 'flag', reason, at: new Date(), staff: req.user._id } } }, { new: true });
  if (!updated) throw httpError(409, 'ALREADY_FLAGGED', 'Message is already held or reviewed.');
  // Previously delivered messages are removed when the conversation is refreshed.
  const latest = await Message.findOne({ conversation: candidate.conversation, moderation: { $nin: ['held', 'rejected'] } }).sort({ createdAt: -1 });
  const unread = await Message.countDocuments({ conversation: candidate.conversation, senderRole: 'customer', moderation: { $nin: ['held', 'rejected'] }, 'readBy.user': { $ne: req.user._id } });
  await Conversation.updateOne({ _id: candidate.conversation }, { $set: { lastMessagePreview: latest?.text.slice(0, 160) || '', lastMessageAt: latest?.createdAt || candidate.createdAt, bakeryUnreadCount: unread } });
  req.app.get('io')?.to(`conversation:${candidate.conversation}`).emit('message:moderated', { conversationId: String(candidate.conversation) });
  notify(req, candidate.sender);
  res.json({ message: updated });
}));

router.post('/customers/:id/restriction', ...staff, handler(async (req, res) => {
  const action = req.body.action;
  if (!['suspend', 'ban', 'restore'].includes(action)) throw httpError(400, 'INVALID_ACTION', 'Choose suspend, ban or restore.');
  const reason = text(req.body.reason);
  const target = await User.findOne({ _id: id(req.params.id), role: 'customer' });
  if (!target) throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Only customer accounts can be moderated.');
  const currentId = target.restriction?.id ? String(target.restriction.id) : null;
  if ((req.body.expectedRestrictionId || null) !== currentId) throw httpError(409, 'RESTRICTION_CHANGED', 'Another staff member changed this account. Refresh before proceeding.');
  let evidence = null;
  if (action !== 'restore') {
    // Any reservation history protects the customer, regardless of payment
    // or fulfillment status. Check again at action time, not just in the UI.
    if (await Reservation.exists({ user: target._id })) throw httpError(409, 'CUSTOMER_HAS_RESERVATION', 'Customers who have made a reservation cannot be suspended or banned.');
    if (req.body.acknowledged !== true) throw httpError(400, 'REVIEW_REQUIRED', 'Confirm you reviewed the evidence.');
    evidence = await Message.findOne({ _id: id(req.body.messageId), sender: target._id, senderRole: 'customer', moderation: 'rejected', reviewedAt: { $ne: null } });
    if (!evidence || !await Conversation.exists({ _id: evidence.conversation, platform: req.platformId })) throw httpError(400, 'REVIEW_REQUIRED', 'Review and confirm an abusive message before restricting its sender.');
  }
  const now = new Date();
  let expiresAt = null;
  if (action === 'suspend') {
    expiresAt = new Date(req.body.expiresAt);
    if (!req.body.expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= now) throw httpError(400, 'INVALID_EXPIRY', 'Choose a future suspension expiry.');
  }
  const restriction = action === 'restore' ? { type: 'none', id: null, reason: '', startedAt: null, expiresAt: null, staff: null } :
    { id: new mongoose.Types.ObjectId(), type: action === 'suspend' ? 'suspended' : 'banned', reason, startedAt: now, expiresAt, staff: req.user._id };
  const updated = await User.findOneAndUpdate({ _id: target._id, role: 'customer', 'restriction.id': currentId }, {
    $set: { restriction }, $push: { moderationHistory: { action, reason, at: now, expiresAt, staff: req.user._id, message: evidence?._id || null } },
  }, { new: true });
  if (!updated) throw httpError(409, 'RESTRICTION_CHANGED', 'Account changed. Refresh before proceeding.');
  notify(req, target._id);
  res.json({ customer: customerView(updated) });
}));

router.get('/customers/:id/evidence', ...staff, handler(async (req, res) => {
  const target = await User.findOne({ _id: id(req.params.id), role: 'customer' });
  if (!target) throw httpError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found.');
  const conversations = await Conversation.find({ customer: target._id, platform: req.platformId }).select('_id');
  const messages = await Message.find({ conversation: { $in: conversations.map((row) => row._id) }, sender: target._id }).sort({ createdAt: -1 }).limit(50);
  // Evidence must remain selectable even after newer messages displace it
  // from the recent-message list. Keep the same platform and sender scope.
  const confirmedEvidence = await Message.find({ conversation: { $in: conversations.map((row) => row._id) }, sender: target._id, senderRole: 'customer', moderation: 'rejected', reviewedAt: { $ne: null } }).sort({ reviewedAt: -1 }).limit(50);
  const hasReservation = Boolean(await Reservation.exists({ user: target._id }));
  res.json({ customer: { ...customerView(target), hasReservation }, messages, confirmedEvidence });
}));

router.get('/mine', customer, handler(async (req, res) => {
  const requests = await SupportRequest.find({ customer: req.user._id }).sort({ updatedAt: -1 }).limit(100);
  const orders = await Reservation.find({ user: req.user._id }).select('-blueprintUrl').sort({ createdAt: -1 });
  const blueprints = await Blueprint.find({ customer: req.user._id }).select('designName deliveryDate status quoteSnapshot paymentMode createdAt').sort({ createdAt: -1 });
  res.json({ restriction: effectiveRestriction(req.user), requests, orders, blueprints });
}));

router.get('/blueprints/:id/access', customer, handler(async (req, res) => {
  throw httpError(403, 'BLUEPRINT_STAFF_ONLY', 'Blueprint access is available only to bakery staff.');
}));

router.post('/requests', customer, handler(async (req, res) => {
  const content = text(req.body.text, 2000);
  const restriction = effectiveRestriction(req.user);
  const kind = req.body.kind;
  let order = null;
  let openKey;
  if (kind === 'appeal') {
    if (!restriction) throw httpError(400, 'NO_RESTRICTION', 'There is no active restriction to appeal.');
    openKey = `appeal:${req.user._id}:${restriction.id}`;
  } else if (kind === 'order') {
    const blueprint = req.body.orderType === 'blueprint';
    order = blueprint ? await Blueprint.findOne({ _id: id(req.body.orderId), customer: req.user._id }) : await Reservation.findOne({ _id: id(req.body.orderId), user: req.user._id });
    if (!order || restriction && order.createdAt > restriction.startedAt) throw httpError(403, 'ORDER_NOT_ELIGIBLE', 'Choose an existing order belonging to you.');
    openKey = `order:${req.user._id}:${req.body.orderType === 'blueprint' ? 'blueprint' : 'reservation'}:${order._id}`;
  } else throw httpError(400, 'INVALID_KIND', 'Choose an appeal or existing-order request.');
  const request = await SupportRequest.create({ customer: req.user._id, kind, restriction: restriction?.id, order: order?._id, orderType: req.body.orderType === 'blueprint' ? 'blueprint' : 'reservation', openKey,
    messages: [{ author: req.user._id, role: 'customer', text: content, at: new Date() }] });
  res.status(201).json({ request });
}));

router.post('/requests/:id/reply', handler(async (req, res) => {
  const isCustomer = req.user.role === 'customer';
  if (!isCustomer && !['bakery_staff', 'bakery_admin', 'platform_admin'].includes(req.user.role)) throw httpError(403, 'FORBIDDEN', 'Not permitted.');
  if (!isCustomer && !req.user.platform) throw httpError(403, 'FORBIDDEN', 'Bakery membership is required.');
  const content = text(req.body.text, 2000);
  const resolve = !isCustomer && req.body.resolve === true;
  const filter = { _id: id(req.params.id), status: isCustomer ? 'waiting_customer' : { $ne: 'resolved' }, 'messages.99': { $exists: false } };
  if (isCustomer) filter.customer = req.user._id;
  const request = await SupportRequest.findOneAndUpdate(filter, {
    $push: { messages: { author: req.user._id, role: isCustomer ? 'customer' : 'staff', text: content, at: new Date() } },
    $set: { status: resolve ? 'resolved' : isCustomer ? 'waiting_staff' : 'waiting_customer', ...(resolve ? { openKey: null } : {}) },
  }, { new: true });
  if (!request) throw httpError(409, 'REPLY_UNAVAILABLE', 'Wait for a staff response, or this request has closed/reached its message limit.');
  notify(req, request.customer);
  res.json({ request });
}));
module.exports = router;
