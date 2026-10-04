const assert = require('node:assert/strict');
const { afterEach, mock, test } = require('node:test');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Message = require('../src/models/Message');
const Conversation = require('../src/models/Conversation');
const Reservation = require('../src/models/Reservation');
const SupportRequest = require('../src/models/SupportRequest');
const { effectiveRestriction, assertCustomerMayAct, spamFingerprint, visibleMessageFilter, publishMessage } = require('../src/services/moderationService');
const router = require('../src/routes/moderationRoutes');
const { createMessage } = require('../src/services/messageService');

afterEach(() => mock.restoreAll());
test('evidence includes older confirmed abuse independently of the recent message window', async () => {
  const conversationId = new mongoose.Types.ObjectId();
  const queries = [];
  mock.method(User, 'findOne', async () => ({ _id: customerId, role: 'customer', moderationHistory: [] }));
  mock.method(Conversation, 'find', () => ({ select: async () => [{ _id: conversationId }] }));
  mock.method(Message, 'find', filter => {
    queries.push(filter);
    return { sort: () => ({ limit: async () => filter.moderation === 'rejected' ? [{ _id: messageId, moderation: 'rejected', reviewedAt: new Date() }] : [] }) };
  });
  const route = router.stack.find(layer => layer.route?.path === '/customers/:id/evidence').route;
  const req = { user: staff, params: { id: String(customerId) }, app: { get: () => null } };
  const res = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; } };
  for (const layer of route.stack) {
    let next = false;
    await layer.handle(req, res, () => { next = true; });
    if (!next) break;
  }
  assert.equal(res.body.messages.length, 0);
  assert.equal(res.body.confirmedEvidence.length, 1);
  assert.equal(queries[1].senderRole, 'customer');
  assert.deepEqual(queries[1].conversation.$in, [conversationId]);
  assert.equal(queries[1].sender, customerId);
});
const customerId = new mongoose.Types.ObjectId();
const platformId = new mongoose.Types.ObjectId();
const staffId = new mongoose.Types.ObjectId();
const messageId = new mongoose.Types.ObjectId();
const restrictionId = new mongoose.Types.ObjectId();
const staff = { _id: staffId, role: 'bakery_staff', platform: platformId };

async function request(path, body, user = staff, params = {}) {
  const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods.post).route;
  const req = { user, body, params, app: { get: () => null } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  for (const layer of route.stack) {
    let next = false;
    await layer.handle(req, res, () => { next = true; });
    if (!next) break;
  }
  return res;
}

test('expired suspensions allow actions while bans remain active; staff are never moderation targets', () => {
  const now = new Date('2026-10-04T00:00:00Z');
  const expired = { role: 'customer', restriction: { type: 'suspended', expiresAt: now } };
  assert.equal(effectiveRestriction(expired, now), null);
  assert.equal(effectiveRestriction({ ...expired, restriction: { type: 'banned' } }, now).type, 'banned');
  assert.equal(effectiveRestriction({ ...expired, role: 'bakery_staff' }, now), null);
});

test('existing sessions reload restrictions before creating a message', async () => {
  mock.method(User, 'findById', async () => ({ role: 'customer', status: 'active', restriction: { type: 'banned' } }));
  const create = mock.method(Message, 'create', async () => assert.fail('must not create a message'));
  await assert.rejects(createMessage({ account: { _id: customerId, role: 'customer' }, conversationId: 'unused', text: 'hi', clientMessageId: 'message_123' }), { code: 'CUSTOMER_RESTRICTED' });
  assert.equal(create.mock.callCount(), 0);
});

test('expired moderation restrictions do not disable the application account', async () => {
  const account = { _id: customerId, role: 'customer', status: 'active', restriction: { type: 'suspended', expiresAt: new Date(0) } };
  mock.method(User, 'findById', async () => account);
  assert.equal(await assertCustomerMayAct(account), account);
});

test('fingerprints normalize case and whitespace without treating links alone as spam', () => {
  assert.equal(spamFingerprint(' Hello   WORLD\n'), spamFingerprint('hello world'));
  assert.notEqual(spamFingerprint('https://example.com/cake1'), spamFingerprint('https://example.com/cake2'));
});

test('held messages are delivered only to their sender, never to conversation or staff rooms', () => {
  const events = [];
  const io = { to(room) { return { emit(event, payload) { events.push({ room, event, payload }); } }; } };
  publishMessage(io, { _id: 'conversation', customer: 'customer', platform: 'bakery' }, { _id: 'message', conversation: 'conversation', sender: 'customer', moderation: 'held', text: 'spam' });
  assert.equal(events.filter((event) => event.event === 'message:new').length, 1);
  assert.equal(events.find((event) => event.event === 'message:new').room, 'user:customer');
  assert.equal(events.find((event) => event.room === 'platform:bakery').payload, undefined);
  assert.deepEqual(visibleMessageFilter(staff), { moderation: { $nin: ['held', 'rejected'] } });
  assert.deepEqual(visibleMessageFilter({ role: 'customer' }), {});
});

test('customers cannot use staff moderation endpoints', async () => {
  const res = await request('/customers/:id/restriction', {}, { _id: customerId, role: 'customer' }, { id: customerId.toString() });
  assert.equal(res.statusCode, 403);
});

test('staff accounts cannot be targeted by customer moderation', async () => {
  let filter;
  mock.method(User, 'findOne', async (value) => { filter = value; return null; });
  const res = await request('/customers/:id/restriction', { action: 'ban', reason: 'Abuse' }, staff, { id: staffId.toString() });
  assert.equal(res.statusCode, 404);
  assert.equal(filter.role, 'customer');
});

test('restrictions require reviewed evidence and reject stale account versions', async () => {
  mock.method(User, 'findOne', async () => ({ _id: customerId, role: 'customer', restriction: { id: restrictionId } }));
  const stale = await request('/customers/:id/restriction', { action: 'ban', reason: 'Abuse' }, staff, { id: customerId.toString() });
  assert.equal(stale.statusCode, 409);
  const unreviewed = await request('/customers/:id/restriction', { action: 'ban', reason: 'Abuse', expectedRestrictionId: restrictionId.toString() }, staff, { id: customerId.toString() });
  assert.equal(unreviewed.body.code, 'REVIEW_REQUIRED');
});

test('a suspension and its audit history are persisted in the same atomic account update', async () => {
  mock.method(User, 'findOne', async () => ({ _id: customerId, role: 'customer', restriction: { id: null } }));
  mock.method(Message, 'findOne', async () => ({ _id: messageId, conversation: platformId }));
  mock.method(Conversation, 'exists', async () => true);
  let update;
  mock.method(User, 'findOneAndUpdate', async (_filter, value) => { update = value; return { _id: customerId, role: 'customer', restriction: value.$set.restriction, moderationHistory: [value.$push.moderationHistory] }; });
  const expiry = new Date(Date.now() + 86400000).toISOString();
  const res = await request('/customers/:id/restriction', { action: 'suspend', reason: 'Reviewed repeated abuse', acknowledged: true, messageId: messageId.toString(), expiresAt: expiry }, staff, { id: customerId.toString() });
  assert.equal(res.statusCode, 200);
  assert.equal(update.$set.restriction.type, 'suspended');
  assert.equal(update.$push.moderationHistory.staff, staffId);
  assert.equal(update.$push.moderationHistory.message, messageId);
});

test('review races do not release the same message twice', async () => {
  mock.method(Message, 'findById', async () => ({ _id: messageId, conversation: platformId }));
  mock.method(Conversation, 'findOne', async () => ({ _id: platformId, customer: customerId }));
  mock.method(Message, 'findOneAndUpdate', () => ({ populate: async () => null }));
  const res = await request('/messages/:id/review', { decision: 'release', reason: 'Legitimate reference' }, staff, { id: messageId.toString() });
  assert.equal(res.statusCode, 409);
});

test('existing-order contact checks customer ownership', async () => {
  let filter;
  mock.method(Reservation, 'findOne', async (value) => { filter = value; return null; });
  const res = await request('/requests', { kind: 'order', text: 'Where is my cake?', orderId: platformId.toString() }, { _id: customerId, role: 'customer' });
  assert.equal(res.statusCode, 403);
  assert.equal(filter.user, customerId);
});

test('a customer follow-up requires a staff reply and uses an atomic status condition', async () => {
  let filter;
  mock.method(SupportRequest, 'findOneAndUpdate', async (value) => { filter = value; return null; });
  const res = await request('/requests/:id/reply', { text: 'Follow-up' }, { _id: customerId, role: 'customer' }, { id: messageId.toString() });
  assert.equal(res.statusCode, 409);
  assert.equal(filter.status, 'waiting_customer');
  assert.equal(filter.customer, customerId);
});

test('duplicate pending appeals are rejected by the unique request key', async () => {
  let data;
  mock.method(SupportRequest, 'create', async (value) => { data = value; throw Object.assign(new Error('duplicate'), { code: 11000 }); });
  const res = await request('/requests', { kind: 'appeal', text: 'Please review' }, { _id: customerId, role: 'customer', restriction: { id: restrictionId, type: 'banned' } });
  assert.equal(res.statusCode, 409);
  assert.equal(data.openKey, `appeal:${customerId}:${restrictionId}`);
});

test('the actual blueprint submission guard rejects a restricted customer before parsing/uploading', async () => {
  const blueprintRouter = require('../src/routes/blueprintSubmissionRoutes');
  const guard = blueprintRouter.stack.find((layer) => layer.route).route.stack[3].handle;
  mock.method(User, 'findById', async () => ({ status: 'active', role: 'customer', restriction: { type: 'banned' } }));
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  let continued = false;
  await guard({ user: { _id: customerId, role: 'customer' } }, res, () => { continued = true; });
  assert.equal(res.code, 403);
  assert.equal(res.body.code, 'CUSTOMER_RESTRICTED');
  assert.equal(continued, false);
});

test('newer orders are not eligible for restricted-customer contact', async () => {
  const now = new Date();
  mock.method(Reservation, 'findOne', async () => ({ _id: platformId, createdAt: new Date(now.getTime() + 1) }));
  const res = await request('/requests', { kind: 'order', text: 'Question', orderId: platformId.toString() }, {
    _id: customerId, role: 'customer', restriction: { id: restrictionId, type: 'banned', startedAt: now },
  });
  assert.equal(res.statusCode, 403);
});
