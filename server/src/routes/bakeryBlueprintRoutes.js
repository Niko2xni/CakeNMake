const express = require('express');
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole, requirePlatformMembership } = require('../middleware/authorize');
const { listBlueprints, getBlueprintAccess } = require('../controllers/bakeryBlueprintController');
const router = express.Router();
router.use(authenticate, loadAppUser, requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), requirePlatformMembership);
router.get('/', listBlueprints);
router.get('/:id/access', getBlueprintAccess);
module.exports = router;
