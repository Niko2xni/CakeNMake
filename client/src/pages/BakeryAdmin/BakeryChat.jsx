import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Cake, Loader2, RefreshCw, Search, Send, User, X } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { sortConversationsByActivity, useChat } from '@/hooks/useChat';
import { chatApi } from '@/services/chat-api';
import { useSearchParams } from 'react-router-dom';

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function customerLabel(conversation) {
  return conversation?.customer?.displayName || conversation?.customer?.email || 'Customer';
}

export default function BakeryChat() {
  const chat = useChat();
  const [params] = useSearchParams();
  const requestedConversation = params.get('conversation');
  const openedRequest = useRef(null);
  useEffect(() => {
    if (requestedConversation && openedRequest.current !== requestedConversation && chat.conversations.some((item) => item.id === requestedConversation)) {
      chat.setActiveConversationId(requestedConversation);
      openedRequest.current = requestedConversation;
    }
  }, [requestedConversation, chat.conversations, chat.setActiveConversationId]);
  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bottomRef = useRef(null);

  const visibleConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const sorted = sortConversationsByActivity(chat.conversations);
    if (!normalizedQuery) return sorted;
    return sorted.filter((conversation) => [
      conversation?.customer?.displayName,
      conversation?.customer?.email,
    ].some((value) => String(value || '').toLowerCase().includes(normalizedQuery)));
  }, [chat.conversations, searchQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages.length]);

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
      <div className="cn-bakery-chat-list w-72 flex-shrink-0 rounded-2xl border border-pink-100 shadow-sm bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-4 py-3 flex items-start justify-between gap-2">
          <div><h1 className="font-bold text-gray-900">Customer Chats</h1><p className="text-[13px] text-gray-600">Live customer messages</p></div>
          <button onClick={chat.refreshConversations} aria-label="Refresh conversations" className="p-1.5 rounded-full hover:bg-pink-50"><RefreshCw className="w-4 h-4 text-gray-500" /></button>
        </header>
        <div className="flex-shrink-0 px-3 py-2 border-b border-pink-50">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search customers"
              aria-label="Search customers"
              className="w-full h-11 pl-9 pr-9 rounded-xl border border-pink-100 bg-pink-50/50 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear customer search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-pink-100 hover:text-pink-600">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>
        <CustomScrollbar className="flex-1">
          {chat.loading && <div role="status" aria-label="Loading customer conversations" className="p-3"><AdminRowsSkeleton count={5} avatar /></div>}
          {!chat.loading && chat.conversations.length === 0 && <p className="text-sm text-gray-600 text-center px-4 py-8">No customer conversations yet.</p>}
          {!chat.loading && chat.conversations.length > 0 && visibleConversations.length === 0 && <p className="text-sm text-gray-600 text-center px-4 py-8">No customers match your search.</p>}
          {visibleConversations.map((conversation) => {
            const hasUnread = Number(conversation.unreadCount) > 0;
            const label = customerLabel(conversation);
            return (
            <button key={conversation.id} aria-label={`Open conversation with ${label}`} onClick={() => chat.setActiveConversationId(conversation.id)} className={`w-full flex items-center gap-3 py-3 text-left border-b border-pink-50 transition-colors ${chat.activeConversationId === conversation.id ? 'pl-3 pr-4 border-l-4 border-l-pink-500 bg-pink-100/70' : hasUnread ? 'px-4 bg-pink-50/35 hover:bg-pink-50/60' : 'px-4 hover:bg-pink-50/40'}`}>
              <div className="relative w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-gray-500" />
                {hasUnread && <span className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-white" aria-label={`${conversation.unreadCount} unread message${conversation.unreadCount === 1 ? '' : 's'}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2"><p className={`text-sm truncate ${hasUnread ? 'font-bold text-gray-950' : 'font-semibold text-gray-900'}`}>{label}</p><span className={`text-xs whitespace-nowrap ${hasUnread ? 'font-semibold text-pink-700' : 'text-gray-600'}`}>{formatTime(conversation.lastMessageAt)}</span></div>
                <p className={`text-[13px] truncate ${hasUnread ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{conversation.lastMessagePreview || 'New conversation'}</p>
                <span className="text-xs text-gray-500 capitalize">{conversation.status}</span>
              </div>
            </button>
          );})}
        </CustomScrollbar>
      </div>

      <div className="cn-bakery-chat-thread flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-sm bg-white flex flex-col overflow-hidden">
        {!chat.activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-center px-6"><div><div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center"><Cake className="w-8 h-8 text-white" /></div><p className="text-sm text-gray-500 mt-3">Select a conversation to start messaging.</p>{chat.error && <p className="text-xs text-red-600 mt-2" role="alert">{chat.error}</p>}</div></div>
        ) : (
          <>
            <header className="flex-shrink-0 border-b border-pink-100 px-3 sm:px-5 py-3 flex items-center gap-3">
              <button type="button" className="cn-bakery-chat-back" aria-label="Back to conversations" onClick={() => chat.setActiveConversationId(null)}><ArrowLeft /></button>
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center"><User className="w-5 h-5 text-gray-500" /></div>
              <div className="flex-1"><p className="font-semibold text-gray-900 text-[15px]">{customerLabel(chat.activeConversation)}</p><p className="text-[13px] text-gray-600">{chat.activeConversation.platform?.name || 'Bakery'}</p></div>
              <button type="button" onClick={toggleStatus} disabled={updatingStatus} className="min-h-11 text-sm px-3 py-1.5 rounded-xl border border-pink-300 text-pink-700 hover:bg-pink-50 disabled:opacity-50">{chat.activeConversation.status === 'open' ? 'Close chat' : 'Reopen chat'}</button>
            </header>
            <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-gray-50/70">
              {chat.hasMore && <button onClick={chat.loadOlder} disabled={chat.loadingMessages} className="block mx-auto mb-4 text-sm text-pink-700 hover:underline">{chat.loadingMessages ? 'Loading…' : 'Load earlier messages'}</button>}
              {chat.loadingMessages && chat.messages.length === 0 && (
                <div role="status" aria-label="Loading messages" className="space-y-4">
                  <Skeleton className="h-12 w-2/5 rounded-2xl" />
                  <Skeleton className="ml-auto h-16 w-1/2 rounded-2xl" />
                  <Skeleton className="h-14 w-1/3 rounded-2xl" />
                </div>
              )}
              <div className="space-y-2">
                {chat.messages.filter(Boolean).map((message) => {
                  const fromBakery = message.senderRole !== 'customer';
                  return <div key={message.id} className={`flex ${fromBakery ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] sm:max-w-[75%] px-4 py-2.5 rounded-2xl text-[15px] ${fromBakery ? 'bg-rose-600 text-white' : 'bg-white text-gray-900 shadow-sm border border-pink-100'} ${message.failed ? 'ring-2 ring-red-400' : ''}`}><p className="whitespace-pre-wrap break-words">{message.text}</p><p className={`text-xs mt-1 ${fromBakery ? 'text-white/85 text-right' : 'text-gray-600'}`}>{message.pending ? 'Sending…' : message.failed ? 'Failed' : formatTime(message.createdAt)}</p></div></div>;
                })}
                <div ref={bottomRef} />
              </div>
            </div>
            <div className="flex-shrink-0 border-t border-pink-100 bg-white px-4 py-3">
              {(sendError || chat.error) && <p className="text-xs text-red-600 mb-2" role="alert">{sendError || chat.error}</p>}
              <div className="flex items-center gap-2">
                <input type="text" value={inputText} maxLength={4000} onChange={(event) => setInputText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); submitMessage(); } }} disabled={chat.activeConversation.status === 'closed'} placeholder={chat.activeConversation.status === 'closed' ? 'Reopen this chat to reply' : 'Message customer'} aria-label="Message customer" className="min-w-0 flex-1 px-4 py-2.5 rounded-xl bg-pink-50/70 border border-pink-100 text-[15px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:opacity-60" />
                <button onClick={submitMessage} disabled={!inputText.trim() || sending || chat.activeConversation.status === 'closed'} aria-label="Send" className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white flex items-center justify-center disabled:opacity-40">{sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
