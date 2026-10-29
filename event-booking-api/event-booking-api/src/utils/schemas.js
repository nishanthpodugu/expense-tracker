const Joi = require('joi');

exports.register = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(8).max(72).required(),
  role: Joi.string().valid('user', 'organizer').default('user'), // admin can only be seeded
});

exports.login = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

exports.createEvent = Joi.object({
  title: Joi.string().trim().max(150).required(),
  description: Joi.string().trim().max(2000).allow(''),
  category: Joi.string().trim().required(),
  venue: Joi.string().trim().required(),
  date: Joi.date().greater('now').required(),
  price: Joi.number().min(0).required(),
  totalSeats: Joi.number().integer().min(1).required(),
});

exports.updateEvent = Joi.object({
  title: Joi.string().trim().max(150),
  description: Joi.string().trim().max(2000).allow(''),
  category: Joi.string().trim(),
  venue: Joi.string().trim(),
  date: Joi.date().greater('now'),
  price: Joi.number().min(0),
  totalSeats: Joi.number().integer().min(1),
}).min(1);

exports.listEvents = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid('date', '-date', 'price', '-price', 'newest').default('date'),
  category: Joi.string().trim().lowercase(),
  from: Joi.date(),
  to: Joi.date(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  q: Joi.string().trim().max(100),
});

exports.book = Joi.object({
  seats: Joi.number().integer().min(1).max(10).required(),
});

exports.pagination = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});

exports.topEvents = Joi.object({ limit: Joi.number().integer().min(1).max(50).default(5) });
exports.perDay = Joi.object({ days: Joi.number().integer().min(1).max(365).default(30) });
