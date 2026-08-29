const express = require('express');
const router = express.Router();
const {
  getDesigns,
  getDesignById,
  createDesign,
  updateDesign,
  deleteDesign,
  moveToTrash,
  restoreFromTrash,
  permanentlyDelete
} = require('../controllers/designController');

// GET /api/designs - Get all designs for a user
router.get('/', getDesigns);

// GET /api/designs/:id - Get a single design
router.get('/:id', getDesignById);

// POST /api/designs - Create a new design
router.post('/', createDesign);

// PUT /api/designs/:id - Update a design
router.put('/:id', updateDesign);

// DELETE /api/designs/:id - Delete a design
router.delete('/:id', deleteDesign);

// POST /api/designs/:id/trash - Move design to trash
router.post('/:id/trash', moveToTrash);

// POST /api/designs/:id/restore - Restore design from trash
router.post('/:id/restore', restoreFromTrash);

// DELETE /api/designs/:id/permanent - Permanently delete design
router.delete('/:id/permanent', permanentlyDelete);

module.exports = router;
