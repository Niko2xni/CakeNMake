const PricingPreset = require('../models/PricingPreset');
const PricingChangeLog = require('../models/PricingChangeLog');

// GET /api/bakery/pricing
async function listPresets(req, res) {
  try {
    const presets = await PricingPreset.find({ platform: req.platformId, isActive: true }).sort({ category: 1, name: 1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load pricing presets', error: err.message });
  }
}

// PATCH /api/bakery/pricing/:id   body: { price, reason }
async function updatePresetPrice(req, res) {
  try {
    const { price, reason } = req.body;

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A reason is required for every price change' });
    }

    const preset = await PricingPreset.findOne({ _id: req.params.id, platform: req.platformId });
    if (!preset) return res.status(404).json({ message: 'Pricing preset not found' });

    const oldPrice = preset.price;
    preset.price = price;
    await preset.save();

    await PricingChangeLog.create({
      platform: req.platformId,
      pricingPreset: preset._id,
      changedBy: req.user._id,
      componentName: preset.name,
      oldPrice,
      newPrice: price,
      reason: reason.trim(),
    });

    res.json(preset);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update price', error: err.message });
  }
}

// GET /api/bakery/pricing/log
async function listChangeLog(req, res) {
  try {
    const log = await PricingChangeLog.find({ platform: req.platformId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load change log', error: err.message });
  }
}

module.exports = { listPresets, updatePresetPrice, listChangeLog };
