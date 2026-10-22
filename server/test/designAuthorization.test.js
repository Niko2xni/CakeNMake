const assert = require('node:assert/strict');
const { afterEach, beforeEach, mock, test } = require('node:test');
const mongoose = require('mongoose');

const Design = require('../src/models/Design');
const {
  createDesign,
  getDesigns,
  getDesignById,
  ownerFilter,
  updateDesign,
  moveToTrash,
  moveAllToTrash,
  restoreFromTrash,
  deleteAllTrash,
  MAX_TRASH_CAPACITY,
  MAX_ACTIVE_DESIGNS,
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

beforeEach(() => {
  mock.method(Design, 'countDocuments', async () => 0);
});

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
  mock.method(Design, 'findOne', async () => ({ _id: designId, sentToBakery: false }));
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

test('updates reject designs that have already been sent to bakery', async () => {
  mock.method(Design, 'findOne', async () => ({ _id: designId, sentToBakery: true }));
  const res = response();
  await updateDesign(request({
    body: {
      name: 'Tampered Name',
    },
  }), res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /permanently locked/i);
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

test('auto-naming assigns Unnamed 1 initially, increments, and reclaims lowest untaken numbers when earlier names are renamed or deleted', async () => {
  mock.method(Design.prototype, 'save', async function save() { return this; });

  // 1. Initial design gets "Unnamed 1"
  mock.method(Design, 'find', async () => []);
  const res1 = response();
  await createDesign(request({ body: { config: { layers: 1 } } }), res1);
  assert.equal(res1.statusCode, 201);
  assert.equal(res1.body.name, 'Unnamed 1');

  // 2. Next design gets "Unnamed 2" when "Unnamed 1" exists
  mock.method(Design, 'find', async () => [{ name: 'Unnamed 1' }]);
  const res2 = response();
  await createDesign(request({ body: { config: { layers: 1 } } }), res2);
  assert.equal(res2.statusCode, 201);
  assert.equal(res2.body.name, 'Unnamed 2');

  // 3. When "Unnamed 2" and "Unnamed 3" exist (because "Unnamed 1" was renamed/deleted), reclaims "Unnamed 1"
  mock.method(Design, 'find', async () => [
    { name: 'Celebration Cake' },
    { name: 'Unnamed 2' },
    { name: 'Unnamed 3' },
  ]);
  const res3 = response();
  await createDesign(request({ body: { config: { layers: 1 } } }), res3);
  assert.equal(res3.statusCode, 201);
  assert.equal(res3.body.name, 'Unnamed 1');

  // 4. When "Unnamed 1" and "Unnamed 3" exist (gap at 2), reclaims "Unnamed 2"
  mock.method(Design, 'find', async () => [
    { name: 'Unnamed 1' },
    { name: 'Unnamed 3' },
  ]);
  const res4 = response();
  await createDesign(request({ body: { config: { layers: 1 } } }), res4);
  assert.equal(res4.statusCode, 201);
  assert.equal(res4.body.name, 'Unnamed 2');
});

test('moveToTrash respects maximum trash capacity of 20 designs', async () => {
  assert.equal(MAX_TRASH_CAPACITY, 20);

  let findOneAndDeleteCalled = false;
  mock.method(Design, 'findOne', async () => ({
    _id: designId,
    isTrashed: false,
    save: async function () { return this; },
  }));
  mock.method(Design, 'countDocuments', async () => 19);
  mock.method(Design, 'findOneAndDelete', async () => {
    findOneAndDeleteCalled = true;
    return null;
  });

  const res1 = response();
  await moveToTrash(request(), res1);
  assert.equal(res1.statusCode, 200);
  assert.equal(findOneAndDeleteCalled, false, 'Should not delete oldest design when under 20 trashed designs');

  // When capacity reaches 20, moving an additional design triggers deletion of the oldest
  mock.method(Design, 'countDocuments', async () => 20);
  const res2 = response();
  await moveToTrash(request(), res2);
  assert.equal(res2.statusCode, 200);
  assert.equal(findOneAndDeleteCalled, true, 'Should delete oldest design when trash capacity reaches 20');
});

test('getDesigns allows fetching up to 20 trashed designs', async () => {
  let capturedLimit = 0;
  let capturedSort = null;
  mock.method(Design, 'find', () => ({
    sort(sortObj) {
      capturedSort = sortObj;
      return {
        limit(num) {
          capturedLimit = num;
          return Array.from({ length: 15 }, (_, i) => ({ name: `Trashed ${i}` }));
        },
      };
    },
  }));

  const res = response();
  await getDesigns(request({ query: { isTrashed: 'true' } }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(capturedLimit, 20);
  assert.deepEqual(capturedSort, { trashedAt: -1, lastEdited: -1 });
  assert.equal(res.body.length, 15);
});

test('createDesign rejects when active designs reach capacity of 20', async () => {
  assert.equal(MAX_ACTIVE_DESIGNS, 20);
  mock.method(Design, 'countDocuments', async () => 20);

  const res = response();
  await createDesign(request({ body: { config: { layers: 1 }, name: 'Over limit cake' } }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /maximum.*20/i);
});

test('restoreFromTrash rejects when active designs reach capacity of 20', async () => {
  mock.method(Design, 'findOne', async () => ({
    _id: designId,
    isTrashed: true,
    save: async function () { return this; },
  }));
  mock.method(Design, 'countDocuments', async () => 20);

  const res = response();
  await restoreFromTrash(request(), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /maximum.*20/i);
});

test('moveAllToTrash moves all active designs to trash', async () => {
  let updatedFilter = null;
  let updateSet = null;

  mock.method(Design, 'find', (filter) => {
    if (filter?.isTrashed === false) {
      return Promise.resolve([{ _id: 'd1', name: 'Cake 1' }, { _id: 'd2', name: 'Cake 2' }]);
    }
    return {
      sort: () => Promise.resolve([{ _id: 'd1' }, { _id: 'd2' }]),
    };
  });

  mock.method(Design, 'updateMany', async (filter, update) => {
    updatedFilter = filter;
    updateSet = update;
    return { modifiedCount: 2 };
  });

  const res = response();
  await moveAllToTrash(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 2);
  assert.equal(updatedFilter.isTrashed, false);
  assert.equal(updateSet.$set.isTrashed, true);
});

test('deleteAllTrash permanently removes all trashed designs', async () => {
  let deleteFilter = null;
  mock.method(Design, 'find', async () => [{ _id: 'd1', thumbnailAsset: null }]);
  mock.method(Design, 'deleteMany', async (filter) => {
    deleteFilter = filter;
    return { deletedCount: 1 };
  });

  const res = response();
  await deleteAllTrash(request(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 1);
  assert.equal(deleteFilter.isTrashed, true);
});

