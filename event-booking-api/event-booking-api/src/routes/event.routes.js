const router = require('express').Router();
const events = require('../controllers/event.controller');
const bookings = require('../controllers/booking.controller');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');
const schemas = require('../utils/schemas');

router.get('/', validate(schemas.listEvents, 'query'), events.listEvents);
router.get('/:id', events.getEvent);

router.post('/', protect, authorize('organizer', 'admin'), validate(schemas.createEvent), events.createEvent);
router.patch('/:id', protect, authorize('organizer', 'admin'), validate(schemas.updateEvent), events.updateEvent);
router.delete('/:id', protect, authorize('organizer', 'admin'), events.deleteEvent);

router.post('/:id/book', protect, authorize('user', 'organizer', 'admin'), validate(schemas.book), bookings.bookEvent);

module.exports = router;
