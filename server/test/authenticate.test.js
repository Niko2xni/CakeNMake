const assert = require('node:assert/strict');
const { afterEach, test } = require('node:test');

const firebaseConfigPath = require.resolve('../src/config/firebaseAdmin');
const authenticatePath = require.resolve('../src/middleware/authenticate');
const firebaseConfig = require(firebaseConfigPath);

const originalConfig = {
  firebaseAdminAuth: firebaseConfig.firebaseAdminAuth,
  firebaseAdminConfigured: firebaseConfig.firebaseAdminConfigured,
};

function loadAuthenticate({ configured = true, verifyIdToken } = {}) {
  firebaseConfig.firebaseAdminConfigured = configured;
  firebaseConfig.firebaseAdminAuth = configured
    ? { verifyIdToken: verifyIdToken || (async () => ({ uid: 'firebase-user-1' })) }
    : null;

  delete require.cache[authenticatePath];
  return require(authenticatePath);
}

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

afterEach(() => {
  firebaseConfig.firebaseAdminAuth = originalConfig.firebaseAdminAuth;
  firebaseConfig.firebaseAdminConfigured = originalConfig.firebaseAdminConfigured;
  delete require.cache[authenticatePath];
});

test('authenticate rejects a missing bearer token', async () => {
  const authenticate = loadAuthenticate();
  const req = { get: () => '' };
  const res = createResponse();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'AUTH_REQUIRED');
  assert.equal(nextCalled, false);
});

test('authenticate rejects an invalid Firebase ID token', async () => {
  const authenticate = loadAuthenticate({
    verifyIdToken: async () => {
      const error = new Error('invalid');
      error.code = 'auth/argument-error';
      throw error;
    },
  });
  const req = { get: () => 'Bearer invalid-token' };
  const res = createResponse();

  await authenticate(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.code, 'INVALID_AUTH_TOKEN');
});

test('authenticate exposes verified Firebase identity to later middleware', async () => {
  const authenticate = loadAuthenticate({
    verifyIdToken: async (token) => {
      assert.equal(token, 'valid-token');
      return {
        uid: 'firebase-user-1',
        email: 'USER@example.com',
        email_verified: true,
        name: 'Cake User',
        picture: 'https://example.com/avatar.png',
        firebase: { sign_in_provider: 'google.com' },
      };
    },
  });
  const req = { get: () => 'bearer valid-token' };
  const res = createResponse();
  let nextCalled = false;

  await authenticate(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(req.auth, {
    uid: 'firebase-user-1',
    email: 'USER@example.com',
    emailVerified: true,
    name: 'Cake User',
    picture: 'https://example.com/avatar.png',
    provider: 'google.com',
  });
});

test('authenticate reports unavailable Firebase Admin configuration', async () => {
  const authenticate = loadAuthenticate({ configured: false });
  const req = { get: () => 'Bearer token' };
  const res = createResponse();

  await authenticate(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, 'AUTH_NOT_CONFIGURED');
});
