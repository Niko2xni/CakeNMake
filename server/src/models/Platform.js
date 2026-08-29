const mongoose = require('mongoose');

const platformSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true }, // e.g. 'mamshie-bakery'
    email: { type: String, required: true },
    address: { type: String, default: '' },
    hoursOfOperation: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    featureFlags: { type: Object, default: {} },
    billingSettings: { type: Object, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Platform', platformSchema);