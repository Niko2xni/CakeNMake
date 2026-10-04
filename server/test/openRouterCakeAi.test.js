const { test } = require('node:test');
const assert = require('node:assert/strict');
const { callOpenRouter, convertMessages, convertResponse } = require('../src/services/openRouterCakeAi');

test('converts multiple tool calls and results without losing IDs or arguments', () => {
  const reasoning_details = [{ type: 'reasoning.encrypted', data: 'opaque' }];
  const converted = convertMessages([
    { role: 'user', content: 'Make it chocolate' },
    { role: 'assistant', reasoning_details, content: [
      { type: 'text', text: 'Updating your cake.' },
      { type: 'tool_use', id: 'one', name: 'set_sponge_flavor', input: { flavor: 'chocolate' } },
      { type: 'tool_use', id: 'two', name: 'set_exterior_finish', input: { flavor: 'chocolate' } },
    ] },
    { role: 'user', content: [
      { type: 'tool_result', tool_use_id: 'one', content: '{"flavor":"chocolate"}' },
      { type: 'tool_result', tool_use_id: 'two', content: '{"error":"unsupported"}', is_error: true },
    ] },
  ]);
  assert.equal(converted.length, 4);
  assert.equal(converted[1].tool_calls[0].function.arguments, '{"flavor":"chocolate"}');
  assert.deepEqual(converted[1].reasoning_details, reasoning_details);
  assert.equal(converted[2].tool_call_id, 'one');
  assert.equal(converted[3].role, 'tool');
  assert.equal(converted[3].content, '{"error":"unsupported"}');
});

test('normalizes tool requests into the existing frontend protocol', () => {
  const response = convertResponse({ model: 'test/model', usage: { total_tokens: 20 }, choices: [{
    finish_reason: 'tool_calls', message: { content: null, tool_calls: [{
      id: 'one', type: 'function', function: { name: 'set_structure', arguments: '{"layers":2}' },
    }] },
  }] });
  assert.equal(response.stop_reason, 'tool_use');
  assert.deepEqual(response.content, [{ type: 'tool_use', id: 'one', name: 'set_structure', input: { layers: 2 } }]);
  assert.equal(response.usage.total_tokens, 20);
});

test('normalizes final text replies', () => {
  assert.equal(convertResponse({ choices: [{ finish_reason: 'stop', message: { content: 'Done.' } }] }).stop_reason, 'end_turn');
});

test('rejects empty, malformed, and truncated responses before edits can run', () => {
  assert.throws(() => convertResponse({ choices: [] }));
  assert.throws(() => convertResponse({ choices: [{ finish_reason: 'stop', message: { content: null } }] }));
  assert.throws(() => convertResponse({ choices: [{ finish_reason: 'length', message: { content: 'Partial' } }] }));
  assert.throws(() => convertResponse({ choices: [{ message: { tool_calls: [{ id: 'one', type: 'function', function: { name: 'set_structure', arguments: 'broken' } }] } }] }));
});

test('sends configured model, current system prompt, and schemas on every request', async () => {
  let request;
  const response = await callOpenRouter([{ role: 'user', content: 'Hello' }], 'Current cake JSON', {
    apiKey: 'test-key', model: 'test/model',
    fetchImpl: async (url, options) => {
      request = { url, ...options };
      return { ok: true, json: async () => ({ choices: [{ finish_reason: 'stop', message: { content: 'Hello!' } }] }) };
    },
  });
  assert.equal(request.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(request.headers.Authorization, 'Bearer test-key');
  const body = JSON.parse(request.body);
  assert.equal(body.model, 'test/model');
  assert.equal(body.max_tokens, 1024);
  assert.equal(body.messages[0].content, 'Current cake JSON');
  assert.equal(body.tools.length, 12);
  assert.ok(body.tools.some(tool => tool.function.name === 'set_edge_border'));
  assert.ok(body.tools.some(tool => tool.function.name === 'set_cake_text' && tool.function.parameters.properties.text.maxLength === 60));
  assert.equal(body.tools[0].function.parameters.additionalProperties, false);
  assert.equal(body.provider.require_parameters, true);
  assert.equal(response.content[0].text, 'Hello!');
});

test('requires credentials and model before any network call', async () => {
  let called = false;
  await assert.rejects(callOpenRouter([], '', { apiKey: '', model: '', fetchImpl: async () => { called = true; } }));
  assert.equal(called, false);
});

test('reports provider HTTP failures without exposing the raw body', async () => {
  await assert.rejects(callOpenRouter([], '', { apiKey: 'test', model: 'test/model',
    fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: 'private details' }) }),
  }), /OpenRouter request failed \(429\)/);
});
