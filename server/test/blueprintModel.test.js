const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Blueprint = require('../src/models/Blueprint');

function submission(extra = {}) {
  return new Blueprint({
    platform: new mongoose.Types.ObjectId(),
    submissionId: 'checkout-123',
    designName: 'Birthday cake',
    deliveryDate: new Date('2026-10-10'),
    designSnapshot: { structure: { layers: 1 } },
    paymentMode: 'simulated',
    paymentCompletedAt: new Date(),
    ...extra,
  });
}

test('guest submissions do not require a saved design or user', () => {
  const record = submission();
  assert.equal(record.validateSync(), undefined);
  assert.equal(record.customer, null);
  assert.equal(record.customerName, 'Guest');
  assert.equal(record.status, 'uploading');
});

test('payment completion is required and ready, in_production, and completed records require private storage', () => {
  assert.ok(submission({ paymentCompletedAt: null }).validateSync().errors.paymentCompletedAt);
  assert.ok(submission({ status: 'ready' }).validateSync().errors.status);
  assert.ok(submission({ status: 'in_production' }).validateSync().errors.status);
  assert.ok(submission({ status: 'completed' }).validateSync().errors.status);
  const pdf = { publicId: 'blueprints/order.pdf', resourceType: 'raw', deliveryType: 'private', bytes: 1000, uploadedAt: new Date() };
  assert.equal(submission({ status: 'ready', pdf }).validateSync(), undefined);
  assert.equal(submission({ status: 'in_production', pdf }).validateSync(), undefined);
  assert.equal(submission({ status: 'completed', pdf }).validateSync(), undefined);
  assert.ok(submission({ status: 'ready', pdf: { ...pdf, deliveryType: 'upload' } }).validateSync());
});

test('submission identity is unique per bakery and snapshots are immutable', () => {
  assert.ok(Blueprint.schema.indexes().some(([fields, opts]) => fields.platform === 1 && fields.submissionId === 1 && opts.unique));
  for (const key of ['platform', 'submissionId', 'designSnapshot', 'quoteSnapshot', 'paymentCompletedAt']) {
    assert.equal(Blueprint.schema.path(key).options.immutable, true);
  }
});
