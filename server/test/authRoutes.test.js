const assert = require('node:assert/strict');
const { test } = require('node:test');

const authRoutes = require('../src/routes/authRoutes');

test('public authentication routes do not expose OTP cancellation', () => {
  const routes = authRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).sort(),
    }));

  assert.deepEqual(routes, [
    { path: '/email/request-otp', methods: ['post'] },
    { path: '/email/verify-otp', methods: ['post'] },
    { path: '/google', methods: ['post'] },
  ]);
});
