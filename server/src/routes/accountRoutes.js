const express = require('express');
const authenticate = require('../middleware/authenticate');
const {
    syncAccount,
    getCurrentAccount,
    updateCurrentAccount,
} = require('../controllers/accountController');

const router = express.Router();

router.use(authenticate);

router.post('/sync', syncAccount);
router.get('/me', getCurrentAccount);
router.patch('/me', updateCurrentAccount);

module.exports = router;