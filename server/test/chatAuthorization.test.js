const assert = require('node:assert/strict');
const { test } = require('node:test');
const mongoose = require('mongoose');

const { canAccessConversation } = require('../src/services/conversationAccessService');
const { normalizeMessageText } = require('../src/services/messageService');

test('customers can access only their own conversations', () => {
  const customerId = new mongoose.Types.ObjectId();
  const otherCustomerId = new mongoose.Types.ObjectId();
  const conversation = { customer: customerId, platform: new mongoose.Types.ObjectId() };

  assert.equal(canAccessConversation({ _id: customerId, role: 'customer' }, conversation), true);
  assert.equal(canAccessConversation({ _id: otherCustomerId, role: 'customer' }, conversation), false);
});

test('bakery users can access only conversations for their assigned platform', () => {
  const platformId = new mongoose.Types.ObjectId();
  const otherPlatformId = new mongoose.Types.ObjectId();
  const conversation = { customer: new mongoose.Types.ObjectId(), platform: platformId };

  assert.equal(canAccessConversation({ role: 'bakery_staff', platform: platformId }, conversation), true);
  assert.equal(canAccessConversation({ role: 'bakery_admin', platform: otherPlatformId }, conversation), false);
  assert.equal(canAccessConversation({ role: 'bakery_admin', platform: null }, conversation), false);
});

test('message normalization strips control characters while preserving line breaks', () => {
  assert.equal(normalizeMessageText('  hello\u0000\nworld\u0007  '), 'hello\nworld');
});
