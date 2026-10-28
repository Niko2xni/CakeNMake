const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Reservation = require('../models/Reservation');
const Blueprint = require('../models/Blueprint');
const User = require('../models/User');
const {
  BAKERY_ROLES,
  accountPlatformId,
  findAccessibleConversation,
  httpError,
  resolveCustomerPlatform,
} = require('../services/conversationAccessService');
const { createMessage, serializeMessage } = require('../services/messageService');
const { visibleMessageFilter, publishMessage } = require('../services/moderationService');

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
    const filter = { conversation: conversation._id, ...visibleMessageFilter(req.user) };
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
    if (result.created) publishMessage(io, result.conversation, result.message);
    return res.status(201).json({ message });
  } catch (error) {
    return sendError(res, error);
  }
}

async function postOrderAcknowledgement(req, res) {
  try {
    if (req.user.role !== 'customer') throw httpError(403, 'FORBIDDEN', 'Only customers can request an order acknowledgement.');
    const { submissionId } = req.body || {};
    if (typeof submissionId !== 'string' || !/^[a-zA-Z0-9_-]{16,100}$/.test(submissionId)) {
      throw httpError(400, 'INVALID_SUBMISSION_ID', 'A valid order submission ID is required.');
    }

    const conversation = await findAccessibleConversation(req.user, req.params.id);
    if (conversation.status !== 'open') {
      throw httpError(409, 'CONVERSATION_CLOSED', 'This conversation is closed.');
    }
    const blueprint = await Blueprint.findOne({
      submissionId,
      customer: req.user._id,
      platform: conversation.platform,
      status: 'ready',
    });
    if (!blueprint) throw httpError(404, 'ORDER_NOT_FOUND', 'The submitted order could not be found.');

    const clientMessageId = `order_received_${createHash('sha256').update(submissionId).digest('hex')}`;
    const acknowledgementFilter = {
      conversation: conversation._id,
      clientMessageId,
      senderRole: { $in: ['bakery_admin', 'bakery_staff'] },
    };
    let message = await Message.findOne(acknowledgementFilter);
    if (message) return res.status(200).json({ message: serializeMessage(message) });

    const bakerySender = await User.findOne({
      platform: conversation.platform,
      role: { $in: ['bakery_admin', 'bakery_staff'] },
      status: 'active',
    });
    if (!bakerySender) {
      throw httpError(503, 'BAKERY_UNAVAILABLE', 'The bakery cannot receive chat messages right now. Please try again shortly.');
    }

    const text = "We have received your design and payment details. Since your remaining balance is already shown in your order summary, please chat with the bakery here on how to get your cake and how you want it to be. Checkout is simulated; no money has been collected.";
    let created = true;
    try {
      message = await Message.create({
        conversation: conversation._id,
        sender: bakerySender._id,
        senderRole: bakerySender.role,
        type: 'text',
        text,
        clientMessageId,
        readBy: [],
        moderation: 'approved',
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      created = false;
      message = await Message.findOne(acknowledgementFilter);
      if (!message) throw error;
    }

    if (created) {
      await Conversation.updateOne(
        { _id: conversation._id },
        {
          $set: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: text.slice(0, 160),
          },
          $inc: { customerUnreadCount: 1 },
        },
      );
      publishMessage(req.app.get('io'), conversation, message);
    }
    return res.status(created ? 201 : 200).json({ message: serializeMessage(message) });
  } catch (error) {
    return sendError(res, error);
  }
}

async function markRead(req, res) {
  try {
    const conversation = await findAccessibleConversation(req.user, req.params.id);
    const now = new Date();
    await Message.updateMany(
      { conversation: conversation._id, sender: { $ne: req.user._id }, 'readBy.user': { $ne: req.user._id }, ...visibleMessageFilter(req.user) },
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
  postOrderAcknowledgement,
  postMessage,
  serializeConversation,
  updateStatus,
};
