const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];

const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
  allowedOrigins.push(...defaultOrigins);
}

function isOriginAllowed(origin) {
  return !origin || allowedOrigins.includes(origin);
}

const corsOptions = {
  credentials: true,
  origin(origin, callback) {
    if (isOriginAllowed(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed.');
    error.code = 'CORS_ORIGIN_REJECTED';
    return callback(error);
  },
};

module.exports = { allowedOrigins, corsOptions, isOriginAllowed };
