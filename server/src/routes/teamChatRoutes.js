const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const TeamMessage = require('../models/TeamMessage');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole, requirePlatformMembership } = require('../middleware/authorize');
const { normalizeMessageText } = require('../services/messageService');

const router = express.Router();
router.use(authenticate, loadAppUser);

const bakeryOnly = [
  requireRole('bakery_staff', 'bakery_admin', 'platform_admin'),
  requirePlatformMembership,
];

const BAKERY_ROLES = ['bakery_staff', 'bakery_admin', 'platform_admin'];
const ALLOWED_TYPES = new Set(['text', 'image', 'video', 'audio', 'document', 'file', 'like']);

function buildDmChannelKey(userIdA, userIdB) {
  const sorted = [String(userIdA), String(userIdB)].sort();
  return `dm:${sorted[0]}:${sorted[1]}`;
}

function serializeTeamMessage(doc) {
  const value = doc.toObject ? doc.toObject() : doc;
  const sender = value.sender && typeof value.sender === 'object'
    ? {
        id: String(value.sender._id),
        displayName: value.sender.displayName || value.sender.email?.split('@')[0] || 'Team Member',
        email: value.sender.email || '',
        photoURL: value.sender.photoURL || null,
        role: value.sender.role || value.senderRole,
      }
    : {
        id: String(value.sender),
        displayName: 'Team Member',
        role: value.senderRole,
      };

  return {
    id: String(value._id),
    channelKey: value.channelKey,
    channelType: value.channelType,
    sender,
    senderRole: value.senderRole,
    type: value.type || 'text',
    text: value.text || '',
    fileUrl: value.fileUrl || null,
    fileName: value.fileName || '',
    fileSize: value.fileSize || 0,
    duration: value.duration || null,
    replyTo: value.replyTo || null,
    pinned: Boolean(value.pinned),
    pinnedAt: value.pinnedAt || null,
    createdAt: value.createdAt,
  };
}

async function resolveChannelAccess(req, rawChannelKey, recipientId) {
  const platformId = req.platformId || req.user.platform;
  const selfId = String(req.user._id);

  if (recipientId) {
    if (!mongoose.isValidObjectId(recipientId)) {
      const err = new Error('Invalid recipient ID.');
      err.status = 400;
      throw err;
    }
    if (String(recipientId) === selfId) {
      const err = new Error('Cannot open a direct chat with yourself.');
      err.status = 400;
      throw err;
    }
    const targetMember = await User.findOne({
      _id: recipientId,
      platform: platformId,
      role: { $in: BAKERY_ROLES },
    }).select('_id displayName email photoURL role');

    if (!targetMember) {
      const err = new Error('Team member not found in your bakery workspace.');
      err.status = 404;
      throw err;
    }

    return {
      channelKey: buildDmChannelKey(selfId, targetMember._id),
      channelType: 'direct',
      participants: [req.user._id, targetMember._id],
      recipient: targetMember,
    };
  }

  const channelKey = String(rawChannelKey || 'general').trim();
  if (channelKey === 'general') {
    return {
      channelKey: 'general',
      channelType: 'group',
      participants: [],
      recipient: null,
    };
  }

  if (channelKey.startsWith('dm:')) {
    const parts = channelKey.split(':');
    if (parts.length !== 3) {
      const err = new Error('Invalid direct message channel key.');
      err.status = 400;
      throw err;
    }
    const [, idA, idB] = parts;
    if (idA !== selfId && idB !== selfId) {
      const err = new Error('You do not have access to this direct message thread.');
      err.status = 403;
      throw err;
    }
    const otherId = idA === selfId ? idB : idA;
    if (!mongoose.isValidObjectId(otherId)) {
      const err = new Error('Invalid direct message participant.');
      err.status = 400;
      throw err;
    }
    const targetMember = await User.findOne({
      _id: otherId,
      platform: platformId,
      role: { $in: BAKERY_ROLES },
    }).select('_id displayName email photoURL role');

    if (!targetMember) {
      const err = new Error('Team member not found in your bakery workspace.');
      err.status = 404;
      throw err;
    }

    return {
      channelKey: buildDmChannelKey(selfId, targetMember._id),
      channelType: 'direct',
      participants: [req.user._id, targetMember._id],
      recipient: targetMember,
    };
  }

  const err = new Error('Unsupported team chat channel.');
  err.status = 400;
  throw err;
}

// GET /api/bakery/team-chat/channels
router.get('/channels', ...bakeryOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    const selfId = String(req.user._id);

    const employees = await User.find({
      platform: platformId,
      role: { $in: BAKERY_ROLES },
    })
      .select('_id email displayName photoURL role status createdAt')
      .sort({ role: 1, displayName: 1, createdAt: 1 });

    const otherMembers = employees.filter((emp) => String(emp._id) !== selfId);
    const dmChannelKeys = otherMembers.map((emp) => buildDmChannelKey(selfId, emp._id));
    const allKeys = ['general', ...dmChannelKeys];

    const recentMessages = await TeamMessage.find({
      platform: platformId,
      channelKey: { $in: allKeys },
    })
      .populate('sender', 'displayName email role')
      .sort({ createdAt: -1 })
      .limit(300);

    const latestByKey = new Map();
    const unreadByKey = new Map();

    for (const msg of recentMessages) {
      const key = msg.channelKey;
      if (!latestByKey.has(key)) {
        latestByKey.set(key, msg);
      }
      const isFromSelf = String(msg.sender?._id || msg.sender) === selfId;
      const hasRead = (msg.readBy || []).some((r) => String(r.user) === selfId);
      if (!isFromSelf && !hasRead) {
        unreadByKey.set(key, (unreadByKey.get(key) || 0) + 1);
      }
    }

    const generalLatest = latestByKey.get('general');
    const generalPreviewText = generalLatest
      ? generalLatest.text || (generalLatest.type === 'like' ? '👍' : generalLatest.fileName || 'Shared attachment')
      : '';
    const generalChannel = {
      channelKey: 'general',
      channelType: 'group',
      name: 'Bakery Team Room',
      subtitle: 'All Admin & Staff Members',
      memberCount: employees.length,
      lastMessageAt: generalLatest?.createdAt || null,
      lastMessagePreview: generalLatest
        ? `${generalLatest.sender?.displayName || generalLatest.sender?.email?.split('@')[0] || 'Team'}: ${generalPreviewText}`
        : 'Shared channel for admin & staff coordination',
      unreadCount: unreadByKey.get('general') || 0,
    };

    const members = otherMembers.map((emp) => {
      const key = buildDmChannelKey(selfId, emp._id);
      const latest = latestByKey.get(key);
      const preview = latest
        ? latest.text || (latest.type === 'like' ? '👍' : latest.fileName || 'Shared attachment')
        : '';
      return {
        id: String(emp._id),
        channelKey: key,
        channelType: 'direct',
        displayName: emp.displayName || emp.email?.split('@')[0] || 'Team Member',
        email: emp.email || '',
        photoURL: emp.photoURL || null,
        role: emp.role,
        lastMessageAt: latest?.createdAt || null,
        lastMessagePreview: preview,
        unreadCount: unreadByKey.get(key) || 0,
      };
    });

    members.sort((a, b) => {
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      if (timeA !== timeB) return timeB - timeA;
      const aIsAdmin = a.role === 'bakery_admin' || a.role === 'platform_admin' ? 0 : 1;
      const bIsAdmin = b.role === 'bakery_admin' || b.role === 'platform_admin' ? 0 : 1;
      if (aIsAdmin !== bIsAdmin) return aIsAdmin - bIsAdmin;
      return a.displayName.localeCompare(b.displayName);
    });

    return res.json({
      generalChannel,
      members,
      totalTeamMembers: employees.length,
    });
  } catch (error) {
    console.error('Failed to list team chat channels:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Failed to load team chat channels.' });
  }
});

// GET /api/bakery/team-chat/messages
router.get('/messages', ...bakeryOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    const { channelKey } = await resolveChannelAccess(req, req.query.channelKey, req.query.recipientId);

    const rows = await TeamMessage.find({
      platform: platformId,
      channelKey,
    })
      .populate('sender', 'displayName email photoURL role')
      .sort({ createdAt: -1, _id: -1 })
      .limit(100);

    await TeamMessage.updateMany(
      {
        platform: platformId,
        channelKey,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id },
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } },
      }
    );

    const chronological = rows.reverse().map(serializeTeamMessage);
    return res.json({ channelKey, messages: chronological });
  } catch (error) {
    console.error('Failed to load team chat messages:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Failed to load team messages.' });
  }
});

// POST /api/bakery/team-chat/messages
router.post('/messages', ...bakeryOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    const {
      channelKey: rawChannelKey,
      recipientId,
      text,
      type: rawType = 'text',
      fileUrl = null,
      fileName = '',
      fileSize = 0,
      duration = null,
      replyTo = null,
    } = req.body || {};

    const msgType = ALLOWED_TYPES.has(rawType) ? rawType : 'text';
    const normalizedText = normalizeMessageText(text || (msgType === 'like' ? '👍' : ''));
    if (!normalizedText && !fileUrl) {
      return res.status(400).json({ message: 'Please enter a message or attachment.' });
    }
    if (normalizedText.length > 4000) {
      return res.status(400).json({ message: 'Message cannot exceed 4,000 characters.' });
    }

    const { channelKey, channelType, participants, recipient } = await resolveChannelAccess(
      req,
      rawChannelKey,
      recipientId
    );

    const created = await TeamMessage.create({
      platform: platformId,
      channelType,
      channelKey,
      participants,
      sender: req.user._id,
      senderRole: req.user.role,
      type: msgType,
      text: normalizedText,
      fileUrl: typeof fileUrl === 'string' ? fileUrl : null,
      fileName: typeof fileName === 'string' ? fileName.slice(0, 200) : '',
      fileSize: Number(fileSize) || 0,
      duration: Number(duration) || null,
      replyTo: replyTo || null,
      readBy: [{ user: req.user._id, readAt: new Date() }],
    });

    const populated = await TeamMessage.findById(created._id).populate(
      'sender',
      'displayName email photoURL role'
    );

    const serialized = serializeTeamMessage(populated);
    const io = req.app.get('io');
    if (io) {
      if (channelType === 'group') {
        io.to(`platform:${platformId}`).emit('team:message:new', serialized);
      } else if (recipient) {
        io.to(`user:${req.user._id}`).to(`user:${recipient._id}`).emit('team:message:new', serialized);
      }
    }

    return res.status(201).json({ message: serialized });
  } catch (error) {
    console.error('Failed to send team chat message:', error);
    return res.status(error.status || 500).json({ message: error.message || 'Failed to send team message.' });
  }
});

// PATCH /api/bakery/team-chat/messages/:id/pin
router.patch('/messages/:id/pin', ...bakeryOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    const messageId = req.params.id;
    if (!mongoose.isValidObjectId(messageId)) {
      return res.status(400).json({ message: 'Invalid message ID.' });
    }
    const msg = await TeamMessage.findOne({ _id: messageId, platform: platformId });
    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }
    msg.pinned = !msg.pinned;
    msg.pinnedAt = msg.pinned ? new Date() : null;
    await msg.save();

    const populated = await TeamMessage.findById(msg._id).populate(
      'sender',
      'displayName email photoURL role'
    );
    return res.json({ message: serializeTeamMessage(populated) });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update pin status.' });
  }
});

// PATCH /api/bakery/team-chat/read
router.patch('/read', ...bakeryOnly, async (req, res) => {
  try {
    const platformId = req.platformId || req.user.platform;
    const { channelKey } = await resolveChannelAccess(req, req.body?.channelKey, req.body?.recipientId);

    await TeamMessage.updateMany(
      {
        platform: platformId,
        channelKey,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id },
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } },
      }
    );

    return res.json({ ok: true, channelKey });
  } catch (error) {
    return res.status(error.status || 500).json({ message: error.message || 'Failed to mark channel read.' });
  }
});

module.exports = router;
module.exports.buildDmChannelKey = buildDmChannelKey;
