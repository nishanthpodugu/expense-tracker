const Event = require('../models/Event');
const Booking = require('../models/Booking');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const SORTS = { date: 'date', '-date': '-date', price: 'price', '-price': '-price', newest: '-createdAt' };

const canManage = (user, event) => user.role === 'admin' || event.organizer.equals(user._id);

exports.createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({
    ...req.body,
    organizer: req.user._id,
    availableSeats: req.body.totalSeats,
  });
  res.status(201).json({ success: true, data: event });
});

exports.listEvents = asyncHandler(async (req, res) => {
  const { page, limit, sort, category, from, to, minPrice, maxPrice, q } = req.query;

  const filter = { status: 'active', date: { $gte: from || new Date() } };
  if (to) filter.date.$lte = to;
  if (category) filter.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  if (q) filter.$text = { $search: q };

  const [data, total] = await Promise.all([
    Event.find(filter)
      .sort(SORTS[sort])
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('organizer', 'name'),
    Event.countDocuments(filter),
  ]);

  res.json({ success: true, page, limit, total, totalPages: Math.ceil(total / limit), data });
});

exports.getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name');
  if (!event) throw new ApiError(404, 'Event not found');
  res.json({ success: true, data: event });
});

exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (!canManage(req.user, event)) throw new ApiError(403, 'You can only modify your own events');

  const { totalSeats, ...rest } = req.body;
  if (totalSeats !== undefined) {
    const booked = event.totalSeats - event.availableSeats;
    if (totalSeats < booked) throw new ApiError(400, `Cannot reduce seats below already booked (${booked})`);
    event.totalSeats = totalSeats;
    event.availableSeats = totalSeats - booked;
  }
  Object.assign(event, rest);
  await event.save();
  res.json({ success: true, data: event });
});

exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw new ApiError(404, 'Event not found');
  if (!canManage(req.user, event)) throw new ApiError(403, 'You can only delete your own events');

  if (await Booking.exists({ event: event._id, status: 'confirmed' })) {
    throw new ApiError(409, 'Event has confirmed bookings and cannot be deleted');
  }
  await event.deleteOne();
  res.status(204).send();
});
