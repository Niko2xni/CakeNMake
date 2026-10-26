const assert = require('node:assert/strict');
const { test, afterEach, mock } = require('node:test');
const Platform = require('../src/models/Platform');
const Reservation = require('../src/models/Reservation');
const { getBookedDates } = require('../src/controllers/reservationController');

afterEach(() => mock.restoreAll());

const response = () => ({
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
});

test('getBookedDates returns 404 when platform is not found', async () => {
  mock.method(Platform, 'findOne', async () => null);
  const req = { query: { platform: 'unknown-bakery' } };
  const res = response();
  await getBookedDates(req, res);
  assert.equal(res.code, 404);
  assert.equal(res.body.message, 'Bakery not found.');
});

test('getBookedDates returns dates that have reached daily capacity (default 1 for home bakeshop)', async () => {
  const platformId = 'a'.repeat(24);
  mock.method(Platform, 'findOne', async () => ({ _id: platformId, slug: 'mamshie-bakery' }));

  const sampleReservations = [
    { pickupDate: new Date('2026-11-10T00:00:00.000Z'), status: 'confirmed' },
    { pickupDate: new Date('2026-11-15T00:00:00.000Z'), status: 'in_production' },
    { pickupDate: new Date('2026-11-20T00:00:00.000Z'), status: 'completed' },
  ];

  mock.method(Reservation, 'find', () => ({
    select: async () => sampleReservations,
  }));

  const req = { query: { platform: 'mamshie-bakery' } };
  const res = response();
  await getBookedDates(req, res);

  assert.equal(res.body.platform, 'mamshie-bakery');
  assert.equal(res.body.dailyCapacity, 1);
  assert.deepEqual(res.body.bookedDates.sort(), ['2026-11-10', '2026-11-15', '2026-11-20'].sort());
});

test('getBookedDates respects custom bakery daily capacity if configured', async () => {
  const platformId = 'a'.repeat(24);
  mock.method(Platform, 'findOne', async () => ({ _id: platformId, slug: 'mamshie-bakery', dailyCapacity: 2 }));

  const sampleReservations = [
    { pickupDate: new Date('2026-11-10T00:00:00.000Z'), status: 'confirmed' },
    { pickupDate: new Date('2026-11-10T00:00:00.000Z'), status: 'confirmed' },
    { pickupDate: new Date('2026-11-15T00:00:00.000Z'), status: 'confirmed' }, // only 1 on Nov 15 -> not booked yet
  ];

  mock.method(Reservation, 'find', () => ({
    select: async () => sampleReservations,
  }));

  const req = { query: { platform: 'mamshie-bakery' } };
  const res = response();
  await getBookedDates(req, res);

  assert.equal(res.body.dailyCapacity, 2);
  assert.deepEqual(res.body.bookedDates, ['2026-11-10']);
});
