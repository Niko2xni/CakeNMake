const Template = require('../models/Template');
const Platform = require('../models/Platform');
const PriceBook = require('../models/PriceBook');
const BakeryAuditLog = require('../models/BakeryAuditLog');
const { nextManilaTenPm } = require('../controllers/priceBookController');

/**
 * Checks if the given date is within 3 hours prior to 10:00 PM Manila time.
 * In Manila time (UTC+8): 10:00 PM is 22:00.
 * 3 hours ahead warning window starts at 7:00 PM (19:00).
 * Warning window is [19:00, 22:00) Manila time.
 */
function isWithinThreeHourWarningWindow(now = new Date()) {
  const manilaMs = now.getTime() + 8 * 60 * 60 * 1000;
  const manilaDate = new Date(manilaMs);
  const hours = manilaDate.getUTCHours();
  // 19:00 to 21:59 is the 3-hour window before 22:00
  return hours >= 19 && hours < 22;
}

/**
 * Checks if now is within the 10:00 PM Manila update execution window.
 * Window: 22:00 to 22:05 (first 5 minutes of 10:00 PM update window)
 */
function isWithinUpdateExecutionWindow(now = new Date()) {
  const manilaMs = now.getTime() + 8 * 60 * 60 * 1000;
  const manilaDate = new Date(manilaMs);
  const hours = manilaDate.getUTCHours();
  const minutes = manilaDate.getUTCMinutes();
  return hours === 22 && minutes < 3;
}

/**
 * Checks if the given date is within 30 minutes prior to 10:00 PM Manila time
 * or during the 10:00 PM update window.
 * 10:00 PM is 22:00 Manila time (UTC+8).
 * 30 minutes before 10:00 PM is 9:30 PM (21:30 Manila time).
 * Payment cutoff window is [21:30, 22:05) Manila time.
 */
function isWithinThirtyMinutePaymentCutoff(now = new Date()) {
  const manilaMs = now.getTime() + 8 * 60 * 60 * 1000;
  const manilaDate = new Date(manilaMs);
  const hours = manilaDate.getUTCHours();
  const minutes = manilaDate.getUTCMinutes();
  return (hours === 21 && minutes >= 30) || (hours === 22 && minutes < 5);
}

/**
 * Returns beginning of current Manila day (midnight 00:00:00 Manila time in UTC Date)
 */
function getStartOfManilaDay(now = new Date()) {
  const manilaOffsetMs = 8 * 60 * 60 * 1000;
  const manila = new Date(now.getTime() + manilaOffsetMs);
  const startUtc = Date.UTC(manila.getUTCFullYear(), manila.getUTCMonth(), manila.getUTCDate(), 0, 0, 0, 0) - manilaOffsetMs;
  return new Date(startUtc);
}

/**
 * Records an entry into the single unified BakeryAuditLog
 */
async function recordAuditLog({
  platformId = null,
  type, // 'template' | 'pricing'
  action, // 'create', 'update', 'delete', 'revert', 'schedule', 'discard'
  title,
  description = '',
  changedBy = null,
  changedByName = 'Bakery Staff',
  details = {},
  scheduledEffectiveAt = null,
}) {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1 && !platformId) {
      return; // DB not connected (e.g. unit tests without mongodb mock for Platform)
    }
    let pId = platformId;
    if (!pId) {
      const plat = await Platform.findOne();
      pId = plat?._id;
    }
    await BakeryAuditLog.create({
      platform: pId,
      type,
      action,
      title,
      description,
      changedBy,
      changedByName,
      details,
      scheduledEffectiveAt,
    });
  } catch (err) {
    // Non-blocking
  }
}

const FLAVOR_NAMES = {
  plain: 'Plain Sponge (6×4 Base)',
  vanilla: 'Vanilla Sponge (6×4 Base)',
  cheese: 'Cheese Sponge (6×4 Base)',
  chocolate: 'Chocolate Sponge (6×4 Base)',
  strawberry: 'Strawberry Sponge (6×4 Base)',
  ube: 'Ube Sponge (6×4 Base)',
  mocha: 'Mocha Sponge (6×4 Base)',
  pickColor: 'All Pick Colors (6×4 Base)',
};

const SIZE_NAMES = {
  '6x4': '6×4 Size Factor',
  '8x6': '8×6 Size Factor',
  '10x8': '10×8 Size Factor',
  '12x10': '12×10 Size Factor',
};

function diffRates(targetRates = {}, baseRates = {}, targetBook, isScheduled, statusLabel, now) {
  const diffs = [];
  const effectiveAt = targetBook.effectiveAt || nextManilaTenPm(now);

  // 1. Flavors
  if (targetRates.flavors && baseRates.flavors) {
    for (const [k, name] of Object.entries(FLAVOR_NAMES)) {
      const curr = targetRates.flavors[k];
      const old = baseRates.flavors[k];
      if (curr !== undefined && old !== undefined && curr !== old) {
        diffs.push({
          id: `pricing-rate-flavors-${k}`,
          rawId: targetBook._id,
          category: 'pricing',
          name,
          thumbnail: null,
          priceMinor: Number(curr) * 100,
          sectionName: 'Sponge Flavors',
          pendingAction: isScheduled ? 'scheduled' : 'update',
          effectiveAt,
          summary: `Rate changed from ₱${old} to ₱${curr} (${curr > old ? '+' : ''}₱${curr - old}) (${statusLabel})`,
          hasOriginal: true,
          rateCategory: 'flavors',
          rateKey: k,
        });
      }
    }
  }

  // 2. Sizes
  if (targetRates.sizes && baseRates.sizes) {
    for (const [k, name] of Object.entries(SIZE_NAMES)) {
      const curr = targetRates.sizes[k];
      const old = baseRates.sizes[k];
      if (curr !== undefined && old !== undefined && curr !== old) {
        diffs.push({
          id: `pricing-rate-sizes-${k}`,
          rawId: targetBook._id,
          category: 'pricing',
          name,
          thumbnail: null,
          priceMinor: Number(curr) * 100,
          sectionName: 'Size Factors',
          pendingAction: isScheduled ? 'scheduled' : 'update',
          effectiveAt,
          summary: `Rate changed from ₱${old} to ₱${curr} (${curr > old ? '+' : ''}₱${curr - old}) (${statusLabel})`,
          hasOriginal: true,
          rateCategory: 'sizes',
          rateKey: k,
        });
      }
    }
  }

  // 3. Center Per-Piece
  if (targetRates.center?.perPiece && baseRates.center?.perPiece) {
    for (const [k, curr] of Object.entries(targetRates.center.perPiece)) {
      const old = baseRates.center.perPiece[k];
      if (curr !== undefined && old !== undefined && curr !== old) {
        diffs.push({
          id: `pricing-rate-center-perPiece-${k}`,
          rawId: targetBook._id,
          category: 'pricing',
          name: `Center Decoration (${k})`,
          thumbnail: null,
          priceMinor: Number(curr) * 100,
          sectionName: 'Center Decorations',
          pendingAction: isScheduled ? 'scheduled' : 'update',
          effectiveAt,
          summary: `Rate changed from ₱${old} to ₱${curr} (${curr > old ? '+' : ''}₱${curr - old}) (${statusLabel})`,
          hasOriginal: true,
          rateCategory: 'center.perPiece',
          rateKey: k,
        });
      }
    }
  }

  // 4. Center Brackets
  if (targetRates.center?.brackets && baseRates.center?.brackets) {
    for (const [designId, currArr] of Object.entries(targetRates.center.brackets)) {
      const oldArr = baseRates.center.brackets[designId] || [];
      if (Array.isArray(currArr)) {
        currArr.forEach((tier, idx) => {
          const oldTier = oldArr[idx] || {};
          if (tier.price !== undefined && oldTier.price !== undefined && tier.price !== oldTier.price) {
            diffs.push({
              id: `pricing-rate-center-bracket-${designId}-${idx}`,
              rawId: targetBook._id,
              category: 'pricing',
              name: `Center Bracket (${designId} tier #${idx + 1})`,
              thumbnail: null,
              priceMinor: Number(tier.price) * 100,
              sectionName: 'Center Brackets',
              pendingAction: isScheduled ? 'scheduled' : 'update',
              effectiveAt,
              summary: `Bracket price changed from ₱${oldTier.price} to ₱${tier.price} (${statusLabel})`,
              hasOriginal: true,
              rateCategory: 'center.brackets',
              rateKey: `${designId}-${idx}`,
            });
          }
        });
      }
    }
  }

  // Fallback for general rates difference
  if (diffs.length === 0 && JSON.stringify(targetRates) !== JSON.stringify(baseRates)) {
    diffs.push({
      id: `pricing-rates-${targetBook._id}`,
      rawId: targetBook._id,
      category: 'pricing',
      name: `Rate Matrix Update (v${targetBook.version})`,
      thumbnail: null,
      priceMinor: 0,
      sectionName: 'Pricing Rates',
      pendingAction: isScheduled ? 'scheduled' : 'update',
      effectiveAt,
      summary: targetBook.publicationReason
        ? `Rates modified: "${targetBook.publicationReason}"`
        : `Rates updated for upcoming v${targetBook.version} (${statusLabel})`,
      hasOriginal: true,
    });
  }

  return diffs;
}

/**
 * Collects unified pending drafts across both Templates and Pricing
 */
async function getUnifiedDrafts(platformId = null) {
  const now = new Date();
  let plat = null;
  if (platformId) {
    plat = await Platform.findById(platformId);
  }
  if (!plat) {
    plat = await Platform.findOne();
  }

  // 1. Template Drafts
  const templates = await Template.find({
    $or: [
      { pendingAction: { $in: ['create', 'update', 'delete'] } },
      { effectiveAt: { $gt: now } },
    ],
  }).populate('sectionId', 'name').lean();

  const templateDrafts = templates.map((t) => {
    let action = t.pendingAction;
    if (!action || action === 'none') {
      action = t.draftOriginalState ? 'update' : 'create';
    }

    let summary = '';
    if (action === 'create') {
      summary = `New Template: "${t.name}" added to "${t.sectionId?.name || 'Section'}"`;
    } else if (action === 'delete') {
      summary = `Delete Template: "${t.name}"`;
    } else if (action === 'update') {
      const changes = [];
      const orig = t.draftOriginalState || {};
      if (orig.name && orig.name !== t.name) changes.push(`name to "${t.name}"`);
      if (orig.priceMinor !== undefined && orig.priceMinor !== t.priceMinor) changes.push(`price to ₱${(t.priceMinor / 100).toFixed(2)}`);
      if (orig.description !== undefined && orig.description !== t.description) changes.push('description');
      if (orig.sectionId && String(orig.sectionId) !== String(t.sectionId?._id || t.sectionId)) changes.push('section');
      if (orig.views && JSON.stringify(orig.views) !== JSON.stringify(t.views)) changes.push('showcase views');
      if (orig.config && JSON.stringify(orig.config) !== JSON.stringify(t.config)) changes.push('3D design specs');
      summary = changes.length > 0 ? `Updated ${changes.join(', ')} on "${t.name}"` : `Modified details for "${t.name}"`;
    }

    return {
      id: `template-${t._id}`,
      rawId: t._id,
      category: 'template',
      name: t.name,
      thumbnail: t.thumbnail,
      priceMinor: t.priceMinor,
      sectionName: t.sectionId?.name || '',
      pendingAction: action,
      effectiveAt: t.effectiveAt,
      summary,
      hasOriginal: Boolean(t.draftOriginalState),
    };
  });

  // 2. Pricing Drafts
  const pricingDrafts = [];
  if (plat) {
    const [activeBook, currentDraft, scheduledPricing] = await Promise.all([
      PriceBook.findOne({ platform: plat._id, status: 'active' }).sort({ version: -1 }),
      PriceBook.findOne({ platform: plat._id, status: 'draft' }),
      PriceBook.findOne({ platform: plat._id, status: 'scheduled', effectiveAt: { $gt: now } }),
    ]);

    // Active reference for diffing
    const baseBook = activeBook;

    // Check unsaved or scheduled draft
    const targetBook = currentDraft || scheduledPricing;
    if (targetBook) {
      const isScheduled = targetBook.status === 'scheduled';
      const statusLabel = isScheduled ? 'scheduled' : 'draft';

      // Item estimate differences
      if (targetBook.items && baseBook?.items) {
        const baseMap = new Map(baseBook.items.map((i) => [i.componentKey, i.costBasisMinor + i.markupMinor]));
        for (const item of targetBook.items) {
          const baseEst = baseMap.get(item.componentKey) ?? 0;
          const currentEst = item.costBasisMinor + item.markupMinor;
          if (baseEst !== currentEst) {
            pricingDrafts.push({
              id: `pricing-item-${item.componentKey}`,
              rawId: item.componentKey,
              category: 'pricing',
              name: item.displayName || item.componentKey,
              thumbnail: null,
              priceMinor: currentEst,
              sectionName: item.category || 'Pricing Components',
              pendingAction: isScheduled ? 'scheduled' : 'update',
              effectiveAt: targetBook.effectiveAt || nextManilaTenPm(now),
              summary: `Estimate changed from ₱${(baseEst / 100).toFixed(2)} to ₱${(currentEst / 100).toFixed(2)} (${statusLabel})`,
              hasOriginal: true,
              componentKey: item.componentKey,
            });
          }
        }
      }

      // Rates differences (itemized per modified rate)
      if (targetBook.rates && baseBook?.rates) {
        const rateDiffs = diffRates(targetBook.rates, baseBook.rates, targetBook, isScheduled, statusLabel, now);
        pricingDrafts.push(...rateDiffs);
      }
    }
  }

  const allDrafts = [...templateDrafts, ...pricingDrafts];

  return {
    drafts: allDrafts,
    templateDrafts,
    pricingDrafts,
    totalCount: allDrafts.length,
    templatesCount: templateDrafts.length,
    pricingCount: pricingDrafts.length,
    nextCommitTime: nextManilaTenPm(now).toISOString(),
  };
}

/**
 * Returns single track log of all changes that happened on the current Manila day
 */
async function getDailyTrackLog(platformId = null) {
  const now = new Date();
  const startOfDay = getStartOfManilaDay(now);

  const query = {
    createdAt: { $gte: startOfDay },
  };
  if (platformId) {
    query.platform = platformId;
  }

  const logs = await BakeryAuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return logs.map((l) => ({
    _id: l._id,
    type: l.type, // 'template' or 'pricing'
    action: l.action,
    title: l.title,
    description: l.description,
    changedByName: l.changedByName || 'Bakery Staff',
    createdAt: l.createdAt,
    details: l.details,
    scheduledEffectiveAt: l.scheduledEffectiveAt,
  }));
}

/**
 * Auto-activates scheduled drafts when 10:00 PM arrives.
 * Switches websiteOff -> true during migration, then automatically false -> "Website On".
 */
async function processScheduledMaintenance(platformId = null) {
  const now = new Date();
  const query = platformId ? { _id: platformId } : {};
  const platforms = await Platform.find(query);

  for (const plat of platforms) {
    // Check if there are pending template or pricing changes due at or before now
    const pendingTemplates = await Template.find({
      $or: [
        { pendingAction: { $in: ['create', 'update', 'delete'] } },
        { effectiveAt: { $ne: null, $lte: now } },
      ],
    });

    const scheduledPricing = await PriceBook.findOne({
      platform: plat._id,
      status: 'scheduled',
      effectiveAt: { $lte: now },
    });

    if (pendingTemplates.length === 0 && !scheduledPricing) {
      if (plat.maintenanceMode?.isWebsiteOff) {
        plat.maintenanceMode.isWebsiteOff = false;
        plat.maintenanceMode.lastCompletedAt = now;
        await plat.save();
      }
      continue;
    }

    // Step 1: Turn Website Off while applying updates
    plat.maintenanceMode = plat.maintenanceMode || {};
    plat.maintenanceMode.isWebsiteOff = true;
    plat.maintenanceMode.updatedAt = now;
    plat.maintenanceMode.reason = 'Applying scheduled 10:00 PM updates';
    await plat.save();

    // Step 2: Apply Template changes
    for (const tpl of pendingTemplates) {
      if (tpl.pendingAction === 'delete') {
        await recordAuditLog({
          platformId: plat._id,
          type: 'template',
          action: 'delete',
          title: `Template Deleted: "${tpl.name}"`,
          description: 'Committed at 10:00 PM scheduled update.',
          changedByName: 'Automated 10 PM Worker',
        });
        await Template.findByIdAndDelete(tpl._id);
      } else {
        const isNew = tpl.pendingAction === 'create';
        await recordAuditLog({
          platformId: plat._id,
          type: 'template',
          action: isNew ? 'create' : 'update',
          title: isNew ? `Template Published: "${tpl.name}"` : `Template Updated: "${tpl.name}"`,
          description: 'Committed at 10:00 PM scheduled update.',
          changedByName: 'Automated 10 PM Worker',
        });

        tpl.pendingAction = 'none';
        tpl.draftOriginalState = null;
        tpl.effectiveAt = null; // now live
        tpl.isPublished = true;
        await tpl.save();
      }
    }

    // Step 3: Apply Pricing changes
    if (scheduledPricing) {
      scheduledPricing.status = 'active';
      scheduledPricing.effectiveAt = now;
      await scheduledPricing.save();

      await PriceBook.updateMany(
        {
          platform: plat._id,
          _id: { $ne: scheduledPricing._id },
          status: { $in: ['active', 'scheduled'] },
        },
        { $set: { status: 'archived' } }
      );

      await recordAuditLog({
        platformId: plat._id,
        type: 'pricing',
        action: 'publish',
        title: `Pricing Book v${scheduledPricing.version} Activated`,
        description: scheduledPricing.publicationReason || 'Committed at 10:00 PM scheduled update.',
        changedByName: 'Automated 10 PM Worker',
      });
    }

    // Step 4: Automatically switch Website On once update is complete
    plat.maintenanceMode.isWebsiteOff = false;
    plat.maintenanceMode.lastCompletedAt = new Date();
    plat.maintenanceMode.reason = 'Update completed successfully';
    await plat.save();
  }
}

/**
 * Gets live system status for client and bakery admin monitoring room.
 */
async function getSystemStatus(platformId = null) {
  const now = new Date();
  let plat = null;
  if (platformId) {
    plat = await Platform.findById(platformId);
  }
  if (!plat) {
    plat = await Platform.findOne();
  }

  const { totalCount, templatesCount, pricingCount } = await getUnifiedDrafts(plat?._id);

  const hasScheduledChanges = totalCount > 0;
  const inWarningWindow = isWithinThreeHourWarningWindow(now);
  const showWarning = hasScheduledChanges && inWarningWindow;

  const isWebsiteOff = Boolean(plat?.maintenanceMode?.isWebsiteOff);
  const isPaymentCutoff = isWithinThirtyMinutePaymentCutoff(now) || isWebsiteOff;

  return {
    isWebsiteOff,
    statusText: isWebsiteOff ? 'Website Off' : 'Website On',
    hasScheduledChanges,
    pendingTemplatesCount: templatesCount,
    hasScheduledPricing: pricingCount > 0,
    totalDraftsCount: totalCount,
    nextScheduledUpdate: nextManilaTenPm(now).toISOString(),
    isWarningWindow: inWarningWindow,
    showClientWarning: showWarning,
    warningMessage: 'Notice: The server will update and will be temporarily off starting from 10:00 PM. No payments are available 30 minutes before the scheduled update (from 9:30 PM).',
    isPaymentCutoff,
    paymentCutoffMessage: 'No payments are available 30 minutes before the scheduled update (from 9:30 PM to 10:05 PM). Please try again after the update completes.',
    maintenanceReason: plat?.maintenanceMode?.reason || '',
    lastCompletedAt: plat?.maintenanceMode?.lastCompletedAt || null,
  };
}

module.exports = {
  isWithinThreeHourWarningWindow,
  isWithinUpdateExecutionWindow,
  isWithinThirtyMinutePaymentCutoff,
  processScheduledMaintenance,
  getSystemStatus,
  getUnifiedDrafts,
  getDailyTrackLog,
  recordAuditLog,
};
