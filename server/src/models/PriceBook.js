const mongoose = require('mongoose');

const priceItemSchema = new mongoose.Schema({
  componentKey: { type: String, required: true },
  displayName: { type: String, required: true },
  category: { type: String, required: true },
  billingUnit: {
    type: String,
    enum: ['per_cake', 'per_tier', 'per_layer', 'per_edge', 'per_set', 'per_piece'],
    default: 'per_cake',
  },
  costBasisMinor: { type: Number, required: true, min: 0, default: 0 },
  markupMinor: { type: Number, required: true, min: 0, default: 0 },
  isActive: { type: Boolean, default: true },
  isRequired: { type: Boolean, default: false },
}, { _id: false });

priceItemSchema.virtual('customerEstimateMinor').get(function getEstimate() {
  return this.costBasisMinor + this.markupMinor;
});

const { DEFAULT_RATES } = require('../services/cakePricingRules');

const priceBookSchema = new mongoose.Schema({
  platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true, index: true },
  version: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['draft', 'scheduled', 'active', 'archived'], required: true },
  effectiveAt: { type: Date, default: null, index: true },
  publicationReason: { type: String, trim: true, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  items: { type: [priceItemSchema], default: [] },
  rates: { type: mongoose.Schema.Types.Mixed, default: () => JSON.parse(JSON.stringify(DEFAULT_RATES)) },
}, { timestamps: true, toJSON: { virtuals: true } });

priceBookSchema.index({ platform: 1, version: 1 }, { unique: true });
priceBookSchema.index({ platform: 1, status: 1 });

module.exports = mongoose.model('PriceBook', priceBookSchema);
