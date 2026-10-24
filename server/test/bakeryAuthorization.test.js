const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');

const PricingChangeLog = require('../src/models/PricingChangeLog');
const PricingPreset = require('../src/models/PricingPreset');
const Reservation = require('../src/models/Reservation');
const { updatePresetPrice } = require('../src/controllers/pricingController');
const { updateStatus } = require('../src/controllers/reservationController');

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

test('reservation status updates use the trusted platform membership', async () => {
  let capturedFilter;
  mock.method(Reservation, 'findOneAndUpdate', async (filter) => {
    capturedFilter = filter;
    return { _id: 'reservation-1', status: 'completed' };
  });

  const req = {
    params: { id: 'reservation-1' },
    platformId: 'trusted-platform',
    body: {
      status: 'completed',
      platformSlug: 'attacker-controlled-platform',
    },
  };
  const res = createResponse();

  await updateStatus(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(capturedFilter, {
    _id: 'reservation-1',
    platform: 'trusted-platform',
  });
});

test('pricing updates are platform-scoped and audit the authenticated actor', async () => {
  const preset = {
    _id: 'preset-1',
    name: 'Base Price',
    price: 100,
    save: mock.fn(async () => {}),
  };
  let capturedPresetFilter;
  let capturedAudit;

  mock.method(PricingPreset, 'findOne', async (filter) => {
    capturedPresetFilter = filter;
    return preset;
  });
  mock.method(PricingChangeLog, 'create', async (audit) => {
    capturedAudit = audit;
    return audit;
  });

  const req = {
    params: { id: 'preset-1' },
    platformId: 'trusted-platform',
    user: { _id: 'authenticated-user' },
    body: {
      price: 125,
      reason: 'Ingredient cost change',
      platformSlug: 'attacker-controlled-platform',
    },
  };
  const res = createResponse();

  await updatePresetPrice(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(capturedPresetFilter, {
    _id: 'preset-1',
    platform: 'trusted-platform',
  });
  assert.deepEqual(capturedAudit, {
    platform: 'trusted-platform',
    pricingPreset: 'preset-1',
    changedBy: 'authenticated-user',
    componentName: 'Base Price',
    oldPrice: 100,
    newPrice: 125,
    reason: 'Ingredient cost change',
  });
});
