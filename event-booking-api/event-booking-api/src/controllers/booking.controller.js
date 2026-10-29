const Event = require('../models/Event');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Book seats.
 * The seat check and decrement happen in ONE atomic findOneAndUpdate, so concurrent
 * requests can never push availableSeats below zero (no overbooking).
 */
exports.bookEvent = asyncHandler(async (req, res) => {
  const { seats } = req.body;

  const event = await Event.findOneAndUpdate(
    { _id: req.params.id, status: 'active', date: { $gt: new Date() }, availableSeats: { $gte: seats } },
    { $inc: { availableSeats: -seats } },
    { new: true }
  );

  if (!event) {
    // Work out why the atomic update did not match
    const existing = await Event.findById(req.params.id);
    if (!existing) throw new ApiError(404, 'Event not found');
    if (existing.status !== 'active' || existing.date <= new Date()) {
      throw new ApiError(400, 'Event is not open for booking');
    }
    throw new ApiError(409, `Only ${existing.availableSeats} seat(s) left`);
  }

  try {
    const booking = await Booking.create({
      user: req.user._id,
      event: event._id,
      seats,
      totalAmount: seats * event.price,
    });
    res.status(201).json({ success: true, data: booking, availableSeats: event.availableSeats });
  } catch (err) {
    // Compensate: give the seats back if the booking record could not be saved
    await Event.updateOne({ _id: event._id }, { $inc: { availableSeats: seats } });
    throw err;
  }
});

exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (req.user.role !== 'admin' && !booking.user.equals(req.user._id)) {
    throw new ApiError(403, 'You can only cancel your own bookings');
  }

  // Atomic status flip guarantees seats are released only once, even on double-clicks
  const cancelled = await Booking.findOneAndUpdate(
    { _id: booking._id, status: 'confirmed' },
    { status: 'cancelled', cancelledAt: new Date() },
    { new: true }
  );
  if (!cancelled) throw new ApiError(409, 'Booking is already cancelled');

  await Event.updateOne({ _id: cancelled.event }, { $inc: { availableSeats: cancelled.seats } });
  res.json({ success: true, data: cancelled });
});

exports.myBookings = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const filter = { user: req.user._id };
  const [data, total] = await Promise.all([
    Booking.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('event', 'title date venue price'),
    Booking.countDocuments(filter),
  ]);
  res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), data });
});
