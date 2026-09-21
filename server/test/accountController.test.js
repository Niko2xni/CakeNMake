const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');

const User = require('../src/models/User');
const {
  getCurrentAccount,
  syncAccount,
  updateCurrentAccount,
} = require('../src/controllers/accountController');

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

function createRequest(overrides = {}) {
  return {
    auth: {
      uid: 'firebase-user-1',
      email: 'USER@example.com',
      emailVerified: true,
      name: 'Cake User',
      picture: 'https://example.com/avatar.png',
      provider: 'google.com',
      ...overrides,
    },
    body: {
      role: 'platform_admin',
      status: 'active',
    },
  };
}

afterEach(() => mock.restoreAll());

test('syncAccount creates a customer from verified Firebase claims', async () => {
  const savedUser = {
    firebaseUid: 'firebase-user-1',
    email: 'user@example.com',
    role: 'customer',
  };
  let capturedUpdate;

  mock.method(User, 'findOne', async () => null);
  mock.method(User, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter, { firebaseUid: 'firebase-user-1' });
    assert.equal(options.upsert, true);
    capturedUpdate = update;
    return savedUser;
  });

  const res = createResponse();
  await syncAccount(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user, savedUser);
  assert.equal(capturedUpdate.$set.email, 'user@example.com');
  assert.equal(capturedUpdate.$set.displayName, 'Cake User');
  assert.deepEqual(capturedUpdate.$set.providers, ['google.com']);
  assert.equal(capturedUpdate.$setOnInsert.role, 'customer');
  assert.equal(capturedUpdate.$setOnInsert.status, 'active');
  assert.equal(capturedUpdate.$set.role, undefined);
  assert.equal(capturedUpdate.$set.status, undefined);
});

test('syncAccount preserves backend-managed fields for an existing user', async () => {
  const existingUser = {
    firebaseUid: 'firebase-user-1',
    role: 'bakery_admin',
    status: 'active',
    platform: 'platform-1',
  };
  let capturedUpdate;

  mock.method(User, 'findOne', async () => existingUser);
  mock.method(User, 'findOneAndUpdate', async (_filter, update) => {
    capturedUpdate = update;
    return existingUser;
  });

  const res = createResponse();
  await syncAccount(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedUpdate.$set.role, undefined);
  assert.equal(capturedUpdate.$set.platform, undefined);
  assert.equal(capturedUpdate.$set.status, undefined);
});

test('syncAccount rejects a suspended application account', async () => {
  mock.method(User, 'findOne', async () => ({
    firebaseUid: 'firebase-user-1',
    status: 'suspended',
  }));
  const updateMock = mock.method(User, 'findOneAndUpdate', async () => {
    assert.fail('suspended accounts must not be synchronized');
  });

  const res = createResponse();
  await syncAccount(createRequest(), res);

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'ACCOUNT_SUSPENDED');
  assert.equal(updateMock.mock.callCount(), 0);
});

test('getCurrentAccount returns the active account for the verified UID', async () => {
  const user = {
    firebaseUid: 'firebase-user-1',
    role: 'customer',
    status: 'active',
  };
  mock.method(User, 'findOne', (filter) => {
    assert.deepEqual(filter, { firebaseUid: 'firebase-user-1' });
    return {
      populate: async () => user,
    };
  });

  const res = createResponse();
  await getCurrentAccount(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.user, user);
});

test('updateCurrentAccount only writes the supported display name field', async () => {
  let capturedUpdate;
  mock.method(User, 'findOneAndUpdate', async (filter, update, options) => {
    assert.deepEqual(filter, {
      firebaseUid: 'firebase-user-1',
      status: 'active',
    });
    assert.equal(options.runValidators, true);
    capturedUpdate = update;
    return { firebaseUid: 'firebase-user-1', displayName: 'Updated Name' };
  });

  const req = createRequest();
  req.body = {
    displayName: '  Updated Name  ',
    role: 'platform_admin',
    status: 'disabled',
  };
  const res = createResponse();

  await updateCurrentAccount(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(capturedUpdate, {
    $set: { displayName: 'Updated Name' },
  });
});
