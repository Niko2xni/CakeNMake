const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];

function normalizeOrigin(value) {
  try {
    const url = new URL(value);
    // Configuration accepts an origin with a trailing slash, never paths.
    return ['http:', 'https:'].includes(url.protocol) && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password ? url.origin : null;
  } catch { return null; }
}

const allowedOrigins = (process.env.CLIENT_ORIGINS || process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map((origin) => normalizeOrigin(origin.trim()))
  .filter(Boolean);

if (process.env.NODE_ENV !== 'production') {
  for (const origin of defaultOrigins) if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
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
    error.status = 403;
    return callback(error);
  },
};

module.exports = { allowedOrigins, corsOptions, isOriginAllowed };
