import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const SUGGESTIONS = [
  'Make me a birthday cake for a 5-year-old',
  'Design an elegant wedding cake',
  'Create a chocolate lover\'s dream cake',
  'Make a cute unicorn cake',
];

export default function AIChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I\'m your AI Cake Designer 🎂 Describe your dream cake and I\'ll help bring it to life. (AI integration coming soon!)',
    },
  ]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: msg },
      { role: 'assistant', content: '✨ AI design generation is coming soon! Your idea has been noted: "' + msg + '"' },
    ]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header label */}
      <div className="flex items-center gap-2 px-1 pb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-xs font-heading font-semibold text-foreground/70">AI Cake Designer</p>
          <p className="text-[10px] text-muted-foreground">Describe your dream cake</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div
              className={`rounded-2xl px-3 py-2 text-xs max-w-[85%] leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-muted text-foreground rounded-bl-sm'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && (
        <div className="flex flex-wrap gap-1.5 py-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-[10px] bg-muted hover:bg-muted/80 rounded-full px-2.5 py-1 text-foreground/70 hover:text-foreground transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="pt-3 border-t border-border/50 flex gap-2 items-end">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Describe your cake..."
          className="min-h-[60px] max-h-[100px] text-xs resize-none rounded-xl"
        />
        <Button
          size="icon"
          className="rounded-xl shrink-0 h-9 w-9"
          onClick={() => sendMessage()}
          disabled={!input.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}