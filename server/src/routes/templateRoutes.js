const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const TemplateSection = require('../models/TemplateSection');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole } = require('../middleware/authorize');

// ----------------------------------------------------
// Public Client Endpoints
// ----------------------------------------------------

// GET /api/templates - Get all sections and published templates for client
router.get('/public', async (req, res) => {
  try {
    const sections = await TemplateSection.find().sort({ order: 1, createdAt: 1 }).lean();
    const templates = await Template.find({ isPublished: true }).sort({ order: 1, createdAt: 1 }).lean();

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
    return res.status(500).json({ message: 'Failed to fetch template' });
  }
});

// ----------------------------------------------------
// Bakery Admin Endpoints
// ----------------------------------------------------

// GET /api/bakery/templates/sections - List sections
router.get('/sections', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const sections = await TemplateSection.find().sort({ order: 1, createdAt: 1 }).lean();
    return res.json(sections);
  } catch (error) {
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
    return res.status(500).json({ message: 'Failed to reorder sections' });
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

    return res.json({
      sections: sectionsWithTemplates,
      allTemplates: templates,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch bakery templates' });
  }
});

// POST /api/bakery/templates - Create template
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

    const defaultThumb = thumbnail || (Array.isArray(views) && views[0]?.url ? views[0].url : '');

    const template = await Template.create({
      name: name.trim(),
      description: description?.trim() || '',
      longDescription: longDescription?.trim() || description?.trim() || '',
      sectionId: targetSectionId,
      priceMinor: Number(priceMinor) || 0,
      specs: Array.isArray(specs) ? specs : [],
      views: Array.isArray(views) ? views : [],
      thumbnail: defaultThumb,
      config: config || {},
      order: nextOrder,
      isPublished: true,
    });

    return res.status(201).json(template);
  } catch (error) {
    console.error('Failed to create template:', error);
    return res.status(500).json({ message: 'Failed to create template' });
  }
});

// PUT /api/bakery/templates/:id - Update template
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

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (description !== undefined) update.description = description.trim();
    if (longDescription !== undefined) update.longDescription = longDescription.trim();
    if (sectionId !== undefined) update.sectionId = sectionId;
    if (priceMinor !== undefined) update.priceMinor = Number(priceMinor);
    if (specs !== undefined) update.specs = specs;
    if (views !== undefined) update.views = views;
    if (thumbnail !== undefined) update.thumbnail = thumbnail;
    if (config !== undefined) update.config = config;
    if (order !== undefined) update.order = Number(order);
    if (isPublished !== undefined) update.isPublished = Boolean(isPublished);

    const template = await Template.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update template' });
  }
});

// DELETE /api/bakery/templates/:id - Delete template
router.delete('/:id', authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), async (req, res) => {
  try {
    const template = await Template.findByIdAndDelete(req.params.id);
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }
    return res.json({ message: 'Template deleted', deletedId: req.params.id });
  } catch (error) {
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
    return res.status(500).json({ message: 'Failed to reorder templates' });
  }
});

module.exports = router;
