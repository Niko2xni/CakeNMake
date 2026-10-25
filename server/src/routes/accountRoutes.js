const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
    syncAccount,
    getCurrentAccount,
    updateCurrentAccount,
    requestEmailLinkOtp,
    verifyEmailLinkOtp,
    disconnectEmailOtp,
    getCustomerTransactions,
    payTransactionBalance,
} = require('../controllers/accountController');

const router = express.Router();

router.use(authenticate);

router.post('/sync', syncAccount);
router.get('/me', getCurrentAccount);
router.patch('/me', updateCurrentAccount);
router.get('/transactions', getCustomerTransactions);
router.post('/transactions/:id/pay-balance', payTransactionBalance);
router.post('/email/request-otp', requestEmailLinkOtp);
router.post('/email/verify-otp', verifyEmailLinkOtp);
router.delete('/email/disconnect', disconnectEmailOtp);

module.exports = router;
