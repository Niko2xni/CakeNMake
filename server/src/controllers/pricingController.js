const PricingPreset = require('../models/PricingPreset');
const PricingChangeLog = require('../models/PricingChangeLog');
const Platform = require('../models/Platform');

async function resolvePlatform(slug) {
  if (!slug) return null;
  return Platform.findOne({ slug });
}

// GET /api/bakery/pricing?platformSlug=mamshie-bakery
async function listPresets(req, res) {
  try {
    const { platformSlug } = req.query;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    const presets = await PricingPreset.find({ platform: platform._id, isActive: true }).sort({ category: 1, name: 1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load pricing presets', error: err.message });
  }
}

// PATCH /api/bakery/pricing/:id   body: { price, reason, platformSlug }
async function updatePresetPrice(req, res) {
  try {
    const { price, reason, platformSlug } = req.body;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'A reason is required for every price change' });
    }

    const preset = await PricingPreset.findOne({ _id: req.params.id, platform: platform._id });
    if (!preset) return res.status(404).json({ message: 'Pricing preset not found' });

    const oldPrice = preset.price;
    preset.price = price;
    await preset.save();

    await PricingChangeLog.create({
      platform: platform._id,
      pricingPreset: preset._id,
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

// GET /api/bakery/pricing/log?platformSlug=mamshie-bakery
async function listChangeLog(req, res) {
  try {
    const { platformSlug } = req.query;
    const platform = await resolvePlatform(platformSlug);
    if (!platform) return res.status(404).json({ message: 'Bakery not found' });

    const log = await PricingChangeLog.find({ platform: platform._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(log);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load change log', error: err.message });
  }
}

module.exports = { listPresets, updatePresetPrice, listChangeLog };