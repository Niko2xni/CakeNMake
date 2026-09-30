const express = require('express');
const { submitBlueprint } = require('../controllers/blueprintSubmissionController');
const router = express.Router();
// The base64 PDF expands by roughly one third. Limit this endpoint only.
router.post('/', express.json({ limit: '29mb' }), submitBlueprint);
router.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Blueprint submission is too large.' });
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid submission JSON.' });
  return next(error);
});
module.exports = router;
