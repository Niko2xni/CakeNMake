const express = require('express');
const router = express.Router();
const { listPresets, updatePresetPrice, listChangeLog } = require('../controllers/pricingController');
const authenticate = require('../middleware/authenticate');
const {
  loadAppUser,
  requirePlatformMembership,
  requireRole,
} = require('../middleware/authorize');

router.use(authenticate);
router.use(loadAppUser);
router.use(requireRole('bakery_staff', 'bakery_admin', 'platform_admin'));
router.use(requirePlatformMembership);

router.get('/', listPresets);
router.get('/log', listChangeLog);
router.patch('/:id', updatePresetPrice);

module.exports = router;
