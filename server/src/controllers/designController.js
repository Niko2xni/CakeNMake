const mongoose = require('mongoose');
const Design = require('../models/Design');
const Reservation = require('../models/Reservation');
const {
  createThumbnailUploadSignature: buildThumbnailUploadSignature,
  deleteTrustedThumbnail,
  verifyThumbnailAsset,
} = require('../config/cloudinary');

const MAX_TRASH_CAPACITY = 20;
const MAX_ACTIVE_DESIGNS = 20;
exports.MAX_TRASH_CAPACITY = MAX_TRASH_CAPACITY;
exports.MAX_ACTIVE_DESIGNS = MAX_ACTIVE_DESIGNS;

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

    const sanitized = designs.map((d) => {
      if (d.isDuplicated && (d.paymentCompleted || d.sentToBakery || d.orderContext)) {
        const doc = d.toObject ? d.toObject() : { ...d };
        doc.sentToBakery = false;
        doc.paymentCompleted = false;
        doc.orderContext = null;
        Design.updateOne(
          { _id: d._id },
          { $set: { sentToBakery: false, paymentCompleted: false, orderContext: null } }
        ).exec().catch(() => {});
        return doc;
      }
      return d;
    });

    return res.json(sanitized);
  } catch (error) {
    console.error('Error fetching designs:', error);
    return res.status(500).json({ message: 'Failed to load designs' });
  }
};

exports.getDesignById = async (req, res) => {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req));
    if (!design) return notFound(res);
    if (design.isDuplicated && (design.paymentCompleted || design.sentToBakery || design.orderContext)) {
      const doc = design.toObject ? design.toObject() : { ...design };
      doc.sentToBakery = false;
      doc.paymentCompleted = false;
      doc.orderContext = null;
      Design.updateOne(
        { _id: design._id },
        { $set: { sentToBakery: false, paymentCompleted: false, orderContext: null } }
      ).exec().catch(() => {});
      return res.json(doc);
    }
    return res.json(design);
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

    const activeCount = await Design.countDocuments({ ...ownerFilter(req), isTrashed: false });
    if (activeCount >= MAX_ACTIVE_DESIGNS) {
      return res.status(400).json({
        message: 'Maximum design capacity reached (20). Please delete or move older designs to trash to create a new one.',
        code: 'MAX_CAPACITY_REACHED'
      });
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

    const isDuplicated = req.body.isDuplicated === true;

    const design = new Design({
      name,
      config,
      owner: req.user._id,
      lastEstimate: lastEstimate || undefined,
      thumbnail: typeof thumbnail === 'string' ? thumbnail : undefined,
      thumbnailFallback: typeof thumbnailFallback === 'string' ? thumbnailFallback : undefined,
      thumbnailAsset: thumbnailAsset && typeof thumbnailAsset === 'object' ? thumbnailAsset : undefined,
      sentToBakery: isDuplicated ? false : req.body.sentToBakery === true,
      paymentCompleted: isDuplicated ? false : req.body.paymentCompleted === true,
      orderContext: isDuplicated ? undefined : (req.body.orderContext && typeof req.body.orderContext === 'object' ? req.body.orderContext : undefined),
      isDuplicated,
      templateId: req.body.templateId || undefined,
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
    if (req.body.templateId !== undefined) updates.templateId = req.body.templateId || null;
    if (req.body.lastEstimate !== undefined) updates.lastEstimate = req.body.lastEstimate;
    if (req.body.sentToBakery !== undefined) updates.sentToBakery = Boolean(req.body.sentToBakery);
    if (req.body.paymentCompleted !== undefined) updates.paymentCompleted = Boolean(req.body.paymentCompleted);
    if (req.body.orderContext !== undefined) updates.orderContext = req.body.orderContext;

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

async function hasActiveReservation(req, design) {
  if (!design || !design.sentToBakery) return false;
  const userId = req.user?._id;
  if (!userId) return false;
  try {
    const reservation = await Reservation.findOne({
      user: userId,
      $or: [
        { design: design._id },
        { designName: design.name },
      ],
      status: { $in: ['pending_payment', 'confirmed', 'in_production'] },
    });
    return Boolean(reservation);
  } catch (error) {
    console.error('Error checking active reservation:', error);
    return false;
  }
}

async function removeOwnedDesign(req, res, message) {
  if (invalidDesignId(req, res)) return;
  try {
    const design = await Design.findOne(ownedDesignFilter(req));
    if (!design) return notFound(res);
    if (await hasActiveReservation(req, design)) {
      return res.status(400).json({
        code: 'ORDER_IN_PROGRESS',
        message: 'This design has an active reservation and cannot be deleted while in progress.',
      });
    }
    await Design.deleteOne({ _id: design._id });
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
    if (await hasActiveReservation(req, design)) {
      return res.status(400).json({
        code: 'ORDER_IN_PROGRESS',
        message: 'This design has an active reservation and cannot be moved to trash while in progress.',
      });
    }
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
    const activeCount = await Design.countDocuments({ ...ownerFilter(req), isTrashed: false });
    if (activeCount >= MAX_ACTIVE_DESIGNS) {
      return res.status(400).json({
        message: 'Cannot restore design. Your cake table has reached the maximum capacity of 20 designs. Please move or delete designs before restoring.',
        code: 'MAX_CAPACITY_REACHED'
      });
    }
    design.isTrashed = false;
    design.trashedAt = null;
    return res.json(await design.save());
  } catch (error) {
    console.error('Error restoring design:', error);
    return res.status(500).json({ message: 'Failed to restore design' });
  }
};

exports.moveAllToTrash = async (req, res) => {
  try {
    const filter = ownerFilter(req);
    const activeDesigns = await Design.find({ ...filter, isTrashed: false });
    if (activeDesigns.length === 0) {
      return res.json({ message: 'No designs to move to trash', count: 0 });
    }

    const userId = req.user?._id;
    const hasSentToBakery = activeDesigns.some((d) => d.sentToBakery);
    let activeReservationDesignIds = new Set();
    if (hasSentToBakery && userId) {
      try {
        const activeReservations = await Reservation.find({
          user: userId,
          status: { $in: ['pending_payment', 'confirmed', 'in_production'] },
        }).select('design designName');
        for (const r of activeReservations) {
          if (r.design) activeReservationDesignIds.add(String(r.design));
        }
        for (const d of activeDesigns) {
          if (d.sentToBakery && activeReservations.some((r) => r.designName === d.name)) {
            activeReservationDesignIds.add(String(d._id));
          }
        }
      } catch (error) {
        console.error('Error checking active reservations for moveAllToTrash:', error);
      }
    }

    const trashableDesigns = activeDesigns.filter((d) => !activeReservationDesignIds.has(String(d._id)));
    if (trashableDesigns.length === 0) {
      return res.status(400).json({
        code: 'ALL_ORDERS_IN_PROGRESS',
        message: 'All your designs have active reservations and cannot be moved to trash while in progress.',
      });
    }

    const now = new Date();
    const updateFilter = activeReservationDesignIds.size > 0
      ? { ...filter, isTrashed: false, _id: { $nin: Array.from(activeReservationDesignIds) } }
      : { ...filter, isTrashed: false };

    await Design.updateMany(
      updateFilter,
      { $set: { isTrashed: true, trashedAt: now } }
    );

    // Enforce trash capacity (up to 20 designs in trash). Trim oldest if needed.
    const allTrashed = await Design.find({ ...filter, isTrashed: true })
      .sort({ trashedAt: -1, lastEdited: -1 });

    if (allTrashed.length > MAX_TRASH_CAPACITY) {
      const excess = allTrashed.slice(MAX_TRASH_CAPACITY);
      for (const oldDesign of excess) {
        await Design.findByIdAndDelete(oldDesign._id);
        if (oldDesign.thumbnailAsset) {
          await deleteTrustedThumbnail({
            asset: oldDesign.thumbnailAsset,
            firebaseUid: req.auth.uid,
            designId: oldDesign._id.toString(),
          });
        }
      }
    }

    return res.json({ message: 'All eligible designs moved to trash', count: trashableDesigns.length });
  } catch (error) {
    console.error('Error moving all designs to trash:', error);
    return res.status(500).json({ message: 'Failed to move all designs to trash' });
  }
};

exports.deleteAllTrash = async (req, res) => {
  try {
    const filter = ownerFilter(req);
    const trashedDesigns = await Design.find({ ...filter, isTrashed: true });
    for (const d of trashedDesigns) {
      if (d.thumbnailAsset) {
        await deleteTrustedThumbnail({
          asset: d.thumbnailAsset,
          firebaseUid: req.auth.uid,
          designId: d._id.toString(),
        });
      }
    }
    const result = await Design.deleteMany({ ...filter, isTrashed: true });
    return res.json({ message: 'All trashed designs permanently deleted', count: result.deletedCount });
  } catch (error) {
    console.error('Error deleting all trashed designs:', error);
    return res.status(500).json({ message: 'Failed to delete all trashed designs' });
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
