const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { afterEach, mock, test } = require('node:test');
const Blueprint = require('../src/models/Blueprint');
const Conversation = require('../src/models/Conversation');
const Message = require('../src/models/Message');
const User = require('../src/models/User');
const { postOrderAcknowledgement } = require('../src/controllers/conversationController');

afterEach(() => mock.restoreAll());

const customerId = '111111111111111111111111';
const platformId = '222222222222222222222222';
const conversationId = '333333333333333333333333';
const submissionId = 'checkout_123456789';

function response() {
  return {
    status(code) { this.code = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function request() {
  return {
    body: { submissionId },
    params: { id: conversationId },
    user: { _id: customerId, role: 'customer' },
    app: { get: () => ({ to: () => ({ emit() {} }) }) },
  };
}

test('posts one bakery-authored acknowledgement for a ready customer order', async () => {
  const findBlueprint = mock.method(Blueprint, 'findOne', async () => ({ platform: platformId }));
  mock.method(Conversation, 'findOne', async () => ({
    _id: conversationId,
    customer: customerId,
    platform: platformId,
    status: 'open',
  }));
  mock.method(Message, 'findOne', async () => null);
  mock.method(User, 'findOne', async () => ({ _id: '444444444444444444444444', role: 'bakery_admin' }));
  let createdMessage;
  mock.method(Message, 'create', async (data) => {
    createdMessage = { ...data, _id: '555555555555555555555555', createdAt: new Date() };
    return createdMessage;
  });
  const update = mock.method(Conversation, 'updateOne', async () => ({}));

  const res = response();
  await postOrderAcknowledgement(request(), res);

  assert.equal(res.code, 201);
  assert.deepEqual(findBlueprint.mock.calls[0].arguments[0], {
    submissionId,
    customer: customerId,
    platform: platformId,
    status: 'ready',
  });
  assert.equal(createdMessage.senderRole, 'bakery_admin');
  assert.match(createdMessage.text, /received your design and payment details/);
  assert.match(createdMessage.text, /remaining balance, including the delivery fee/);
  assert.match(createdMessage.text, /no money has been collected/i);
  assert.equal(res.body.message.senderRole, 'bakery_admin');
  assert.equal(update.mock.calls[0].arguments[1].$inc.customerUnreadCount, 1);
});

test('does not duplicate the acknowledgement on retry', async () => {
  mock.method(Blueprint, 'findOne', async () => ({ platform: platformId }));
  mock.method(Conversation, 'findOne', async () => ({
    _id: conversationId,
    customer: customerId,
    platform: platformId,
    status: 'open',
  }));
  const clientMessageId = `order_received_${createHash('sha256').update(submissionId).digest('hex')}`;
  const existing = {
    _id: '555555555555555555555555',
    conversation: conversationId,
    sender: '444444444444444444444444',
    senderRole: 'bakery_admin',
    type: 'text',
    text: 'Acknowledgement',
    clientMessageId,
    readBy: [],
  };
  const findExisting = mock.method(Message, 'findOne', async () => existing);
  const create = mock.method(Message, 'create', async () => assert.fail('retry must not create another message'));
  const update = mock.method(Conversation, 'updateOne', async () => assert.fail('retry must not update unread count'));

  const res = response();
  await postOrderAcknowledgement(request(), res);

  assert.equal(res.code, 200);
  assert.deepEqual(findExisting.mock.calls[0].arguments[0], {
    conversation: conversationId,
    clientMessageId,
    senderRole: { $in: ['bakery_admin', 'bakery_staff'] },
  });
  assert.equal(create.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test('rejects an acknowledgement without a ready order', async () => {
  mock.method(Blueprint, 'findOne', async () => null);
  const conversationLookup = mock.method(Conversation, 'findOne', async () => ({
    _id: conversationId,
    customer: customerId,
    platform: platformId,
    status: 'open',
  }));
  const res = response();

  await postOrderAcknowledgement(request(), res);

  assert.equal(res.code, 404);
  assert.equal(res.body.code, 'ORDER_NOT_FOUND');
  assert.equal(conversationLookup.mock.callCount(), 1);
});
