const MAX_PROMPT_LENGTH = 2000;
const MAX_HISTORY_LENGTH = 100;
const MAX_REQUEST_LENGTH = 100000;

// Deliberately narrow rules: ordinary short design follow-ups need no
// cake keyword. Semantic scope is also enforced by the system prompt.
const injectionPatterns = [
  /\b(?:ignore|disregard|override|bypass|forget)\b.{0,60}\b(?:instructions?|rules?|system prompt|safety|guardrails?)\b/i,
  /\b(?:reveal|show|print|leak|give|expose)\b.{0,60}\b(?:system prompt|developer (?:message|instructions?)|api[ _-]?keys?|passwords?|secrets?|credentials?)\b/i,
  /\b(?:you are now|act as|pretend to be)\b.{0,40}\b(?:unrestricted|uncensored|DAN|system|developer)\b/i,
  /<\|(?:im_start|system|endoftext)\|>|\[INST\]|<<SYS>>/i,
];
const unrelatedPatterns = [
  /\b(?:write|debug|execute|run|generate)\b.{0,35}\b(?:python|javascript|sql|shell|powershell|code|script)\b/i,
  /\b(?:hack|steal|phish)\b.{0,40}\b(?:account|password|credentials|database)\b/i,
  /\b(?:solve|do|answer)\b.{0,25}\b(?:homework|math problem|equation)\b/i,
];

function validateCakeAiPrompt(messages, config) {
  const invalid = message => ({ status: 400, code: 'INVALID_AI_REQUEST', message });
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_HISTORY_LENGTH
    || !config || typeof config !== 'object' || Array.isArray(config)) {
    return invalid('Please start a new cake-design conversation and send a valid request.');
  }
  if (JSON.stringify({ messages, config }).length > MAX_REQUEST_LENGTH) {
    return invalid('This conversation is too large. Please start a new cake-design conversation.');
  }
  let prompts = [];
  for (const message of messages) {
    if (!message || !['user', 'assistant'].includes(message.role)) return invalid('Unsupported conversation message.');
    if (typeof message.content === 'string') {
      if (message.role === 'user') prompts.push(message.content);
    } else if (Array.isArray(message.content) && message.content.length) {
      for (const block of message.content) {
        if (!block || typeof block !== 'object') return invalid('Invalid conversation content.');
        if (block.type === 'text' && typeof block.text === 'string') {
          if (message.role === 'user') prompts.push(block.text);
        } else if (message.role === 'user' && block.type === 'tool_result'
          && typeof block.tool_use_id === 'string' && typeof block.content === 'string') {
          // Tool results are data, not user instructions.
        } else if (message.role === 'assistant' && block.type === 'tool_use'
          && typeof block.id === 'string' && typeof block.name === 'string'
          && block.input && typeof block.input === 'object' && !Array.isArray(block.input)) {
          // The existing executor validates tool names and arguments.
        } else return invalid('Invalid conversation content.');
      }
    } else return invalid('Invalid conversation content.');
  }
  if (messages.at(-1).role !== 'user' || !prompts.length) return invalid('A user cake-design request is required.');
  for (const prompt of prompts) {
    const normalized = prompt.normalize('NFKC').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
    if (!normalized || prompt.length > MAX_PROMPT_LENGTH) return invalid(`Please enter a request of 1–${MAX_PROMPT_LENGTH} characters.`);
    if (injectionPatterns.some(pattern => pattern.test(normalized))) {
      return { status: 422, code: 'PROMPT_REJECTED', message: 'I can help design your cake, but cannot follow requests to override my rules or reveal private instructions or credentials. Please describe the cake changes you want.' };
    }
    if (unrelatedPatterns.some(pattern => pattern.test(normalized))) {
      return { status: 422, code: 'PROMPT_REJECTED', message: 'I can help with cake designs, decorations, flavors, and cake estimates. Please send a cake-related request.' };
    }
  }
  return null;
}

module.exports = { validateCakeAiPrompt };
