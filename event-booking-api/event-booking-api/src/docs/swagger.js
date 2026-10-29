const secured = [{ bearerAuth: [] }];
const idParam = [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }];
const json = (props, required = []) => ({
  required: true,
  content: { 'application/json': { schema: { type: 'object', required, properties: props } } },
});
const ok = (description = 'Success') => ({ 200: { description } });

module.exports = {
  openapi: '3.0.3',
  info: { title: 'Event Booking API', version: '1.0.0', description: 'Event booking & ticketing REST API' },
  servers: [{ url: '/' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register (role: user | organizer)',
        requestBody: json(
          {
            name: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
            role: { type: 'string', enum: ['user', 'organizer'] },
          },
          ['name', 'email', 'password']
        ),
        responses: { 201: { description: 'Registered, returns JWT' } },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        requestBody: json({ email: { type: 'string' }, password: { type: 'string' } }, ['email', 'password']),
        responses: ok('Returns JWT'),
      },
    },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: ok() } },
    '/api/events': {
      get: {
        tags: ['Events'],
        summary: 'List events with filters, search and pagination',
        parameters: ['page', 'limit', 'sort', 'category', 'from', 'to', 'minPrice', 'maxPrice', 'q'].map((name) => ({
          name,
          in: 'query',
          schema: { type: 'string' },
        })),
        responses: ok(),
      },
      post: {
        tags: ['Events'],
        summary: 'Create event (organizer/admin)',
        security: secured,
        requestBody: json(
          {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            venue: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            price: { type: 'number' },
            totalSeats: { type: 'integer' },
          },
          ['title', 'category', 'venue', 'date', 'price', 'totalSeats']
        ),
        responses: { 201: { description: 'Created' } },
      },
    },
    '/api/events/{id}': {
      get: { tags: ['Events'], summary: 'Get event', parameters: idParam, responses: ok() },
      patch: { tags: ['Events'], summary: 'Update own event', security: secured, parameters: idParam, responses: ok() },
      delete: {
        tags: ['Events'],
        summary: 'Delete own event (no confirmed bookings)',
        security: secured,
        parameters: idParam,
        responses: { 204: { description: 'Deleted' } },
      },
    },
    '/api/events/{id}/book': {
      post: {
        tags: ['Bookings'],
        summary: 'Book seats (atomic, no overbooking)',
        security: secured,
        parameters: idParam,
        requestBody: json({ seats: { type: 'integer', minimum: 1, maximum: 10 } }, ['seats']),
        responses: { 201: { description: 'Booked' }, 409: { description: 'Not enough seats' } },
      },
    },
    '/api/bookings/me': { get: { tags: ['Bookings'], summary: 'My bookings', security: secured, responses: ok() } },
    '/api/bookings/{id}': {
      delete: {
        tags: ['Bookings'],
        summary: 'Cancel booking and release seats',
        security: secured,
        parameters: idParam,
        responses: ok('Cancelled'),
      },
    },
    '/api/admin/analytics/revenue': { get: { tags: ['Admin'], summary: 'Revenue per event', security: secured, responses: ok() } },
    '/api/admin/analytics/top-events': { get: { tags: ['Admin'], summary: 'Top events by tickets sold', security: secured, responses: ok() } },
    '/api/admin/analytics/bookings-per-day': { get: { tags: ['Admin'], summary: 'Bookings per day', security: secured, responses: ok() } },
  },
};
