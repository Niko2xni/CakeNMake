const mongoose = require('mongoose');

const pricingChangeLogSchema = new mongoose.Schema(
  {
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
    pricingPreset: { type: mongoose.Schema.Types.ObjectId, ref: 'PricingPreset', required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    componentName: { type: String, required: true }, // snapshotted so the log still reads correctly even if the preset is later renamed
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingChangeLog', pricingChangeLogSchema);
