import React, { useState, useRef, useEffect } from 'react';
import { Send, Store, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const INITIAL_MESSAGES = [
  {
    role: 'bakery',
    content: '👋 Hi! We received your order and down payment. We\'ll be in touch soon to confirm the delivery time and discuss transportation. Thank you!',
    time: 'Just now',
  },
];

export default function BakeryChat({ onClose }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text, time: now },
    ]);
    // Static demo reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'bakery', content: 'Thanks for reaching out! We\'ll get back to you shortly. 🎂', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      ]);
    }, 1200);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2.5 mb-4 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Store className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <p className="font-heading font-bold text-sm">Bakery Chat</p>
          <p className="text-[10px] text-green-500 font-medium flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" /> Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 mb-4">
        {messages.map((msg, i) => {
          const isBakery = msg.role === 'bakery';
          return (
            <div key={i} className={`flex gap-2 ${isBakery ? 'justify-start' : 'justify-end'}`}>
              {isBakery && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Store className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[80%]`}>
                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  isBakery ? 'bg-muted text-foreground rounded-bl-sm' : 'bg-primary text-primary-foreground rounded-br-sm'
                }`}>
                  {msg.content}
                </div>
                <div className={`flex items-center gap-1 mt-0.5 ${isBakery ? 'justify-start' : 'justify-end'}`}>
                  <span className="text-[10px] text-muted-foreground">{msg.time}</span>
                  {!isBakery && <CheckCheck className="w-3 h-3 text-primary" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 items-end shrink-0 border-t border-border/40 pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Message the bakery..."
          className="min-h-[52px] max-h-[80px] text-xs resize-none rounded-xl"
        />
        <Button size="icon" className="rounded-xl h-9 w-9 shrink-0" onClick={send} disabled={!input.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
