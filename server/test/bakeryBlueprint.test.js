const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const Blueprint = require('../src/models/Blueprint');
const { cloudinary } = require('../src/config/cloudinary');
const { getBlueprintAccess, listBlueprints } = require('../src/controllers/bakeryBlueprintController');
const { blueprintPublicId } = require('../src/services/blueprintStorageService');
afterEach(() => mock.restoreAll());
const platformId = 'a'.repeat(24);
const id = 'b'.repeat(24);
const res = () => ({ code: 200, status(n) { this.code = n; return this; }, json(data) { this.body = data; return this; }, set() {} });

test('access lookup is scoped to staff bakery and missing records issue no link', async () => {
  const lookup = mock.method(Blueprint, 'findOne', async (filter) => {
    assert.deepEqual(filter, { _id: id, platform: platformId });
    return null;
  });
  const signing = mock.method(cloudinary.utils, 'private_download_url', () => assert.fail('must not sign'));
  const response = res();
  await getBlueprintAccess({ platformId, params: { id }, query: {} }, response);
  assert.equal(response.code, 404);
  assert.equal(lookup.mock.callCount(), 1);
  assert.equal(signing.mock.callCount(), 0);
});

test('ready private files receive expiring links with requested attachment behavior', async () => {
  mock.method(Blueprint, 'findOne', async () => ({ _id: id, status: 'ready', pdf: { publicId: blueprintPublicId(platformId, id), resourceType: 'raw', deliveryType: 'private' } }));
  mock.method(cloudinary.utils, 'private_download_url', (publicId, format, options) => {
    assert.equal(options.type, 'private');
    assert.equal(options.resource_type, 'raw');
    assert.equal(options.attachment, true);
    assert.ok(options.expires_at <= Math.floor(Date.now() / 1000) + 300);
    return 'https://api.cloudinary.com/private-download';
  });
  const response = res();
  await getBlueprintAccess({ platformId, params: { id }, query: { download: 'true' } }, response);
  assert.equal(response.code, 200);
  assert.ok(response.body.url);
});

test('in_production and completed blueprints also receive access to private PDF links', async () => {
  for (const status of ['in_production', 'completed']) {
    mock.method(Blueprint, 'findOne', async () => ({
      _id: id, status, pdf: { publicId: blueprintPublicId(platformId, id), resourceType: 'raw', deliveryType: 'private' },
    }));
    mock.method(cloudinary.utils, 'private_download_url', () => 'https://api.cloudinary.com/private-download');
    const response = res();
    await getBlueprintAccess({ platformId, params: { id }, query: {} }, response);
    assert.equal(response.code, 200);
    assert.ok(response.body.url);
    mock.restoreAll();
  }
});

test('uploading or failed blueprints cannot access PDF links', async () => {
  for (const status of ['uploading', 'failed']) {
    mock.method(Blueprint, 'findOne', async () => ({ _id: id, status, pdf: null }));
    const response = res();
    await getBlueprintAccess({ platformId, params: { id }, query: {} }, response);
    assert.equal(response.code, 409);
    mock.restoreAll();
  }
});

test('listing omits PDF identifiers and uses only trusted bakery membership', async () => {
  mock.method(Blueprint, 'find', (filter) => {
    assert.deepEqual(filter, { platform: platformId });
    return { select() { return this; }, sort() { return this; }, limit() { return this; }, async lean() { return [{ _id: id, status: 'ready', pdf: { publicId: 'secret' }, quoteSnapshot: { totalMinor: 12300 } }]; } };
  });
  const response = res();
  await listBlueprints({ platformId }, response);
  assert.equal(response.body[0].totalMinor, 12300);
  assert.equal(response.body[0].pdf, undefined);
});
