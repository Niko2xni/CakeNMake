import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Cake, Image as ImageIcon, Info, RefreshCw, Search, User, X } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { AdminRowsSkeleton } from '@/components/shared/PageLoadingSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { sortConversationsByActivity, useChat } from '@/hooks/useChat';
import { chatApi } from '@/services/chat-api';
import { useSearchParams } from 'react-router-dom';
import { sanitizeFileName } from '@/lib/file-validation';
import {
  formatTime,
  sanitizeInputText,
  useRichChatController,
  RichMessageBubble,
  RichChatComposer,
  RichChatDetailsPanel,
  RichChatModals,
} from '@/components/bakery/RichChatFeatures';

function customerLabel(conversation) {
  return conversation?.customer?.displayName || conversation?.customer?.email || 'Customer';
}

export default function BakeryChat() {
  const chat = useChat();
  const [params] = useSearchParams();
  const requestedConversation = params.get('conversation');
  const openedRequest = useRef(null);
  useEffect(() => {
    if (
      requestedConversation &&
      openedRequest.current !== requestedConversation &&
      chat.conversations.some((item) => item.id === requestedConversation)
    ) {
      chat.setActiveConversationId(requestedConversation);
      openedRequest.current = requestedConversation;
    }
  }, [requestedConversation, chat.conversations, chat.setActiveConversationId]);

  const [inputText, setInputText] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const bottomRef = useRef(null);

  const controller = useRichChatController({
    messages: chat.messages || [],
    setMessages: chat.setMessages,
  });

  const visibleConversations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const sorted = sortConversationsByActivity(chat.conversations);
    if (!normalizedQuery) return sorted;
    return sorted.filter((conversation) =>
      [conversation?.customer?.displayName, conversation?.customer?.email].some((value) =>
        String(value || '').toLowerCase().includes(normalizedQuery)
      )
    );
  }, [chat.conversations, searchQuery]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [controller.enrichedMessages.length]);

  async function submitMessage() {
    const text = sanitizeInputText(inputText);
    const hasAttachments = controller.pendingAttachments.length > 0;
    if ((!text && !hasAttachments) || sending) return;

    const attachmentsToSend = controller.pendingAttachments;
    const replyTarget = controller.replyingTo;
    setInputText('');
    setSendError('');
    setSending(true);
    try {
      if (hasAttachments) {
        controller.setPendingAttachments([]);
        const newMsgList = attachmentsToSend.map((att, idx) => ({
          id: `local-${Date.now()}-${idx}`,
          conversationId: chat.activeConversation?.id,
          senderRole: 'bakery_admin',
          type: att.kind === 'audio' || att.kind === 'document' ? 'file' : att.kind,
          text: idx === 0 && text ? text : '',
          fileUrl: att.fileUrl,
          fileName: sanitizeFileName(att.fileName),
          fileSize: att.fileSize,
          duration: att.duration,
          createdAt: new Date(),
          pinned: false,
          replyTo: replyTarget?.id || null,
        }));
        controller.appendMessages(newMsgList);
        controller.setReplyingTo(null);

        const summary =
          text ||
          `Shared ${
            attachmentsToSend.length === 1
              ? sanitizeFileName(attachmentsToSend[0].fileName)
              : `${attachmentsToSend.length} attachments`
          }`;
        await chat.sendMessage(summary, { replyTo: replyTarget?.id || null }).catch(() => {});
      } else {
        await chat.sendMessage(text, { replyTo: replyTarget?.id || null });
        controller.setReplyingTo(null);
      }
    } catch (error) {
      setSendError(error.message || 'Message could not be sent.');
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  async function handleSendLike() {
    if (sending || chat.activeConversation?.status === 'closed') return;
    setSendError('');
    try {
      await chat.sendMessage('👍', { replyTo: controller.replyingTo?.id || null });
      controller.setReplyingTo(null);
    } catch (error) {
      setSendError(error.message || 'Message could not be sent.');
    }
  }

  return (
    <div className={`cn-bakery-chat flex h-full gap-4 ${chat.activeConversation ? 'has-active-chat' : ''}`}>
      {/* Customer Conversations Sidebar */}
      <div className="cn-bakery-chat-list w-72 flex-shrink-0 rounded-2xl border border-pink-100 shadow-sm bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-4 py-3 flex items-start justify-between gap-2">
          <div>
            <h1 className="font-bold text-gray-900">Customer Chats</h1>
            <p className="text-[13px] text-gray-600">Live customer messages</p>
          </div>
          <button
            onClick={chat.refreshConversations}
            aria-label="Refresh conversations"
            className="p-1.5 rounded-full hover:bg-pink-50"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </header>
        <div className="flex-shrink-0 px-3 py-2 border-b border-pink-50">
          <label className="relative block">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search customers"
              aria-label="Search customers"
              className="w-full h-11 pl-9 pr-9 rounded-xl border border-pink-100 bg-pink-50/50 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear customer search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-pink-100 hover:text-pink-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>
        <CustomScrollbar className="flex-1">
          {chat.loading && (
            <div role="status" aria-label="Loading customer conversations" className="p-3">
              <AdminRowsSkeleton count={5} avatar />
            </div>
          )}
          {!chat.loading && chat.conversations.length === 0 && (
            <p className="text-sm text-gray-600 text-center px-4 py-8">No customer conversations yet.</p>
          )}
          {!chat.loading && chat.conversations.length > 0 && visibleConversations.length === 0 && (
            <p className="text-sm text-gray-600 text-center px-4 py-8">No customers match your search.</p>
          )}
          {visibleConversations.map((conversation) => {
            const hasUnread = Number(conversation.unreadCount) > 0;
            const label = customerLabel(conversation);
            return (
              <button
                key={conversation.id}
                aria-label={`Open conversation with ${label}`}
                onClick={() => chat.setActiveConversationId(conversation.id)}
                className={`w-full flex items-center gap-3 py-3 text-left border-b border-pink-50 transition-colors ${
                  chat.activeConversationId === conversation.id
                    ? 'pl-3 pr-4 border-l-4 border-l-pink-500 bg-pink-100/70'
                    : hasUnread
                    ? 'px-4 bg-pink-50/35 hover:bg-pink-50/60'
                    : 'px-4 hover:bg-pink-50/40'
                }`}
              >
                <div className="relative w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-gray-500" />
                  {hasUnread && (
                    <span
                      className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-white"
                      aria-label={`${conversation.unreadCount} unread message${
                        conversation.unreadCount === 1 ? '' : 's'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <p
                      className={`text-sm truncate ${
                        hasUnread ? 'font-bold text-gray-950' : 'font-semibold text-gray-900'
                      }`}
                    >
                      {label}
                    </p>
                    <span
                      className={`text-xs whitespace-nowrap ${
                        hasUnread ? 'font-semibold text-pink-700' : 'text-gray-600'
                      }`}
                    >
                      {formatTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p
                    className={`text-[13px] truncate ${
                      hasUnread ? 'font-medium text-gray-800' : 'text-gray-600'
                    }`}
                  >
                    {conversation.lastMessagePreview || 'New conversation'}
                  </p>
                  <span className="text-xs text-gray-500 capitalize">{conversation.status}</span>
                </div>
              </button>
            );
          })}
        </CustomScrollbar>
      </div>

      {/* Main Conversation Thread */}
      <div
        onDragEnter={controller.handleDragEnter}
        onDragOver={controller.handleDragOver}
        onDragLeave={controller.handleDragLeave}
        onDrop={controller.handleDrop}
        onPaste={controller.handlePaste}
        className="cn-bakery-chat-thread relative flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-sm bg-white flex flex-col overflow-hidden"
      >
        {controller.isDraggingFile && chat.activeConversation && (
          <div className="absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-pink-400 bg-pink-50/90 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-none text-center px-6">
            <div className="w-12 h-12 rounded-full bg-pink-500 text-white flex items-center justify-center shadow mb-2">
              <ImageIcon className="w-6 h-6" />
            </div>
            <p className="font-semibold text-gray-900 text-sm">Drop files to attach them</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Photos, videos, audio, and documents will be staged above the message box
            </p>
          </div>
        )}

        {!chat.activeConversation ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div>
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Cake className="w-8 h-8 text-white" />
              </div>
              <p className="text-sm text-gray-500 mt-3">Select a conversation to start messaging.</p>
              {chat.error && (
                <p className="text-xs text-red-600 mt-2" role="alert">
                  {chat.error}
                </p>
              )}
            </div>
          </div>
        ) : (
          <>
            <header className="flex-shrink-0 border-b border-pink-100 px-3 sm:px-5 py-3 flex items-center gap-3">
              <button
                type="button"
                className="cn-bakery-chat-back"
                aria-label="Back to conversations"
                onClick={() => chat.setActiveConversationId(null)}
              >
                <ArrowLeft />
              </button>
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-5 h-5 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-[15px] truncate">
                  {customerLabel(chat.activeConversation)}
                </p>
                <p className="text-[13px] text-gray-600 truncate">
                  {chat.activeConversation.platform?.name || 'Bakery'}
                </p>
              </div>
              <button
                type="button"
                onClick={controller.toggleInfo}
                aria-label="Conversation info"
                title="Chat details & history"
                className={`h-10 px-3 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  controller.showInfo
                    ? 'bg-pink-500 text-white border-pink-500'
                    : 'border-pink-200 text-pink-600 hover:bg-pink-50'
                }`}
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Details</span>
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 bg-gray-50/70">
              {chat.hasMore && (
                <button
                  onClick={chat.loadOlder}
                  disabled={chat.loadingMessages}
                  className="block mx-auto mb-4 text-sm text-pink-700 hover:underline"
                >
                  {chat.loadingMessages ? 'Loading…' : 'Load earlier messages'}
                </button>
              )}
              {chat.loadingMessages && controller.enrichedMessages.length === 0 && (
                <div role="status" aria-label="Loading messages" className="space-y-4">
                  <Skeleton className="h-12 w-2/5 rounded-2xl" />
                  <Skeleton className="ml-auto h-16 w-1/2 rounded-2xl" />
                  <Skeleton className="h-14 w-1/3 rounded-2xl" />
                </div>
              )}
              <div className="space-y-3">
                {controller.enrichedMessages.map((message) => {
                  const fromBakery = message.senderRole !== 'customer';
                  const senderLabel = fromBakery
                    ? 'Bakery'
                    : customerLabel(chat.activeConversation);
                  return (
                    <RichMessageBubble
                      key={message.id}
                      message={message}
                      allMessages={controller.enrichedMessages}
                      isMine={fromBakery}
                      senderLabel={senderLabel}
                      conversationId={message.conversationId || chat.activeConversation.id}
                      isHighlighted={controller.highlightId === message.id}
                      onStartReply={controller.startReply}
                      onTogglePin={(id) => controller.togglePin(id)}
                      onOpenMedia={controller.openMediaModalForMessage}
                      onJumpToMessage={controller.jumpToMessage}
                    />
                  );
                })}
                <div ref={bottomRef} />
              </div>
            </div>

            <RichChatComposer
              inputText={inputText}
              setInputText={setInputText}
              onSendText={submitMessage}
              onSendLike={handleSendLike}
              disabled={chat.activeConversation.status === 'closed'}
              sending={sending}
              placeholder={
                chat.activeConversation.status === 'closed'
                  ? 'Reopen this chat to reply'
                  : 'Message customer'
              }
              inputAriaLabel="Message customer"
              sendAriaLabel="Send"
              errorText={sendError || chat.error}
              controller={controller}
            />
          </>
        )}
      </div>

      {/* Right Chat Details / History Panel */}
      {chat.activeConversation && (
        <RichChatDetailsPanel
          controller={controller}
          title={customerLabel(chat.activeConversation)}
          subtitle={chat.activeConversation.customer?.email || 'Customer Conversation'}
          avatarType="user"
        />
      )}

      {/* Rich Chat Modals (Media Lightbox, Pinned Messages, Attachment Permission) */}
      <RichChatModals controller={controller} />
    </div>
  );
}
