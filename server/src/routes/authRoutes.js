const express = require('express');
const { requestEmailOtp, verifyEmailOtp, handleGoogleOAuth } = require('../controllers/authController');

const router = express.Router();

router.post('/email/request-otp', requestEmailOtp);
router.post('/email/verify-otp', verifyEmailOtp);
router.post('/google', handleGoogleOAuth);

module.exports = router;
