const express = require('express');
const { getBookedDates } = require('../controllers/reservationController');

const router = express.Router();

router.get('/booked-dates', getBookedDates);

module.exports = router;
