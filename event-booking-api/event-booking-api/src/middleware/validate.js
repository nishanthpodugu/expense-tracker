const ApiError = require('../utils/ApiError');

// validate(schema, 'body' | 'query' | 'params')
module.exports = (schema, source = 'body') => (req, _res, next) => {
  const { value, error } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    const details = error.details.map((d) => d.message.replace(/"/g, ''));
    return next(new ApiError(400, 'Validation failed', details));
  }
  // Express 5 makes req.query a read-only getter, so redefine it instead of assigning
  Object.defineProperty(req, source, { value, writable: true, configurable: true, enumerable: true });
  next();
};
