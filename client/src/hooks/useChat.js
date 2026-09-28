import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { getChatSocket } from '@/lib/chat-socket';
import { chatApi } from '@/services/chat-api';

export function normalizeMessage(message) {
  if (!message || typeof message !== 'object') return null;
  const parsedCreatedAt = new Date(message.createdAt);
  return {
    ...message,
    senderProfile: message.sender && typeof message.sender === 'object' ? message.sender : null,
    sender: message.senderRole === 'customer' ? 'user' : 'bakery',
    pinned: Boolean(message.pinned),
    createdAt: Number.isNaN(parsedCreatedAt.getTime()) ? new Date() : parsedCreatedAt,
  };
}

function uniqueMessages(messages) {
  const byId = new Map();
  messages.forEach((message) => {
    const normalized = normalizeMessage(message);
    if (!normalized) return;
    byId.set(normalized.id || `pending:${normalized.clientMessageId}`, normalized);
  });
  return [...byId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function clientMessageId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID().replaceAll('-', '_');
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useChat({ autoCreate = false } = {}) {
  const { account } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const activeIdRef = useRef(null);
  activeIdRef.current = activeConversationId;

  const refreshConversations = useCallback(async () => {
    const result = await chatApi.listConversations();
    let list = Array.isArray(result.conversations)
      ? result.conversations.filter((item) => item?.id && item?.customer && item?.platform)
      : [];
    if (autoCreate && account?.role === 'customer' && list.length === 0) {
      const created = await chatApi.createConversation();
      list = [created.conversation];
    }
    setConversations(list);
    if (autoCreate && list.length > 0) setActiveConversationId((current) => current || list[0].id);
    return list;
  }, [account?.role, autoCreate]);

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setLoadingMessages(true);
    try {
      const result = await chatApi.getMessages(conversationId);
      setMessages((Array.isArray(result.messages) ? result.messages : []).map(normalizeMessage).filter(Boolean));
      setNextCursor(result.nextCursor);
      await chatApi.markRead(conversationId);
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const loadOlder = useCallback(async () => {
    if (!activeConversationId || !nextCursor || loadingMessages) return;
    setLoadingMessages(true);
    try {
      const result = await chatApi.getMessages(activeConversationId, { before: nextCursor });
      setMessages((current) => uniqueMessages([...(result.messages || []), ...current]));
      setNextCursor(result.nextCursor);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeConversationId, loadingMessages, nextCursor]);

  useEffect(() => {
    if (!account) return undefined;
    let active = true;
    setLoading(true);
    refreshConversations()
      .catch((requestError) => active && setError(requestError.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [account, refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    setError('');
    loadMessages(activeConversationId).catch((requestError) => setError(requestError.message));
  }, [activeConversationId, loadMessages]);

  useEffect(() => {
    if (!account) return undefined;
    let currentSocket;
    let cancelled = false;

    const onNewMessage = (message) => {
      if (!message?.id || !message?.conversationId || typeof message.text !== 'string') return;
      if (message.conversationId === activeIdRef.current) {
        setMessages((current) => uniqueMessages([
          ...current.filter((item) => item.clientMessageId !== message.clientMessageId),
          message,
        ]));
        chatApi.markRead(message.conversationId).catch(() => {});
      }
      refreshConversations().catch(() => {});
    };
    const onConversationUpdated = () => refreshConversations().catch(() => {});
    const onConnect = () => {
      if (activeIdRef.current) currentSocket.emit('conversation:join', { conversationId: activeIdRef.current });
      refreshConversations().catch(() => {});
    };

    getChatSocket().then((connectedSocket) => {
      if (cancelled) return;
      currentSocket = connectedSocket;
      currentSocket.on('message:new', onNewMessage);
      currentSocket.on('conversation:updated', onConversationUpdated);
      currentSocket.on('connect', onConnect);
      if (currentSocket.connected) onConnect();
    }).catch((socketError) => setError(socketError.message));

    return () => {
      cancelled = true;
      currentSocket?.off('message:new', onNewMessage);
      currentSocket?.off('conversation:updated', onConversationUpdated);
      currentSocket?.off('connect', onConnect);
    };
  }, [account, refreshConversations]);

  useEffect(() => {
    if (!activeConversationId) return undefined;
    let socket;
    getChatSocket().then((value) => {
      socket = value;
      socket.emit('conversation:join', { conversationId: activeConversationId });
    }).catch(() => {});
    return () => socket?.emit('conversation:leave', { conversationId: activeConversationId });
  }, [activeConversationId]);

  const sendMessage = useCallback(async (text, { replyTo = null } = {}) => {
    const normalized = text.trim();
    if (!normalized || !activeConversationId) return null;
    const localId = clientMessageId();
    const optimistic = {
      id: `pending:${localId}`,
      conversationId: activeConversationId,
      sender: { id: account?.id || account?._id || '', displayName: account?.displayName || '' },
      senderRole: account?.role || 'customer',
      type: 'text',
      text: normalized,
      clientMessageId: localId,
      replyTo,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((current) => [...current, normalizeMessage(optimistic)]);

    try {
      const socket = await getChatSocket();
      const response = await new Promise((resolve, reject) => {
        socket.timeout(10_000).emit('message:send', {
          conversationId: activeConversationId,
          text: normalized,
          clientMessageId: localId,
          replyTo,
        }, (timeoutError, result) => {
          if (timeoutError) reject(timeoutError);
          else if (!result?.ok) reject(Object.assign(new Error(result?.message || 'Message failed.'), { code: result?.code }));
          else resolve(result);
        });
      });
      if (!response?.message) throw new Error('The server returned an invalid message response.');
      setMessages((current) => uniqueMessages([
        ...current.filter((item) => item.clientMessageId !== localId),
        response.message,
      ]));
      return response.message;
    } catch (sendError) {
      setMessages((current) => current.map((item) => item.clientMessageId === localId
        ? { ...item, pending: false, failed: true }
        : item));
      throw sendError;
    }
  }, [account, activeConversationId]);

  return {
    activeConversation: conversations.find((item) => item.id === activeConversationId) || null,
    activeConversationId,
    conversations,
    error,
    hasMore: Boolean(nextCursor),
    loading,
    loadingMessages,
    loadOlder,
    messages,
    refreshConversations,
    sendMessage,
    setActiveConversationId,
    setMessages,
  };
}
