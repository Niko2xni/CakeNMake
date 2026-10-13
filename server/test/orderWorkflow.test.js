const assert = require('node:assert/strict');
const { test, afterEach, mock } = require('node:test');
const Reservation = require('../src/models/Reservation');
const Conversation = require('../src/models/Conversation');
const { ensureCheckoutReservation } = require('../src/services/checkoutReservationService');
const { openChat, recordDownPayment } = require('../src/controllers/reservationController');
afterEach(() => mock.restoreAll());
const orderId = 'a'.repeat(24);
const platform = 'b'.repeat(24);
const customer = 'c'.repeat(24);
const staff = 'd'.repeat(24);
const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = (body) => ({ params: { id: orderId }, platformId: platform, user: { _id: staff, role: 'bakery_staff' }, body });
const order = () => ({ _id: orderId, user: customer, platform, status: 'pending_payment', downPayment: { amount: 975, isPaid: false } });

test('checkout creates one confirmed reservation with paid down payment from the trusted stored price snapshot', async () => {
  mock.method(Reservation, 'findOne', async () => null);
  const upsert = mock.method(Reservation, 'findOneAndUpdate', async () => ({}));
  await ensureCheckoutReservation({ _id: orderId, customer, platform, status: 'ready', designName: 'Cake', deliveryDate: '2026-10-10', orderPricingSnapshot: { totalMinor: 195000, pricingVersion: 1, calculatedAt: new Date(), lineItems: [] } }, { emailSender: null });
  const [key, update] = upsert.mock.calls[0].arguments;
  assert.deepEqual(key, { blueprint: orderId });
  assert.equal(update.$setOnInsert.totalPrice, 1950);
  assert.equal(update.$setOnInsert.status, 'confirmed');
  assert.equal(update.$setOnInsert.downPayment.amount, 975);
  assert.equal(update.$setOnInsert.downPayment.isPaid, true);
  assert.equal(update.$setOnInsert.downPayment.method, 'gcash');
  assert.equal(update.$setOnInsert.downPayment.paymentReference, 'simulated_checkout');
});
test('checkout retry preserves an existing reservation and payment', async () => {
  const existing = { ...order(), downPayment: { isPaid: true } };
  mock.method(Reservation, 'findOne', async () => existing);
  const upsert = mock.method(Reservation, 'findOneAndUpdate', async () => assert.fail('must not reset payment'));
  assert.equal(await ensureCheckoutReservation({ _id: orderId, customer, status: 'ready' }, { emailSender: null }), existing);
  assert.equal(upsert.mock.callCount(), 0);
});
test('checkout reservations validate without a saved Design and preserve price line items', async () => {
  mock.method(Reservation, 'findOne', async () => null);
  mock.method(Reservation, 'findOneAndUpdate', async (_filter, update) => {
    const document = new Reservation(update.$setOnInsert);
    await document.validate();
    assert.equal(document.pricingSnapshot.lineItems[0].unit, 'item');
    return document;
  });
  await ensureCheckoutReservation({ _id: orderId, customer, platform, status: 'ready', designName: 'Cake', deliveryDate: '2026-10-10', orderPricingSnapshot: { totalMinor: 195000, pricingVersion: 1, calculatedAt: new Date(), lineItems: [{ componentKey: 'cake', label: 'Cake', quantity: 1, unitPriceMinor: 195000, lineTotalMinor: 195000 }] } }, { emailSender: null });
});
test('failed uploads and unowned guest blueprints do not create orders', async () => {
  const lookup = mock.method(Reservation, 'findOne', async () => assert.fail('must not create order'));
  assert.equal(await ensureCheckoutReservation({ customer, status: 'failed' }), null);
  assert.equal(await ensureCheckoutReservation({ status: 'ready' }), null);
  assert.equal(lookup.mock.callCount(), 0);
});
test('verified payment is bakery scoped, records staff and confirms an unpaid order atomically', async () => {
  const lookup = mock.method(Reservation, 'findOne', async () => order());
  const update = mock.method(Reservation, 'findOneAndUpdate', async () => ({ paid: true }));
  const res = response();
  await recordDownPayment(request({ amount: 975, method: 'gcash', reference: ' GC-123 ' }), res);
  assert.deepEqual(lookup.mock.calls[0].arguments[0], { _id: orderId, platform });
  const [filter, changes] = update.mock.calls[0].arguments;
  assert.equal(filter['downPayment.isPaid'], false);
  assert.equal(changes.$set.status, 'confirmed');
  assert.equal(changes.$set['downPayment.recordedBy'], staff);
  assert.equal(changes.$set['downPayment.paymentReference'], 'GC-123');
  assert.deepEqual(res.body, { paid: true });
});
test('duplicate payments and mismatched amounts are rejected', async () => {
  mock.method(Reservation, 'findOne', async () => ({ ...order(), downPayment: { amount: 975, isPaid: true } }));
  const res = response();
  await recordDownPayment(request({ amount: 975, method: 'cash', reference: 'Receipt' }), res);
  assert.equal(res.code, 409);
  mock.method(Reservation, 'findOne', async () => order());
  const wrong = response();
  await recordDownPayment(request({ amount: 900, method: 'cash', reference: 'Receipt' }), wrong);
  assert.equal(wrong.code, 400);
});
test('concurrent payment or status changes cannot overwrite an order', async () => {
  mock.method(Reservation, 'findOne', async () => order());
  mock.method(Reservation, 'findOneAndUpdate', async () => null);
  const res = response();
  await recordDownPayment(request({ amount: 975, method: 'cash', reference: 'Receipt' }), res);
  assert.equal(res.code, 409);
});
test('invalid payment details are rejected before database access', async () => {
  const find = mock.method(Reservation, 'findOne', async () => assert.fail('invalid payment'));
  for (const body of [{ amount: 975, method: 'cash', reference: '' }, { amount: -1, method: 'cash', reference: 'x' }, { amount: 1.001, method: 'cash', reference: 'x' }, { amount: 975, method: 'fake', reference: 'x' }]) {
    const res = response(); await recordDownPayment(request(body), res); assert.equal(res.code, 400);
  }
  assert.equal(find.mock.callCount(), 0);
});
test('order chat reuses the customer bakery conversation without reopening or replacing it', async () => {
  mock.method(Reservation, 'findOne', async () => order());
  const conversation = { _id: 'e'.repeat(24), customer, platform, status: 'closed', async populate() {} };
  const update = mock.method(Conversation, 'findOneAndUpdate', async () => conversation);
  const res = response(); await openChat(request(), res);
  assert.equal(res.body.conversation.id, conversation._id);
  assert.equal(res.body.conversation.status, 'closed');
  assert.deepEqual(update.mock.calls[0].arguments[0], { customer, platform });
  assert.equal(update.mock.calls[0].arguments[1].$set, undefined);
});
test('orders belonging to another bakery cannot be used to start chats or record payments', async () => {
  mock.method(Reservation, 'findOne', async () => null);
  const res = response(); await openChat(request(), res); assert.equal(res.code, 404);
  const payment = response(); await recordDownPayment(request({ amount: 975, method: 'cash', reference: 'Receipt' }), payment); assert.equal(payment.code, 404);
});
