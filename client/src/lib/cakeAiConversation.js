export const CAKE_AI_GREETING = {
  role: 'assistant',
  content: "Hi! I'm your AI Cake Designer 🎂 What cake would you like?",
};

export function emptyCakeAiConversation() {
  return { history: [], display: [CAKE_AI_GREETING], input: '', thinking: false };
}

// Keep complete user/tool exchanges together, never orphan tool results.
export function recentCakeAiHistory(history) {
  const isPrompt = message => message.role === 'user' && (typeof message.content === 'string' || message.content?.some(block => block.type === 'text'));
  const starts = history.flatMap((message, index) => isPrompt(message) ? [index] : []);
  let result = history.slice(starts.at(-4) ?? 0);
  while (JSON.stringify(result).length > 50000) {
    const next = result.findIndex((message, index) => index > 0 && isPrompt(message));
    if (next < 0) return [];
    result = result.slice(next);
  }
  return result;
}

export function savedCakeAiConversation(conversation) {
  let display = conversation.display.slice(-60).map(message => ({ ...message, content: message.content.slice(0, 10000) }));
  while (JSON.stringify(display).length > 60000) display = display.slice(1);
  return { history: recentCakeAiHistory(conversation.history), display };
}
