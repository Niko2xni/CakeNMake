const express = require('express');
const router = express.Router();
const { listPresets, updatePresetPrice, listChangeLog } = require('../controllers/pricingController');

router.get('/', listPresets);
router.get('/log', listChangeLog);
router.patch('/:id', updatePresetPrice);

module.exports = router;