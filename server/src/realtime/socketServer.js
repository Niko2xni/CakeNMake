const { Server } = require('socket.io');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');
const { allowedOrigins } = require('../config/origins');
const { accountPlatformId, findAccessibleConversation } = require('../services/conversationAccessService');
const { createMessage, serializeMessage } = require('../services/messageService');
const { visibleMessageFilter, publishMessage } = require('../services/moderationService');

function socketError(code, message) {
  const error = new Error(message);
  error.data = { code };
  return error;
}

function createEventLimiter({ limit, windowMs }) {
  const buckets = new Map();
  return (key) => {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    bucket.count += 1;
    return bucket.count <= limit;
  };
}

const allowJoin = createEventLimiter({ limit: 30, windowMs: 60_000 });
const allowTyping = createEventLimiter({ limit: 1, windowMs: 1_000 });
const activeConnections = new Map();
const activeBakeryConnections = new Map();
const BAKERY_ROLES = new Set(['bakery_staff', 'bakery_admin', 'platform_admin']);

function bakeryPresenceRoom(platformId) {
  return `bakery-presence:${platformId}`;
}

function publishBakeryPresence(io, platformId) {
  if (!platformId) return;
  io.to(bakeryPresenceRoom(platformId)).emit('bakery:presence', {
    online: (activeBakeryConnections.get(String(platformId)) || 0) > 0,
  });
}

function acknowledgeFailure(acknowledge, error) {
  acknowledge?.({
    ok: false,
    code: error.code || error.data?.code || 'CHAT_EVENT_FAILED',
    message: error.message || 'The chat request failed.',
  });
}

function initializeSocketServer(httpServer, app) {
  const io = new Server(httpServer, {
    path: process.env.SOCKET_PATH || '/socket.io',
    cors: { origin: allowedOrigins, credentials: true, methods: ['GET', 'POST'] },
    maxHttpBufferSize: Number(process.env.SOCKET_MAX_HTTP_BUFFER_BYTES) || 1_000_000,
    pingInterval: Number(process.env.SOCKET_PING_INTERVAL_MS) || 25_000,
    pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT_MS) || 20_000,
  });

  io.use(async (socket, next) => {
    try {
      if (!firebaseAdminConfigured || !firebaseAdminAuth) return next(socketError('AUTH_NOT_CONFIGURED', 'Authentication is not configured.'));
      const token = socket.handshake.auth?.token;
      if (typeof token !== 'string' || !token) return next(socketError('AUTH_REQUIRED', 'Authentication is required.'));
      const claims = await firebaseAdminAuth.verifyIdToken(token);
      const account = await User.findOne({ firebaseUid: claims.uid, status: 'active' });
      if (!account) return next(socketError('APPLICATION_ACCOUNT_REQUIRED', 'An active application account is required.'));
      if ((activeConnections.get(String(account._id)) || 0) >= 5) {
        return next(socketError('CONNECTION_LIMIT_REACHED', 'Too many active chat connections.'));
      }
      socket.account = account;
      return next();
    } catch {
      return next(socketError('INVALID_AUTH_TOKEN', 'Your session is invalid or expired.'));
    }
  });

  io.on('connection', async (socket) => {
    const account = socket.account;
    const accountId = String(account._id);
    const platformId = accountPlatformId(account);
    const isBakeryAccount = BAKERY_ROLES.has(account.role) && Boolean(platformId);
    activeConnections.set(accountId, (activeConnections.get(accountId) || 0) + 1);
    if (isBakeryAccount) {
      const platformKey = String(platformId);
      activeBakeryConnections.set(platformKey, (activeBakeryConnections.get(platformKey) || 0) + 1);
    }
    socket.once('disconnect', () => {
      const remaining = Math.max(0, (activeConnections.get(accountId) || 1) - 1);
      if (remaining === 0) activeConnections.delete(accountId);
      else activeConnections.set(accountId, remaining);
      if (isBakeryAccount) {
        const platformKey = String(platformId);
        const remainingBakeryConnections = Math.max(0, (activeBakeryConnections.get(platformKey) || 1) - 1);
        if (remainingBakeryConnections === 0) activeBakeryConnections.delete(platformKey);
        else activeBakeryConnections.set(platformKey, remainingBakeryConnections);
        publishBakeryPresence(io, platformKey);
      }
    });
    await socket.join(`user:${account._id}`);
    if (platformId) await socket.join(`platform:${platformId}`);
    if (isBakeryAccount) publishBakeryPresence(io, String(platformId));

    socket.on('bakery:presence:watch', async ({ conversationId } = {}, acknowledge) => {
      try {
        if (account.role !== 'customer') throw Object.assign(new Error('Only customers can check bakery presence.'), { code: 'FORBIDDEN' });
        const conversation = await findAccessibleConversation(account, conversationId);
        const room = bakeryPresenceRoom(conversation.platform);
        await socket.join(room);
        acknowledge?.({
          ok: true,
          online: (activeBakeryConnections.get(String(conversation.platform)) || 0) > 0,
        });
      } catch (error) {
        acknowledgeFailure(acknowledge, error);
      }
    });

    socket.on('bakery:presence:unwatch', async ({ conversationId } = {}) => {
      try {
        if (account.role !== 'customer') return;
        const conversation = await findAccessibleConversation(account, conversationId);
        await socket.leave(bakeryPresenceRoom(conversation.platform));
      } catch {
        // Invalid presence subscriptions are intentionally ignored.
      }
    });

    socket.on('conversation:join', async ({ conversationId } = {}, acknowledge) => {
      try {
        if (!allowJoin(String(account._id))) throw Object.assign(new Error('Too many room requests.'), { code: 'RATE_LIMITED' });
        await findAccessibleConversation(account, conversationId);
        await socket.join(`conversation:${conversationId}`);
        acknowledge?.({ ok: true });
      } catch (error) {
        acknowledgeFailure(acknowledge, error);
      }
    });

    socket.on('conversation:leave', async ({ conversationId } = {}) => {
      if (conversationId) await socket.leave(`conversation:${conversationId}`);
    });

    socket.on('message:send', async (payload = {}, acknowledge) => {
      try {
        const result = await createMessage({
          account,
          conversationId: payload.conversationId,
          text: payload.text,
          clientMessageId: payload.clientMessageId,
          replyTo: payload.replyTo,
        });
        const message = serializeMessage(result.message);
        if (result.created) publishMessage(io, result.conversation, result.message);
        acknowledge?.({ ok: true, message });
      } catch (error) {
        acknowledgeFailure(acknowledge, error);
      }
    });

    socket.on('message:read', async ({ conversationId } = {}, acknowledge) => {
      try {
        const conversation = await findAccessibleConversation(account, conversationId);
        const now = new Date();
        await Message.updateMany(
          { conversation: conversation._id, sender: { $ne: account._id }, 'readBy.user': { $ne: account._id }, ...visibleMessageFilter(account) },
          { $push: { readBy: { user: account._id, readAt: now } } }
        );
        const field = account.role === 'customer' ? 'customerUnreadCount' : 'bakeryUnreadCount';
        await Conversation.updateOne({ _id: conversation._id }, { $set: { [field]: 0 } });
        io.to(`conversation:${conversationId}`).emit('message:read', {
          conversationId,
          userId: String(account._id),
          readAt: now,
        });
        acknowledge?.({ ok: true, readAt: now });
      } catch (error) {
        acknowledgeFailure(acknowledge, error);
      }
    });

    socket.on('typing:change', async ({ conversationId, isTyping } = {}) => {
      if (!allowTyping(String(account._id))) return;
      try {
        await findAccessibleConversation(account, conversationId);
        socket.to(`conversation:${conversationId}`).emit('typing:changed', {
          conversationId,
          userId: String(account._id),
          isTyping: Boolean(isTyping),
        });
      } catch {
        // Invalid room activity is intentionally ignored.
      }
    });
  });

  app.set('io', io);
  return io;
}

module.exports = initializeSocketServer;
