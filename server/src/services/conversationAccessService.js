const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Platform = require('../models/Platform');
const Reservation = require('../models/Reservation');

const BAKERY_ROLES = new Set(['bakery_staff', 'bakery_admin', 'platform_admin']);

function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function accountPlatformId(account) {
  return account?.platform?._id || account?.platform || null;
}

function canAccessConversation(account, conversation) {
  if (!account || !conversation) return false;
  if (account.role === 'customer') {
    return String(conversation.customer?._id || conversation.customer) === String(account._id);
  }
  if (BAKERY_ROLES.has(account.role)) {
    const platformId = accountPlatformId(account);
    return Boolean(platformId) && String(conversation.platform?._id || conversation.platform) === String(platformId);
  }
  return false;
}

async function findAccessibleConversation(account, conversationId, { populate = false } = {}) {
  if (!mongoose.isValidObjectId(conversationId)) {
    throw httpError(400, 'INVALID_CONVERSATION_ID', 'Invalid conversation ID.');
  }

  const filter = { _id: conversationId };
  if (account.role === 'customer') filter.customer = account._id;
  else {
    const platformId = accountPlatformId(account);
    if (!BAKERY_ROLES.has(account.role) || !platformId) {
      throw httpError(403, 'FORBIDDEN', 'You cannot access this conversation.');
    }
    filter.platform = platformId;
  }

  let query = Conversation.findOne(filter);
  if (populate) query = query.populate('customer', 'displayName email photoURL').populate('platform', 'name slug');
  const conversation = await query;
  if (!conversation) throw httpError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
  return conversation;
}

async function resolveCustomerPlatform(account, requestedPlatformId) {
  if (account.role !== 'customer') throw httpError(403, 'FORBIDDEN', 'Only customers can start conversations.');

  if (requestedPlatformId) {
    if (!mongoose.isValidObjectId(requestedPlatformId)) {
      throw httpError(400, 'INVALID_PLATFORM_ID', 'Invalid bakery ID.');
    }
    const platform = await Platform.findOne({ _id: requestedPlatformId, isActive: true });
    if (!platform) throw httpError(404, 'PLATFORM_NOT_FOUND', 'Bakery not found.');
    return platform;
  }

  const reservation = await Reservation.findOne({ user: account._id }).sort({ createdAt: -1 }).select('platform');
  if (reservation?.platform) {
    const platform = await Platform.findOne({ _id: reservation.platform, isActive: true });
    if (platform) return platform;
  }

  const platforms = await Platform.find({ isActive: true }).sort({ createdAt: 1 }).limit(2);
  if (platforms.length === 1) return platforms[0];
  throw httpError(409, 'PLATFORM_SELECTION_REQUIRED', 'Select a bakery before starting a conversation.');
}

module.exports = {
  BAKERY_ROLES,
  accountPlatformId,
  canAccessConversation,
  findAccessibleConversation,
  httpError,
  resolveCustomerPlatform,
};
