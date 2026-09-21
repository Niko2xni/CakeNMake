const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');

const User = require('../src/models/User');
const {
  loadAppUser,
  requirePlatformMembership,
  requireRole,
} = require('../src/middleware/authorize');

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

afterEach(() => mock.restoreAll());

test('loadAppUser loads the active MongoDB account for verified Firebase claims', async () => {
  const user = { firebaseUid: 'firebase-user-1', status: 'active', role: 'customer' };
  mock.method(User, 'findOne', async (filter) => {
    assert.deepEqual(filter, { firebaseUid: 'firebase-user-1' });
    return user;
  });
  const req = { auth: { uid: 'firebase-user-1' } };
  const res = createResponse();
  let nextCalled = false;

  await loadAppUser(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user, user);
});

test('loadAppUser rejects suspended accounts', async () => {
  mock.method(User, 'findOne', async () => ({ status: 'suspended' }));
  const req = { auth: { uid: 'firebase-user-1' } };
  const res = createResponse();

  await loadAppUser(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
});

test('requireRole rejects customers from bakery administration', () => {
  const authorize = requireRole('bakery_staff', 'bakery_admin', 'platform_admin');
  const req = { user: { role: 'customer' } };
  const res = createResponse();

  authorize(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'FORBIDDEN');
});

test('requireRole allows an assigned bakery administrator', () => {
  const authorize = requireRole('bakery_staff', 'bakery_admin', 'platform_admin');
  const req = { user: { role: 'bakery_admin' } };
  const res = createResponse();
  let nextCalled = false;

  authorize(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
});

test('requirePlatformMembership derives the platform from the trusted account', () => {
  const platformId = { toString: () => 'platform-1' };
  const req = {
    user: { role: 'bakery_admin', platform: platformId },
    query: { platformSlug: 'attacker-controlled-bakery' },
  };
  const res = createResponse();
  let nextCalled = false;

  requirePlatformMembership(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.platformId, platformId);
});

test('requirePlatformMembership rejects bakery users without an assignment', () => {
  const req = { user: { role: 'bakery_admin', platform: null } };
  const res = createResponse();

  requirePlatformMembership(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'PLATFORM_MEMBERSHIP_REQUIRED');
});
