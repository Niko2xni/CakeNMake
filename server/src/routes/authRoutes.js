const express = require('express');
const { requestEmailOtp, cancelEmailOtp, verifyEmailOtp } = require('../controllers/authController');

const router = express.Router();

router.post('/email/request-otp', requestEmailOtp);
router.post('/email/cancel-otp', cancelEmailOtp);
router.post('/email/verify-otp', verifyEmailOtp);

module.exports = router;
