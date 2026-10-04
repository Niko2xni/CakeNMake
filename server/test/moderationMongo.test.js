const assert = require('node:assert/strict');
const { test } = require('node:test');
const mongoose = require('mongoose');
const ChatGate = require('../src/models/ChatGate');
const { screenMessage } = require('../src/services/moderationService');

test('Mongo spam gate enforces rolling limits, duplicate detection, cooldown and concurrent retries', { skip: !process.env.TEST_MONGO_URI }, async () => {
  const dbName = `cakenmake_moderation_test_${Date.now()}`;
  await mongoose.connect(process.env.TEST_MONGO_URI, { dbName });
  try {
    const account = { _id: new mongoose.Types.ObjectId(), role: 'customer' };
    const now = new Date('2026-10-04T00:00:00Z');
    assert.equal((await screenMessage(account, 'chat', 'first_001', 'Hello', now)).held, false);
    assert.equal((await screenMessage(account, 'chat', 'second_02', ' hello ', now)).held, false);
    assert.equal((await screenMessage(account, 'chat', 'third_003', 'HELLO', now)).held, true);
    for (let index = 3; index < 10; index++) await screenMessage(account, 'chat', `message_${index}`, `different ${index}`, now);
    await assert.rejects(screenMessage(account, 'chat', 'eleventh_1', 'new text', now), { code: 'CHAT_COOLDOWN' });
    assert.equal((await screenMessage(account, 'chat', 'first_001', 'Hello', now)).held, false);
    await assert.rejects(screenMessage(account, 'chat', 'next_001', 'new text', new Date(now.getTime() + 59000)), { code: 'CHAT_COOLDOWN' });
    assert.equal((await screenMessage(account, 'chat', 'next_002', 'new text', new Date(now.getTime() + 60000))).held, false);
    const other = { _id: new mongoose.Types.ObjectId(), role: 'customer' };
    await Promise.all(Array.from({ length: 5 }, () => screenMessage(other, 'chat', 'retry_001', 'same request', now)));
    const gate = await ChatGate.findById(other._id);
    assert.equal(gate.entries.length, 1);
  } finally {
    // This generated database contains only this test's fixtures.
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
