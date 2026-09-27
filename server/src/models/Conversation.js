const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
  reservation: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', default: null },
  assignedStaff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
  lastMessageAt: { type: Date, default: Date.now, index: true },
  lastMessagePreview: { type: String, maxlength: 160, default: '' },
  customerUnreadCount: { type: Number, min: 0, default: 0 },
  bakeryUnreadCount: { type: Number, min: 0, default: 0 },
}, { timestamps: true });

conversationSchema.index({ customer: 1, platform: 1 }, { unique: true });
conversationSchema.index({ platform: 1, lastMessageAt: -1 });
conversationSchema.index({ customer: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
