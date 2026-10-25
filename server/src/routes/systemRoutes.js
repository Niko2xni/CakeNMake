const express = require('express');
const router = express.Router();
const { getSystemStatus, processScheduledMaintenance } = require('../services/maintenanceService');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole } = require('../middleware/authorize');
const Platform = require('../models/Platform');

// GET /api/system/status - Public status for client access guard and warnings
router.get('/status', async (req, res) => {
  try {
    const status = await getSystemStatus();
    return res.json(status);
  } catch (error) {
    console.error('Failed to get system status:', error);
    return res.status(500).json({ message: 'Failed to retrieve system status' });
  }
});

// POST /api/system/maintenance/trigger - Manual trigger for testing/admin monitoring room
router.post(
  '/maintenance/trigger',
  authenticate,
  loadAppUser,
  requireRole('bakery_admin', 'platform_admin'),
  async (req, res) => {
    try {
      await processScheduledMaintenance();
      const status = await getSystemStatus();
      return res.json({ message: 'Maintenance update cycle completed', status });
    } catch (error) {
      console.error('Failed to trigger maintenance:', error);
      return res.status(500).json({ message: 'Failed to trigger maintenance', error: error.message });
    }
  }
);

// POST /api/system/website-toggle - Explicit manual toggle for Bakery Admin control room
router.post(
  '/website-toggle',
  authenticate,
  loadAppUser,
  requireRole('bakery_admin', 'platform_admin'),
  async (req, res) => {
    try {
      const { isWebsiteOff, reason } = req.body;
      const plat = await Platform.findOne();
      if (!plat) {
        return res.status(404).json({ message: 'Platform not found' });
      }
      plat.maintenanceMode = plat.maintenanceMode || {};
      plat.maintenanceMode.isWebsiteOff = Boolean(isWebsiteOff);
      plat.maintenanceMode.updatedAt = new Date();
      if (reason) plat.maintenanceMode.reason = reason;
      if (!isWebsiteOff) plat.maintenanceMode.lastCompletedAt = new Date();
      await plat.save();

      const status = await getSystemStatus(plat._id);
      return res.json({ message: `Website status set to ${isWebsiteOff ? 'Website Off' : 'Website On'}`, status });
    } catch (error) {
      console.error('Failed to toggle website status:', error);
      return res.status(500).json({ message: 'Failed to toggle website status', error: error.message });
    }
  }
);
// GET /api/system/unified-drafts - Both Templates & Pricing drafts
router.get(
  '/unified-drafts',
  authenticate,
  loadAppUser,
  requireRole('bakery_staff', 'bakery_admin', 'platform_admin'),
  async (req, res) => {
    try {
      const { getUnifiedDrafts } = require('../services/maintenanceService');
      const platformId = req.platformId || req.user?.platform?._id || req.user?.platform;
      const data = await getUnifiedDrafts(platformId);
      return res.json(data);
    } catch (error) {
      console.error('Failed to get unified drafts:', error);
      return res.status(500).json({ message: 'Failed to retrieve unified drafts' });
    }
  }
);

// DELETE /api/system/unified-drafts/:id - Discard / Revert an individual draft edit (template or pricing)
router.delete(
  '/unified-drafts/:id',
  authenticate,
  loadAppUser,
  requireRole('bakery_admin', 'platform_admin'),
  async (req, res) => {
    try {
      const id = req.params.id;
      const PriceBook = require('../models/PriceBook');
      const Template = require('../models/Template');
      const { recordAuditLog } = require('../services/maintenanceService');

      const platformId = req.platformId || req.user?.platform?._id || req.user?.platform || (await Platform.findOne())?._id;

      if (id.startsWith('pricing-rate-')) {
        const draft = await PriceBook.findOne({ platform: platformId, status: 'draft' });
        const activeBook = await PriceBook.findOne({ platform: platformId, status: 'active' }).sort({ version: -1 });
        if (draft && activeBook && draft.rates && activeBook.rates) {
          const parts = id.replace('pricing-rate-', '').split('-');
          let revertedLabel = '';

          if (parts[0] === 'flavors' && parts[1]) {
            const key = parts[1];
            draft.rates.flavors = draft.rates.flavors || {};
            draft.rates.flavors[key] = activeBook.rates.flavors?.[key];
            revertedLabel = `Sponge Flavor "${key}"`;
          } else if (parts[0] === 'sizes' && parts[1]) {
            const key = parts[1];
            draft.rates.sizes = draft.rates.sizes || {};
            draft.rates.sizes[key] = activeBook.rates.sizes?.[key];
            revertedLabel = `Size Factor "${key}"`;
          } else if (parts[0] === 'center' && parts[1] === 'perPiece' && parts[2]) {
            const key = parts[2];
            if (draft.rates.center?.perPiece) {
              draft.rates.center.perPiece[key] = activeBook.rates.center?.perPiece?.[key];
            }
            revertedLabel = `Center Decoration "${key}"`;
          } else if (parts[0] === 'center' && parts[1] === 'bracket' && parts[2] && parts[3] !== undefined) {
            const designId = parts[2];
            const idx = parseInt(parts[3], 10);
            if (draft.rates.center?.brackets?.[designId]?.[idx] && activeBook.rates.center?.brackets?.[designId]?.[idx]) {
              draft.rates.center.brackets[designId][idx].price = activeBook.rates.center.brackets[designId][idx].price;
            }
            revertedLabel = `Center Bracket "${designId}"`;
          }

          draft.markModified('rates');
          await draft.save();

          await recordAuditLog({
            platformId,
            type: 'pricing',
            action: 'revert',
            title: `Reverted Rate: ${revertedLabel || id}`,
            description: 'Restored individual rate back to active price book.',
            changedBy: req.user?._id,
            changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
          });

          return res.json({ message: `Reverted rate for ${revertedLabel || 'item'}.` });
        }
        return res.status(404).json({ message: 'Pricing draft or active book not found' });
      }

      if (id.startsWith('pricing-item-')) {
        const compKey = id.replace('pricing-item-', '');
        // Discard individual pricing item edit by restoring from active book
        const draft = await PriceBook.findOne({ platform: platformId, status: 'draft' });
        const activeBook = await PriceBook.findOne({ platform: platformId, status: 'active' }).sort({ version: -1 });
        if (draft && activeBook) {
          const draftItem = draft.items.find((i) => i.componentKey === compKey);
          const activeItem = activeBook.items.find((i) => i.componentKey === compKey);
          if (draftItem && activeItem) {
            draftItem.costBasisMinor = activeItem.costBasisMinor;
            draftItem.markupMinor = activeItem.markupMinor;
            await draft.save();

            await recordAuditLog({
              platformId,
              type: 'pricing',
              action: 'revert',
              title: `Reverted Pricing for "${draftItem.displayName}"`,
              description: `Restored to active rate ₱${((activeItem.costBasisMinor + activeItem.markupMinor) / 100).toFixed(2)}`,
              changedBy: req.user?._id,
              changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
            });
            return res.json({ message: `Pricing item "${draftItem.displayName}" reverted to active rate.` });
          }
        }
        return res.status(404).json({ message: 'Pricing item not found in draft' });
      }

      if (id.startsWith('pricing-rates-')) {
        // Revert rates matrix to active book
        const draft = await PriceBook.findOne({ platform: platformId, status: 'draft' });
        const activeBook = await PriceBook.findOne({ platform: platformId, status: 'active' }).sort({ version: -1 });
        if (draft && activeBook) {
          draft.rates = JSON.parse(JSON.stringify(activeBook.rates));
          draft.markModified('rates');
          await draft.save();
          await recordAuditLog({
            platformId,
            type: 'pricing',
            action: 'revert',
            title: `Reverted Rate Matrix to Active Version`,
            description: 'Restored rates table to match live catalog.',
            changedBy: req.user?._id,
            changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
          });
          return res.json({ message: 'Pricing rates reverted to active book.' });
        }
        return res.status(404).json({ message: 'Pricing draft not found' });
      }

      if (id.startsWith('template-')) {
        const rawTemplateId = id.replace('template-', '');
        const template = await Template.findById(rawTemplateId);
        if (!template) {
          return res.status(404).json({ message: 'Draft template not found' });
        }

        if (template.pendingAction === 'create' || (!template.draftOriginalState && template.effectiveAt)) {
          const tName = template.name;
          await Template.findByIdAndDelete(template._id);
          await recordAuditLog({
            platformId: req.platformId,
            type: 'template',
            action: 'discard',
            title: `Draft Template Discarded: "${tName}"`,
            description: 'Draft template removed.',
            changedBy: req.user?._id,
            changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
          });
          return res.json({ message: `Draft "${tName}" removed completely.` });
        }

        if (template.draftOriginalState) {
          const orig = template.draftOriginalState;
          template.name = orig.name;
          template.description = orig.description;
          template.longDescription = orig.longDescription;
          template.sectionId = orig.sectionId;
          template.priceMinor = orig.priceMinor;
          template.specs = orig.specs;
          template.views = orig.views;
          template.thumbnail = orig.thumbnail;
          template.config = orig.config;
          template.order = orig.order;
          template.isPublished = orig.isPublished !== undefined ? orig.isPublished : true;
          template.pendingAction = 'none';
          template.draftOriginalState = null;
          template.effectiveAt = null;
          await template.save();

          await recordAuditLog({
            platformId: req.platformId,
            type: 'template',
            action: 'revert',
            title: `Template Reverted: "${template.name}"`,
            description: 'Restored template to live catalog state.',
            changedBy: req.user?._id,
            changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
          });
          return res.json({ message: `Changes reverted for "${template.name}".` });
        }

        template.pendingAction = 'none';
        template.effectiveAt = null;
        await template.save();
        return res.json({ message: `Draft status cleared for "${template.name}".` });
      }

      return res.status(400).json({ message: 'Invalid draft item ID' });
    } catch (error) {
      console.error('Failed to discard draft edit:', error);
      return res.status(500).json({ message: 'Failed to discard draft edit' });
    }
  }
);

// POST /api/system/unified-drafts/discard-all - Discard all drafts (both templates & pricing)
router.post(
  '/unified-drafts/discard-all',
  authenticate,
  loadAppUser,
  requireRole('bakery_admin', 'platform_admin'),
  async (req, res) => {
    try {
      const PriceBook = require('../models/PriceBook');
      const Template = require('../models/Template');
      const { recordAuditLog } = require('../services/maintenanceService');
      const now = new Date();

      const platformId = req.platformId || req.user?.platform?._id || req.user?.platform || (await Platform.findOne())?._id;

      // Discard Pricing draft
      await PriceBook.deleteMany({ platform: platformId, status: 'draft' });

      // Discard Template drafts
      const draftedTemplates = await Template.find({
        $or: [
          { pendingAction: { $in: ['create', 'update', 'delete'] } },
          { effectiveAt: { $gt: now } },
        ],
      });

      for (const tpl of draftedTemplates) {
        if (tpl.pendingAction === 'create' || (!tpl.draftOriginalState && tpl.effectiveAt)) {
          await Template.findByIdAndDelete(tpl._id);
        } else if (tpl.draftOriginalState) {
          const orig = tpl.draftOriginalState;
          tpl.name = orig.name;
          tpl.description = orig.description;
          tpl.longDescription = orig.longDescription;
          tpl.sectionId = orig.sectionId;
          tpl.priceMinor = orig.priceMinor;
          tpl.specs = orig.specs;
          tpl.views = orig.views;
          tpl.thumbnail = orig.thumbnail;
          tpl.config = orig.config;
          tpl.order = orig.order;
          tpl.isPublished = orig.isPublished !== undefined ? orig.isPublished : true;
          tpl.pendingAction = 'none';
          tpl.draftOriginalState = null;
          tpl.effectiveAt = null;
          await tpl.save();
        } else {
          tpl.pendingAction = 'none';
          tpl.effectiveAt = null;
          await tpl.save();
        }
      }

      await recordAuditLog({
        platformId,
        type: 'template',
        action: 'discard',
        title: 'Discarded All Pending Drafts',
        description: 'Cleared both templates and pricing drafts back to active state.',
        changedBy: req.user?._id,
        changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      });

      return res.json({ message: 'All template and pricing draft edits discarded.' });
    } catch (error) {
      console.error('Failed to discard all drafts:', error);
      return res.status(500).json({ message: 'Failed to discard all drafts' });
    }
  }
);

// GET /api/system/daily-log - Single unified track log for all changes from that day
router.get(
  '/daily-log',
  authenticate,
  loadAppUser,
  requireRole('bakery_staff', 'bakery_admin', 'platform_admin'),
  async (req, res) => {
    try {
      const { getDailyTrackLog } = require('../services/maintenanceService');
      const platformId = req.platformId || req.user?.platform?._id || req.user?.platform;
      const logs = await getDailyTrackLog(platformId);
      return res.json({ logs, count: logs.length });
    } catch (error) {
      console.error('Failed to get daily track log:', error);
      return res.status(500).json({ message: 'Failed to retrieve daily track log' });
    }
  }
);

module.exports = router;
