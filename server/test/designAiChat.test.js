const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Design = require('../src/models/Design');
const { getAiChat, saveAiChat } = require('../src/controllers/designController');
const owner = new mongoose.Types.ObjectId();
const id = new mongoose.Types.ObjectId().toString();
const req = body => ({ user: { _id: owner, email: 'owner@example.com' }, auth: { email: 'owner@example.com', emailVerified: true }, params: { id }, body });
const res = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
afterEach(() => mock.restoreAll());
test('chat reads are owner scoped and explicitly select the private field', async () => {
  mock.method(Design, 'findOne', filter => {
    assert.equal(filter._id, id);
    assert.deepEqual(filter.$or[0], { owner });
    return { select: async field => { assert.equal(field, '+aiChat'); return null; } };
  });
  const response = res();
  await getAiChat(req(), response);
  assert.equal(response.statusCode, 404);
});
test('chat saves and clearing affect only chat and scope the owner', async () => {
  mock.method(Design, 'findOneAndUpdate', async (filter, update) => {
    assert.deepEqual(filter.$or[0], { owner });
    assert.deepEqual(update, { $set: { aiChat: { history: [], display: [] } } });
    return { _id: id };
  });
  const response = res();
  await saveAiChat(req({ history: [], display: [], config: { malicious: true } }), response);
  assert.deepEqual(response.body, { saved: true });
});
test('invalid and oversized conversations are rejected before a database write', async () => {
  const write = mock.method(Design, 'findOneAndUpdate', async () => { throw Error('unexpected'); });
  for (const body of [{ history: [], display: [{ role: 'system', content: 'bad' }] }, { history: [], display: Array(61).fill({ role: 'user', content: 'hello' }) }]) {
    const response = res();
    await saveAiChat(req(body), response);
    assert.equal(response.statusCode, 400);
  }
  assert.equal(write.mock.callCount(), 0);
});
