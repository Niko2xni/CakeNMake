const express = require('express');
const { submitBlueprint } = require('../controllers/blueprintSubmissionController');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const { loadAppUser, requireRole } = require('../middleware/authorize');
const { assertCustomerMayAct } = require('../services/moderationService');
// The base64 PDF expands by roughly one third. Limit this endpoint only.
router.post('/', authenticate, loadAppUser, requireRole('customer'), async (req, res, next) => {
  try { await assertCustomerMayAct(req.user); next(); }
  catch (error) { res.status(error.status || 500).json({ code: error.code, message: error.message }); }
}, express.json({ limit: '29mb' }), submitBlueprint);
router.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Blueprint submission is too large.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid submission JSON.' });
  return next(error);
});
module.exports = router;
