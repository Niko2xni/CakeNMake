const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getLocalCakeAiReply } = require('../src/services/cakeAiScope');
const reply = text => getLocalCakeAiReply([{ role: 'user', content: text }]);

test('answers obvious off-topic input locally with a short redirect', () => {
  for (const text of ['What is the capital of France?', 'Tell me a joke', 'What is 2 + 2?', 'asdfghjkl', 'aaaaaaa', '123456', 'What is the weather today?', 'Write an essay about politics', '!!!']) {
    assert.equal(reply(text), 'I can help with cake designs. What would you like to change?', text);
  }
});
test('handles greetings and acknowledgments without model output', () => {
  for (const text of ['Hi', 'Hello!', 'Thanks', 'okay', 'How are you?']) {
    assert.ok(reply(text));
    assert.ok(reply(text).split(/\s+/).length <= 15);
  }
});
test('preserves real cake requests, creative themes, lettering, and short follow-ups', () => {
  for (const text of ['Pink', 'Keep it pink', 'Remove that', 'Make it cute', 'Basketball', 'A weather theme', 'Write "Tell me a joke" on the cake', 'Translate the text into French', 'Make a president-themed cake', 'Use this reference image']) assert.equal(reply(text), null, text);
});
test('does not intercept tool results or reference content blocks', () => {
  assert.equal(getLocalCakeAiReply([{ role: 'user', content: [{ type: 'tool_result', tool_use_id: 'one', content: 'okay' }] }]), null);
  assert.equal(getLocalCakeAiReply([{ role: 'user', content: [{ type: 'text', text: 'Use this reference image' }] }]), null);
});
test('route returns a concise local response before provider configuration is checked', async () => {
  const express = require('express');
  const app = express();
  app.use(express.json());
  app.use('/ai', require('../src/routes/cakeAi.routes'));
  const server = app.listen(0, '127.0.0.1');
  try {
    await new Promise(resolve => server.listening ? resolve() : server.once('listening', resolve));
    const response = await fetch(`http://127.0.0.1:${server.address().port}/ai/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'Tell me a joke' }], config: {} }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { role: 'assistant', content: [{ type: 'text', text: reply('Tell me a joke') }] });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
