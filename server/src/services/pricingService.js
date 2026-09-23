const PriceBook = require('../models/PriceBook');
const Platform = require('../models/Platform');

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

function addSelection(lines, index, key, quantity = 1, fallbackKey = null) {
  if (!key || quantity <= 0) return;
  const selected = index.get(key) || (fallbackKey ? index.get(fallbackKey) : null);
  if (!selected || !selected.isActive) {
    lines.warnings.add(key);
    return;
  }
  const existing = lines.items.get(key);
  if (existing) {
    existing.quantity += quantity;
    existing.lineTotalMinor = existing.quantity * existing.unitPriceMinor;
    return;
  }
  const unitPriceMinor = selected.costBasisMinor + selected.markupMinor;
  lines.items.set(key, {
    componentKey: key,
    label: selected.displayName,
    unit: selected.billingUnit,
    quantity,
    unitPriceMinor,
    lineTotalMinor: unitPriceMinor * quantity,
  });
}

function buildQuote(config = {}, priceBook) {
  const index = new Map(priceBook.items.map((entry) => [entry.componentKey, entry]));
  const lines = { items: new Map(), warnings: new Set() };
  const structure = config.structure || {};
  const layers = Math.max(1, Number(structure.layers || 1));
  addSelection(lines, index, 'base.standard');
  addSelection(lines, index, `size.${structure.size || 'big'}`);
  addSelection(lines, index, 'tier.additional', Math.max(0, layers - 1));

  const sponge = config.sponge || {};
  if (structure.layerDesign === 'individual') {
    (sponge.layerFlavors || []).slice(0, layers).forEach((value) => addSelection(lines, index, `sponge.${value}`));
  } else addSelection(lines, index, `sponge.${sponge.flavor || 'vanilla'}`, layers);

  const filling = config.filling || {};
  if (filling.enabled) {
    const fillingLayers = Math.max(1, Number(filling.layers || 1));
    addSelection(lines, index, 'filling.layer', fillingLayers);
    if (structure.layerDesign === 'individual' && filling.layerFlavors?.length) {
      filling.layerFlavors.slice(0, fillingLayers).forEach((value) => addSelection(lines, index, `filling.${value}`));
    } else addSelection(lines, index, `filling.${filling.flavor || 'vanilla'}`, fillingLayers);
    if (filling.piping?.tip) addSelection(lines, index, 'edge.piping');
  }

  const finish = config.exteriorFinish || {};
  if (structure.layerDesign === 'individual') {
    (finish.layerStyles || []).slice(0, layers).forEach((style, position) => {
      addSelection(lines, index, `finish.${style}`);
      if (style !== 'naked') addSelection(lines, index, `frosting.${finish.layerFlavors?.[position] || finish.flavor || 'vanilla'}`);
      if (style === 'texturedButtercream') addSelection(lines, index, `texture.${finish.layerButtercreamTextures?.[position] || finish.buttercreamTexture || 'ridged'}`);
    });
  } else {
    if (finish.style) addSelection(lines, index, `finish.${finish.style}`);
    if (finish.style && finish.style !== 'naked') addSelection(lines, index, `frosting.${finish.flavor || 'vanilla'}`, layers);
    if (finish.style === 'texturedButtercream' && finish.buttercreamTexture) addSelection(lines, index, `texture.${finish.buttercreamTexture}`);
  }

  const surface = config.surfaceTreatment || {};
  if (structure.layerDesign === 'individual' && surface.layerTreatments?.length) {
    surface.layerTreatments.slice(0, layers).forEach((treatment) => {
      if (treatment?.mode) addSelection(lines, index, `surface.${treatment.mode}`);
    });
  } else if (surface.mode) addSelection(lines, index, `surface.${surface.mode}`);
  if (config.sugarColor?.mode === 'colorOverride' && config.sugarColor.colorId) {
    addSelection(lines, index, `color.${config.sugarColor.colorId}`);
  }
  const colorValues = Object.values(config.sugarColorOverrides || {}).map((value) => value?.colorId).filter(Boolean);
  [...new Set(colorValues)].forEach((color) => addSelection(lines, index, `color.${color}`));

  const center = config.center || {};
  if (center.mode === 'text' && center.text && Object.values(center.text).some(Boolean)) addSelection(lines, index, 'center.customText');

  const edge = config.edge || {};
  ['top', 'bottom', 'middle'].forEach((region) => {
    if (edge[region]?.piping?.tip) addSelection(lines, index, 'edge.piping');
    if (edge[region]?.decorations?.setId) addSelection(lines, index, 'edge.decorationSet');
  });
  if (edge.both?.piping?.tip) addSelection(lines, index, 'edge.piping', 2);
  if (edge.both?.decorations?.setId) addSelection(lines, index, 'edge.decorationSet', 2);

  const side = config.side || {};
  if (side.mode) addSelection(lines, index, `side.${side.mode}`, 1, 'side.treatment');

  const placedItems = config.place?.items || config.place?.placedItems || config.placedItems || [];
  placedItems.forEach((placedItem) => addSelection(lines, index, `placed.${placedItem.type || placedItem.designId}`));

  const lineItems = [...lines.items.values()];
  return {
    pricingVersion: priceBook.version,
    currency: 'PHP',
    effectiveAt: priceBook.effectiveAt,
    lineItems,
    totalMinor: lineItems.reduce((sum, entry) => sum + entry.lineTotalMinor, 0),
    warnings: [...lines.warnings],
  };
}

module.exports = { buildQuote, customerItem, getActivePriceBook, resolvePlatform };
