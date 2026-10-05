const express = require('express');
const authenticate = require('../middleware/authenticate');
const { loadAppUser } = require('../middleware/authorize');
const { uploadImage } = require('../controllers/imageUploadController');
const router = express.Router();
router.post('/images', authenticate, loadAppUser, express.json({ limit: '7mb' }), uploadImage);
module.exports = router;
