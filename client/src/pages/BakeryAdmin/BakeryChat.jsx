import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Cake, Loader2, RefreshCw, Send, User } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useChat } from '@/hooks/useChat';
import { chatApi } from '@/services/chat-api';

function formatTime(value) {
  if (!value) return '';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function BakeryChat() {
  const chat = useChat();
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [chat.messages.length]);

  async function submitMessage() {
    const text = inputText.trim();
    if (!text || sending) return;
    setInputText('');
    setSendError('');
    setSending(true);
    try {
      await chat.sendMessage(text);
    } catch (error) {
      setSendError(error.message || 'Message could not be sent.');
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  async function toggleStatus() {
    if (!chat.activeConversation || updatingStatus) return;
    setUpdatingStatus(true);
    setSendError('');
    try {
      const nextStatus = chat.activeConversation.status === 'open' ? 'closed' : 'open';
      await chatApi.updateStatus(chat.activeConversation.id, nextStatus);
      await chat.refreshConversations();
    } catch (error) {
      setSendError(error.message);
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className={`cn-bakery-chat flex h-full gap-4 ${chat.activeConversation ? 'has-active-chat' : ''}`}>
      <div className="cn-bakery-chat-list w-72 flex-shrink-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-4 py-3 flex items-start justify-between gap-2">
          <div><h1 className="font-bold text-gray-900">Customer Chats</h1><p className="text-xs text-gray-500">Live customer messages</p></div>
          <button onClick={chat.refreshConversations} aria-label="Refresh conversations" className="p-1.5 rounded-full hover:bg-pink-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
        </header>
        <CustomScrollbar className="flex-1">
          {chat.loading && <Loader2 className="w-5 h-5 mx-auto my-8 animate-spin text-pink-500" />}
          {!chat.loading && chat.conversations.length === 0 && <p className="text-xs text-gray-500 text-center px-4 py-8">No customer conversations yet.</p>}
          {chat.conversations.map((conversation) => (
            <button key={conversation.id} onClick={() => chat.setActiveConversationId(conversation.id)} className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-pink-50 ${chat.activeConversationId === conversation.id ? 'bg-pink-50/60' : 'hover:bg-pink-50/40'}`}>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0"><User className="w-5 h-5 text-gray-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2"><p className="text-sm font-semibold truncate">{conversation.customer.displayName || conversation.customer.email || 'Customer'}</p><span className="text-[10px] text-gray-400">{formatTime(conversation.lastMessageAt)}</span></div>
                <p className="text-xs text-gray-500 truncate">{conversation.lastMessagePreview || 'New conversation'}</p>
                <span className="text-[10px] text-gray-400 capitalize">{conversation.status}</span>
              </div>
              {conversation.unreadCount > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-pink-500 text-white text-[10px] font-bold flex items-center justify-center">{conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}</span>}
            </button>
          ))}
        </CustomScrollbar>
      </div>

      <div className="cn-bakery-chat-thread flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
        {!chat.activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-center px-6"><div><div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center"><Cake className="w-8 h-8 text-white" /></div><p className="text-sm text-gray-500 mt-3">Select a conversation to start messaging.</p>{chat.error && <p className="text-xs text-red-600 mt-2" role="alert">{chat.error}</p>}</div></div>
        ) : (
          <>
            <header className="flex-shrink-0 border-b border-pink-100 px-6 py-3 flex items-center gap-3">
              <button type="button" className="cn-bakery-chat-back" aria-label="Back to conversations" onClick={() => chat.setActiveConversationId(null)}><ArrowLeft /></button>
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
              <div className="flex-1"><p className="font-semibold text-gray-900 text-sm">{chat.activeConversation.customer.displayName || chat.activeConversation.customer.email || 'Customer'}</p><p className="text-xs text-gray-500">{chat.activeConversation.platform.name}</p></div>
              <button type="button" onClick={toggleStatus} disabled={updatingStatus} className="text-xs px-3 py-1.5 rounded-full border border-pink-200 text-pink-600 disabled:opacity-50">{chat.activeConversation.status === 'open' ? 'Close chat' : 'Reopen chat'}</button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
              {chat.hasMore && <button onClick={chat.loadOlder} disabled={chat.loadingMessages} className="block mx-auto mb-4 text-xs text-pink-600 hover:underline">{chat.loadingMessages ? 'Loading…' : 'Load earlier messages'}</button>}
              {chat.loadingMessages && chat.messages.length === 0 && <Loader2 className="w-5 h-5 mx-auto animate-spin text-pink-500" />}
              <div className="space-y-2">
                {chat.messages.map((message) => {
                  const fromBakery = message.senderRole !== 'customer';
                  return <div key={message.id} className={`flex ${fromBakery ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${fromBakery ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' : 'bg-white text-gray-800 shadow-sm border border-pink-100'} ${message.failed ? 'ring-2 ring-red-400' : ''}`}><p className="whitespace-pre-wrap break-words">{message.text}</p><p className={`text-[10px] mt-1 ${fromBakery ? 'text-white/70 text-right' : 'text-gray-400'}`}>{message.pending ? 'Sending…' : message.failed ? 'Failed' : formatTime(message.createdAt)}</p></div></div>;
                })}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-pink-100 bg-white px-4 py-3">
              {(sendError || chat.error) && <p className="text-xs text-red-600 mb-2" role="alert">{sendError || chat.error}</p>}
              <div className="flex items-center gap-2">
                <input type="text" value={inputText} maxLength={4000} onChange={(event) => setInputText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitMessage(); } }} disabled={chat.activeConversation.status === 'closed'} placeholder={chat.activeConversation.status === 'closed' ? 'Reopen this chat to reply' : 'Message customer'} className="flex-1 px-4 py-2.5 rounded-full bg-pink-50/70 border border-pink-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:opacity-60" />
                <button onClick={submitMessage} disabled={!inputText.trim() || sending || chat.activeConversation.status === 'closed'} aria-label="Send" className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center disabled:opacity-40">{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
