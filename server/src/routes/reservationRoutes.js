const express = require('express');
const router = express.Router();
const { listReservations, getReservation, updateStatus } = require('../controllers/reservationController');

// No auth middleware yet — see the security caveat above.
// Wire in real JWT + role-check middleware here once bakery login exists.

router.get('/', listReservations);
router.get('/:id', getReservation);
router.patch('/:id/status', updateStatus);

module.exports = router;