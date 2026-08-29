const Design = require('../models/Design');
const { deleteImageByUrl } = require('../config/cloudinary');

// Get all designs for a user
exports.getDesigns = async (req, res) => {
  try {
    const { userId } = req.query;
    const designs = await Design.find({ userId })
      .sort({ lastEdited: -1 })
      .limit(3);
    res.json(designs);
  } catch (error) {
    console.error('Error fetching designs:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get a single design by ID
exports.getDesignById = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }
    res.json(design);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create a new design
exports.createDesign = async (req, res) => {
  try {
    const { name, config, userId } = req.body;
    
    console.log('Creating design with data:', { name, userId, hasConfig: !!config });
    
    // Auto-generate name if not provided
    let designName = name || 'Untitled';
    if (!name) {
      const count = await Design.countDocuments({ userId });
      designName = `Untitled ${count + 1}`;
    }

    const design = new Design({
      name: designName,
      config,
      userId
    });

    const savedDesign = await design.save();
    console.log('Design saved successfully:', savedDesign._id);
    res.status(201).json(savedDesign);
  } catch (error) {
    console.error('Error creating design:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update a design
exports.updateDesign = async (req, res) => {
  try {
    const { name, config, thumbnail } = req.body;
    const design = await Design.findById(req.params.id);

    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Store original state for rollback
    const originalThumbnail = design.thumbnail;
    const originalFallback = design.thumbnailFallback;

    console.log('[DEBUG] updateDesign - Design ID:', req.params.id);
    console.log('[DEBUG] updateDesign - Original thumbnail:', originalThumbnail);
    console.log('[DEBUG] updateDesign - Original fallback:', originalFallback);
    console.log('[DEBUG] updateDesign - New thumbnail provided:', thumbnail);

    if (thumbnail && thumbnail !== originalThumbnail) {
      // New thumbnail provided: delete old thumbnails to prevent stacking
      // Delete old current thumbnail
      if (originalThumbnail) {
        console.log('[DEBUG] updateDesign - Deleting old current thumbnail:', originalThumbnail);
        const deleteResult = await deleteImageByUrl(originalThumbnail);
        console.log('[DEBUG] updateDesign - Old current deletion result:', deleteResult);
      }
      // Delete old fallback if exists
      if (originalFallback) {
        console.log('[DEBUG] updateDesign - Deleting old fallback:', originalFallback);
        const deleteResult = await deleteImageByUrl(originalFallback);
        console.log('[DEBUG] updateDesign - Old fallback deletion result:', deleteResult);
      }
      
      // Set new thumbnail, no fallback (to prevent stacking)
      design.thumbnail = thumbnail;
      design.thumbnailFallback = null;
      console.log('[DEBUG] updateDesign - New thumbnail set, no fallback to prevent stacking');
    } else if (!thumbnail) {
      // No new thumbnail: clear fallback and delete from Cloudinary
      if (originalFallback) {
        console.log('[DEBUG] updateDesign - Clearing fallback:', originalFallback);
        const deleteResult = await deleteImageByUrl(originalFallback);
        console.log('[DEBUG] updateDesign - Fallback deletion result:', deleteResult);
        design.thumbnailFallback = null;
      } else {
        console.log('[DEBUG] updateDesign - No fallback to clear');
      }
    } else {
      console.log('[DEBUG] updateDesign - Thumbnail unchanged, no rotation needed');
    }

    // Update other fields
    if (name) design.name = name;
    if (config) design.config = config;

    const updatedDesign = await design.save();
    console.log('[DEBUG] updateDesign - Design saved successfully');

    res.json(updatedDesign);
  } catch (error) {
    console.error('[ERROR] updateDesign - Error updating design:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete a design
exports.deleteDesign = async (req, res) => {
  try {
    console.log('[DEBUG] deleteDesign - Attempting to delete design ID:', req.params.id);
    const design = await Design.findById(req.params.id);
    if (!design) {
      console.log('[DEBUG] deleteDesign - Design not found');
      return res.status(404).json({ message: 'Design not found' });
    }

    console.log('[DEBUG] deleteDesign - Design found. Thumbnail:', design.thumbnail, 'Fallback:', design.thumbnailFallback);

    // Delete both thumbnails from Cloudinary before deleting from database
    if (design.thumbnail) {
      console.log('[DEBUG] deleteDesign - Deleting thumbnail from Cloudinary');
      await deleteImageByUrl(design.thumbnail);
    }
    if (design.thumbnailFallback) {
      console.log('[DEBUG] deleteDesign - Deleting fallback from Cloudinary');
      await deleteImageByUrl(design.thumbnailFallback);
    }

    await Design.findByIdAndDelete(req.params.id);
    console.log('[DEBUG] deleteDesign - Design deleted from database');
    res.json({ message: 'Design deleted successfully' });
  } catch (error) {
    console.error('[ERROR] deleteDesign - Error deleting design:', error);
    res.status(500).json({ message: error.message });
  }
};

// Move design to trash
exports.moveToTrash = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    // Check if trash is full (max 5 items)
    const trashedCount = await Design.countDocuments({ 
      userId: design.userId, 
      isTrashed: true 
    });

    if (trashedCount >= 5) {
      // Find and permanently delete the oldest trashed design
      const oldestTrashed = await Design.findOne({
        userId: design.userId,
        isTrashed: true
      }).sort({ trashedAt: 1 });
      
      if (oldestTrashed) {
        await Design.findByIdAndDelete(oldestTrashed._id);
      }
    }

    design.isTrashed = true;
    design.trashedAt = new Date();
    await design.save();

    res.json(design);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Restore design from trash
exports.restoreFromTrash = async (req, res) => {
  try {
    const design = await Design.findById(req.params.id);
    if (!design) {
      return res.status(404).json({ message: 'Design not found' });
    }

    design.isTrashed = false;
    design.trashedAt = null;
    await design.save();

    res.json(design);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Permanently delete design
exports.permanentlyDelete = async (req, res) => {
  try {
    console.log('[DEBUG] permanentlyDelete - Attempting to permanently delete design ID:', req.params.id);
    const design = await Design.findById(req.params.id);
    if (!design) {
      console.log('[DEBUG] permanentlyDelete - Design not found');
      return res.status(404).json({ message: 'Design not found' });
    }

    console.log('[DEBUG] permanentlyDelete - Design found. Thumbnail:', design.thumbnail, 'Fallback:', design.thumbnailFallback);

    // Delete both thumbnails from Cloudinary before deleting from database
    if (design.thumbnail) {
      console.log('[DEBUG] permanentlyDelete - Deleting thumbnail from Cloudinary');
      await deleteImageByUrl(design.thumbnail);
    }
    if (design.thumbnailFallback) {
      console.log('[DEBUG] permanentlyDelete - Deleting fallback from Cloudinary');
      await deleteImageByUrl(design.thumbnailFallback);
    }

    await Design.findByIdAndDelete(req.params.id);
    console.log('[DEBUG] permanentlyDelete - Design permanently deleted from database');
    res.json({ message: 'Design permanently deleted' });
  } catch (error) {
    console.error('[ERROR] permanentlyDelete - Error permanently deleting design:', error);
    res.status(500).json({ message: error.message });
  }
};
