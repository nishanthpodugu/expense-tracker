const Booking = require('../models/Booking');
const asyncHandler = require('../utils/asyncHandler');

const perEventStages = [
  { $match: { status: 'confirmed' } },
  {
    $group: {
      _id: '$event',
      revenue: { $sum: '$totalAmount' },
      ticketsSold: { $sum: '$seats' },
      bookings: { $sum: 1 },
    },
  },
  { $lookup: { from: 'events', localField: '_id', foreignField: '_id', as: 'event' } },
  { $unwind: '$event' },
  {
    $project: {
      _id: 0,
      eventId: '$_id',
      title: '$event.title',
      date: '$event.date',
      revenue: 1,
      ticketsSold: 1,
      bookings: 1,
    },
  },
];

// Revenue per event
exports.revenuePerEvent = asyncHandler(async (_req, res) => {
  const data = await Booking.aggregate([...perEventStages, { $sort: { revenue: -1 } }]);
  const totalRevenue = data.reduce((sum, e) => sum + e.revenue, 0);
  res.json({ success: true, totalRevenue, data });
});

// Top events by tickets sold
exports.topEvents = asyncHandler(async (req, res) => {
  const data = await Booking.aggregate([
    ...perEventStages,
    { $sort: { ticketsSold: -1 } },
    { $limit: req.query.limit },
  ]);
  res.json({ success: true, data });
});

// Bookings per day for the last N days
exports.bookingsPerDay = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - req.query.days * 24 * 60 * 60 * 1000);
  const data = await Booking.aggregate([
    { $match: { status: 'confirmed', createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        bookings: { $sum: 1 },
        tickets: { $sum: '$seats' },
        revenue: { $sum: '$totalAmount' },
      },
    },
    { $project: { _id: 0, date: '$_id', bookings: 1, tickets: 1, revenue: 1 } },
    { $sort: { date: 1 } },
  ]);
  res.json({ success: true, data });
});
