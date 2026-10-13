const mongoose = require('mongoose');
const Design = require('../models/Design');
const {
  createThumbnailUploadSignature: buildThumbnailUploadSignature,
  deleteTrustedThumbnail,
  verifyThumbnailAsset,
} = require('../config/cloudinary');

const MAX_TRASH_CAPACITY = 20;
exports.MAX_TRASH_CAPACITY = MAX_TRASH_CAPACITY;

function legacyEmail(req) {
  if (!req.auth?.emailVerified) return '';
  return String(req.user?.email || req.auth?.email || '').trim().toLowerCase();
}

function ownerFilter(req) {
  const filters = [{ owner: req.user._id }];
  const email = legacyEmail(req);
  if (email) filters.push({ owner: null, userId: email });
  return filters.length === 1 ? filters[0] : { $or: filters };
}

function ownedDesignFilter(req, id = req.params.id) {
  return { _id: id, ...ownerFilter(req) };
}

function invalidDesignId(req, res) {
  if (mongoose.isValidObjectId(req.params.id)) return false;
  res.status(400).json({ message: 'Invalid design ID' });
  return true;
}

function notFound(res) {
  return res.status(404).json({ message: 'Design not found' });
}

exports.getDesigns = async (req, res) => {
  try {
    const trashOnly = req.query.isTrashed === 'true';
    const sort = trashOnly ? { trashedAt: -1, lastEdited: -1 } : { lastEdited: -1 };
    const designs = await Design.find({ ...ownerFilter(req), isTrashed: trashOnly })
      .sort(sort)
      .limit(MAX_TRASH_CAPACITY);
    return res.json(designs);
  } catch (error) {
    console.error('Error fetching designs:', error);
    return res.status(500).json({ message: 'Failed to load designs' });
  }
};

exports.getDesignById = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req));
    return design ? res.json(design) : notFound(res);
  } catch (error) {
    console.error('Error fetching design:', error);
    return res.status(500).json({ message: 'Failed to load design' });
  }
};

exports.getAiChat = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req)).select('+aiChat');
    return design ? res.json(design.aiChat || { history: [], display: [] }) : notFound(res);
  } catch {
    return res.status(500).json({ message: 'Failed to load design chat' });
  }
};

exports.saveAiChat = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  const { history, display } = req.body || {};
  if (!Array.isArray(history) || !Array.isArray(display) || history.length > 100 || display.length > 60
    || JSON.stringify({ history, display }).length > 120000
    || history.some(message => !message || !['user', 'assistant'].includes(message.role)
      || !(typeof message.content === 'string' || Array.isArray(message.content)))
    || display.some(message => !message || !['user', 'assistant'].includes(message.role)
      || typeof message.content !== 'string' || message.content.length > 10000
      || (message.changes !== undefined && (!Array.isArray(message.changes) || message.changes.some(change => typeof change !== 'string'))))) {
    return res.status(400).json({ message: 'Invalid design chat' });
  }
  try {
    const design = await Design.findOneAndUpdate(ownedDesignFilter(req), {
      $set: { aiChat: { history, display } },
    }, { new: true, runValidators: true });
    return design ? res.json({ saved: true }) : notFound(res);
  } catch {
    return res.status(500).json({ message: 'Failed to save design chat' });
  }
};

exports.createDesign = async (req, res) => {
  try {
    const { config, lastEstimate, thumbnail, thumbnailFallback, thumbnailAsset } = req.body;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      return res.status(400).json({ message: 'A valid design configuration is required' });
    }
    let name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const isAutoName = !name || /^(?:Unnamed|Untitled)(?:\s+\d+)?$/i.test(name);
    if (isAutoName) {
      const existing = await Design.find({ ...ownerFilter(req), isTrashed: false }, { name: 1 });
      const existingNames = new Set(existing.map((d) => (d.name || '').trim().toLowerCase()));
      let num = 1;
      while (existingNames.has(`unnamed ${num}`) || existingNames.has(`untitled ${num}`)) {
        num++;
      }
      name = `Unnamed ${num}`;
    }
    if (name.length > 100) return res.status(400).json({ message: 'Design name is too long' });

    const design = new Design({
      name,
      config,
      owner: req.user._id,
      lastEstimate: lastEstimate || undefined,
      thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined,
      thumbnailFallback: typeof thumbnailFallback === 'string' ? thumbnailFallback : undefined,
      thumbnailAsset: thumbnailAsset && typeof thumbnailAsset === 'object' ? thumbnailAsset : undefined,
      sentToBakery: req.body.sentToBakery === true,
      isDuplicated: req.body.isDuplicated === true,
    });
    return res.status(201).json(await design.save());
  } catch (error) {
    console.error('Error creating design:', error);
    return res.status(400).json({ message: 'Failed to create design' });
  }
};

exports.updateDesign = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const existing = await Design.findOne(ownedDesignFilter(req));
    if (!existing) return notFound(res);

    if (existing.sentToBakery) {
      return res.status(403).json({ message: 'This design has already been submitted to the bakery and is permanently locked.' });
    }

    const updates = {};
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.trim().length > 100) {
        return res.status(400).json({ message: 'Enter a design name of no more than 100 characters' });
      }
      updates.name = req.body.name.trim();
    }
    if (req.body.config !== undefined) {
      if (!req.body.config || typeof req.body.config !== 'object' || Array.isArray(req.body.config)) {
        return res.status(400).json({ message: 'Invalid design configuration' });
      }
      updates.config = req.body.config;
      updates.isDuplicated = false;
    }
    if (req.body.isDuplicated !== undefined) updates.isDuplicated = Boolean(req.body.isDuplicated);
    if (req.body.lastEstimate !== undefined) updates.lastEstimate = req.body.lastEstimate;
    if (req.body.sentToBakery !== undefined) updates.sentToBakery = Boolean(req.body.sentToBakery);

    const design = await Design.findOneAndUpdate(
      ownedDesignFilter(req),
      { $set: updates },
      { new: true, runValidators: true }
    );
    return design ? res.json(design) : notFound(res);
  } catch (error) {
    console.error('Error updating design:', error);
    return res.status(400).json({ message: 'Failed to update design' });
  }
};

async function removeOwnedDesign(req, res, message) {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOneAndDelete(ownedDesignFilter(req));
    if (!design) return notFound(res);
    await deleteTrustedThumbnail({
      asset: design.thumbnailAsset,
      firebaseUid: req.auth.uid,
      designId: design._id.toString(),
    });
    return res.json({ message });
  } catch (error) {
    console.error('Error deleting design:', error);
    return res.status(500).json({ message: 'Failed to delete design' });
  }
}

exports.deleteDesign = (req, res) => removeOwnedDesign(req, res, 'Design deleted successfully');
exports.permanentlyDelete = (req, res) => removeOwnedDesign(req, res, 'Design permanently deleted');

exports.moveToTrash = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req));
    if (!design) return notFound(res);
    const filter = ownerFilter(req);
    if (!design.isTrashed) {
      const trashedCount = await Design.countDocuments({ ...filter, isTrashed: true });
      if (trashedCount >= MAX_TRASH_CAPACITY) {
        const oldest = await Design.findOneAndDelete({ ...filter, isTrashed: true }, { sort: { trashedAt: 1 } });
        if (oldest) {
          await deleteTrustedThumbnail({
            asset: oldest.thumbnailAsset,
            firebaseUid: req.auth.uid,
            designId: oldest._id.toString(),
          });
        }
      }
      design.isTrashed = true;
    }
    design.trashedAt = new Date();
    return res.json(await design.save());
  } catch (error) {
    console.error('Error moving design to trash:', error);
    return res.status(500).json({ message: 'Failed to move design to trash' });
  }
};

exports.restoreFromTrash = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req));
    if (!design) return notFound(res);
    design.isTrashed = false;
    design.trashedAt = null;
    return res.json(await design.save());
  } catch (error) {
    console.error('Error restoring design:', error);
    return res.status(500).json({ message: 'Failed to restore design' });
  }
};

exports.createThumbnailUploadSignature = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req)).select('_id');
    if (!design) return notFound(res);
    return res.json(buildThumbnailUploadSignature({
      firebaseUid: req.auth.uid,
      designId: design._id.toString(),
    }));
  } catch (error) {
    console.error('Error creating thumbnail upload signature:', error);
    return res.status(500).json({ message: 'Failed to authorize thumbnail upload' });
  }
};

exports.attachThumbnail = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req));
    if (!design) return notFound(res);
    const verified = await verifyThumbnailAsset({
      firebaseUid: req.auth.uid,
      designId: design._id.toString(),
      publicId: req.body.publicId,
      secureUrl: req.body.secureUrl,
    });
    if (!verified) return res.status(400).json({ message: 'Invalid thumbnail asset' });

    const previousAsset = design.thumbnailAsset?.trusted
      ? design.thumbnailAsset.toObject?.() || design.thumbnailAsset
      : null;
    design.thumbnail = verified.secureUrl;
    design.thumbnailFallback = null;
    design.thumbnailAsset = {
      ...verified,
      ownerUid: req.auth.uid,
      uploadedAt: new Date(),
      trusted: true,
    };
    const saved = await design.save();
    if (previousAsset?.publicId && previousAsset.publicId !== verified.publicId) {
      await deleteTrustedThumbnail({
        asset: previousAsset,
        firebaseUid: req.auth.uid,
        designId: design._id.toString(),
      });
    }
    return res.json(saved);
  } catch (error) {
    console.error('Error attaching thumbnail:', error);
    return res.status(400).json({ message: 'Failed to attach thumbnail' });
  }
};

exports.ownerFilter = ownerFilter;
