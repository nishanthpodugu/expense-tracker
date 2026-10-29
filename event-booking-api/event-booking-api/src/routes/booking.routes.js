const router = require('express').Router();
const ctrl = require('../controllers/booking.controller');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const schemas = require('../utils/schemas');

router.use(protect);
router.get('/me', validate(schemas.pagination, 'query'), ctrl.myBookings);
router.delete('/:id', ctrl.cancelBooking);

module.exports = router;
