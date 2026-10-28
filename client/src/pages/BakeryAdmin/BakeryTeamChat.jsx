import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Image as ImageIcon,
  Info,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import { useAuth } from '@/lib/AuthContext';
import { getChatSocket } from '@/lib/chat-socket';
import { teamChatApi } from '@/services/chat-api';
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

function isAdminRole(role) {
  return role === 'bakery_admin' || role === 'platform_admin';
}

function RoleBadge({ role }) {
  const admin = isAdminRole(role);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
        admin
          ? 'bg-purple-100 text-purple-700 border border-purple-200'
          : 'bg-blue-50 text-blue-700 border border-blue-200'
      }`}
    >
      {admin ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
      {admin ? 'Admin' : 'Staff'}
    </span>
  );
}

export default function BakeryTeamChat() {
  const { account } = useAuth();
  const selfId = String(account?._id || account?.id || '');

  const [generalChannel, setGeneralChannel] = useState({
    channelKey: 'general',
    channelType: 'group',
    name: 'Bakery Team Room',
    subtitle: 'All Admin & Staff Members',
    memberCount: 1,
    lastMessageAt: null,
    lastMessagePreview: 'Shared channel for admin & staff coordination',
    unreadCount: 0,
  });
  const [members, setMembers] = useState([]);
  const [activeChannelKey, setActiveChannelKey] = useState('general');
  const [messages, setMessages] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [brokenAvatars, setBrokenAvatars] = useState({});

  const activeKeyRef = useRef(activeChannelKey);
  activeKeyRef.current = activeChannelKey;
  const bottomRef = useRef(null);

  const controller = useRichChatController({
    messages,
    setMessages,
  });

  const activeRecipient = useMemo(
    () => members.find((m) => m.channelKey === activeChannelKey) || null,
    [members, activeChannelKey]
  );

  const refreshChannels = useCallback(async () => {
    try {
      const data = await teamChatApi.getChannels();
      if (data?.generalChannel) {
        setGeneralChannel(data.generalChannel);
      }
      if (Array.isArray(data?.members)) {
        setMembers(data.members);
      }
    } catch (err) {
      setError(err?.message || 'Could not load team chat channels.');
    }
  }, []);

  const loadMessages = useCallback(async (channelKey, recipientId = undefined) => {
    if (!channelKey) return;
    setLoadingMessages(true);
    setError('');
    try {
      const data = await teamChatApi.getMessages({ channelKey, recipientId });
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (channelKey === 'general') {
        setGeneralChannel((prev) => ({ ...prev, unreadCount: 0 }));
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.channelKey === channelKey ? { ...m, unreadCount: 0 } : m))
        );
      }
    } catch (err) {
      setError(err?.message || 'Could not load team messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingChannels(true);
    refreshChannels().finally(() => {
      if (active) setLoadingChannels(false);
    });
    return () => {
      active = false;
    };
  }, [refreshChannels]);

  useEffect(() => {
    if (!activeChannelKey) return;
    const recipient = members.find((m) => m.channelKey === activeChannelKey);
    loadMessages(activeChannelKey, recipient?.id);
  }, [activeChannelKey, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [controller.enrichedMessages.length]);

  useEffect(() => {
    let currentSocket;
    let cancelled = false;

    const onNewTeamMessage = (msg) => {
      if (!msg?.id || !msg?.channelKey) return;
      const isCurrentChannel = msg.channelKey === activeKeyRef.current;
      const fromSelf = String(msg.sender?.id || '') === selfId;

      if (isCurrentChannel) {
        setMessages((prev) => {
          if (prev.some((existing) => existing.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (!fromSelf) {
          teamChatApi.markRead({ channelKey: msg.channelKey }).catch(() => {});
        }
      }

      if (msg.channelKey === 'general') {
        setGeneralChannel((prev) => ({
          ...prev,
          lastMessageAt: msg.createdAt,
          lastMessagePreview: `${msg.sender?.displayName || 'Team'}: ${msg.text}`,
          unreadCount: isCurrentChannel || fromSelf ? 0 : (prev.unreadCount || 0) + 1,
        }));
      } else {
        setMembers((prev) =>
          prev.map((m) =>
            m.channelKey === msg.channelKey
              ? {
                  ...m,
                  lastMessageAt: msg.createdAt,
                  lastMessagePreview: msg.text,
                  unreadCount: isCurrentChannel || fromSelf ? 0 : (m.unreadCount || 0) + 1,
                }
              : m
          )
        );
      }
    };

    const onMessageUpdated = (msg) => {
      if (!msg?.id) return;
      setMessages((prev) => prev.map((existing) => (existing.id === msg.id ? msg : existing)));
    };

    getChatSocket()
      .then((socket) => {
        if (cancelled || !socket) return;
        currentSocket = socket;
        currentSocket.on('team:message:new', onNewTeamMessage);
        currentSocket.on('team:message:updated', onMessageUpdated);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      currentSocket?.off?.('team:message:new', onNewTeamMessage);
      currentSocket?.off?.('team:message:updated', onMessageUpdated);
    };
  }, [selfId]);

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.displayName, m.email, isAdminRole(m.role) ? 'admin' : 'staff'].some((val) =>
        String(val || '').toLowerCase().includes(q)
      )
    );
  }, [members, searchQuery]);

  function updateSidebarPreview(msg) {
    if (!msg) return;
    if (activeChannelKey === 'general') {
      setGeneralChannel((prev) => ({
        ...prev,
        lastMessageAt: msg.createdAt,
        lastMessagePreview: `${msg.sender?.displayName || 'You'}: ${msg.text}`,
      }));
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.channelKey === activeChannelKey
            ? {
                ...m,
                lastMessageAt: msg.createdAt,
                lastMessagePreview: msg.text,
              }
            : m
        )
      );
    }
  }

  async function handleSendMessage(e) {
    if (e && e.preventDefault) e.preventDefault();
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
        for (let i = 0; i < attachmentsToSend.length; i += 1) {
          const att = attachmentsToSend[i];
          const itemText = i === 0 && text ? text : `Shared ${sanitizeFileName(att.fileName)}`;
          const payload = {
            channelKey: activeChannelKey,
            recipientId: activeRecipient?.id,
            text: itemText,
            type: att.kind === 'audio' || att.kind === 'document' ? 'file' : att.kind,
            fileUrl: att.fileUrl,
            fileName: sanitizeFileName(att.fileName),
            fileSize: att.fileSize,
            duration: att.duration,
            ...(replyTarget ? { replyTo: replyTarget } : {}),
          };
          const res = await teamChatApi.sendMessage(payload);
          const created = res?.message || {
            id: `local-team-${Date.now()}-${i}`,
            channelKey: activeChannelKey,
            sender: {
              id: selfId,
              displayName: account?.displayName || 'You',
              role: account?.role || 'bakery_staff',
            },
            senderRole: account?.role || 'bakery_staff',
            ...payload,
            createdAt: new Date().toISOString(),
          };
          setMessages((prev) => {
            if (prev.some((existing) => existing.id === created.id)) return prev;
            return [...prev, { ...created, ...payload }];
          });
          updateSidebarPreview(created);
        }
        controller.setReplyingTo(null);
      } else {
        const payload = {
          channelKey: activeChannelKey,
          recipientId: activeRecipient?.id,
          text,
          ...(replyTarget ? { replyTo: replyTarget } : {}),
        };
        const res = await teamChatApi.sendMessage(payload);
        if (res?.message) {
          const merged = replyTarget && !res.message.replyTo ? { ...res.message, replyTo: replyTarget } : res.message;
          setMessages((prev) => {
            if (prev.some((existing) => existing.id === merged.id)) return prev;
            return [...prev, merged];
          });
          updateSidebarPreview(merged);
        }
        controller.setReplyingTo(null);
      }
    } catch (err) {
      setSendError(err?.message || 'Failed to send message.');
      setInputText(text);
    } finally {
      setSending(false);
    }
  }

  async function handleSendLike() {
    if (sending) return;
    setSendError('');
    setSending(true);
    try {
      const replyTarget = controller.replyingTo;
      const payload = {
        channelKey: activeChannelKey,
        recipientId: activeRecipient?.id,
        text: '👍',
        type: 'like',
        ...(replyTarget ? { replyTo: replyTarget } : {}),
      };
      const res = await teamChatApi.sendMessage(payload);
      if (res?.message) {
        const merged = { ...res.message, type: 'like', ...(replyTarget ? { replyTo: replyTarget } : {}) };
        setMessages((prev) => {
          if (prev.some((existing) => existing.id === merged.id)) return prev;
          return [...prev, merged];
        });
        updateSidebarPreview(merged);
      }
      controller.setReplyingTo(null);
    } catch (err) {
      setSendError(err?.message || 'Failed to send quick like.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`cn-bakery-chat flex h-full gap-4 ${activeChannelKey ? 'has-active-chat' : ''}`}>
      {/* Left Sidebar: Team Room & Direct Employee List */}
      <div className="cn-bakery-chat-list w-80 flex-shrink-0 rounded-2xl border border-pink-100 shadow-sm bg-white flex flex-col overflow-hidden">
        <header className="flex-shrink-0 border-b border-pink-100 px-4 py-3 flex items-start justify-between gap-2">
          <div>
            <h1 className="font-bold text-gray-900">Team &amp; Staff Chat</h1>
            <p className="text-[13px] text-gray-600">Admin &amp; employee communication</p>
          </div>
          <button
            type="button"
            onClick={() => {
              refreshChannels();
              loadMessages(activeChannelKey, activeRecipient?.id);
            }}
            aria-label="Refresh team chats"
            className="p-1.5 rounded-full hover:bg-pink-50"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </header>

        {/* Search Employees */}
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
              placeholder="Search admin or staff"
              aria-label="Search admin or staff"
              className="w-full h-10 pl-9 pr-9 rounded-xl border border-pink-100 bg-pink-50/50 text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear team search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-gray-400 hover:bg-pink-100 hover:text-pink-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        <CustomScrollbar className="flex-1">
          {/* Shared Bakery Team Room */}
          <div className="px-3 pt-2.5 pb-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
              Group Channel
            </p>
          </div>
          <button
            type="button"
            aria-label="Open Bakery Team Room"
            onClick={() => setActiveChannelKey('general')}
            className={`w-full flex items-center gap-3 py-3 text-left border-b border-pink-50 transition-colors ${
              activeChannelKey === 'general'
                ? 'pl-3 pr-4 border-l-4 border-l-pink-500 bg-pink-100/70'
                : generalChannel.unreadCount > 0
                ? 'px-4 bg-pink-50/35 hover:bg-pink-50/60'
                : 'px-4 hover:bg-pink-50/40'
            }`}
          >
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Users className="w-5 h-5" />
              {generalChannel.unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-pink-600 border-2 border-white"
                  aria-label={`${generalChannel.unreadCount} unread team messages`}
                />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center gap-2">
                <p className="text-sm font-bold text-gray-900 truncate">{generalChannel.name}</p>
                {generalChannel.lastMessageAt && (
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {formatTime(generalChannel.lastMessageAt)}
                  </span>
                )}
              </div>
              <p className="text-[12px] text-gray-600 truncate">
                {generalChannel.lastMessagePreview || 'All Admin & Staff Members'}
              </p>
            </div>
          </button>

          {/* Direct Messages with Admin & Other Employees */}
          <div className="px-3 pt-3 pb-1 flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 px-1">
              Direct Messages ({filteredMembers.length})
            </p>
          </div>

          {loadingChannels && (
            <p className="text-xs text-gray-500 text-center py-6">Loading team members…</p>
          )}

          {!loadingChannels && members.length === 0 && (
            <p className="text-xs text-gray-500 text-center px-4 py-6">
              No other employees added yet. Use Bakery Team Room above or add staff in Employees.
            </p>
          )}

          {!loadingChannels && members.length > 0 && filteredMembers.length === 0 && (
            <p className="text-xs text-gray-500 text-center px-4 py-6">
              No team members match your search.
            </p>
          )}

          {filteredMembers.map((member) => {
            const isSelected = activeChannelKey === member.channelKey;
            const hasUnread = Number(member.unreadCount) > 0;
            const initial = (member.displayName?.[0] || member.email?.[0] || 'T').toUpperCase();

            return (
              <button
                key={member.id}
                type="button"
                aria-label={`Open direct chat with ${member.displayName}`}
                onClick={() => setActiveChannelKey(member.channelKey)}
                className={`w-full flex items-center gap-3 py-3 text-left border-b border-pink-50 transition-colors ${
                  isSelected
                    ? 'pl-3 pr-4 border-l-4 border-l-pink-500 bg-pink-100/70'
                    : hasUnread
                    ? 'px-4 bg-pink-50/35 hover:bg-pink-50/60'
                    : 'px-4 hover:bg-pink-50/40'
                }`}
              >
                <div className="relative w-10 h-10 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {member.photoURL && !brokenAvatars[member.id] ? (
                    <img
                      src={member.photoURL}
                      alt={member.displayName}
                      onError={() => setBrokenAvatars((prev) => ({ ...prev, [member.id]: true }))}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initial
                  )}
                  {hasUnread && (
                    <span
                      className="absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full bg-pink-500 border-2 border-white"
                      aria-label={`${member.unreadCount} unread message${member.unreadCount === 1 ? '' : 's'}`}
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5">
                    <p
                      className={`text-sm truncate ${
                        hasUnread ? 'font-bold text-gray-950' : 'font-semibold text-gray-900'
                      }`}
                    >
                      {member.displayName}
                    </p>
                    <RoleBadge role={member.role} />
                  </div>
                  <p className="text-[12px] text-gray-500 truncate mt-0.5">
                    {member.lastMessagePreview || member.email}
                  </p>
                </div>
              </button>
            );
          })}
        </CustomScrollbar>
      </div>

      {/* Center Thread Panel */}
      <div
        onDragEnter={controller.handleDragEnter}
        onDragOver={controller.handleDragOver}
        onDragLeave={controller.handleDragLeave}
        onDrop={controller.handleDrop}
        onPaste={controller.handlePaste}
        className="cn-bakery-chat-thread relative flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-sm bg-white flex flex-col overflow-hidden"
      >
        {controller.isDraggingFile && (
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

        <header className="flex-shrink-0 border-b border-pink-100 px-3 sm:px-5 py-3 flex items-center gap-3">
          <button
            type="button"
            className="cn-bakery-chat-back"
            aria-label="Back to team channels"
            onClick={() => setActiveChannelKey('general')}
          >
            <ArrowLeft />
          </button>

          {activeChannelKey === 'general' ? (
            <>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-white flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-[15px]">
                    {generalChannel.name}
                  </p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 font-medium border border-pink-200">
                    All Staff &amp; Admin
                  </span>
                </div>
                <p className="text-[13px] text-gray-600 truncate">
                  Shared workspace channel for bakery admin and staff
                </p>
              </div>
            </>
          ) : activeRecipient ? (
            <>
              <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-700 font-bold flex items-center justify-center flex-shrink-0">
                {(activeRecipient.displayName?.[0] || activeRecipient.email?.[0] || 'T').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-[15px] truncate">
                    {activeRecipient.displayName}
                  </p>
                  <RoleBadge role={activeRecipient.role} />
                </div>
                <p className="text-[13px] text-gray-600 truncate">{activeRecipient.email}</p>
              </div>
            </>
          ) : null}

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
          {loadingMessages && controller.enrichedMessages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">Loading messages…</p>
          ) : controller.enrichedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-10">
              <div className="w-14 h-14 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center mb-3">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="font-semibold text-gray-800 text-sm">
                {activeChannelKey === 'general'
                  ? 'Welcome to the Bakery Team Room!'
                  : `Start a conversation with ${activeRecipient?.displayName || 'this team member'}`}
              </p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm">
                {activeChannelKey === 'general'
                  ? 'Messages sent here are visible to the Bakery Admin and all Bakery Staff members.'
                  : 'Send a direct message to coordinate tasks, orders, or schedules.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {controller.enrichedMessages.map((message) => {
                const isMine = String(message.sender?.id || '') === selfId;
                const senderName = isMine
                  ? 'You'
                  : message.sender?.displayName || 'Team Member';
                const senderRole = message.sender?.role || message.senderRole;

                return (
                  <RichMessageBubble
                    key={message.id}
                    message={message}
                    allMessages={controller.enrichedMessages}
                    isMine={isMine}
                    senderLabel={senderName}
                    roleBadge={<RoleBadge role={senderRole} />}
                    conversationId={message.channelKey || activeChannelKey}
                    isHighlighted={controller.highlightId === message.id}
                    onStartReply={controller.startReply}
                    onTogglePin={(id) =>
                      controller.togglePin(id, (msgId) => teamChatApi.togglePin?.(msgId))
                    }
                    onOpenMedia={controller.openMediaModalForMessage}
                    onJumpToMessage={controller.jumpToMessage}
                  />
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <RichChatComposer
          inputText={inputText}
          setInputText={setInputText}
          onSendText={handleSendMessage}
          onSendLike={handleSendLike}
          disabled={false}
          sending={sending}
          placeholder={
            activeChannelKey === 'general'
              ? 'Message the bakery team (admin & all staff)…'
              : `Message ${activeRecipient?.displayName || 'team member'}…`
          }
          inputAriaLabel="Message team"
          sendAriaLabel="Send team message"
          errorText={sendError || error}
          controller={controller}
        />
      </div>

      {/* Right Chat Details / History Panel */}
      <RichChatDetailsPanel
        controller={controller}
        title={
          activeChannelKey === 'general'
            ? generalChannel.name
            : activeRecipient?.displayName || 'Team Chat'
        }
        subtitle={
          activeChannelKey === 'general'
            ? 'All Bakery Admin & Staff Members'
            : activeRecipient?.email || 'Direct Team Message'
        }
        avatarType={activeChannelKey === 'general' ? 'group' : 'user'}
      />

      {/* Rich Chat Modals (Media Lightbox, Pinned Messages, Attachment Permission) */}
      <RichChatModals controller={controller} />
    </div>
  );
}
