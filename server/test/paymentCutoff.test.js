const assert = require('node:assert/strict');
const { test, mock, afterEach } = require('node:test');

const {
  isWithinThirtyMinutePaymentCutoff,
  getSystemStatus,
} = require('../src/services/maintenanceService');
const { submitBlueprint } = require('../src/controllers/blueprintSubmissionController');
const { payTransactionBalance } = require('../src/controllers/accountController');
const Platform = require('../src/models/Platform');
const User = require('../src/models/User');

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

test('isWithinThirtyMinutePaymentCutoff accurately checks Manila 21:30 to 22:05 window', () => {
  // Manila is UTC+8: 21:30 Manila is 13:30 UTC, 22:00 Manila is 14:00 UTC, 22:05 Manila is 14:05 UTC

  // 21:29:59 Manila (13:29:59 UTC) -> outside cutoff
  const justBefore = new Date('2026-10-25T13:29:59Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(justBefore), false);

  // 21:30:00 Manila (13:30:00 UTC) -> cutoff begins (30 mins before 10:00 PM)
  const cutoffStart = new Date('2026-10-25T13:30:00Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(cutoffStart), true);

  // 21:45:00 Manila (13:45:00 UTC) -> inside cutoff
  const middle = new Date('2026-10-25T13:45:00Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(middle), true);

  // 21:59:59 Manila (13:59:59 UTC) -> inside cutoff
  const beforeTen = new Date('2026-10-25T13:59:59Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(beforeTen), true);

  // 22:00:00 Manila (14:00:00 UTC) -> scheduled update starts
  const tenPm = new Date('2026-10-25T14:00:00Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(tenPm), true);

  // 22:04:59 Manila (14:04:59 UTC) -> update window finishing
  const updateFinishing = new Date('2026-10-25T14:04:59Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(updateFinishing), true);

  // 22:05:00 Manila (14:05:00 UTC) -> cutoff ends
  const cutoffEnd = new Date('2026-10-25T14:05:00Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(cutoffEnd), false);

  // Daytime (10:00 AM Manila / 02:00 UTC) -> false
  const daytime = new Date('2026-10-25T02:00:00Z');
  assert.equal(isWithinThirtyMinutePaymentCutoff(daytime), false);
});

test('submitBlueprint blocks order submission 30 minutes before 10:00 PM update', async () => {
  const cutoffTime = new Date('2026-10-25T13:35:00Z'); // 21:35 Manila time
  const req = {
    __testNow: cutoffTime,
    body: {
      submissionId: 'test_submission_1234567890',
      designName: 'Wedding Cake',
      deliveryDate: '2026-11-01',
    },
  };
  const res = createResponse();

  await submitBlueprint(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /No payments are available 30 minutes before the scheduled update/i);
});

test('payTransactionBalance blocks balance payments 30 minutes before 10:00 PM update', async () => {
  const cutoffTime = new Date('2026-10-25T13:40:00Z'); // 21:40 Manila time
  const req = {
    __testNow: cutoffTime,
    params: { id: 'dummy_order_id' },
    body: { paymentReference: 'DEMO-BAL-100-TEST' },
  };
  const res = createResponse();

  await payTransactionBalance(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /No payments are available 30 minutes before the scheduled update/i);
});

test('payTransactionBalance blocks balance payments if website is turned off', async () => {
  const normalTime = new Date('2026-10-25T04:00:00Z'); // 12:00 PM Manila
  mock.method(Platform, 'findOne', async () => ({
    maintenanceMode: { isWebsiteOff: true },
  }));

  const req = {
    __testNow: normalTime,
    params: { id: 'dummy_order_id' },
    body: { paymentReference: 'DEMO-BAL-100-TEST' },
  };
  const res = createResponse();

  await payTransactionBalance(req, res);

  assert.equal(res.statusCode, 403);
  assert.match(res.body.message, /website is in maintenance mode/i);
});
