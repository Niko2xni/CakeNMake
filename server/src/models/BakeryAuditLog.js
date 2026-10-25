const mongoose = require('mongoose');

const bakeryAuditLogSchema = new mongoose.Schema(
  {
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', default: null, index: true },
    type: {
      type: String,
      enum: ['template', 'pricing'],
      required: true,
      index: true,
    },
    action: {
      type: String, // 'create', 'update', 'delete', 'rate_change', 'schedule', 'revert', 'publish'
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    changedByName: { type: String, default: 'Bakery Staff' },
    details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    scheduledEffectiveAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bakeryAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('BakeryAuditLog', bakeryAuditLogSchema);
