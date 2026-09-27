const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const mongoose = require('mongoose');

const Design = require('../src/models/Design');
const {
  createDesign,
  getDesignById,
  ownerFilter,
  updateDesign,
} = require('../src/controllers/designController');

const ownerId = new mongoose.Types.ObjectId();
const designId = new mongoose.Types.ObjectId().toString();

function request(overrides = {}) {
  return {
    auth: { uid: 'firebase-user-1', email: 'owner@example.com', emailVerified: true },
    user: { _id: ownerId, email: 'owner@example.com' },
    params: { id: designId },
    query: {},
    body: {},
    ...overrides,
  };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

afterEach(() => mock.restoreAll());

test('owner filter uses trusted account data and a migration-only email fallback', () => {
  const filter = ownerFilter(request({
    query: { userId: 'attacker@example.com' },
    body: { userId: 'attacker@example.com' },
  }));

  assert.deepEqual(filter, {
    $or: [
      { owner: ownerId },
      { owner: null, userId: 'owner@example.com' },
    ],
  });
});

test('single-design reads scope the lookup to the authenticated owner', async () => {
  let capturedFilter;
  mock.method(Design, 'findOne', async (filter) => {
    capturedFilter = filter;
    return null;
  });
  const res = response();
  await getDesignById(request(), res);

  assert.equal(res.statusCode, 404);
  assert.equal(capturedFilter._id, designId);
  assert.deepEqual(capturedFilter.$or[0], { owner: ownerId });
  assert.equal(capturedFilter.$or[1].userId, 'owner@example.com');
});

test('updates ignore ownership and thumbnail fields supplied by the caller', async () => {
  let capturedFilter;
  let capturedUpdate;
  mock.method(Design, 'findOneAndUpdate', async (filter, update) => {
    capturedFilter = filter;
    capturedUpdate = update;
    return { _id: designId, name: 'Updated' };
  });

  const res = response();
  await updateDesign(request({
    body: {
      name: 'Updated',
      owner: new mongoose.Types.ObjectId(),
      userId: 'attacker@example.com',
      thumbnail: 'https://example.com/attacker-controlled.jpg',
    },
  }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(capturedFilter._id, designId);
  assert.deepEqual(capturedUpdate, { $set: { name: 'Updated' } });
});

test('new designs derive ownership from the authenticated account', async () => {
  mock.method(Design.prototype, 'save', async function save() { return this; });
  const res = response();
  await createDesign(request({
    body: {
      name: 'Birthday cake',
      config: { layers: 2 },
      owner: new mongoose.Types.ObjectId(),
      userId: 'attacker@example.com',
    },
  }), res);

  assert.equal(res.statusCode, 201);
  assert.equal(String(res.body.owner), String(ownerId));
  assert.equal(res.body.userId, null);
});
