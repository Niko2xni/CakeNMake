const { Server } = require('socket.io');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { firebaseAdminAuth, firebaseAdminConfigured } = require('../config/firebaseAdmin');
const { allowedOrigins } = require('../config/origins');
const { accountPlatformId, findAccessibleConversation } = require('../services/conversationAccessService');
const { createMessage, serializeMessage } = require('../services/messageService');

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

const allowMessage = createEventLimiter({ limit: 20, windowMs: 60_000 });
const allowJoin = createEventLimiter({ limit: 30, windowMs: 60_000 });
const allowTyping = createEventLimiter({ limit: 1, windowMs: 1_000 });
const activeConnections = new Map();

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
    activeConnections.set(accountId, (activeConnections.get(accountId) || 0) + 1);
    socket.once('disconnect', () => {
      const remaining = Math.max(0, (activeConnections.get(accountId) || 1) - 1);
      if (remaining === 0) activeConnections.delete(accountId);
      else activeConnections.set(accountId, remaining);
    });
    await socket.join(`user:${account._id}`);
    const platformId = accountPlatformId(account);
    if (platformId) await socket.join(`platform:${platformId}`);

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
        if (!allowMessage(String(account._id))) throw Object.assign(new Error('Too many messages. Try again shortly.'), { code: 'RATE_LIMITED' });
        const result = await createMessage({
          account,
          conversationId: payload.conversationId,
          text: payload.text,
          clientMessageId: payload.clientMessageId,
          replyTo: payload.replyTo,
        });
        const message = serializeMessage(result.message);
        io.to(`conversation:${payload.conversationId}`).emit('message:new', message);
        io.to(`platform:${result.conversation.platform}`).emit('conversation:updated', { conversationId: payload.conversationId });
        io.to(`user:${result.conversation.customer}`).emit('conversation:updated', { conversationId: payload.conversationId });
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
          { conversation: conversation._id, sender: { $ne: account._id }, 'readBy.user': { $ne: account._id } },
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
