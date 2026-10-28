import React, { useState, useRef, useEffect } from 'react';
import {
  Image as ImageIcon,
  ThumbsUp,
  Send,
  Pin,
  FileText,
  Link2,
  ChevronLeft,
  ChevronRight,
  Cake,
  Download,
  Reply,
  X,
  Search,
  User,
  Play,
  Plus,
  Info,
  Loader2,
  Users,
} from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';
import ChatMessageContent from '@/components/shared/ChatMessageContent';
import { sanitizeFileName, hasBlockedExtension } from '@/lib/file-validation';

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
export const MAX_VIDEO_DURATION = 10 * 60;
export const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'avi', 'flv', 'webm'];
const AUDIO_EXTENSIONS = ['wav', 'mp3', 'm4a', 'ogg'];
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt'];

export function getFileExtension(filename) {
  if (typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase().trim() : '';
}

export function isSafeLinkUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return false;
  if (/[\u0000-\u001F\u007F-\u009F]/.test(rawUrl)) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    return true;
  } catch {
    return false;
  }
}

export function sanitizeInputText(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '').trim();
}

export function getFileKind(file) {
  if (!file || typeof file.name !== 'string') return null;
  if (hasBlockedExtension(file.name)) return null;
  const ext = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase().trim();
  if (IMAGE_EXTENSIONS.includes(ext) && ['image/png', 'image/jpeg', 'image/webp'].includes(mime)) return 'image';
  if (
    VIDEO_EXTENSIONS.includes(ext) &&
    ['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/x-flv', 'video/webm'].includes(mime)
  )
    return 'video';
  if (
    AUDIO_EXTENSIONS.includes(ext) &&
    ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg'].includes(mime)
  )
    return 'audio';
  if (
    DOCUMENT_EXTENSIONS.includes(ext) &&
    [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ].includes(mime)
  )
    return 'document';
  return null;
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatTime(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function getRelativeTime(value) {
  const date = value instanceof Date ? value : new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return 'just now';
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  const diffWeek = Math.floor(diffDay / 7);
  return `${diffWeek}w`;
}

export function getSnippet(m) {
  if (!m) return '';
  if (m.type === 'like' || m.text === '👍') return '👍';
  if (m.type === 'image') return m.text || m.fileName || 'Photo';
  if (m.type === 'video') return m.text || m.fileName || 'Video';
  if (m.type === 'file' || m.type === 'document' || m.type === 'audio') return m.fileName || 'Attachment';
  return m.text || '';
}

export function formatReadableUrl(url) {
  try {
    const parsed = new URL(url);
    const readable = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}`;
    return readable.length > 42 ? `${readable.slice(0, 39)}…` : readable;
  } catch {
    return url.length > 42 ? `${url.slice(0, 39)}…` : url;
  }
}

export function getFirstUrl(text) {
  if (typeof text !== 'string') return null;
  const found = text.match(URL_REGEX);
  return found ? found[0] : null;
}

export function getLinkInfo(url) {
  let hostname = '';
  try {
    if (!isSafeLinkUrl(url)) throw new Error('Invalid URL');
    hostname = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return { label: 'Link', color: 'bg-pink-50 border-pink-100 text-pink-500' };
  }
  const platforms = [
    { domains: ['youtube.com', 'youtu.be'], label: 'YouTube', color: 'bg-red-50 border-red-100 text-red-600' },
    { domains: ['instagram.com'], label: 'Instagram', color: 'bg-pink-50 border-pink-100 text-pink-600' },
    { domains: ['facebook.com', 'fb.com'], label: 'Facebook', color: 'bg-blue-50 border-blue-100 text-blue-600' },
    { domains: ['twitter.com', 'x.com'], label: 'X (Twitter)', color: 'bg-gray-50 border-gray-200 text-gray-700' },
    { domains: ['tiktok.com'], label: 'TikTok', color: 'bg-gray-50 border-gray-200 text-gray-900' },
    { domains: ['pinterest.com', 'pin.it'], label: 'Pinterest', color: 'bg-red-50 border-red-100 text-red-600' },
  ];
  const found = platforms.find((p) => p.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`)));
  if (found) return found;
  const fallbackLabel = hostname.split('.')[0] || 'Link';
  return {
    label: fallbackLabel.charAt(0).toUpperCase() + fallbackLabel.slice(1),
    color: 'bg-pink-50 border-pink-100 text-pink-500',
  };
}

export function resolveReplyTarget(message, allMessages) {
  if (!message?.replyTo) return null;
  if (typeof message.replyTo === 'object' && message.replyTo !== null) {
    return message.replyTo;
  }
  const targetId = String(message.replyTo);
  const found = (allMessages || []).find((item) => String(item?.id) === targetId);
  if (!found) return null;
  return {
    id: found.id,
    senderName: found.senderName || found.sender?.displayName || (found.senderRole === 'customer' ? 'Customer' : 'Bakery'),
    snippet: getSnippet(found),
    mediaType: found.type === 'image' || found.type === 'video' ? found.type : null,
    mediaUrl: found.fileUrl || null,
  };
}

export function handleDownloadMedia(m) {
  if (!m?.fileUrl) return;
  if (!m.fileUrl.startsWith('blob:') && !m.fileUrl.startsWith('data:') && !isSafeLinkUrl(m.fileUrl)) return;
  const a = document.createElement('a');
  a.href = m.fileUrl;
  a.download = sanitizeFileName(m.fileName || 'file');
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function useRichChatController({ messages = [], setMessages }) {
  const [uploadError, setUploadError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoView, setInfoView] = useState('home'); // 'home' | 'media' | 'search'
  const [mediaTab, setMediaTab] = useState('media'); // 'media' | 'files' | 'links'
  const [highlightId, setHighlightId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [chatSearchSubmittedQuery, setChatSearchSubmittedQuery] = useState('');
  const [mediaModalIndex, setMediaModalIndex] = useState(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [sessionAttachmentPerm, setSessionAttachmentPerm] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [localPinnedMap, setLocalPinnedMap] = useState({});
  const [localExtraMessages, setLocalExtraMessages] = useState([]);

  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const pendingIdRef = useRef(1);

  useEffect(() => {
    if (!uploadError) return undefined;
    const t = setTimeout(() => setUploadError(null), 4000);
    return () => clearTimeout(t);
  }, [uploadError]);

  const combinedRawMessages = [
    ...messages.filter(Boolean),
    ...localExtraMessages.filter(
      (extra) => !messages.some((existing) => existing?.id === extra?.id)
    ),
  ];

  const enrichedMessages = combinedRawMessages.map((m) => {
    const pinnedState = localPinnedMap[m.id];
    const isPinned = pinnedState !== undefined ? pinnedState.pinned : Boolean(m.pinned);
    const pinnedAt = pinnedState !== undefined ? pinnedState.pinnedAt : m.pinnedAt;
    const resolvedType =
      m.type && m.type !== 'text'
        ? m.type
        : m.text === '👍'
        ? 'like'
        : 'text';
    return {
      ...m,
      type: resolvedType,
      pinned: isPinned,
      pinnedAt,
    };
  });

  const mediaMessages = enrichedMessages.filter((m) => m.type === 'image' || m.type === 'video');
  const fileMessages = enrichedMessages.filter(
    (m) => m.type === 'file' || m.type === 'document' || m.type === 'audio'
  );
  const pinnedMessages = enrichedMessages.filter((m) => m.pinned);
  const linkMessages = enrichedMessages.flatMap((m) => {
    if (m.type !== 'text' || typeof m.text !== 'string') return [];
    const found = m.text.match(URL_REGEX);
    return found ? found.map((url) => ({ id: `${m.id}-${url}`, messageId: m.id, url, createdAt: m.createdAt })) : [];
  });

  function checkAttachmentPermission() {
    try {
      const permanent = localStorage.getItem('cakenmake_attachment_permission') === 'permanent';
      if (permanent || sessionAttachmentPerm) return true;
    } catch {}
    return sessionAttachmentPerm;
  }

  function handleGrantPermission(type) {
    if (type === 'permanent') {
      try {
        localStorage.setItem('cakenmake_attachment_permission', 'permanent');
      } catch {}
      setSessionAttachmentPerm(true);
    } else if (type === 'one-time') {
      setSessionAttachmentPerm(true);
    }
    setShowPermissionModal(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 80);
  }

  function handleAttachClick() {
    if (checkAttachmentPermission()) {
      fileInputRef.current?.click();
    } else {
      setShowPermissionModal(true);
    }
  }

  function removePendingAttachment(id) {
    setPendingAttachments((prev) => {
      const att = prev.find((a) => a.id === id);
      if (att?.fileUrl?.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(att.fileUrl);
        } catch {}
      }
      return prev.filter((a) => a.id !== id);
    });
  }

  function stageFile(file) {
    if (!file || typeof file.name !== 'string') {
      setUploadError('Please choose a valid file.');
      return;
    }
    if (hasBlockedExtension(file.name)) {
      setUploadError(`"${file.name}" can't be sent — that file type isn't allowed for security reasons.`);
      return;
    }

    const kind = getFileKind(file);
    if (!kind) {
      setUploadError(
        `"${file.name}" isn't a supported file type. Allowed: JPG, PNG, WEBP, MP4, MOV, WAV, MP3, PDF, DOC, DOCX, TXT.`
      );
      return;
    }

    if (kind === 'image' && file.size > MAX_IMAGE_SIZE) {
      setUploadError('This image is over 25 MB. Try a smaller one.');
      return;
    }
    if (kind === 'video' && file.size > MAX_VIDEO_SIZE) {
      setUploadError('This video is over 100 MB. Try a smaller one.');
      return;
    }
    if ((kind === 'audio' || kind === 'document') && file.size > MAX_FILE_SIZE) {
      setUploadError('This file is over 25 MB. Try a smaller one.');
      return;
    }

    const cleanFileName = sanitizeFileName(file.name);
    const url = URL.createObjectURL(file);
    const id = `pending-${pendingIdRef.current++}`;
    const normalizedKind = kind === 'audio' || kind === 'document' ? 'file' : kind;
    const attachment = {
      id,
      kind: normalizedKind,
      rawKind: kind,
      fileUrl: url,
      fileName: cleanFileName,
      fileSize: file.size,
      duration: null,
    };

    setPendingAttachments((prev) => [...prev, attachment]);

    if (kind === 'video') {
      const probe = document.createElement('video');
      probe.preload = 'metadata';
      probe.onloadedmetadata = () => {
        if (probe.duration > MAX_VIDEO_DURATION) {
          setUploadError('This video is longer than 10 minutes. Try a shorter clip.');
          removePendingAttachment(id);
          return;
        }
        setPendingAttachments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, duration: probe.duration } : a))
        );
      };
      probe.onerror = () => {
        setUploadError("Couldn't read this video file.");
        removePendingAttachment(id);
      };
      probe.src = url;
    }
  }

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    files.forEach(stageFile);
    e.target.value = '';
  }

  function handleDragEnter(e) {
    e.preventDefault();
    dragCounterRef.current += 1;
    setIsDraggingFile(true);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingFile(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach(stageFile);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    const files = [];
    for (let i = 0; i < items.length; i += 1) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      files.forEach(stageFile);
    }
  }

  function togglePin(id, onServerPin) {
    setLocalPinnedMap((prev) => {
      const currentMsg = enrichedMessages.find((m) => m.id === id);
      const nextPinned = !currentMsg?.pinned;
      return {
        ...prev,
        [id]: { pinned: nextPinned, pinnedAt: nextPinned ? new Date() : null },
      };
    });
    if (setMessages) {
      setMessages((prev) =>
        prev.map((m) => {
          if (m?.id !== id) return m;
          const nextPinned = !m.pinned;
          return { ...m, pinned: nextPinned, pinnedAt: nextPinned ? new Date() : null };
        })
      );
    }
    if (onServerPin) {
      Promise.resolve(onServerPin(id)).catch(() => {});
    }
  }

  function startReply(m, senderNameOverride) {
    setReplyingTo({
      id: m.id,
      senderName: senderNameOverride || m.senderName || m.sender?.displayName || 'User',
      snippet: getSnippet(m),
      mediaType: m.type === 'image' || m.type === 'video' ? m.type : null,
      mediaUrl: m.fileUrl || null,
    });
    textInputRef.current?.focus();
  }

  function toggleInfo() {
    setShowInfo((prev) => {
      const next = !prev;
      if (next) setInfoView('home');
      return next;
    });
  }

  function handleInfoBack() {
    if (infoView === 'home') {
      setShowInfo(false);
    } else {
      if (infoView === 'search') {
        setChatSearchQuery('');
        setChatSearchSubmittedQuery('');
      }
      setInfoView('home');
    }
  }

  function jumpToMessage(id) {
    if (!id) return;
    setHighlightId(id);
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightId(null), 900);
  }

  function openMediaModalForMessage(id) {
    const idx = mediaMessages.findIndex((mm) => mm.id === id);
    if (idx !== -1) setMediaModalIndex(idx);
  }

  function appendMessages(newMsgs) {
    const list = Array.isArray(newMsgs) ? newMsgs : [newMsgs];
    if (setMessages) {
      setMessages((prev) => [...prev, ...list]);
    } else {
      setLocalExtraMessages((prev) => [...prev, ...list]);
    }
  }

  return {
    enrichedMessages,
    appendMessages,
    mediaMessages,
    fileMessages,
    pinnedMessages,
    linkMessages,
    uploadError,
    setUploadError,
    showInfo,
    setShowInfo,
    infoView,
    setInfoView,
    mediaTab,
    setMediaTab,
    highlightId,
    replyingTo,
    setReplyingTo,
    chatSearchQuery,
    setChatSearchQuery,
    chatSearchSubmittedQuery,
    setChatSearchSubmittedQuery,
    mediaModalIndex,
    setMediaModalIndex,
    showPinnedModal,
    setShowPinnedModal,
    showPermissionModal,
    setShowPermissionModal,
    isDraggingFile,
    pendingAttachments,
    setPendingAttachments,
    fileInputRef,
    textInputRef,
    handleGrantPermission,
    handleAttachClick,
    removePendingAttachment,
    stageFile,
    handleFileChange,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    togglePin,
    startReply,
    toggleInfo,
    handleInfoBack,
    jumpToMessage,
    openMediaModalForMessage,
  };
}

export function RichMessageBubble({
  message,
  allMessages,
  isMine,
  senderLabel,
  roleBadge = null,
  conversationId,
  isHighlighted,
  onStartReply,
  onTogglePin,
  onOpenMedia,
  onJumpToMessage,
}) {
  const replyObj = resolveReplyTarget(message, allMessages);

  if (message.type === 'like' && !['held', 'rejected'].includes(message.moderation)) {
    return (
      <div
        id={`msg-${message.id}`}
        className={`group flex flex-col mb-2 ${isMine ? 'items-end' : 'items-start'}`}
      >
        <div className="flex items-center gap-1.5 mb-1 px-1">
          <span className="text-xs font-semibold text-gray-700">{senderLabel}</span>
          {roleBadge}
          {message.pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600">
              <Pin className="w-3 h-3" fill="currentColor" /> Pinned
            </span>
          )}
        </div>
        <div className={`flex items-center gap-2 ${isMine ? 'flex-row-reverse' : ''}`}>
          <div
            className={`w-11 h-11 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 shadow-sm ${
              isHighlighted ? 'ring-2 ring-pink-400' : ''
            }`}
          >
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onStartReply(message, senderLabel)}
              title="Reply"
              aria-label="Reply"
              className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
            >
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onTogglePin(message.id)}
              title={message.pinned ? 'Unpin' : 'Pin'}
              aria-label={message.pinned ? 'Unpin message' : 'Pin message'}
              className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
            >
              <Pin className="w-3.5 h-3.5" fill={message.pinned ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-1 px-1">{formatTime(message.createdAt)}</p>
      </div>
    );
  }

  const firstUrl = message.type === 'text' ? getFirstUrl(message.text) : null;
  const linkInfo = firstUrl && isSafeLinkUrl(firstUrl) ? getLinkInfo(firstUrl) : null;

  return (
    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
      {/* Sender + Role + Pinned badge */}
      <div className="flex items-center gap-1.5 mb-1 px-1">
        <span className="text-xs font-semibold text-gray-700">{senderLabel}</span>
        {roleBadge}
        {message.pinned && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-pink-600">
            <Pin className="w-3 h-3" fill="currentColor" /> Pinned
          </span>
        )}
      </div>

      {/* Reply preview header */}
      {replyObj && (
        <div className={`flex flex-col mb-1 max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-1 text-[11px] text-gray-400 mb-0.5 px-1">
            <Reply className="w-3 h-3 flex-shrink-0" />
            <span>
              {isMine ? 'You' : senderLabel} replied to {replyObj.senderName || 'a message'}
            </span>
          </div>
          {replyObj.mediaType ? (
            <button
              type="button"
              onClick={() => onJumpToMessage(replyObj.id)}
              className="w-16 h-16 rounded-xl overflow-hidden border border-pink-100 opacity-75 hover:opacity-100 transition-opacity"
            >
              {replyObj.mediaType === 'video' ? (
                <video src={replyObj.mediaUrl} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={replyObj.mediaUrl} alt="" className="w-full h-full object-cover" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onJumpToMessage(replyObj.id)}
              className="px-3 py-1.5 text-xs text-gray-600 bg-pink-50/90 border border-pink-100 rounded-xl truncate max-w-full hover:bg-pink-100 transition-colors text-left"
            >
              {replyObj.snippet}
            </button>
          )}
        </div>
      )}

      {/* Message Content + Hover Actions */}
      <div className={`group flex items-center gap-1.5 max-w-[88%] sm:max-w-[78%] ${isMine ? 'flex-row-reverse' : ''}`}>
        <div
          id={`msg-${message.id}`}
          className={`min-w-0 max-w-full transition-shadow ${
            isHighlighted ? 'ring-2 ring-pink-400 rounded-2xl' : ''
          }`}
        >
          {message.type === 'image' && (
            <button
              type="button"
              onClick={() => onOpenMedia(message.id)}
              className="block rounded-2xl overflow-hidden border border-pink-100 bg-pink-50 text-left shadow-sm"
            >
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Shared image'}
                className="block w-auto max-w-full h-auto max-h-72 object-contain"
              />
              {message.text && (
                <p className="text-xs text-gray-700 bg-white px-3 py-2 border-t border-pink-50">
                  {message.text}
                </p>
              )}
            </button>
          )}

          {message.type === 'video' && (
            <button
              type="button"
              onClick={() => onOpenMedia(message.id)}
              className="block rounded-2xl overflow-hidden border border-pink-100 bg-black text-left shadow-sm"
            >
              <div className="relative inline-block">
                <video
                  src={message.fileUrl}
                  className="block w-auto h-auto max-w-full max-h-72"
                  muted
                  playsInline
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Play className="w-8 h-8 text-white" fill="white" />
                </div>
                {message.duration && (
                  <span className="absolute bottom-1.5 right-1.5 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                    {formatDuration(message.duration)}
                  </span>
                )}
              </div>
              {message.text && (
                <p className="text-xs text-gray-700 bg-white px-3 py-2">{message.text}</p>
              )}
            </button>
          )}

          {(message.type === 'file' || message.type === 'document' || message.type === 'audio') && (
            <button
              type="button"
              onClick={() => handleDownloadMedia(message)}
              disabled={!message.fileUrl}
              className="flex items-center gap-3 rounded-xl border border-pink-100 bg-white px-3.5 py-2.5 w-64 text-left shadow-sm hover:bg-pink-50/60 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-pink-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{message.fileName || 'Attachment'}</p>
                <p className="text-xs text-gray-500">{formatFileSize(message.fileSize)}</p>
              </div>
              <Download className="w-4 h-4 text-pink-500 flex-shrink-0" />
            </button>
          )}

          {message.type === 'text' && (
            <div>
              <div
                className={`px-4 py-2.5 rounded-2xl text-[15px] ${
                  isMine
                    ? 'bg-rose-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border border-pink-100'
                } ${message.failed ? 'ring-2 ring-red-400' : ''}`}
              >
                <div className="whitespace-pre-wrap break-words">
                  <ChatMessageContent
                    text={message.text}
                    messageId={message.id}
                    conversationId={conversationId}
                  />
                </div>
                <p
                  className={`text-xs mt-1 ${
                    isMine ? 'text-white/85 text-right' : 'text-gray-500'
                  }`}
                >
                  {message.pending
                    ? 'Sending…'
                    : message.failed
                    ? 'Failed'
                    : formatTime(message.createdAt)}
                </p>
              </div>

              {linkInfo && firstUrl && (
                <div
                  className={`mt-1.5 rounded-xl border p-2.5 text-xs bg-white text-gray-700 shadow-sm border-pink-100 max-w-xs ${
                    isMine ? 'ml-auto' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 font-semibold text-pink-600">
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{linkInfo.label}</span>
                  </div>
                  <p className="text-gray-500 truncate mb-1" title={firstUrl}>
                    {formatReadableUrl(firstUrl)}
                  </p>
                  <a
                    href={firstUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-pink-500 font-medium hover:underline inline-flex items-center gap-0.5"
                  >
                    Open Link <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {message.type !== 'text' && (
            <p
              className={`text-[11px] text-gray-400 mt-1 px-1 ${
                isMine ? 'text-right' : 'text-left'
              }`}
            >
              {formatTime(message.createdAt)}
            </p>
          )}
        </div>

        {/* Hover Reply + Pin actions */}
        <div className="self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
          <button
            type="button"
            onClick={() => onStartReply(message, senderLabel)}
            title="Reply"
            aria-label="Reply"
            className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onTogglePin(message.id)}
            title={message.pinned ? 'Unpin' : 'Pin'}
            aria-label={message.pinned ? 'Unpin message' : 'Pin message'}
            className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
          >
            <Pin className="w-3.5 h-3.5" fill={message.pinned ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function RichChatComposer({
  inputText,
  setInputText,
  onSendText,
  onSendLike,
  disabled = false,
  sending = false,
  placeholder = 'Type a message…',
  inputAriaLabel = 'Message customer',
  sendAriaLabel = 'Send',
  errorText = '',
  controller,
}) {
  const {
    replyingTo,
    setReplyingTo,
    pendingAttachments,
    fileInputRef,
    textInputRef,
    handleAttachClick,
    removePendingAttachment,
    handleFileChange,
    uploadError,
  } = controller;

  const combinedError = errorText || uploadError;

  return (
    <div className="flex-shrink-0 border-t border-pink-100 bg-white px-4 py-3">
      {combinedError && (
        <p className="text-xs text-red-600 mb-2" role="alert">
          {combinedError}
        </p>
      )}

      {replyingTo && (
        <div className="w-full flex items-center gap-2 px-1 pb-2">
          <Reply className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
          <span className="flex-1 text-xs text-gray-500 truncate">
            Replying to <strong className="text-gray-700">{replyingTo.senderName}</strong>:{' '}
            <span className="text-gray-700">{replyingTo.snippet}</span>
          </span>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            aria-label="Cancel reply"
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {pendingAttachments.length > 0 && (
        <div className="w-full flex items-center gap-2 px-1 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={handleAttachClick}
            aria-label="Upload another file"
            title="Upload another file"
            className="w-14 h-14 flex-shrink-0 rounded-xl border border-pink-100 bg-pink-50 hover:bg-pink-100 transition-colors flex items-center justify-center text-pink-500"
          >
            <Plus className="w-5 h-5" />
          </button>
          {pendingAttachments.map((att) => (
            <div
              key={att.id}
              className={`relative flex-shrink-0 rounded-xl overflow-hidden border border-pink-100 bg-pink-50 ${
                att.kind === 'file' ? 'w-32 h-14' : 'w-14 h-14'
              }`}
            >
              {att.kind === 'image' && (
                <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
              )}
              {att.kind === 'video' && (
                <>
                  <video src={att.fileUrl} className="w-full h-full object-cover" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-4 h-4 text-white" fill="white" />
                  </div>
                </>
              )}
              {att.kind === 'file' && (
                <div className="w-full h-full flex items-center gap-2 px-2">
                  <FileText className="w-5 h-5 text-pink-500 flex-shrink-0" />
                  <p className="text-[11px] leading-tight text-gray-700 line-clamp-2 break-all">
                    {att.fileName}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => removePendingAttachment(att.id)}
                aria-label="Remove attachment"
                title="Remove attachment"
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={disabled}
          aria-label="Attach a photo, video, or file"
          title="Attach a photo, video, or file"
          className="h-10 px-3 rounded-xl border border-pink-100 bg-pink-50/60 hover:bg-pink-100 text-pink-600 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40 flex-shrink-0"
        >
          <ImageIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Attach</span>
        </button>

        <input
          ref={textInputRef}
          type="text"
          value={inputText}
          maxLength={4000}
          onChange={(event) => setInputText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSendText();
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={inputAriaLabel}
          className="min-w-0 flex-1 px-4 py-2.5 rounded-xl bg-pink-50/70 border border-pink-100 text-[15px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 disabled:opacity-60"
        />

        <button
          type="button"
          onClick={onSendLike}
          disabled={disabled || sending}
          aria-label="Send a quick like"
          title="Send a quick like"
          className="w-10 h-10 shrink-0 rounded-xl border border-pink-100 text-pink-500 hover:bg-pink-50 flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onSendText}
          disabled={(!inputText.trim() && pendingAttachments.length === 0) || sending || disabled}
          aria-label={sendAriaLabel}
          className="h-10 px-3.5 shrink-0 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          <span className="hidden sm:inline">Send</span>
        </button>
      </div>
    </div>
  );
}

export function RichChatDetailsPanel({
  controller,
  title,
  subtitle,
  avatarType = 'user', // 'user' | 'group' | 'cake'
  extraActions = null,
}) {
  const {
    showInfo,
    setShowInfo,
    infoView,
    setInfoView,
    mediaTab,
    setMediaTab,
    pinnedMessages,
    mediaMessages,
    fileMessages,
    linkMessages,
    enrichedMessages,
    chatSearchQuery,
    setChatSearchQuery,
    chatSearchSubmittedQuery,
    setChatSearchSubmittedQuery,
    handleInfoBack,
    jumpToMessage,
    setMediaModalIndex,
    setShowPinnedModal,
  } = controller;

  if (!showInfo) return null;

  const isSubmittedMatch =
    chatSearchSubmittedQuery !== '' && chatSearchSubmittedQuery === chatSearchQuery.trim();
  const searchResults = chatSearchSubmittedQuery
    ? enrichedMessages.filter(
        (m) =>
          typeof m.text === 'string' &&
          m.text.toLowerCase().includes(chatSearchSubmittedQuery.toLowerCase())
      )
    : [];

  function highlightMatch(text, query) {
    if (!query || typeof text !== 'string') return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-pink-600 font-semibold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  }

  return (
    <div className="w-80 flex-shrink-0 bg-white rounded-2xl border border-pink-100 shadow-sm flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-pink-100">
        <div className="flex items-center gap-2 min-w-0">
          {infoView !== 'home' && (
            <button
              type="button"
              onClick={handleInfoBack}
              aria-label="Back"
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-pink-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="font-semibold text-gray-900 truncate text-sm">
            {infoView === 'home' && 'Chat Details'}
            {infoView === 'media' && 'Media, files and links'}
            {infoView === 'search' && 'Search in chat'}
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setShowInfo(false)}
          aria-label="Close details"
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-pink-50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {infoView === 'home' && (
          <CustomScrollbar className="h-full">
            <div className="flex flex-col items-center pt-6 pb-5 px-4 text-center border-b border-pink-50">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 text-white flex items-center justify-center shadow-sm">
                {avatarType === 'group' ? (
                  <Users className="w-10 h-10" />
                ) : avatarType === 'cake' ? (
                  <Cake className="w-10 h-10" />
                ) : (
                  <User className="w-10 h-10" />
                )}
              </div>
              <p className="font-bold text-gray-900 mt-3 text-base truncate max-w-full">{title}</p>
              <p className="text-xs text-gray-500 mt-0.5 truncate max-w-full">{subtitle}</p>

              <button
                type="button"
                onClick={() => setInfoView('search')}
                aria-label="Search in conversation"
                className="flex flex-col items-center gap-1 mt-4"
              >
                <span className="w-9 h-9 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 hover:bg-pink-100 transition-colors">
                  <Search className="w-4 h-4" />
                </span>
                <span className="text-xs text-gray-600">Search</span>
              </button>

              {extraActions && <div className="mt-3 w-full">{extraActions}</div>}
            </div>

            <button
              type="button"
              onClick={() => setShowPinnedModal(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-pink-50/60 transition-colors text-left border-b border-pink-50"
            >
              <Pin className="w-4 h-4 text-pink-500" />
              <span className="flex-1 text-sm text-gray-800">Pinned messages</span>
              {pinnedMessages.length > 0 && (
                <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-0.5 rounded-full">
                  {pinnedMessages.length}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={() => setInfoView('media')}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-pink-50/60 transition-colors text-left"
            >
              <ImageIcon className="w-4 h-4 text-pink-500" />
              <span className="flex-1 text-sm text-gray-800">Media, files and links</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </CustomScrollbar>
        )}

        {infoView === 'media' && (
          <div className="h-full flex flex-col">
            <div className="flex-shrink-0 flex px-2 border-b border-pink-50">
              {[
                { key: 'media', label: `Media (${mediaMessages.length})` },
                { key: 'files', label: `Files (${fileMessages.length})` },
                { key: 'links', label: `Links (${linkMessages.length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setMediaTab(t.key)}
                  className={`flex-1 text-xs py-2.5 font-semibold border-b-2 transition-colors ${
                    mediaTab === t.key
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <CustomScrollbar className="flex-1" contentClassName="p-3">
              {mediaTab === 'media' &&
                (mediaMessages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">
                    No photos or videos shared yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {mediaMessages.map((m, idx) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMediaModalIndex(idx)}
                        className="relative rounded-lg overflow-hidden border border-pink-100 aspect-square bg-pink-50"
                      >
                        {m.type === 'video' ? (
                          <>
                            <video
                              src={m.fileUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                              <Play className="w-5 h-5 text-white" fill="white" />
                            </div>
                          </>
                        ) : (
                          <img
                            src={m.fileUrl}
                            alt={m.fileName || 'Shared image'}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                ))}

              {mediaTab === 'files' &&
                (fileMessages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No files shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {fileMessages.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => jumpToMessage(m.id)}
                        className="w-full flex items-center gap-3 rounded-xl border border-pink-100 px-3 py-2.5 hover:bg-pink-50/60 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-pink-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{m.fileName}</p>
                          <p className="text-[11px] text-gray-500">{formatFileSize(m.fileSize)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}

              {mediaTab === 'links' &&
                (linkMessages.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No links shared yet.</p>
                ) : (
                  <div className="space-y-2">
                    {linkMessages.map((l) => (
                      <a
                        key={l.id}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center gap-3 rounded-xl border border-pink-100 px-3 py-2.5 hover:bg-pink-50/60 transition-colors"
                      >
                        <div className="w-9 h-9 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0">
                          <Link2 className="w-4 h-4 text-pink-500" />
                        </div>
                        <span className="text-xs text-gray-800 truncate">{l.url}</span>
                      </a>
                    ))}
                  </div>
                ))}
            </CustomScrollbar>
          </div>
        )}

        {infoView === 'search' && (
          <div className="h-full flex flex-col">
            <div className="p-3 border-b border-pink-50">
              <div className="relative">
                <Search className="w-4 h-4 text-pink-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const trimmed = chatSearchQuery.trim();
                      if (trimmed) setChatSearchSubmittedQuery(trimmed);
                    }
                  }}
                  placeholder="Search in conversation"
                  className="w-full pl-9 pr-8 py-2 rounded-full bg-pink-50 border border-pink-100 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                />
                {chatSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setChatSearchQuery('');
                      setChatSearchSubmittedQuery('');
                    }}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {chatSearchQuery.trim() && !isSubmittedMatch && (
                <p className="text-[11px] text-gray-400 text-center mt-2">
                  Press "Enter" to search.
                </p>
              )}
            </div>

            <CustomScrollbar className="flex-1">
              {isSubmittedMatch &&
                (searchResults.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No messages found.</p>
                ) : (
                  <div className="divide-y divide-pink-50">
                    {searchResults.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => jumpToMessage(m.id)}
                        className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-pink-50/60 transition-colors text-left"
                      >
                        <div className="w-7 h-7 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">
                              {m.sender?.displayName ||
                                (m.senderRole === 'customer' ? 'Customer' : 'Bakery')}
                            </p>
                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                              {getRelativeTime(m.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 truncate mt-0.5">
                            {highlightMatch(m.text, chatSearchSubmittedQuery)}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
            </CustomScrollbar>
          </div>
        )}
      </div>
    </div>
  );
}

export function RichChatModals({ controller }) {
  const {
    mediaModalIndex,
    setMediaModalIndex,
    mediaMessages,
    showPinnedModal,
    setShowPinnedModal,
    pinnedMessages,
    showPermissionModal,
    setShowPermissionModal,
    handleGrantPermission,
    jumpToMessage,
  } = controller;

  const currentMedia = mediaModalIndex !== null ? mediaMessages[mediaModalIndex] : null;

  return (
    <>
      {/* Full-Screen Media Viewer Modal */}
      {currentMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setMediaModalIndex(null)}
        >
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadMedia(currentMedia);
              }}
              aria-label="Download"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMediaModalIndex(null);
              }}
              aria-label="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {mediaMessages.length > 1 && mediaModalIndex > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMediaModalIndex((i) => Math.max(0, i - 1));
              }}
              aria-label="Previous media"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {mediaMessages.length > 1 && mediaModalIndex < mediaMessages.length - 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMediaModalIndex((i) => Math.min(mediaMessages.length - 1, i + 1));
              }}
              aria-label="Next media"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center z-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center max-w-[90vw] max-h-[75vh]"
          >
            {currentMedia.type === 'video' ? (
              <video
                key={currentMedia.id}
                src={currentMedia.fileUrl}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[75vh] object-contain"
              />
            ) : (
              <img
                src={currentMedia.fileUrl}
                alt={currentMedia.fileName || 'Shared image'}
                className="max-w-[90vw] max-h-[75vh] object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* Pinned Messages Modal */}
      {showPinnedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowPinnedModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pinned messages"
            onClick={(e) => e.stopPropagation()}
            className="w-[520px] max-w-full max-h-[560px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-pink-100">
              <h2 className="font-semibold text-gray-900">Pinned messages</h2>
              <button
                type="button"
                onClick={() => setShowPinnedModal(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-pink-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <CustomScrollbar className="flex-1" contentClassName="p-4">
              {pinnedMessages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No pinned messages yet.</p>
              ) : (
                <div className="divide-y divide-pink-100">
                  {pinnedMessages.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setShowPinnedModal(false);
                        jumpToMessage(m.id);
                      }}
                      className="w-full flex items-start gap-3 py-3 text-left hover:bg-pink-50/40 rounded-xl px-2 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center flex-shrink-0">
                        <Pin className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-gray-900">
                            {m.sender?.displayName ||
                              (m.senderRole === 'customer' ? 'Customer' : 'Bakery')}
                          </p>
                          <span className="text-[11px] text-gray-400">
                            {formatTime(m.pinnedAt || m.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 bg-pink-50/80 border border-pink-100 rounded-xl px-3 py-2 break-words">
                          {getSnippet(m)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CustomScrollbar>
          </div>
        </div>
      )}

      {/* Attachment Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bakery-attachment-permission-title"
            className="w-full max-w-sm rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  id="bakery-attachment-permission-title"
                  className="font-bold text-base text-gray-900 leading-tight"
                >
                  Allow Attachment Access?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">CakeNMake Bakery Chat</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              CakeNMake needs your permission to access your files, photos, and videos to attach cake progress photos, references, and documents in chat.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleGrantPermission('permanent')}
                className="w-full py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                Allow Everytime
              </button>
              <button
                type="button"
                onClick={() => handleGrantPermission('one-time')}
                className="w-full py-2.5 px-4 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold transition-colors"
              >
                Allow Once
              </button>
              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="w-full py-2 px-4 rounded-xl text-gray-500 hover:bg-gray-100 text-xs font-medium transition-colors"
              >
                Don't Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
