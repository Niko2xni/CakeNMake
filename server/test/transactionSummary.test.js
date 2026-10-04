const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const Reservation = require('../src/models/Reservation');
const { listTransactions } = require('../src/controllers/transactionController');

afterEach(() => mock.restoreAll());

test('order value includes unpaid orders and collected money includes only paid down payments', async () => {
  let filter;
  const rows = [
    { totalPrice: 2000, downPayment: { amount: 500, isPaid: true } },
    { totalPrice: 3000, downPayment: { amount: 750, isPaid: false } },
  ];
  mock.method(Reservation, 'find', (value) => {
    filter = value;
    return { populate: () => ({ sort: async () => rows }) };
  });
  let result;
  await listTransactions({ platformId: 'trusted-bakery' }, { json: (body) => { result = body; } });
  assert.deepEqual(filter, { platform: 'trusted-bakery' });
  assert.deepEqual(result.summary, {
    totalReservations: 2, totalDownPaymentsCollected: 500, totalRevenueExpected: 5000, pendingCount: 1,
  });
  assert.deepEqual(result.transactions, rows);
});

test('an empty bakery has zero summary totals', async () => {
  mock.method(Reservation, 'find', () => ({ populate: () => ({ sort: async () => [] }) }));
  let result;
  await listTransactions({ platformId: 'empty-bakery' }, { json: (body) => { result = body; } });
  assert.deepEqual(result.summary, {
    totalReservations: 0, totalDownPaymentsCollected: 0, totalRevenueExpected: 0, pendingCount: 0,
  });
});
