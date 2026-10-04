const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { findAccessibleConversation, httpError } = require('./conversationAccessService');
const { assertCustomerMayAct, screenMessage } = require('./moderationService');

function normalizeMessageText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

function serializeMessage(message) {
  const value = message.toObject ? message.toObject() : message;
  const sender = value.sender && typeof value.sender === 'object'
    ? {
      id: String(value.sender._id),
      displayName: value.sender.displayName || '',
      photoURL: value.sender.photoURL || null,
    }
    : { id: String(value.sender) };

  return {
    id: String(value._id),
    conversationId: String(value.conversation),
    sender,
    senderRole: value.senderRole,
    type: value.type,
    text: value.text,
    clientMessageId: value.clientMessageId,
    replyTo: value.replyTo ? String(value.replyTo) : null,
    readBy: (value.readBy || []).map((receipt) => ({
      userId: String(receipt.user),
      readAt: receipt.readAt,
    })),
    createdAt: value.createdAt,
    editedAt: value.editedAt,
    moderation: value.moderation || 'approved',
  };
}

async function createMessage({ account, conversationId, text, clientMessageId, replyTo = null }) {
  account = await assertCustomerMayAct(account);
  const conversation = await findAccessibleConversation(account, conversationId);
  if (conversation.status !== 'open') {
    throw httpError(409, 'CONVERSATION_CLOSED', 'This conversation is closed.');
  }

  const normalizedText = normalizeMessageText(text);
  if (!normalizedText) throw httpError(400, 'MESSAGE_REQUIRED', 'Enter a message.');
  if (normalizedText.length > 4000) throw httpError(400, 'MESSAGE_TOO_LONG', 'Messages may contain up to 4,000 characters.');
  if (typeof clientMessageId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(clientMessageId)) {
    throw httpError(400, 'INVALID_CLIENT_MESSAGE_ID', 'A valid client message ID is required.');
  }
  const existing = await Message.findOne({ conversation: conversation._id, sender: account._id, clientMessageId });
  if (existing) return { conversation, message: await Message.findById(existing._id).populate('sender', 'displayName photoURL'), created: false };

  let replyMessage = null;
  if (replyTo) {
    replyMessage = await Message.findOne({ _id: replyTo, conversation: conversation._id, moderation: { $nin: ['held', 'rejected'] } }).select('_id');
    if (!replyMessage) throw httpError(400, 'INVALID_REPLY', 'The replied-to message was not found.');
  }
  const screening = await screenMessage(account, conversation._id, clientMessageId, normalizedText);

  let message;
  let created = true;
  try {
    message = await Message.create({
      conversation: conversation._id,
      sender: account._id,
      senderRole: account.role,
      type: 'text',
      text: normalizedText,
      clientMessageId,
      replyTo: replyMessage?._id || null,
      readBy: [{ user: account._id, readAt: new Date() }],
      moderation: screening.held ? 'held' : 'approved',
      flagReason: screening.reason || '',
      moderationHistory: screening.held ? [{ action: 'flag', reason: screening.reason, at: new Date(), staff: null }] : [],
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    created = false;
    message = await Message.findOne({
      conversation: conversation._id,
      sender: account._id,
      clientMessageId,
    });
    if (!message) throw error;
  }

  if (created && !screening.held) {
    const fromCustomer = account.role === 'customer';
    await Conversation.updateOne(
      { _id: conversation._id },
      {
        $set: {
          lastMessageAt: message.createdAt,
          lastMessagePreview: normalizedText.slice(0, 160),
        },
        $inc: fromCustomer ? { bakeryUnreadCount: 1 } : { customerUnreadCount: 1 },
      }
    );
  }

  const populated = await Message.findById(message._id).populate('sender', 'displayName photoURL');
  return { conversation, message: populated, created };
}

module.exports = { createMessage, normalizeMessageText, serializeMessage };
