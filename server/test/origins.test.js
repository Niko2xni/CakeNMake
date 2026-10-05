const { test } = require('node:test');
const assert = require('node:assert/strict');

function config(mode, origins) {
  const previous = { NODE_ENV: process.env.NODE_ENV, CLIENT_ORIGINS: process.env.CLIENT_ORIGINS, CLIENT_ORIGIN: process.env.CLIENT_ORIGIN };
  process.env.NODE_ENV = mode;
  process.env.CLIENT_ORIGINS = origins;
  delete process.env.CLIENT_ORIGIN;
  delete require.cache[require.resolve('../src/config/origins')];
  try { return require('../src/config/origins'); }
  finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test('development keeps local clients available with configured origins', () => {
  const { isOriginAllowed } = config('development', 'https://example.com/');
  for (const origin of ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'https://example.com']) assert.equal(isOriginAllowed(origin), true);
  assert.equal(isOriginAllowed('https://untrusted.example'), false);
});
test('production accepts only configured origins and normalizes trailing slashes', () => {
  const { isOriginAllowed, corsOptions } = config('production', ' https://example.com/ ');
  assert.equal(isOriginAllowed('https://example.com'), true);
  assert.equal(isOriginAllowed('http://localhost:5173'), false);
  corsOptions.origin('https://untrusted.example', error => {
    assert.equal(error.code, 'CORS_ORIGIN_REJECTED');
    assert.equal(error.status, 403);
  });
  assert.equal(config('production', '').isOriginAllowed('http://localhost:5173'), false);
});
