import React, { useEffect, useRef, useState } from 'react';
import { CheckCheck, Loader2, Send, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/lib/AuthContext';
import BakeryChat from './BakeryChat';
import AIChatPanel from '@/components/cake/AIChatPanel';

export default function BakeryChatPanel({ onNotificationChange, config, onChange, quote, aiChatSession }) {
  const [mode, setMode] = useState('bakery');
  const canDesignWithAi = Boolean(config && onChange);
  return (
    <div className="flex flex-col h-full min-h-0">
      {canDesignWithAi && (
        <div className="flex gap-2 pb-2 shrink-0">
          <Button size="sm" variant={mode === 'bakery' ? 'default' : 'outline'} onClick={() => setMode('bakery')}>Bakery Chat</Button>
          <Button size="sm" variant={mode === 'ai' ? 'default' : 'outline'} onClick={() => setMode('ai')}>Cake AI</Button>
        </div>
      )}
      <div className={`${mode === 'bakery' || !canDesignWithAi ? 'flex' : 'hidden'} flex-col flex-1 min-h-0`}>
        <BakerySupportPanel onNotificationChange={onNotificationChange} />
      </div>
      {canDesignWithAi && (
        <div className={`${mode === 'ai' ? 'flex' : 'hidden'} flex-col flex-1 min-h-0 bg-card rounded-2xl border border-border/50 p-4`}>
          <AIChatPanel config={config} onChange={onChange} quote={quote} session={aiChatSession} />
        </div>
      )}
    </div>
  );
}

function BakerySupportPanel({ onNotificationChange }) {
  const { account, isAuthenticated } = useAuth();
  if (!isAuthenticated || !account) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card rounded-2xl shadow-xl border border-border/50 p-5">
        <p className="shrink-0 text-xs text-muted-foreground mb-4">Demo chat — messages are simulated.</p>
        <BakeryChat />
      </div>
    );
  }
  return <AuthenticatedBakeryChatPanel onNotificationChange={onNotificationChange} />;
}

function AuthenticatedBakeryChatPanel({ onNotificationChange }) {
  const { account } = useAuth();
  const chat = useChat({ autoCreate: true });
  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [chat.messages.length]);
  useEffect(() => {
    onNotificationChange?.(chat.activeConversation?.unreadCount || 0);
  }, [chat.activeConversation?.unreadCount, onNotificationChange]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    setSendError('');
    setSending(true);
    try {
      await chat.sendMessage(text);
    } catch (error) {
      setInput(text);
      setSendError(error.message || 'Message could not be sent.');
    } finally {
      setSending(false);
    }
  }

  const bakeryName = chat.activeConversation?.platform?.name || 'Bakery';

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center"><Store className="w-5 h-5 text-primary-foreground" /></div>
          <div><h2 className="font-display text-lg font-bold leading-tight">{bakeryName}</h2><p className="text-[10px] text-muted-foreground">Customer support chat</p></div>
        </div>
      </div>
      <Separator />
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {(chat.loading || chat.loadingMessages) && chat.messages.length === 0 && <Loader2 className="w-5 h-5 mx-auto animate-spin" />}
        {chat.hasMore && <button onClick={chat.loadOlder} className="block mx-auto text-[11px] text-primary hover:underline">Load earlier messages</button>}
        {chat.messages.map((message) => {
          const senderId = message.senderProfile?.id || message.senderProfile?._id;
          const accountId = account?.id || account?._id;
          const isOwnMessage = senderId && accountId && String(senderId) === String(accountId);
          const isBakery = !isOwnMessage && message.senderRole !== 'customer';
          return (
            <div key={message.id} className={`flex gap-2 ${isBakery ? 'justify-start' : 'justify-end'}`}>
              {isBakery && <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5"><Store className="w-3 h-3 text-primary-foreground" /></div>}
              <div className="max-w-[80%]">
                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${isBakery ? 'bg-muted text-foreground rounded-bl-sm' : 'bg-primary text-primary-foreground rounded-br-sm'} ${message.failed ? 'ring-2 ring-destructive' : ''}`}>{message.text}</div>
                <div className={`flex items-center gap-1 mt-0.5 ${isBakery ? 'justify-start' : 'justify-end'}`}>
                  <span className="text-[10px] text-muted-foreground">{message.moderation === 'held' ? 'Message held for review' : message.moderation === 'rejected' ? 'Message filtered after review' : message.pending ? 'Sending…' : message.failed ? 'Failed' : new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {!isBakery && !message.failed && !['held', 'rejected'].includes(message.moderation) && <CheckCheck className="w-3 h-3 text-primary" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="px-4 pb-4 pt-3 border-t border-border/50 bg-muted/20 shrink-0">
        {(sendError || chat.error) && <p className="text-[11px] text-destructive mb-2" role="alert">{sendError || chat.error}</p>}
        <div className="flex gap-2 items-end">
          <Textarea disabled={chat.restricted} value={input} maxLength={4000} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder={chat.restricted ? 'Chatting is restricted — use Orders & Support' : 'Message the bakery...'} className="min-h-[52px] max-h-[80px] text-xs resize-none rounded-xl" />
          <Button size="icon" className="rounded-xl h-9 w-9 shrink-0" onClick={send} disabled={chat.restricted || !input.trim() || sending}>{sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
        </div>
      </div>
    </div>
  );
}
