import React, { useState, useRef, useEffect } from 'react';
import { Send, Store, CheckCheck, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

const INITIAL_MESSAGES = [
  {
    role: 'bakery',
    content: '👋 Hi! We received your order and down payment. We\'ll be in touch soon to confirm the delivery time and discuss transportation. Thank you!',
    time: 'Just now',
  },
];

export default function BakeryChatPanel({ onNotificationChange }) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    onNotificationChange?.(unread);
  }, [unread, onNotificationChange]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [...prev, { role: 'user', content: text, time: now }]);

    // Static demo bakery reply
    setTimeout(() => {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages((prev) => [
        ...prev,
        { role: 'bakery', content: 'Thanks for reaching out! We\'ll get back to you shortly. 🎂', time: replyTime },
      ]);
      setUnread((n) => n + 1);
    }, 1200);
  };

  const clearUnread = () => setUnread(0);

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden" onClick={clearUnread}>
      {/* Header */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Store className="w-5 h-5 text-primary-foreground" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Bakery Chat</h2>
            <p className="text-[10px] text-green-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
              Online
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg, i) => {
          const isBakery = msg.role === 'bakery';
          return (
            <div key={i} className={`flex gap-2 ${isBakery ? 'justify-start' : 'justify-end'}`}>
              {isBakery && (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Store className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
              <div className="max-w-[80%]">
                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                  isBakery
                    ? 'bg-muted text-foreground rounded-bl-sm'
                    : 'bg-primary text-primary-foreground rounded-br-sm'
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
      <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-muted/20 shrink-0">
        <div className="flex gap-2 items-end">
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
    </div>
  );
}