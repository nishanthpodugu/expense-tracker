# Event Booking & Ticketing REST API

A backend where organizers create events with limited seats and users book tickets.
The key engineering point: **seat booking is atomic**, so two people can never book the last seat.

**Stack:** Node.js · Express · MongoDB (Mongoose) · JWT · bcrypt · Joi · Swagger · Jest + Supertest

## Features
- JWT authentication with role-based access (`user`, `organizer`, `admin`)
- Event CRUD (organizers manage only their own events)
- Atomic seat reservation and cancellation (no overbooking, no double seat-release)
- Search (MongoDB text index), filtering (category, date, price), sorting, pagination
- Admin analytics using aggregation pipelines (revenue per event, top events, bookings per day)
- Validation (Joi), centralized error handling, Helmet, CORS, rate limiting
- Swagger docs at `/api-docs`
- Integration tests, including a 50-parallel-requests overbooking test

## Getting started
```bash
npm install
cp .env.example .env        # then edit MONGO_URI and JWT_SECRET
npm run seed:admin          # creates the admin account from .env
npm run dev                 # http://localhost:5000  (docs: /api-docs)
npm test                    # runs tests against an in-memory MongoDB
# or use your own MongoDB for tests:  TEST_MONGO_URI=mongodb://127.0.0.1:27017/ebk_test npm test
```
Needs Node 18+ and a MongoDB instance (local or Atlas) for running the server.

## API overview
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Register as `user` or `organizer` |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | auth | Current user |
| GET | `/api/events` | public | List with `category, from, to, minPrice, maxPrice, q, sort, page, limit` |
| GET | `/api/events/:id` | public | Event details |
| POST | `/api/events` | organizer/admin | Create event |
| PATCH | `/api/events/:id` | owner/admin | Update event |
| DELETE | `/api/events/:id` | owner/admin | Delete (only if no confirmed bookings) |
| POST | `/api/events/:id/book` | auth | Book `{ "seats": 1-10 }` |
| GET | `/api/bookings/me` | auth | My bookings |
| DELETE | `/api/bookings/:id` | owner/admin | Cancel and release seats |
| GET | `/api/admin/analytics/revenue` | admin | Revenue per event |
| GET | `/api/admin/analytics/top-events?limit=5` | admin | Top events by tickets sold |
| GET | `/api/admin/analytics/bookings-per-day?days=30` | admin | Daily booking stats |

## How overbooking is prevented
```js
Event.findOneAndUpdate(
  { _id: eventId, availableSeats: { $gte: seats } },   // check ...
  { $inc: { availableSeats: -seats } },                // ... and decrement in one atomic step
  { new: true }
);
```
If this returns `null`, there were not enough seats (HTTP 409). If saving the booking record fails afterwards,
the seats are given back. Cancellation flips `confirmed -> cancelled` atomically, so seats are released only once.

## Folder structure
```
src/
  app.js, server.js
  config/        db connection
  models/        User, Event, Booking
  controllers/   auth, event, booking, analytics
  routes/        auth, events, bookings, admin
  middleware/    auth (JWT + roles), validate (Joi), error handling
  utils/         ApiError, asyncHandler, Joi schemas
  docs/          Swagger/OpenAPI spec
  scripts/       seedAdmin
tests/           Jest + Supertest integration tests
```

## Ideas to extend
Payments (Razorpay test mode), email confirmations, QR-code tickets, waitlists, Docker + CI, MongoDB transactions for multi-document consistency.
