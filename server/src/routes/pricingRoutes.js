const express = require('express');
const router = express.Router();
const { listPresets, updatePresetPrice, listChangeLog } = require('../controllers/pricingController');
const { cancelScheduled, createDraft, discardDraft, getDraftsSummary, getWorkspace, publishDraftNow, scheduleDraft, updateDraftItem, updateDraftRates } = require('../controllers/priceBookController');
const authenticate = require('../middleware/authenticate');
const {
  loadAppUser,
  requirePlatformMembership,
  requireRole,
} = require('../middleware/authorize');

router.use(authenticate);
router.use(loadAppUser);
router.use(requirePlatformMembership);

router.get('/', requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), getWorkspace);
router.get('/drafts-summary', requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), getDraftsSummary);
router.post('/draft', requireRole('bakery_admin', 'platform_admin'), createDraft);
router.patch('/draft/items/:componentKey', requireRole('bakery_admin', 'platform_admin'), updateDraftItem);
router.patch('/draft/rates', requireRole('bakery_admin', 'platform_admin'), updateDraftRates);
router.post('/draft/schedule', requireRole('bakery_admin', 'platform_admin'), scheduleDraft);
router.post('/draft/publish-now', requireRole('bakery_admin', 'platform_admin'), publishDraftNow);
router.delete('/draft', requireRole('bakery_admin', 'platform_admin'), discardDraft);
router.post('/scheduled/cancel', requireRole('bakery_admin', 'platform_admin'), cancelScheduled);

// Legacy endpoints remain during the price-book migration window.
router.get('/legacy/presets', requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), listPresets);
router.get('/legacy/log', requireRole('bakery_staff', 'bakery_admin', 'platform_admin'), listChangeLog);
router.patch('/legacy/:id', requireRole('bakery_admin', 'platform_admin'), updatePresetPrice);

module.exports = router;
