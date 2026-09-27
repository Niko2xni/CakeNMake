const mongoose = require('mongoose');

const readReceiptSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, required: true },
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: {
    type: String,
    enum: ['customer', 'bakery_staff', 'bakery_admin', 'platform_admin'],
    required: true,
  },
  type: { type: String, enum: ['text'], default: 'text', required: true },
  text: { type: String, required: true, minlength: 1, maxlength: 4000 },
  clientMessageId: { type: String, required: true, maxlength: 100 },
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
  readBy: { type: [readReceiptSchema], default: [] },
  editedAt: { type: Date, default: null },
}, { timestamps: true });

messageSchema.index({ conversation: 1, createdAt: -1, _id: -1 });
messageSchema.index(
  { conversation: 1, sender: 1, clientMessageId: 1 },
  { unique: true }
);

module.exports = mongoose.model('Message', messageSchema);
