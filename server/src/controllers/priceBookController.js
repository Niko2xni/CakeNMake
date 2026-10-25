const PriceBook = require('../models/PriceBook');
const PricingPreset = require('../models/PricingPreset');
const { CATALOG_DEFINITIONS } = require('../services/pricingCatalog');
const { buildQuote, customerItem, getActivePriceBook, resolvePlatform } = require('../services/pricingService');
const { DEFAULT_RATES } = require('../services/cakePricingRules');

const LEGACY_ESTIMATES = {
  'base.standard': 170000,
  'tier.additional': 100000,
  'placed.strawberry': 15000,
  'placed.cherry': 10000,
  'placed.blueberry': 10000,
  'placed.mango': 10000,
  'placed.mangoCube': 10000,
};

function initialItems() {
  return CATALOG_DEFINITIONS.map((entry) => ({
    ...entry,
    costBasisMinor: LEGACY_ESTIMATES[entry.componentKey] || 0,
    markupMinor: 0,
  }));
}

async function ensureInitialBook(platformId, userId = null) {
  const existing = await PriceBook.findOne({ platform: platformId }).sort({ version: -1 });
  if (existing) {
    if (!existing.rates) {
      existing.rates = JSON.parse(JSON.stringify(DEFAULT_RATES));
      await existing.save();
    }
    return existing;
  }
  const migratedItems = initialItems();
  const itemIndex = new Map(migratedItems.map((entry) => [entry.componentKey, entry]));
  const legacyPresets = await PricingPreset.find({ platform: platformId, isActive: true });
  for (const preset of legacyPresets) {
    const normalizedName = preset.name.toLowerCase();
    let componentKey = null;
    if (preset.category === 'base') componentKey = 'base.standard';
    if (preset.category === 'tier') componentKey = 'tier.additional';
    if (normalizedName.includes('strawberr')) componentKey = 'placed.strawberry';
    if (normalizedName.includes('blueberr')) componentKey = 'placed.blueberry';
    if (normalizedName.includes('mango')) componentKey = 'placed.mango';
    if (normalizedName.includes('candy flower')) componentKey = 'placed.candyFlowers';
    if (componentKey && itemIndex.has(componentKey)) itemIndex.get(componentKey).costBasisMinor = Math.round(preset.price * 100);
  }
  try {
    return await PriceBook.create({
      platform: platformId,
      version: 1,
      status: 'active',
      effectiveAt: new Date(),
      publicationReason: 'Initial catalog migration',
      createdBy: userId,
      items: migratedItems,
      rates: JSON.parse(JSON.stringify(DEFAULT_RATES)),
    });
  } catch (error) {
    if (error?.code === 11000) return PriceBook.findOne({ platform: platformId }).sort({ version: -1 });
    throw error;
  }
}

async function getOrCreateDraft(platformId, userId) {
  let draft = await PriceBook.findOne({ platform: platformId, status: 'draft' });
  if (draft) return draft;
  await ensureInitialBook(platformId, userId);
  const source = await PriceBook.findOne({ platform: platformId, status: { $in: ['active', 'scheduled'] } }).sort({ version: -1 });
  const latest = await PriceBook.findOne({ platform: platformId }).sort({ version: -1 });
  const ratesToCopy = source?.rates ? JSON.parse(JSON.stringify(source.rates)) : JSON.parse(JSON.stringify(DEFAULT_RATES));
  draft = await PriceBook.create({
    platform: platformId,
    version: (latest?.version || 0) + 1,
    status: 'draft',
    createdBy: userId,
    items: (source?.items?.length ? source.items : initialItems()).map((entry) => ({
      componentKey: entry.componentKey,
      displayName: entry.displayName,
      category: entry.category,
      billingUnit: entry.billingUnit,
      costBasisMinor: entry.costBasisMinor,
      markupMinor: entry.markupMinor,
      isActive: entry.isActive,
      isRequired: entry.isRequired,
    })),
    rates: ratesToCopy,
  });
  return draft;
}

function nextManilaTenPm(now = new Date()) {
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manila = new Date(now.getTime() + manilaOffsetMs);
  let target = Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate(), 22, 0, 0, 0) - manilaOffsetMs;
  if (target <= now.getTime()) target += 24 * 60 * 60 * 1000;
  return new Date(target);
}

async function getWorkspace(req, res) {
  try {
    await ensureInitialBook(req.platformId, req.user._id);
    const [active, draft, scheduled, history] = await Promise.all([
      getActivePriceBook(req.platformId),
      PriceBook.findOne({ platform: req.platformId, status: 'draft' }),
      PriceBook.findOne({ platform: req.platformId, status: 'scheduled', effectiveAt: { $gt: new Date() } }).sort({ effectiveAt: 1 }).populate('scheduledBy', 'displayName email role'),
      PriceBook.find({ platform: req.platformId, status: { $in: ['active', 'archived', 'scheduled'] } })
        .sort({ version: -1 })
        .limit(20)
        .populate('scheduledBy', 'displayName email role')
        .populate('createdBy', 'displayName email role'),
    ]);
    res.json({ active, draft, scheduled, history });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load pricing workspace', error: error.message });
  }
}

async function createDraft(req, res) {
  try {
    const draft = await getOrCreateDraft(req.platformId, req.user._id);
    res.status(201).json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create pricing draft', error: error.message });
  }
}

async function updateDraftItem(req, res) {
  try {
    const { costBasisMinor, markupMinor } = req.body;
    if (![costBasisMinor, markupMinor].every((value) => Number.isSafeInteger(value) && value >= 0)) {
      return res.status(400).json({ message: 'Cost basis and markup must be non-negative integer centavo amounts.' });
    }
    const draft = await getOrCreateDraft(req.platformId, req.user._id);
    const entry = draft.items.find((candidate) => candidate.componentKey === req.params.componentKey);
    if (!entry) return res.status(404).json({ message: 'Pricing component not found.' });
    entry.costBasisMinor = costBasisMinor;
    entry.markupMinor = markupMinor;
    await draft.save();

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      platformId: req.platformId,
      type: 'pricing',
      action: 'update',
      title: `Pricing Component Updated: "${entry.displayName}"`,
      description: `Rate set to ₱${((costBasisMinor + markupMinor) / 100).toFixed(2)} in draft v${draft.version}.`,
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
    });

    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update pricing draft', error: error.message });
  }
}

async function scheduleDraft(req, res) {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A publication reason is required.' });
    const draft = await PriceBook.findOne({ platform: req.platformId, status: 'draft' });
    if (!draft) return res.status(404).json({ message: 'No pricing draft exists.' });
    const missing = draft.items.filter((entry) => entry.isRequired && entry.costBasisMinor + entry.markupMinor <= 0);
    if (missing.length) return res.status(400).json({ message: 'Required pricing components must have a customer estimate.', components: missing.map((entry) => entry.componentKey) });
    await PriceBook.updateMany({ platform: req.platformId, status: 'scheduled', effectiveAt: { $gt: new Date() } }, { status: 'archived' });
    draft.status = 'scheduled';
    draft.effectiveAt = nextManilaTenPm();
    draft.publicationReason = reason;
    draft.scheduledBy = req.user._id;
    await draft.save();

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      platformId: req.platformId,
      type: 'pricing',
      action: 'schedule',
      title: `Pricing Book v${draft.version} Scheduled for 10:00 PM`,
      description: `Reason: "${reason}"`,
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      scheduledEffectiveAt: draft.effectiveAt,
    });

    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Failed to schedule pricing', error: error.message });
  }
}

async function publishDraftNow(req, res) {
  try {
    const reason = String(req.body.reason || '').trim();
    if (!reason) return res.status(400).json({ message: 'A publication reason is required.' });

    const draft = await PriceBook.findOne({ platform: req.platformId, status: 'draft' });
    if (!draft) return res.status(404).json({ message: 'No pricing draft exists.' });

    const missing = draft.items.filter((entry) => entry.isRequired && entry.costBasisMinor + entry.markupMinor <= 0);
    if (missing.length) {
      return res.status(400).json({
        message: 'Required pricing components must have a customer estimate.',
        components: missing.map((entry) => entry.componentKey),
      });
    }

    const now = new Date();
    draft.status = 'active';
    draft.effectiveAt = now;
    draft.publicationReason = reason;
    draft.scheduledBy = req.user._id;
    await draft.save();

    await PriceBook.updateMany(
      { platform: req.platformId, _id: { $ne: draft._id }, status: { $in: ['active', 'scheduled'] } },
      { status: 'archived' },
    );

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      platformId: req.platformId,
      type: 'pricing',
      action: 'publish',
      title: `Pricing Book v${draft.version} Published Live`,
      description: `Reason: "${reason}"`,
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
    });

    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Failed to publish pricing immediately', error: error.message });
  }
}

async function discardDraft(req, res) {
  try {
    const draft = await PriceBook.findOne({ platform: req.platformId, status: 'draft' });
    const version = draft?.version;
    await PriceBook.deleteOne({ platform: req.platformId, status: 'draft' });

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      platformId: req.platformId,
      type: 'pricing',
      action: 'discard',
      title: `Pricing Draft ${version ? `v${version} ` : ''}Discarded`,
      description: 'Pricing draft changes were discarded.',
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
    });

    res.status(204).end();
  } catch (error) {
    res.status(500).json({ message: 'Failed to discard pricing draft', error: error.message });
  }
}

async function cancelScheduled(req, res) {
  try {
    const scheduled = await PriceBook.findOne({ platform: req.platformId, status: 'scheduled', effectiveAt: { $gt: new Date() } });
    if (!scheduled) return res.status(404).json({ message: 'No future pricing update exists.' });
    scheduled.status = 'draft';
    scheduled.effectiveAt = null;
    scheduled.publicationReason = '';
    scheduled.scheduledBy = null;
    await scheduled.save();

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      platformId: req.platformId,
      type: 'pricing',
      action: 'revert',
      title: `Scheduled Pricing v${scheduled.version} Reverted to Draft`,
      description: 'Scheduled 10:00 PM auto-activation cancelled.',
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
    });

    res.json(scheduled);
  } catch (error) {
    res.status(500).json({ message: 'Failed to cancel scheduled pricing', error: error.message });
  }
}

async function getActiveCatalog(req, res) {
  try {
    const platform = await resolvePlatform(req.query.platform);
    if (!platform) return res.status(404).json({ message: 'Bakery platform not found.' });
    await ensureInitialBook(platform._id);
    const priceBook = await getActivePriceBook(platform._id);
    res.json({ pricingVersion: priceBook.version, currency: 'PHP', effectiveAt: priceBook.effectiveAt, items: priceBook.items.filter((entry) => entry.isActive).map(customerItem) });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load active pricing', error: error.message });
  }
}

async function quoteCake(req, res) {
  try {
    const platform = await resolvePlatform(req.body.platform);
    if (!platform) return res.status(404).json({ message: 'Bakery platform not found.' });
    await ensureInitialBook(platform._id);
    const priceBook = await getActivePriceBook(platform._id);
    const previousBook = await PriceBook.findOne({
      platform: platform._id,
      status: { $in: ['active', 'archived'] },
      version: { $lt: priceBook.version },
    }).sort({ version: -1 });
    res.json(buildQuote(req.body.config || {}, priceBook, previousBook));
  } catch (error) {
    res.status(500).json({ message: 'Failed to calculate cake estimate', error: error.message });
  }
}

async function updateDraftRates(req, res) {
  try {
    const { rates } = req.body;
    if (!rates || typeof rates !== 'object') {
      return res.status(400).json({ message: 'Rates object is required.' });
    }
    const draft = await getOrCreateDraft(req.platformId, req.user._id);
    draft.rates = rates;
    draft.markModified('rates');
    await draft.save();
    res.json(draft);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update pricing draft rates', error: error.message });
  }
}

async function getDraftsSummary(req, res) {
  try {
    const { getUnifiedDrafts } = require('../services/maintenanceService');
    const platformId = req.platformId || req.user?.platform?._id || req.user?.platform;
    const unified = await getUnifiedDrafts(platformId);

    const hasPricingDraft = unified.pricingCount > 0;
    const hasScheduledPricing = unified.pricingDrafts.some((d) => d.pendingAction === 'scheduled');
    const pendingTemplatesCount = unified.templatesCount;
    const hasPendingChanges = unified.totalCount > 0;

    res.json({
      hasPendingChanges,
      hasPricingDraft,
      hasScheduledPricing,
      scheduledPricingEffectiveAt: unified.drafts.find((d) => d.category === 'pricing' && d.pendingAction === 'scheduled')?.effectiveAt || null,
      pendingTemplatesCount,
      totalDraftsCount: unified.totalCount,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to check drafts summary', error: error.message });
  }
}

module.exports = { cancelScheduled, createDraft, discardDraft, getActiveCatalog, getDraftsSummary, getWorkspace, nextManilaTenPm, publishDraftNow, quoteCake, scheduleDraft, updateDraftItem, updateDraftRates };
