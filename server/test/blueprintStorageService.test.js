const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const { Writable } = require('node:stream');
const { cloudinary } = require('../src/config/cloudinary');
const { MAX_BLUEPRINT_BYTES, blueprintPublicId, uploadBlueprintPdf } = require('../src/services/blueprintStorageService');

afterEach(() => mock.restoreAll());
const ids = { platformId: 'a'.repeat(24), blueprintId: 'b'.repeat(24) };
const buffer = Buffer.from('%PDF-1.4\nfixture');

test('uploads a private raw PDF with a backend-controlled filename and no public URL', async () => {
  let options;
  let received;
  mock.method(cloudinary.uploader, 'upload_stream', (settings, callback) => {
    options = settings;
    return new Writable({ write(chunk, encoding, done) {
      received = chunk;
      callback(null, { public_id: settings.public_id, resource_type: 'raw', type: 'private', bytes: chunk.length, secure_url: 'must-not-be-exposed' });
      done();
    } });
  });
  const asset = await uploadBlueprintPdf({ ...ids, buffer });
  assert.equal(options.type, 'private');
  assert.equal(options.resource_type, 'raw');
  assert.equal(options.overwrite, false);
  assert.equal(asset.publicId, blueprintPublicId(ids.platformId, ids.blueprintId));
  assert.deepEqual(received, buffer);
  assert.equal(asset.secureUrl, undefined);
  assert.equal(asset.secure_url, undefined);
});

test('rejects invalid PDF headers, excessive size, and path injection before uploading', async () => {
  const upload = mock.method(cloudinary.uploader, 'upload_stream', () => assert.fail('must not upload'));
  await assert.rejects(uploadBlueprintPdf({ ...ids, buffer: Buffer.from('not a PDF') }));
  await assert.rejects(uploadBlueprintPdf({ ...ids, buffer: Buffer.alloc(MAX_BLUEPRINT_BYTES + 1) }));
  await assert.rejects(uploadBlueprintPdf({ ...ids, platformId: '../public', buffer }));
  assert.equal(upload.mock.callCount(), 0);
});

test('propagates Cloudinary failure without reporting a stored file', async () => {
  mock.method(cloudinary.uploader, 'upload_stream', (settings, callback) => new Writable({
    write(chunk, encoding, done) { callback(new Error('Upload failed')); done(); },
  }));
  await assert.rejects(uploadBlueprintPdf({ ...ids, buffer }), /Upload failed/);
});

test('rejects a response describing publicly accessible storage', async () => {
  mock.method(cloudinary.uploader, 'upload_stream', (settings, callback) => new Writable({
    write(chunk, encoding, done) {
      callback(null, { public_id: settings.public_id, resource_type: 'raw', type: 'upload', bytes: chunk.length });
      done();
    },
  }));
  await assert.rejects(uploadBlueprintPdf({ ...ids, buffer }), /did not confirm a private/);
});
