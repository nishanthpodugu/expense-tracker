process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret';
process.env.BCRYPT_ROUNDS = '4';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');

let mongod;
let organizerToken;
let userToken;

const futureDate = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const register = async (name, email, role) => {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'password123', role });
  return res.body.token;
};

const createEvent = async (overrides = {}) => {
  const res = await request(app)
    .post('/api/events')
    .set('Authorization', `Bearer ${organizerToken}`)
    .send({
      title: 'Node Conf',
      description: 'A conference about Node.js',
      category: 'tech',
      venue: 'Delhi',
      date: futureDate(),
      price: 500,
      totalSeats: 10,
      ...overrides,
    });
  return res.body.data;
};

beforeAll(async () => {
  // Use an external MongoDB if TEST_MONGO_URI is set (e.g. in CI), otherwise spin up an in-memory one
  if (process.env.TEST_MONGO_URI) {
    await mongoose.connect(process.env.TEST_MONGO_URI);
    await mongoose.connection.dropDatabase();
  } else {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  }
  organizerToken = await register('Olivia Organizer', 'org@test.com', 'organizer');
  userToken = await register('Uma User', 'user@test.com', 'user');
});

afterAll(async () => {
  if (process.env.TEST_MONGO_URI) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('Auth', () => {
  it('rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Dup', email: 'user@test.com', password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const good = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'password123' });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeDefined();

    const bad = await request(app).post('/api/auth/login').send({ email: 'user@test.com', password: 'wrong' });
    expect(bad.status).toBe(401);
  });

  it('does not allow self-registering as admin', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Eve', email: 'eve@test.com', password: 'password123', role: 'admin' });
    expect(res.status).toBe(400);
  });
});

describe('Events', () => {
  it('forbids normal users from creating events', async () => {
    const res = await request(app)
      .post('/api/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ title: 'x', category: 'a', venue: 'b', date: futureDate(), price: 1, totalSeats: 1 });
    expect(res.status).toBe(403);
  });

  it('lists events with filters and pagination', async () => {
    await createEvent({ title: 'Music Night', category: 'music', price: 200 });
    const res = await request(app).get('/api/events?category=music&limit=5&sort=price');
    expect(res.status).toBe(200);
    expect(res.body.data.every((e) => e.category === 'music')).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });
});

describe('Booking concurrency', () => {
  it('never overbooks: 50 parallel requests for 10 seats -> exactly 10 succeed', async () => {
    const event = await createEvent({ title: 'Concurrency Test', totalSeats: 10 });

    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        request(app)
          .post(`/api/events/${event._id}/book`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ seats: 1 })
      )
    );

    const success = results.filter((r) => r.status === 201).length;
    const conflict = results.filter((r) => r.status === 409).length;
    expect(success).toBe(10);
    expect(conflict).toBe(40);

    const after = await request(app).get(`/api/events/${event._id}`);
    expect(after.body.data.availableSeats).toBe(0);
  });

  it('cancelling releases seats exactly once', async () => {
    const event = await createEvent({ title: 'Cancel Test', totalSeats: 5 });
    const booking = await request(app)
      .post(`/api/events/${event._id}/book`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ seats: 3 });
    expect(booking.status).toBe(201);

    const id = booking.body.data._id;
    const first = await request(app).delete(`/api/bookings/${id}`).set('Authorization', `Bearer ${userToken}`);
    const second = await request(app).delete(`/api/bookings/${id}`).set('Authorization', `Bearer ${userToken}`);
    expect(first.status).toBe(200);
    expect(second.status).toBe(409);

    const after = await request(app).get(`/api/events/${event._id}`);
    expect(after.body.data.availableSeats).toBe(5);
  });
});
