const { CAKE_AI_TOOLS } = require('../../lib/aiCakeToolSchemas');
const { convertMessages, convertResponse } = require('./openRouterCakeAi');

const ENDPOINT = 'https://ai-gateway.vercel.sh/v1/chat/completions';

async function callVercel(messages, systemPrompt, {
  apiKey = process.env.AI_GATEWAY_API_KEY,
  model = process.env.AI_GATEWAY_MODEL,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!apiKey?.trim() || !model?.trim()) throw new Error('Vercel AI Gateway API key and model must be configured.');
  const response = await fetchImpl(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey.trim()}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: model.trim(), stream: false, max_tokens: 1024,
      messages: [{ role: 'system', content: systemPrompt }, ...convertMessages(messages)],
      tools: CAKE_AI_TOOLS.map(tool => ({ type: 'function', function: {
        name: tool.name, description: tool.description,
        parameters: { ...tool.input_schema, additionalProperties: false },
      } })),
      tool_choice: 'auto',
    }),
  });
  // Avoid exposing provider response bodies or credentials in errors.
  if (!response.ok) throw new Error(`Vercel AI Gateway request failed (${response.status}).`);
  return convertResponse(await response.json(), 'Vercel AI Gateway');
}

module.exports = { callVercel };
