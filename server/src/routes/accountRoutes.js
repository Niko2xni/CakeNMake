const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
    syncAccount,
    getCurrentAccount,
    updateCurrentAccount,
    requestEmailLinkOtp,
    verifyEmailLinkOtp,
} = require('../controllers/accountController');

const router = express.Router();

router.use(authenticate);

router.post('/sync', syncAccount);
router.get('/me', getCurrentAccount);
router.patch('/me', updateCurrentAccount);
router.post('/email/request-otp', requestEmailLinkOtp);
router.post('/email/verify-otp', verifyEmailLinkOtp);

module.exports = router;
