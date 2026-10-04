const { CAKE_AI_TOOLS } = require('../../lib/aiCakeToolSchemas');

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function convertMessages(messages) {
  return messages.flatMap(message => {
    if (!['user', 'assistant'].includes(message.role)) throw new Error('Unsupported conversation role.');
    if (typeof message.content === 'string') return [{ role: message.role, content: message.content }];
    if (!Array.isArray(message.content)) throw new Error('Invalid conversation content.');
    const text = message.content.filter(block => block.type === 'text').map(block => block.text).join('\n');
    if (message.role === 'assistant') {
      const calls = message.content.filter(block => block.type === 'tool_use').map(block => ({
        id: block.id, type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      }));
      return [{ role: 'assistant', content: text || null, ...(calls.length ? { tool_calls: calls } : {}),
        ...(message.reasoning_details ? { reasoning_details: message.reasoning_details } : {}),
      }];
    }
    const results = message.content.filter(block => block.type === 'tool_result').map(block => ({
      role: 'tool', tool_call_id: block.tool_use_id,
      content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content),
    }));
    return [...results, ...(text ? [{ role: 'user', content: text }] : [])];
  });
}

function convertResponse(data) {
  if (data.error) throw new Error('OpenRouter returned a provider error.');
  const choice = data.choices?.[0];
  if (!choice?.message || ['length', 'content_filter', 'error'].includes(choice.finish_reason)) {
    throw new Error('OpenRouter returned an incomplete response.');
  }
  const message = choice.message;
  const content = [];
  if (typeof message.content === 'string' && message.content.trim()) content.push({ type: 'text', text: message.content });
  for (const call of message.tool_calls || []) {
    if (!call.id || !call.function?.name || call.type !== 'function') throw new Error('Invalid provider tool call.');
    const input = JSON.parse(call.function.arguments);
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid provider tool arguments.');
    content.push({ type: 'tool_use', id: call.id, name: call.function.name, input });
  }
  if (!content.length) throw new Error('OpenRouter returned an empty response.');
  return {
    role: 'assistant', content,
    stop_reason: content.some(block => block.type === 'tool_use') ? 'tool_use' : 'end_turn',
    ...(message.reasoning_details ? { reasoning_details: message.reasoning_details } : {}),
    model: data.model, usage: data.usage,
  };
}

async function callOpenRouter(messages, systemPrompt, {
  apiKey = process.env.OPENROUTER_API_KEY,
  model = process.env.OPENROUTER_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!apiKey?.trim() || !model?.trim()) throw new Error('OpenRouter API key and model must be configured.');
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: model.trim(), stream: false, max_tokens: 2048,
      messages: [{ role: 'system', content: systemPrompt }, ...convertMessages(messages)],
      tools: CAKE_AI_TOOLS.map(tool => ({ type: 'function', function: {
        name: tool.name, description: tool.description,
        parameters: { ...tool.input_schema, additionalProperties: false },
      } })),
      tool_choice: 'auto', provider: { require_parameters: true },
    }),
  });
  // Do not forward raw provider errors (or headers) into client responses/logs.
  if (!response.ok) throw new Error(`OpenRouter request failed (${response.status}).`);
  return convertResponse(await response.json());
}

module.exports = { callOpenRouter, convertMessages, convertResponse };
