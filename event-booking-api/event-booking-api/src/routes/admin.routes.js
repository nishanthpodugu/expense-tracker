const router = require('express').Router();
const ctrl = require('../controllers/analytics.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const schemas = require('../utils/schemas');

router.use(protect, authorize('admin'));
router.get('/analytics/revenue', ctrl.revenuePerEvent);
router.get('/analytics/top-events', validate(schemas.topEvents, 'query'), ctrl.topEvents);
router.get('/analytics/bookings-per-day', validate(schemas.perDay, 'query'), ctrl.bookingsPerDay);

module.exports = router;
