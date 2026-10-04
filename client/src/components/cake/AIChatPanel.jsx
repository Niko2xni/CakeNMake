import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cakeAiApi } from '@/services/api';
import { applyCakeAiTool } from '@/lib/aiCakeTools';
import { recentCakeAiHistory } from '@/lib/cakeAiConversation';

const SUGGESTIONS = [
  'Make me a birthday cake for a 5-year-old',
  'Design an elegant wedding cake',
  'Create a chocolate lover\'s dream cake',
  'Make a cute unicorn cake',
];

const GREETING = {
  role: 'assistant',
  content: "Hi! I'm your AI Cake Designer 🎂 Describe your dream cake and I'll update the design for you live.",
};

const MAX_TOOL_TURNS = 6;

export default function AIChatPanel({ config, onChange, quote, session }) {
  // `history` is the raw Anthropic-format message array sent back to the
  // API each turn. `display` is the simplified { role, content, changes? }
  // shape the bubbles below render — a tool_use/tool_result turn is never
  // shown to the person literally, only its resulting "changes" chips.
  const [localHistory, setLocalHistory] = useState([]);
  const [localDisplay, setLocalDisplay] = useState([GREETING]);
  const [localInput, setLocalInput] = useState('');
  const [localThinking, setLocalThinking] = useState(false);
  const { history, display, input, thinking, setHistory, setDisplay, setInput, setThinking } = session || {
    history: localHistory, display: localDisplay, input: localInput, thinking: localThinking,
    setHistory: setLocalHistory, setDisplay: setLocalDisplay, setInput: setLocalInput, setThinking: setLocalThinking,
  };
  const unavailable = session && !session.ready;
  const bottomRef = useRef(null);
  const activeSession = useRef(session?.key);
  activeSession.current = session?.key;
  useEffect(() => () => { activeSession.current = Symbol('closed'); }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [display, thinking]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || thinking || unavailable) return;
    setInput('');
    setDisplay((prev) => [...prev, { role: 'user', content: msg }]);
    setThinking(true);

    let nextHistory = [...recentCakeAiHistory(history), { role: 'user', content: msg }];
    // Local mutable snapshot so multiple tool calls within the SAME turn
    // see each other's effects immediately, rather than the stale
    // `config` this closure captured on render (setState is async).
    let liveConfig = config;
    const changesThisTurn = [];
    const requestSession = session?.key;

    try {
      for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
        const response = await cakeAiApi.sendMessage(nextHistory, liveConfig);
        if (activeSession.current !== requestSession) return;

        if (response.stop_reason !== 'tool_use') {
          const finalText = response.content.find((b) => b.type === 'text')?.text || '';
          setHistory([...nextHistory, { role: 'assistant', content: response.content,
            ...(response.reasoning_details ? { reasoning_details: response.reasoning_details } : {}),
          }]);
          setDisplay((prev) => [
            ...prev,
            { role: 'assistant', content: finalText, changes: changesThisTurn.length ? changesThisTurn : undefined },
          ]);
          return;
        }

        const toolResults = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const { label, result, error } = applyCakeAiTool(block.name, block.input, {
            config: liveConfig,
            onChange: (next) => { liveConfig = next; onChange(next); },
            quote,
          });
          if (label) changesThisTurn.push(label);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(error ? { error } : result),
            ...(error ? { is_error: true } : {}),
          });
        }

        nextHistory = [
          ...nextHistory,
          { role: 'assistant', content: response.content,
            ...(response.reasoning_details ? { reasoning_details: response.reasoning_details } : {}),
          },
          { role: 'user', content: toolResults },
        ];
      }

      // Hit the turn cap without a final text reply — still surface what
      // changed rather than leaving the person with no response at all.
      setHistory(nextHistory);
      setDisplay((prev) => [
        ...prev,
        { role: 'assistant', content: "I've made a few changes — let me know if you'd like anything else!", changes: changesThisTurn.length ? changesThisTurn : undefined },
      ]);
    } catch (err) {
      console.error('[cake-ai] failed:', err);
      setDisplay((prev) => [
        ...prev,
        { role: 'assistant', content: err.validationMessage || "Sorry, I couldn't reach the design assistant just now. Please try again in a moment." },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header label */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" disabled={thinking || unavailable} onClick={() => {
          setHistory([]); setDisplay([GREETING]); setInput('');
        }}>Clear chat</Button>
      </div>
      {session?.error && <p role="status" className="text-xs text-destructive pb-2">{session.error}</p>}
      {unavailable && !session.error && <p role="status" className="text-xs text-muted-foreground pb-2">Loading saved chat...</p>}
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
        {display.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            <div className="max-w-[85%]">
              <div
                className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              {/* "✓ change" chips so the person can see what happened
                  without hunting through the 3D view for it. */}
              {msg.changes?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {msg.changes.map((c, ci) => (
                    <span key={ci} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      ✓ {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-2 justify-start">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-xs text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Designing...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions — only on the untouched greeting screen */}
      {display.length === 1 && (
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
          disabled={thinking || unavailable}
        />
        <Button
          size="icon"
          className="rounded-xl shrink-0 h-9 w-9"
          onClick={() => sendMessage()}
          disabled={!input.trim() || thinking || unavailable}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
