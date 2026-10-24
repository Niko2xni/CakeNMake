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

function computeRateChanges(prevRates, curRates) {
  if (!prevRates || !curRates) return [];
  const diffs = [];

  const curFlavors = curRates.flavors || {};
  const prevFlavors = prevRates.flavors || {};
  for (const [k, v] of Object.entries(curFlavors)) {
    if (prevFlavors[k] !== undefined && prevFlavors[k] !== v) {
      const label = k === 'pickColor' ? 'Custom Pick Color' : `${k.charAt(0).toUpperCase() + k.slice(1)} Sponge`;
      diffs.push({ category: 'Flavor Base', item: label, from: prevFlavors[k], to: v });
    }
  }

  const curSizes = curRates.sizes || {};
  const prevSizes = prevRates.sizes || {};
  for (const [k, v] of Object.entries(curSizes)) {
    if (prevSizes[k] !== undefined && prevSizes[k] !== v) {
      diffs.push({ category: 'Size Factor Add-on', item: `${k.replace('x', '×')} Size`, from: prevSizes[k], to: v });
    }
  }

  const curBrackets = curRates.center?.brackets || {};
  const prevBrackets = prevRates.center?.brackets || {};
  for (const [k, curArr] of Object.entries(curBrackets)) {
    const prevArr = prevBrackets[k] || [];
    if (Array.isArray(curArr)) {
      curArr.forEach((b, idx) => {
        const p = prevArr[idx];
        if (p && p.price !== b.price) {
          const name = k === 'buttercreamText' ? '3D Fondant Text' : k;
          diffs.push({
            category: 'Center Bracket',
            item: `${name} (up to ${b.maxQty} pcs)`,
            from: p.price,
            to: b.price,
          });
        }
      });
    }
  }

  const curPerPiece = curRates.center?.perPiece || {};
  const prevPerPiece = prevRates.center?.perPiece || {};
  for (const [k, v] of Object.entries(curPerPiece)) {
    if (prevPerPiece[k] !== undefined && prevPerPiece[k] !== v) {
      diffs.push({ category: 'Center Figure', item: k, from: prevPerPiece[k], to: v });
    }
  }

  return diffs;
}

function buildQuote(config = {}, priceBook = {}, previousPriceBook = null) {
  const rates = priceBook?.rates || DEFAULT_RATES;
  const quote = calculateCakePrice(config, rates);
  const publicationReason = priceBook?.publicationReason || '';

  let changes = null;
  if (previousPriceBook && previousPriceBook.rates) {
    const prevQuote = calculateCakePrice(config, previousPriceBook.rates);
    const catalogDiffs = computeRateChanges(previousPriceBook.rates, rates);

    const lineItemDiffs = [];
    for (const curItem of quote.lineItems) {
      const prevItem = prevQuote.lineItems.find((l) => l.componentKey === curItem.componentKey);
      if (prevItem && prevItem.lineTotalMinor !== curItem.lineTotalMinor) {
        lineItemDiffs.push({
          componentKey: curItem.componentKey,
          label: curItem.label,
          fromMinor: prevItem.lineTotalMinor,
          toMinor: curItem.lineTotalMinor,
          diffMinor: curItem.lineTotalMinor - prevItem.lineTotalMinor,
        });
      } else if (!prevItem && curItem.lineTotalMinor > 0) {
        lineItemDiffs.push({
          componentKey: curItem.componentKey,
          label: curItem.label,
          fromMinor: 0,
          toMinor: curItem.lineTotalMinor,
          diffMinor: curItem.lineTotalMinor,
        });
      }
    }

    changes = {
      previousVersion: previousPriceBook.version,
      newVersion: priceBook?.version || 1,
      reason: publicationReason || 'Scheduled catalog price update',
      effectiveAt: priceBook?.effectiveAt || new Date(),
      previousTotalMinor: prevQuote.totalMinor,
      newTotalMinor: quote.totalMinor,
      diffMinor: quote.totalMinor - prevQuote.totalMinor,
      lineItemDiffs,
      catalogDiffs,
    };
  }

  return {
    pricingVersion: priceBook?.version || 1,
    publicationReason,
    currency: 'PHP',
    effectiveAt: priceBook?.effectiveAt || new Date(),
    lineItems: quote.lineItems,
    totalMinor: quote.totalMinor,
    warnings: quote.warnings,
    changes,
  };
}

module.exports = { buildQuote, customerItem, getActivePriceBook, resolvePlatform };
