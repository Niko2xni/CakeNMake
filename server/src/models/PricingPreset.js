const mongoose = require('mongoose');

const pricingPresetSchema = new mongoose.Schema(
  {
    platform: { type: mongoose.Schema.Types.ObjectId, ref: 'Platform', required: true },
    category: {
      type: String,
      enum: ['base', 'tier', 'topping'],
      required: true,
    },
    name: { type: String, required: true }, // e.g. "Base Price", "Additional Tier", "Candy Flowers"
    price: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PricingPreset', pricingPresetSchema);