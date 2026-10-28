const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const mongoose = require('mongoose');

const User = require('../src/models/User');
const employeeRoutes = require('../src/routes/employeeRoutes');

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

test('employee routes define GET, POST, and DELETE /:id', () => {
  const routes = employeeRoutes.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      methods: Object.keys(layer.route.methods).sort(),
    }));

  assert.deepEqual(routes, [
    { path: '/', methods: ['get'] },
    { path: '/', methods: ['post'] },
    { path: '/:id', methods: ['delete'] },
  ]);
});

test('GET / lists employees scoped to the authenticated bakery platform including staff and admins', async () => {
  let capturedFilter;
  let capturedSelect;
  const mockQuery = {
    select(fields) {
      capturedSelect = fields;
      return this;
    },
    sort(order) {
      return [
        { _id: 'emp-1', email: 'staff@example.com', role: 'bakery_staff' },
        { _id: 'emp-2', email: 'admin@example.com', role: 'bakery_admin' },
      ];
    },
  };

  mock.method(User, 'find', (filter) => {
    capturedFilter = filter;
    return mockQuery;
  });

  const getHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/' && layer.route.methods.get
  ).route.stack.at(-1).handle;

  const req = {
    platformId: 'bakery-platform-123',
    user: { _id: 'admin-1', platform: 'bakery-platform-123', role: 'bakery_admin' },
  };
  const res = createResponse();

  await getHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.employees.length, 2);
  assert.equal(capturedFilter.platform, 'bakery-platform-123');
  assert.deepEqual(capturedFilter.role.$in, ['bakery_staff', 'bakery_admin', 'platform_admin']);
  assert.ok(capturedSelect.includes('email'));
});

test('POST / rejects invalid email or disallowed role assignment', async () => {
  const postHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
  ).route.stack.at(-1).handle;

  const reqNoEmail = {
    platformId: 'platform-1',
    user: { _id: 'admin-1', platform: 'platform-1', role: 'bakery_admin' },
    body: { email: 'invalid-email', role: 'bakery_staff' },
  };
  const resNoEmail = createResponse();
  await postHandler(reqNoEmail, resNoEmail);
  assert.equal(resNoEmail.statusCode, 400);
  assert.match(resNoEmail.body.message, /valid email address/i);

  const reqBadRole = {
    platformId: 'platform-1',
    user: { _id: 'admin-1', platform: 'platform-1', role: 'bakery_admin' },
    body: { email: 'staff@example.com', role: 'bakery_admin' },
  };
  const resBadRole = createResponse();
  await postHandler(reqBadRole, resBadRole);
  assert.equal(resBadRole.statusCode, 400);
  assert.match(resBadRole.body.message, /must be bakery_staff/i);
});

test('POST / returns 404 when target user does not exist', async () => {
  mock.method(User, 'findOne', async () => null);

  const postHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
  ).route.stack.at(-1).handle;

  const req = {
    platformId: 'platform-1',
    user: { _id: 'admin-1', platform: 'platform-1', role: 'bakery_admin' },
    body: { email: 'missing@example.com', role: 'bakery_staff' },
  };
  const res = createResponse();

  await postHandler(req, res);
  assert.equal(res.statusCode, 404);
  assert.match(res.body.message, /No registered user was found/i);
});

test('POST / prevents modifying a platform administrator account', async () => {
  mock.method(User, 'findOne', async () => ({
    _id: 'plat-admin-1',
    email: 'admin@platform.com',
    role: 'platform_admin',
  }));

  const postHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
  ).route.stack.at(-1).handle;

  const req = {
    platformId: 'platform-1',
    user: { _id: 'admin-1', platform: 'platform-1', role: 'bakery_admin' },
    body: { email: 'admin@platform.com', role: 'bakery_staff' },
  };
  const res = createResponse();

  await postHandler(req, res);
  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /Cannot modify a platform administrator/i);
});

test('POST / grants staff access and updates user platform and role', async () => {
  let saved = false;
  const targetUser = {
    _id: 'user-999',
    email: 'newstaff@example.com',
    displayName: 'New Staff',
    role: 'customer',
    platform: null,
    status: 'active',
    save: async function () { saved = true; },
  };

  mock.method(User, 'findOne', async () => targetUser);

  const postHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
  ).route.stack.at(-1).handle;

  const req = {
    platformId: 'bakery-1',
    user: { _id: 'admin-1', platform: 'bakery-1', role: 'bakery_admin' },
    body: { email: 'newstaff@example.com', role: 'bakery_staff' },
  };
  const res = createResponse();

  await postHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(saved, true);
  assert.equal(targetUser.role, 'bakery_staff');
  assert.equal(targetUser.platform, 'bakery-1');
  assert.match(res.body.message, /Access granted!/i);
});

test('DELETE /:id blocks self-revocation', async () => {
  const currentAdminId = new mongoose.Types.ObjectId().toString();

  const deleteHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/:id' && layer.route.methods.delete
  ).route.stack.at(-1).handle;

  const req = {
    params: { id: currentAdminId },
    platformId: 'bakery-1',
    user: { _id: currentAdminId, platform: 'bakery-1', role: 'bakery_admin' },
  };
  const res = createResponse();

  await deleteHandler(req, res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /cannot revoke your own admin account access/i);
});

test('DELETE /:id revokes employee access and resets role to customer', async () => {
  const targetStaffId = new mongoose.Types.ObjectId().toString();
  const currentAdminId = new mongoose.Types.ObjectId().toString();

  let saved = false;
  const staffUser = {
    _id: targetStaffId,
    email: 'staff@example.com',
    role: 'bakery_staff',
    platform: 'bakery-1',
    save: async function () { saved = true; },
  };

  mock.method(User, 'findOne', async () => staffUser);

  const deleteHandler = employeeRoutes.stack.find(
    (layer) => layer.route && layer.route.path === '/:id' && layer.route.methods.delete
  ).route.stack.at(-1).handle;

  const req = {
    params: { id: targetStaffId },
    platformId: 'bakery-1',
    user: { _id: currentAdminId, platform: 'bakery-1', role: 'bakery_admin' },
  };
  const res = createResponse();

  await deleteHandler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(saved, true);
  assert.equal(staffUser.role, 'customer');
  assert.equal(staffUser.platform, null);
  assert.match(res.body.message, /Access revoked/i);
});
