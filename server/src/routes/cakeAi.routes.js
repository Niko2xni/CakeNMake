const { Router } = require('express');
const { GoogleGenAI } = require('@google/genai');
const Anthropic = require('@anthropic-ai/sdk');
const { CAKE_AI_TOOLS } = require('../../lib/aiCakeToolSchemas');

const router = Router();
const AI_PROVIDER = (process.env.AI_PROVIDER || 'gemini').toLowerCase();

const gemini = AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

const anthropic = AI_PROVIDER === 'anthropic' && process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

function buildSystemPrompt(config) {
  return `You are "Cake AI", a friendly design assistant embedded in a cake customization tool on a bakery site. You help the customer change their cake design by CALLING TOOLS — never just describe a change in words, actually make it.

Current design (JSON): ${JSON.stringify(config)}

Guidelines:
- Make one or a few tool calls per turn, then briefly confirm what you changed in plain, warm language (one or two sentences, no bullet lists).
- If a request is ambiguous (e.g. "make it fancy"), pick a reasonable concrete interpretation and say what you picked, rather than asking a clarifying question first.
- Sponge Flavor and Filling only take effect while Exterior Finish's style is 'naked' — if the customer asks for a filling flavor while the cake is frosted, still set it, but mention it won't be visible/relevant until they switch to Naked (or point out you could switch it for them).
- If asked about price, call get_current_quote rather than estimating.
- Never invent option ids that weren't given to you in a tool's enum.`;
}

async function callGemini(messages, config) {
  const response = await gemini.models.generateContent({
    model: 'gemini-3.8-flash',
    contents: [
      { role: 'user', parts: [{ text: buildSystemPrompt(config) }] },
      ...messages.map((m) => ({ role: m.role || 'user', parts: [{ text: Array.isArray(m.content) ? m.content.map((part) => part.text || '').join('\n') : String(m.content || '') }] })),
    ],
  });

  const text = response?.text || response?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
  return { content: [{ type: 'text', text }], role: 'assistant' };
}

async function callAnthropic(messages, config) {
  return anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: buildSystemPrompt(config),
    messages,
    tools: CAKE_AI_TOOLS,
  });
}

router.post('/message', async (req, res) => {
  const { messages, config } = req.body;

  if (!Array.isArray(messages) || !config) {
    return res.status(400).json({ error: 'messages and config are required' });
  }

  if (AI_PROVIDER === 'gemini' && !gemini) {
    return res.status(502).json({ error: 'Cake AI is temporarily unavailable.' });
  }

  if (AI_PROVIDER === 'anthropic' && !anthropic) {
    return res.status(502).json({ error: 'Cake AI is temporarily unavailable.' });
  }

  try {
    const response = AI_PROVIDER === 'gemini'
      ? await callGemini(messages, config)
      : await callAnthropic(messages, config);

    return res.json(response);
  } catch (err) {
    console.error('[cake-ai] request failed:', err);
    return res.status(502).json({ error: 'Cake AI is temporarily unavailable.' });
  }
});

module.exports = router;