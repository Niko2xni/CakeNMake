const mongoose = require('mongoose');

const privatePdfSchema = new mongoose.Schema({
  publicId: { type: String, required: true },
  resourceType: { type: String, enum: ['raw', 'image'], required: true },
  deliveryType: { type: String, enum: ['private', 'authenticated'], required: true },
  bytes: { type: Number, required: true, min: 1 },
  uploadedAt: { type: Date, required: true },
}, { _id: false });

// Separate from reservations: simulated checkout stores a snapshot rather than
// a Design reference. New submissions record their customer; older guest demo
// records may have no owner. No public PDF URL is stored here.
const blueprintSchema = new mongoose.Schema({
  platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true, immutable: true },
  submissionId: { type: String, required: true, maxlength: 100, immutable: true },
  submissionHash: { type: String, immutable: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, immutable: true },
  customerName: { type: String, default: 'Guest', trim: true, maxlength: 200, immutable: true },
  designName: { type: String, required: true, maxlength: 200, immutable: true },
  deliveryDate: { type: Date, required: true, immutable: true },
  designSnapshot: { type: mongoose.Schema.Types.Mixed, required: true, immutable: true },
  // Customer estimate, not evidence of a real payment or authoritative charge.
  quoteSnapshot: { type: mongoose.Schema.Types.Mixed, default: null, immutable: true },
  orderPricingSnapshot: { type: mongoose.Schema.Types.Mixed, default: null, immutable: true },
  paymentMode: { type: String, enum: ['simulated'], required: true, immutable: true },
  paymentCompletedAt: { type: Date, required: true, immutable: true },
  status: {
    type: String,
    enum: ['uploading', 'ready', 'failed', 'in_production', 'completed'],
    default: 'uploading',
    validate: {
      validator(value) { return !['ready', 'in_production', 'completed'].includes(value) || Boolean(this.pdf?.publicId); },
      message: 'A ready blueprint requires a stored private PDF.',
    },
  },
  pdf: { type: privatePdfSchema, default: null },
  failureReason: { type: String, default: null, maxlength: 500 },
}, { timestamps: true });

// A retry reuses its submission identity rather than adding another entry.
blueprintSchema.index({ platform: 1, submissionId: 1 }, { unique: true });
blueprintSchema.index({ platform: 1, createdAt: -1 });

module.exports = mongoose.model('Blueprint', blueprintSchema);
