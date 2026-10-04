const { createHash } = require('node:crypto');
const User = require('../models/User');
const ChatGate = require('../models/ChatGate');
const { httpError } = require('./conversationAccessService');

function effectiveRestriction(account, now = new Date()) {
  const restriction = account?.restriction;
  if (account?.role !== 'customer' || !restriction || restriction.type === 'none') return null;
  if (restriction.type === 'suspended' && restriction.expiresAt && new Date(restriction.expiresAt) <= now) return null;
  return restriction;
}

async function assertCustomerMayAct(account) {
  const current = await User.findById(account._id);
  if (!current || current.status !== 'active') throw httpError(403, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
  const restriction = effectiveRestriction(current);
  if (restriction) throw httpError(403, 'CUSTOMER_RESTRICTED', `Your account is ${restriction.type}. Chatting and new orders are unavailable. Existing orders and support remain accessible.`);
  return current;
}

function spamFingerprint(text) {
  return createHash('sha256').update(text.toLowerCase().replace(/\s+/g, ' ').trim()).digest('hex');
}

// One atomic Mongo update per account: shared by HTTP, sockets, tabs and server processes.
async function screenMessage(account, conversationId, clientMessageId, text, now = new Date()) {
  if (account.role !== 'customer') return { held: false };
  const key = `${conversationId}:${clientMessageId}`;
  const hash = spamFingerprint(text);
  try { await ChatGate.updateOne({ _id: account._id }, { $setOnInsert: { entries: [], cooldownUntil: null } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const gate = await ChatGate.findOneAndUpdate({ _id: account._id }, [
    { $set: { entries: { $filter: { input: '$entries', as: 'entry', cond: { $gt: ['$$entry.at', new Date(now.getTime() - 60_000)] } } } } },
    { $set: {
      duplicate: { $in: [{ $literal: key }, { $map: { input: '$entries', as: 'entry', in: '$$entry.key' } }] },
      held: { $gte: [{ $size: { $filter: { input: '$entries', as: 'entry', cond: { $eq: ['$$entry.hash', { $literal: hash }] } } } }, 2] },
      allowed: { $and: [{ $lt: [{ $size: '$entries' }, 10] }, { $lte: [{ $ifNull: ['$cooldownUntil', new Date(0)] }, now] }] },
    } },
    { $set: {
      entries: { $cond: [{ $and: ['$allowed', { $not: ['$duplicate'] }] }, { $concatArrays: ['$entries', [{ key: { $literal: key }, hash: { $literal: hash }, at: now, held: '$held' }]] }, '$entries'] },
      cooldownUntil: { $cond: [{ $and: [{ $not: ['$duplicate'] }, { $not: ['$allowed'] }, { $lte: [{ $ifNull: ['$cooldownUntil', new Date(0)] }, now] }] }, new Date(now.getTime() + 60_000), '$cooldownUntil'] },
    } },
    { $unset: ['duplicate', 'held', 'allowed'] },
  ], { new: true, updatePipeline: true });
  const entry = gate.entries.find((item) => item.key === key);
  if (!entry) throw httpError(429, 'CHAT_COOLDOWN', `Sending limit reached. Try again in ${Math.max(1, Math.ceil((new Date(gate.cooldownUntil) - now) / 1000))} seconds.`);
  return { held: entry.held, reason: entry.held ? 'Repeated identical message within 60 seconds' : '' };
}

function visibleMessageFilter(account) {
  return account.role === 'customer' ? {} : { moderation: { $nin: ['held', 'rejected'] } };
}

function publishMessage(io, conversation, message) {
  const { serializeMessage } = require('./messageService');
  const serialized = serializeMessage(message);
  if (message.moderation === 'held' || message.moderation === 'rejected') {
    io?.to(`user:${conversation.customer}`).emit('message:new', serialized);
    io?.to(`platform:${conversation.platform}`).emit('moderation:updated');
  } else {
    io?.to(`conversation:${conversation._id}`).emit('message:new', serialized);
    io?.to(`platform:${conversation.platform}`).emit('conversation:updated', { conversationId: String(conversation._id) });
    io?.to(`user:${conversation.customer}`).emit('conversation:updated', { conversationId: String(conversation._id) });
  }
}
module.exports = { effectiveRestriction, assertCustomerMayAct, spamFingerprint, screenMessage, visibleMessageFilter, publishMessage };
