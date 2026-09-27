const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Reservation = require('../models/Reservation');
const {
  BAKERY_ROLES,
  accountPlatformId,
  findAccessibleConversation,
  httpError,
  resolveCustomerPlatform,
} = require('../services/conversationAccessService');
const { createMessage, serializeMessage } = require('../services/messageService');

function serializeConversation(conversation, account) {
  const value = conversation.toObject ? conversation.toObject() : conversation;
  const customer = value.customer && typeof value.customer === 'object'
    ? {
      id: String(value.customer._id),
      displayName: value.customer.displayName || '',
      email: value.customer.email || '',
      photoURL: value.customer.photoURL || null,
    }
    : { id: String(value.customer) };
  const platform = value.platform && typeof value.platform === 'object'
    ? { id: String(value.platform._id), name: value.platform.name, slug: value.platform.slug }
    : { id: String(value.platform) };

  return {
    id: String(value._id),
    customer,
    platform,
    reservationId: value.reservation ? String(value.reservation) : null,
    assignedStaffId: value.assignedStaff ? String(value.assignedStaff) : null,
    status: value.status,
    lastMessageAt: value.lastMessageAt,
    lastMessagePreview: value.lastMessagePreview,
    unreadCount: account.role === 'customer' ? value.customerUnreadCount : value.bakeryUnreadCount,
    createdAt: value.createdAt,
  };
}

function sendError(res, error) {
  if (error.status && error.code) return res.status(error.status).json({ code: error.code, message: error.message });
  console.error('Conversation request failed:', error);
  return res.status(500).json({ code: 'CHAT_REQUEST_FAILED', message: 'The chat request could not be completed.' });
}

async function listConversations(req, res) {
  try {
    const filter = req.user.role === 'customer'
      ? { customer: req.user._id }
      : { platform: accountPlatformId(req.user) };
    if (!filter.customer && !filter.platform) throw httpError(403, 'PLATFORM_MEMBERSHIP_REQUIRED', 'A bakery assignment is required.');

    const conversations = await Conversation.find(filter)
      .populate('customer', 'displayName email photoURL')
      .populate('platform', 'name slug')
      .sort({ lastMessageAt: -1 });
    return res.json({ conversations: conversations.map((item) => serializeConversation(item, req.user)) });
  } catch (error) {
    return sendError(res, error);
  }
}

async function createConversation(req, res) {
  try {
    const platform = await resolveCustomerPlatform(req.user, req.body.platformId);
    let conversation = await Conversation.findOne({ customer: req.user._id, platform: platform._id });
    if (!conversation) {
      const reservation = await Reservation.findOne({ user: req.user._id, platform: platform._id })
        .sort({ createdAt: -1 })
        .select('_id');
      try {
        conversation = await Conversation.create({
          customer: req.user._id,
          platform: platform._id,
          reservation: reservation?._id || null,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        conversation = await Conversation.findOne({ customer: req.user._id, platform: platform._id });
      }
    }
    await conversation.populate('customer', 'displayName email photoURL');
    conversation.platform = platform;
    return res.status(201).json({ conversation: serializeConversation(conversation, req.user) });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getMessages(req, res) {
  try {
    const conversation = await findAccessibleConversation(req.user, req.params.id);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 30, 1), 100);
    const filter = { conversation: conversation._id };
    if (req.query.before) {
      if (!mongoose.isValidObjectId(req.query.before)) throw httpError(400, 'INVALID_CURSOR', 'Invalid message cursor.');
      filter._id = { $lt: req.query.before };
    }
    const rows = await Message.find(filter)
      .populate('sender', 'displayName photoURL')
      .sort({ _id: -1 })
      .limit(limit + 1);
    const hasMore = rows.length > limit;
    const page = rows.slice(0, limit).reverse();
    return res.json({
      messages: page.map(serializeMessage),
      nextCursor: hasMore ? String(page[0]._id) : null,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function postMessage(req, res) {
  try {
    const result = await createMessage({
      account: req.user,
      conversationId: req.params.id,
      text: req.body.text,
      clientMessageId: req.body.clientMessageId,
      replyTo: req.body.replyTo,
    });
    const message = serializeMessage(result.message);
    const io = req.app.get('io');
    io?.to(`conversation:${req.params.id}`).emit('message:new', message);
    io?.to(`platform:${result.conversation.platform}`).emit('conversation:updated', { conversationId: req.params.id });
    io?.to(`user:${result.conversation.customer}`).emit('conversation:updated', { conversationId: req.params.id });
    return res.status(201).json({ message });
  } catch (error) {
    return sendError(res, error);
  }
}

async function markRead(req, res) {
  try {
    const conversation = await findAccessibleConversation(req.user, req.params.id);
    const now = new Date();
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, 'readBy.user': { $ne: req.user._id } },
      { $push: { readBy: { user: req.user._id, readAt: now } } }
    );
    const field = req.user.role === 'customer' ? 'customerUnreadCount' : 'bakeryUnreadCount';
    await Conversation.updateOne({ _id: conversation._id }, { $set: { [field]: 0 } });
    req.app.get('io')?.to(`conversation:${req.params.id}`).emit('message:read', {
      conversationId: req.params.id,
      userId: String(req.user._id),
      readAt: now,
    });
    return res.json({ ok: true, readAt: now });
  } catch (error) {
    return sendError(res, error);
  }
}

async function updateStatus(req, res) {
  try {
    if (!BAKERY_ROLES.has(req.user.role)) throw httpError(403, 'FORBIDDEN', 'Only bakery staff can change chat status.');
    if (!['open', 'closed'].includes(req.body.status)) throw httpError(400, 'INVALID_STATUS', 'Invalid conversation status.');
    const conversation = await findAccessibleConversation(req.user, req.params.id);
    conversation.status = req.body.status;
    await conversation.save();
    req.app.get('io')?.to(`conversation:${req.params.id}`).emit('conversation:updated', {
      conversationId: req.params.id,
      status: conversation.status,
    });
    return res.json({ conversation: serializeConversation(conversation, req.user) });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createConversation,
  getMessages,
  listConversations,
  markRead,
  postMessage,
  serializeConversation,
  updateStatus,
};
