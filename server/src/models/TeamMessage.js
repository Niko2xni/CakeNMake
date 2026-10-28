const mongoose = require('mongoose');

const teamReadReceiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, default: Date.now },
}, { _id: false });

const teamMessageSchema = new mongoose.Schema({
  platform: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Platform',
    required: true,
    index: true,
  },
  channelType: {
    type: String,
    enum: ['group', 'direct'],
    default: 'group',
    required: true,
  },
  channelKey: {
    type: String,
    required: true,
    index: true,
  },
  participants: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderRole: {
    type: String,
    enum: ['bakery_staff', 'bakery_admin', 'platform_admin'],
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'file', 'like'],
    default: 'text',
  },
  text: {
    type: String,
    default: '',
    maxlength: 4000,
  },
  fileUrl: {
    type: String,
    default: null,
  },
  fileName: {
    type: String,
    default: '',
  },
  fileSize: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number,
    default: null,
  },
  replyTo: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  pinned: {
    type: Boolean,
    default: false,
  },
  pinnedAt: {
    type: Date,
    default: null,
  },
  readBy: {
    type: [teamReadReceiptSchema],
    default: [],
  },
}, { timestamps: true });

teamMessageSchema.index({ platform: 1, channelKey: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model('TeamMessage', teamMessageSchema);
