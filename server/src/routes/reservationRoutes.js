const express = require('express');
const router = express.Router();
const { listReservations, getReservation, updateStatus, openChat, recordDownPayment } = require('../controllers/reservationController');
const authenticate = require('../middleware/authenticate');
const {
  loadAppUser,
  requirePlatformMembership,
  requireRole,
} = require('../middleware/authorize');

router.use(authenticate);
router.use(loadAppUser);
router.use(requireRole('bakery_staff', 'bakery_admin', 'platform_admin'));
router.use(requirePlatformMembership);

router.get('/', listReservations);
router.get('/:id', getReservation);
router.patch('/:id/status', updateStatus);
router.post('/:id/chat', openChat);
router.post('/:id/down-payment', recordDownPayment);

module.exports = router;
