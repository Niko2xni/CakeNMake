const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const Blueprint = require('../src/models/Blueprint');
const Platform = require('../src/models/Platform');
const storage = require('../src/services/blueprintStorageService');
const { submitBlueprint } = require('../src/controllers/blueprintSubmissionController');
afterEach(() => mock.restoreAll());

function body() {
  return { submissionId: 'checkout_123456789', designName: 'Actual cake', deliveryDate: '2026-10-10', designSnapshot: { structure: { layers: 1 } }, quoteSnapshot: { totalMinor: 195000, lineItems: [] }, pdfBase64: Buffer.from('%PDF-1.4\nfixture').toString('base64'), paymentMode: 'simulated', paymentCompleted: true };
}
function response() { return { status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } }; }

test('authenticated submission stores account ownership without returning private file access', async () => {
  mock.method(Platform, 'findOne', async () => ({ _id: 'a'.repeat(24) }));
  mock.method(Blueprint, 'findOne', async () => null);
  let saved;
  mock.method(Blueprint, 'create', async (data) => {
    saved = { ...data, _id: 'b'.repeat(24), async save() {} };
    return saved;
  });
  const upload = mock.method(storage, 'uploadBlueprintPdf', async () => ({ publicId: 'private-file', deliveryType: 'private' }));
  const res = response();
  const customer = { _id: 'c'.repeat(24), displayName: 'Ana Cruz' };
  await submitBlueprint({ body: body(), user: customer }, res);
  assert.equal(res.code, 201);
  assert.deepEqual(res.body, { submissionId: body().submissionId, status: 'ready' });
  assert.equal(saved.customerName, 'Ana Cruz');
  assert.equal(saved.customer, customer._id);
  assert.equal(saved.status, 'ready');
  assert.equal(upload.mock.callCount(), 1);
  mock.method(Blueprint, 'findOne', async () => saved);
  const retry = response();
  await submitBlueprint({ body: body(), user: customer }, retry);
  assert.equal(retry.code, 200);
  assert.equal(upload.mock.callCount(), 1);
  const conflict = response();
  await submitBlueprint({ body: { ...body(), designName: 'Different cake' }, user: customer }, conflict);
  assert.equal(conflict.code, 409);
});

test('incomplete simulated payment is rejected before database or storage access', async () => {
  const lookup = mock.method(Platform, 'findOne', async () => assert.fail('must not look up'));
  const res = response();
  await submitBlueprint({ body: { ...body(), paymentCompleted: false } }, res);
  assert.equal(res.code, 400);
  assert.equal(lookup.mock.callCount(), 0);
});

test('upload failure marks the record failed and permits claiming it for a retry', async () => {
  mock.method(Platform, 'findOne', async () => ({ _id: 'a'.repeat(24) }));
  mock.method(Blueprint, 'findOne', async () => null);
  let record;
  mock.method(Blueprint, 'create', async (data) => (record = { ...data, _id: 'b'.repeat(24), async save() {} }));
  const update = mock.method(Blueprint, 'updateOne', async () => {});
  mock.method(storage, 'uploadBlueprintPdf', async () => { throw new Error('Offline'); });
  mock.method(console, 'error', () => {});
  const res = response();
  await submitBlueprint({ body: body() }, res);
  assert.equal(res.code, 503);
  assert.equal(update.mock.calls[0].arguments[1].$set.status, 'failed');
  record.status = 'failed';
  mock.method(Blueprint, 'findOne', async () => record);
  const claim = mock.method(Blueprint, 'findOneAndUpdate', async () => record);
  mock.method(storage, 'uploadBlueprintPdf', async () => ({ publicId: 'private-file' }));
  const retry = response();
  await submitBlueprint({ body: body() }, retry);
  assert.equal(retry.code, 201);
  assert.equal(claim.mock.calls[0].arguments[0].status, 'failed');
});
