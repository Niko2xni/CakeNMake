const express = require('express');
const { getActiveCatalog, quoteCake } = require('../controllers/priceBookController');

const router = express.Router();
router.get('/active', getActiveCatalog);
router.post('/quote', quoteCake);

module.exports = router;
