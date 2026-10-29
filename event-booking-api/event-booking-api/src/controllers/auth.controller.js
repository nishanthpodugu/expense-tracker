const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

const rounds = () => Number(process.env.BCRYPT_ROUNDS) || 10;

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (await User.exists({ email: email.toLowerCase() })) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, role, passwordHash: await bcrypt.hash(password, rounds()) });
  res.status(201).json({ success: true, token: signToken(user.id), user });
});

exports.login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  res.json({ success: true, token: signToken(user.id), user });
});

exports.me = (req, res) => res.json({ success: true, user: req.user });
