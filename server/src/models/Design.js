const mongoose = require('mongoose');

const designSchema = new mongoose.Schema({
  name: {
    type: String,
    default: 'Untitled',
    required: true
  },
  config: {
    type: Object,
    required: true
  },
  aiChat: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ history: [], display: [] }),
    select: false,
  },
  userId: {
    type: String,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    immutable: true,
    index: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  thumbnailFallback: {
    type: String,
    default: null
  },
  thumbnailAsset: {
    secureUrl: { type: String, default: null },
    publicId: { type: String, default: null },
    ownerUid: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
    trusted: { type: Boolean, default: false }
  },
  lastEdited: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isTrashed: {
    type: Boolean,
    default: false
  },
  trashedAt: {
    type: Date,
    default: null
  },
  sentToBakery: {
    type: Boolean,
    default: false
  },
  paymentCompleted: {
    type: Boolean,
    default: false
  },
  orderContext: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  isDuplicated: {
    type: Boolean,
    default: false
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Template',
    default: null
  },
  // Informational estimate shown with saved designs. Reservation checkout
  // recalculates authoritatively and stores its own immutable snapshot.
  lastEstimate: {
    pricingVersion: { type: Number, default: null },
    currency: { type: String, default: 'PHP' },
    totalMinor: { type: Number, default: null },
    lineItems: { type: Array, default: [] },
    calculatedAt: { type: Date, default: null }
  }
}, {
  timestamps: true
});

designSchema.index({ owner: 1, isTrashed: 1, lastEdited: -1 });

// Update lastEdited timestamp before saving
designSchema.pre('save', function() {
  this.lastEdited = new Date();
});

module.exports = mongoose.model('Design', designSchema);
