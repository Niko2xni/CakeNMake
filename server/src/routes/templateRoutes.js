const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const TemplateSection = require('../models/TemplateSection');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole } = require('../middleware/authorize');
const { createTemplateUploadSignature } = require('../config/cloudinary');

let ensureDefaultSectionsPromise = null;

const ensureDefaultSections = async () => {
  if (ensureDefaultSectionsPromise) {
    return ensureDefaultSectionsPromise;
  }
  ensureDefaultSectionsPromise = (async () => {
    try {
      const count = await TemplateSection.countDocuments();
      if (count === 0) {
        await TemplateSection.insertMany([
          { name: 'Featured Cakes', order: 0 },
          { name: 'Birthday Cakes', order: 1 },
          { name: 'Wedding Cakes', order: 2 },
          { name: 'Special Celebrations', order: 3 },
        ]);
      }
    } finally {
      ensureDefaultSectionsPromise = null;
    }
  })();
  return ensureDefaultSectionsPromise;
};

const sanitizeViews = (views) => {
  if (!Array.isArray(views)) return [];
  return views.map((v) => ({
    label: typeof v?.label === 'string' ? v.label : '',
    angle: typeof v?.angle === 'string' ? v.angle : '',
    url: typeof v?.url === 'string' ? v.url : '',
    cloudinaryPublicId: typeof v?.cloudinaryPublicId === 'string' ? v.cloudinaryPublicId : '',
  }));
};

const { nextManilaTenPm } = require('../controllers/priceBookController');

// ----------------------------------------------------
// Public Client Endpoints
// ----------------------------------------------------

// GET /api/templates - Get all sections and published templates for client
router.get('/public', async (req, res) => {
  try {
    await ensureDefaultSections();
    const now = new Date();
    const sections = await TemplateSection.find().sort({ order: 1, createdAt: 1 }).lean();
    // Only return templates that are published and whose scheduled 10 PM effective time has arrived (or was already live)
    const templates = await Template.find({
      isPublished: true,
      $or: [
        { effectiveAt: null },
        { effectiveAt: { $lte: now } },
      ],
    }).sort({ order: 1, createdAt: 1 }).lean();

    const sectionsWithTemplates = sections.map((section) => ({
      ...section,
      templates: templates.filter((t) => String(t.sectionId) === String(section._id)),
    }));

    return res.json({
      sections: sectionsWithTemplates,
      allTemplates: templates,
    });
  } catch (error) {
    console.error('Failed to get public templates:', error);
    return res.status(500).json({ message: 'Failed to fetch templates' });
  }
});

// GET /api/templates/:id - Get a single template
router.get('/public/:id', async (req, res) => {
  try {
    const template = await Template.findById(req.params.id).lean();
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    console.error('Failed to get template by ID:', error);
    return res.status(500).json({ message: 'Failed to fetch template' });
  }
});

// ----------------------------------------------------
// Bakery Admin Endpoints
// ----------------------------------------------------

// POST /api/bakery/templates/upload-signature - Get upload signature for template view images
router.post('/upload-signature', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(503).json({ message: 'Cloudinary upload service is not configured' });
    }
    const signatureData = createTemplateUploadSignature();
    return res.json(signatureData);
  } catch (error) {
    console.error('Failed to create template upload signature:', error);
    return res.status(500).json({ message: 'Failed to authorize template image upload' });
  }
});

// GET /api/bakery/templates/sections - List sections
router.get('/sections', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    await ensureDefaultSections();
    const sections = await TemplateSection.find().sort({ order: 1, createdAt: 1 }).lean();
    return res.json(sections);
  } catch (error) {
    console.error('Failed to get sections:', error);
    return res.status(500).json({ message: 'Failed to fetch sections' });
  }
});

// POST /api/bakery/templates/sections - Create a section
router.post('/sections', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Section name is required' });
    }
    const maxOrderSection = await TemplateSection.findOne().sort({ order: -1 });
    const nextOrder = maxOrderSection ? maxOrderSection.order + 1 : 0;

    const newSection = await TemplateSection.create({
      name: name.trim(),
      order: nextOrder,
    });

    return res.status(201).json(newSection);
  } catch (error) {
    console.error('Failed to create section:', error);
    return res.status(500).json({ message: 'Failed to create section' });
  }
});

// PUT /api/bakery/templates/sections/:id - Update section name or order
router.put('/sections/:id', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const { name, order } = req.body;
    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (order !== undefined) update.order = Number(order);

    const section = await TemplateSection.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    return res.json(section);
  } catch (error) {
    console.error('Failed to update section:', error);
    return res.status(500).json({ message: 'Failed to update section' });
  }
});

// DELETE /api/bakery/templates/sections/:id - Delete section
router.delete('/sections/:id', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const section = await TemplateSection.findByIdAndDelete(req.params.id);
    if (!section) {
      return res.status(404).json({ message: 'Section not found' });
    }
    // Delete associated templates or reassign
    await Template.deleteMany({ sectionId: req.params.id });
    return res.json({ message: 'Section deleted', deletedId: req.params.id });
  } catch (error) {
    console.error('Failed to delete section:', error);
    return res.status(500).json({ message: 'Failed to delete section' });
  }
});

// POST /api/bakery/templates/sections/reorder - Reorder sections
router.post('/sections/reorder', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds array is required' });
    }

    const updates = orderedIds.map((id, index) =>
      TemplateSection.findByIdAndUpdate(id, { order: index })
    );
    await Promise.all(updates);

    const updated = await TemplateSection.find().sort({ order: 1 }).lean();
    return res.json(updated);
  } catch (error) {
    console.error('Failed to reorder sections:', error);
    return res.status(500).json({ message: 'Failed to reorder sections' });
  }
});

// GET /api/bakery/templates/drafts - Get all drafted edits itemized
router.get('/drafts', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const now = new Date();
    const templates = await Template.find({
      $or: [
        { pendingAction: { $in: ['create', 'update', 'delete'] } },
        { effectiveAt: { $gt: now } },
      ],
    }).populate('sectionId', 'name').lean();

    const drafts = templates.map((t) => {
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
        if (orig.config && JSON.stringify(orig.config) !== JSON.stringify(t.config)) changes.push('cake 3D design specs');
        summary = changes.length > 0 ? `Updated ${changes.join(', ')} on "${t.name}"` : `Modified details for "${t.name}"`;
      }

      return {
        _id: t._id,
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

    return res.json({
      drafts,
      count: drafts.length,
      nextCommitTime: nextManilaTenPm(now).toISOString(),
    });
  } catch (error) {
    console.error('Failed to get template drafts:', error);
    return res.status(500).json({ message: 'Failed to retrieve template drafts' });
  }
});

// DELETE /api/bakery/templates/drafts/:id - Discard / Revert a single specific drafted edit
router.delete('/drafts/:id', authenticate, loadAppUser, requireRole('bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const template = await Template.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Draft template not found' });
    }

    if (template.pendingAction === 'create' || (!template.draftOriginalState && template.effectiveAt)) {
      // It was newly created and hasn't gone live yet -> completely remove
      const tName = template.name;
      await Template.findByIdAndDelete(template._id);
      const { recordAuditLog } = require('../services/maintenanceService');
      await recordAuditLog({
        type: 'template',
        action: 'discard',
        title: `Draft Template Discarded: "${tName}"`,
        description: 'Draft was removed prior to 10:00 PM auto-activation.',
        changedBy: req.user?._id,
        changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      });
      return res.json({ message: `Draft "${tName}" removed completely.`, discardedId: template._id, revertedToOriginal: false });
    }

    if (template.draftOriginalState) {
      // It was an update or pending delete -> restore original live state
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
      template.effectiveAt = null; // restore to active live state
      await template.save();

      const { recordAuditLog } = require('../services/maintenanceService');
      await recordAuditLog({
        type: 'template',
        action: 'revert',
        title: `Draft Changes Reverted: "${template.name}"`,
        description: 'Restored template to previous active catalog state.',
        changedBy: req.user?._id,
        changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      });

      return res.json({ message: `Changes reverted for "${template.name}".`, discardedId: template._id, revertedToOriginal: true });
    }

    // Default fallback: clear draft flags
    template.pendingAction = 'none';
    template.effectiveAt = null;
    await template.save();
    return res.json({ message: `Draft status cleared for "${template.name}".`, discardedId: template._id });
  } catch (error) {
    console.error('Failed to discard draft edit:', error);
    return res.status(500).json({ message: 'Failed to discard draft edit' });
  }
});

// POST /api/bakery/templates/drafts/discard-all - Discard all template drafts
router.post('/drafts/discard-all', authenticate, loadAppUser, requireRole('bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const now = new Date();
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

    return res.json({ message: 'All drafted template edits have been discarded.' });
  } catch (error) {
    console.error('Failed to discard all template drafts:', error);
    return res.status(500).json({ message: 'Failed to discard all template drafts' });
  }
});

// GET /api/bakery/templates - Get all templates and sections for management
router.get('/', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    await ensureDefaultSections();
    const sections = await TemplateSection.find().sort({ order: 1, createdAt: 1 }).lean();
    const templates = await Template.find().sort({ order: 1, createdAt: 1 }).lean();

    const sectionsWithTemplates = sections.map((section) => ({
      ...section,
      templates: templates.filter((t) => String(t.sectionId) === String(section._id)),
    }));

    const now = new Date();
    const pendingActivationCount = templates.filter(
      (t) => (t.pendingAction && t.pendingAction !== 'none') || (t.effectiveAt && new Date(t.effectiveAt) > now)
    ).length;

    return res.json({
      sections: sectionsWithTemplates,
      allTemplates: templates,
      pendingActivationCount,
    });
  } catch (error) {
    console.error('Failed to fetch bakery templates:', error);
    return res.status(500).json({ message: 'Failed to fetch bakery templates' });
  }
});

// POST /api/bakery/templates - Create template (drafted for 10 PM)
router.post('/', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      longDescription,
      sectionId,
      priceMinor,
      specs,
      views,
      thumbnail,
      config,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Template name is required' });
    }

    let targetSectionId = sectionId;
    if (!targetSectionId) {
      await ensureDefaultSections();
      const firstSection = await TemplateSection.findOne().sort({ order: 1 });
      targetSectionId = firstSection?._id;
    }

    const maxOrderTemplate = await Template.findOne({ sectionId: targetSectionId }).sort({ order: -1 });
    const nextOrder = maxOrderTemplate ? maxOrderTemplate.order + 1 : 0;

    const cleanViews = sanitizeViews(views);
    const defaultThumb = thumbnail || (cleanViews[0]?.url ? cleanViews[0].url : '');

    const template = await Template.create({
      name: name.trim(),
      description: description?.trim() || '',
      longDescription: longDescription?.trim() || description?.trim() || '',
      sectionId: targetSectionId,
      priceMinor: Number(priceMinor) || 0,
      specs: Array.isArray(specs) ? specs : [],
      views: cleanViews,
      thumbnail: defaultThumb,
      config: config || {},
      order: nextOrder,
      isPublished: true,
      pendingAction: 'create',
      draftOriginalState: null,
      effectiveAt: nextManilaTenPm(),
    });

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      type: 'template',
      action: 'create',
      title: `Draft Template Created: "${template.name}"`,
      description: `Staged for 10:00 PM auto-activation in section "${targetSectionId}"`,
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      scheduledEffectiveAt: template.effectiveAt,
    });

    return res.status(201).json(template);
  } catch (error) {
    console.error('Failed to create template:', error);
    return res.status(500).json({ message: 'Failed to create template' });
  }
});

// PUT /api/bakery/templates/:id - Update template (drafted for 10 PM, snapshots original state)
router.put('/:id', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const {
      name,
      description,
      longDescription,
      sectionId,
      priceMinor,
      specs,
      views,
      thumbnail,
      config,
      order,
      isPublished,
    } = req.body;

    const existing = await Template.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // Preserve original state if not already in a draft update
    let draftOriginalState = existing.draftOriginalState;
    if (!draftOriginalState && existing.pendingAction === 'none') {
      draftOriginalState = {
        name: existing.name,
        description: existing.description,
        longDescription: existing.longDescription,
        sectionId: existing.sectionId,
        priceMinor: existing.priceMinor,
        specs: existing.specs,
        views: existing.views,
        thumbnail: existing.thumbnail,
        config: existing.config,
        order: existing.order,
        isPublished: existing.isPublished,
      };
    }

    if (name !== undefined) existing.name = name.trim();
    if (description !== undefined) existing.description = description.trim();
    if (longDescription !== undefined) existing.longDescription = longDescription.trim();
    if (sectionId !== undefined) existing.sectionId = sectionId;
    if (priceMinor !== undefined) existing.priceMinor = Number(priceMinor);
    if (specs !== undefined) existing.specs = specs;
    if (views !== undefined) existing.views = sanitizeViews(views);
    if (thumbnail !== undefined) existing.thumbnail = thumbnail;
    if (config !== undefined) existing.config = config;
    if (order !== undefined) existing.order = Number(order);
    if (isPublished !== undefined) existing.isPublished = Boolean(isPublished);

    if (existing.pendingAction !== 'create') {
      existing.pendingAction = 'update';
      existing.draftOriginalState = draftOriginalState;
    }
    existing.effectiveAt = nextManilaTenPm();

    await existing.save();

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      type: 'template',
      action: 'update',
      title: `Draft Template Updated: "${existing.name}"`,
      description: 'Changes staged for 10:00 PM auto-activation.',
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      scheduledEffectiveAt: existing.effectiveAt,
    });

    return res.json(existing);
  } catch (error) {
    console.error('Failed to update template:', error);
    return res.status(500).json({ message: 'Failed to update template' });
  }
});

// DELETE /api/bakery/templates/:id - Delete template (stages pending delete if already live, or removes immediately if draft)
router.delete('/:id', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const existing = await Template.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Template not found' });
    }

    // If it was just created in draft (never live), delete immediately
    if (existing.pendingAction === 'create') {
      const tName = existing.name;
      await Template.findByIdAndDelete(existing._id);
      const { recordAuditLog } = require('../services/maintenanceService');
      await recordAuditLog({
        type: 'template',
        action: 'discard',
        title: `Draft Template Discarded: "${tName}"`,
        description: 'New draft template removed before publishing.',
        changedBy: req.user?._id,
        changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      });
      return res.json({ message: 'Draft template removed', deletedId: req.params.id, staged: false });
    }

    // If it's a live template, stage the deletion for 10 PM so it can be viewed and discarded/canceled in control panel
    existing.draftOriginalState = existing.draftOriginalState || {
      name: existing.name,
      description: existing.description,
      longDescription: existing.longDescription,
      sectionId: existing.sectionId,
      priceMinor: existing.priceMinor,
      specs: existing.specs,
      views: existing.views,
      thumbnail: existing.thumbnail,
      config: existing.config,
      order: existing.order,
      isPublished: existing.isPublished,
    };
    existing.pendingAction = 'delete';
    existing.effectiveAt = nextManilaTenPm();
    await existing.save();

    const { recordAuditLog } = require('../services/maintenanceService');
    await recordAuditLog({
      type: 'template',
      action: 'delete',
      title: `Template Deletion Staged: "${existing.name}"`,
      description: 'Scheduled for removal at 10:00 PM.',
      changedBy: req.user?._id,
      changedByName: req.user?.displayName || req.user?.email || 'Bakery Staff',
      scheduledEffectiveAt: existing.effectiveAt,
    });

    return res.json({ message: 'Template scheduled for removal at 10:00 PM', deletedId: req.params.id, staged: true });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return res.status(500).json({ message: 'Failed to delete template' });
  }
});

// POST /api/bakery/templates/reorder - Reorder templates within a section
router.post('/reorder', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const { sectionId, orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds array is required' });
    }

    const updates = orderedIds.map((id, index) =>
      Template.findByIdAndUpdate(id, { order: index, ...(sectionId ? { sectionId } : {}) })
    );
    await Promise.all(updates);

    const updated = await Template.find(sectionId ? { sectionId } : {}).sort({ order: 1 }).lean();
    return res.json(updated);
  } catch (error) {
    console.error('Failed to reorder templates:', error);
    return res.status(500).json({ message: 'Failed to reorder templates' });
  }
});

module.exports = router;
