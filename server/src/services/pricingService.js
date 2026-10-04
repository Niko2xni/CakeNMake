const PriceBook = require('../models/PriceBook');
const Platform = require('../models/Platform');
const { DEFAULT_RATES, calculateCakePrice } = require('./cakePricingRules');

function customerItem(item) {
  return {
    componentKey: item.componentKey,
    displayName: item.displayName,
    category: item.category,
    billingUnit: item.billingUnit,
    customerEstimateMinor: item.costBasisMinor + item.markupMinor,
    isActive: item.isActive,
  };
}

async function resolvePlatform(platformSlug) {
  if (!platformSlug) return Platform.findOne({ slug: 'mamshie-bakery' });
  return Platform.findOne({ slug: platformSlug });
}

async function getActivePriceBook(platformId, now = new Date()) {
  const due = await PriceBook.findOne({
    platform: platformId,
    status: 'scheduled',
    effectiveAt: { $lte: now },
  }).sort({ effectiveAt: -1, version: -1 });

  if (due) {
    due.status = 'active';
    await due.save();
    await PriceBook.updateMany(
      { platform: platformId, status: 'active', _id: { $ne: due._id } },
      { status: 'archived' },
    );
  }

  return PriceBook.findOne({
    platform: platformId,
    status: 'active',
    effectiveAt: { $lte: now },
  }).sort({ effectiveAt: -1, version: -1 });
}

function buildQuote(config = {}, priceBook = {}) {
  const rates = priceBook?.rates || DEFAULT_RATES;
  const quote = calculateCakePrice(config, rates);

  return {
    pricingVersion: priceBook?.version || 1,
    currency: 'PHP',
    effectiveAt: priceBook?.effectiveAt || new Date(),
    lineItems: quote.lineItems,
    totalMinor: quote.totalMinor,
    warnings: quote.warnings,
  };
}

module.exports = { buildQuote, customerItem, getActivePriceBook, resolvePlatform };
