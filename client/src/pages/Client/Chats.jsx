import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
} from 'lucide-react';

import ClientNavbar from '@/components/client/ClientNavbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChat } from '@/hooks/useChat';
import { sanitizeFileName, hasBlockedExtension, BLOCKED_EXTENSIONS } from '@/lib/file-validation';

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB - audio & documents (no separate limit was specified for these)
const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION = 10 * 60; // 10 minutes, in seconds
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'mkv', 'avi', 'flv', 'webm'];
const AUDIO_EXTENSIONS = ['wav', 'mp3', 'm4a', 'ogg'];
const DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt'];

function getFileExtension(filename) {
  if (typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase().trim() : '';
}

function isSafeLinkUrl(rawUrl) {
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

function sanitizeInputText(raw) {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .trim();
}

// Returns 'image' | 'video' | 'audio' | 'document' | null (null = unsupported)
function getFileKind(file) {
  if (!file || typeof file.name !== 'string') return null;
  if (hasBlockedExtension(file.name)) return null;
  const ext = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase().trim();
  if (IMAGE_EXTENSIONS.includes(ext) && ['image/png', 'image/jpeg', 'image/webp'].includes(mime)) return 'image';
  if (VIDEO_EXTENSIONS.includes(ext) && [
    'video/mp4', 'video/quicktime', 'video/x-matroska', 'video/x-msvideo', 'video/x-flv', 'video/webm',
  ].includes(mime)) return 'video';
  if (AUDIO_EXTENSIONS.includes(ext) && [
    'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/ogg',
  ].includes(mime)) return 'audio';
  if (DOCUMENT_EXTENSIONS.includes(ext) && [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ].includes(mime)) return 'document';
  return null;
}

const BAKERY_NAME = 'AH TINAPS BAKESHOP';

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds) {
  if (!seconds || !isFinite(seconds)) return '';
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function nowTime() {
  return formatTime(new Date());
}

// Used for both the "Active Xm ago" status and search-result timestamps.
// Now goes past days into weeks, since older search results need that range.
function getRelativeTime(date) {
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

function getSnippet(m) {
  if (m.type === 'text') return m.text;
  if (m.type === 'image') return m.text || 'Photo';
  if (m.type === 'file') return m.fileName;
  if (m.type === 'like') return '👍';
  return '';
}

// A small inline illustration so the seeded "design preview" bubble doesn't
// depend on loading an external image.
function CakeIllustration() {
  return (
    <svg viewBox="0 0 240 160" className="w-full h-full">
      <rect width="240" height="160" fill="#FDF2F8" />
      <ellipse cx="120" cy="128" rx="78" ry="10" fill="#FBCFE8" />
      <rect x="70" y="90" width="100" height="38" rx="6" fill="#FB7185" />
      <rect x="80" y="62" width="80" height="32" rx="6" fill="#FDA4AF" />
      <rect x="92" y="40" width="56" height="26" rx="5" fill="#FECDD3" />
      <rect x="68" y="86" width="104" height="6" fill="#FFF1F2" opacity="0.7" />
      <rect x="78" y="58" width="84" height="6" fill="#FFF1F2" opacity="0.7" />
      <line x1="120" y1="40" x2="120" y2="24" stroke="#F97316" strokeWidth="3" />
      <path d="M120 24 Q124 18 120 12 Q116 18 120 24" fill="#FB923C" />
      <line x1="100" y1="40" x2="100" y2="26" stroke="#F97316" strokeWidth="3" />
      <path d="M100 26 Q104 20 100 14 Q96 20 100 26" fill="#FB923C" />
      <line x1="140" y1="40" x2="140" y2="26" stroke="#F97316" strokeWidth="3" />
      <path d="M140 26 Q144 20 140 14 Q136 20 140 26" fill="#FB923C" />
      <circle cx="92" cy="100" r="4" fill="#FFF1F2" />
      <circle cx="148" cy="100" r="4" fill="#FFF1F2" />
      <circle cx="120" cy="110" r="4" fill="#FFF1F2" />
    </svg>
  );
}

// Reusable scrollbar matching the Messages panel's custom track + thumb design.
// Wrap any vertical scrollable content with this instead of the browser's native scrollbar.
function CustomScrollbar({ className = '', contentClassName = '', children }) {
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const dragStateRef = useRef(null);
  const justDraggedRef = useRef(false);
  const [thumbMetrics, setThumbMetrics] = useState({ top: 0, height: 0, visible: false });

  function getTrackMetrics(el) {
    const trackHeight = el.clientHeight - 40;
    const thumbHeight = Math.max(24, (el.clientHeight / el.scrollHeight) * trackHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    return { thumbHeight, maxThumbTop, maxScroll };
  }

  function updateThumbMetrics() {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    let next;
    // Only show the scrollbar at all once there's genuinely more content than visible space.
    if (scrollHeight - clientHeight <= 1) {
      next = { top: 0, height: 0, visible: false };
    } else {
      const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
      const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
      next = { top: thumbTop, height: thumbHeight, visible: true };
    }
    // Bail out (return the same object) when nothing actually changed.
    // Without this, useLayoutEffect re-runs after every render it itself
    // triggers, which is what caused the infinite update loop.
    setThumbMetrics((prev) => {
      const sameVisible = prev.visible === next.visible;
      const sameTop = Math.abs(prev.top - next.top) < 0.5;
      const sameHeight = Math.abs(prev.height - next.height) < 0.5;
      if (sameVisible && sameTop && sameHeight) return prev;
      return next;
    });
  }

  function scrollUp() {
    scrollRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
  }
  function scrollDown() {
    scrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  }

  function handleTrackClick(e) {
    if (justDraggedRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
    const desiredThumbTop = Math.min(maxThumbTop, Math.max(0, clickY - thumbHeight / 2));
    const scrollRatio = maxThumbTop > 0 ? desiredThumbTop / maxThumbTop : 0;
    el.scrollTo({ top: scrollRatio * maxScroll, behavior: 'smooth' });
  }

  function handleThumbMouseDown(e) {
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    dragStateRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    window.addEventListener('mousemove', handleThumbMouseMove);
    window.addEventListener('mouseup', handleThumbMouseUp);
  }

  function handleThumbMouseMove(e) {
    const el = scrollRef.current;
    const drag = dragStateRef.current;
    if (!el || !drag) return;
    const { maxThumbTop, maxScroll } = getTrackMetrics(el);
    if (maxThumbTop <= 0) return;
    const deltaScroll = ((e.clientY - drag.startY) / maxThumbTop) * maxScroll;
    el.scrollTop = Math.min(maxScroll, Math.max(0, drag.startScrollTop + deltaScroll));
    updateThumbMetrics();
  }

  function handleThumbMouseUp() {
    dragStateRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 0);
    window.removeEventListener('mousemove', handleThumbMouseMove);
    window.removeEventListener('mouseup', handleThumbMouseUp);
  }

  // Runs after every render, so metrics never go stale regardless of what changed.
  useLayoutEffect(() => {
    updateThumbMetrics();
  });

  useEffect(() => {
    window.addEventListener('resize', updateThumbMetrics);
    const ro = new ResizeObserver(updateThumbMetrics);
    if (scrollRef.current) ro.observe(scrollRef.current);
    if (contentRef.current) ro.observe(contentRef.current);
    return () => {
      window.removeEventListener('resize', updateThumbMetrics);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`relative min-h-0 ${className}`}>
      {thumbMetrics.visible && (
        <div className="cn-custom-scrollbar hidden md:flex absolute top-0 right-0 h-full w-5 flex-col z-10">
          <button
            onClick={scrollUp}
            aria-label="Scroll up"
            title="Scroll up"
            className="h-5 flex-shrink-0 flex items-center justify-center text-pink-300 hover:text-pink-400 text-[10px] leading-none transition-colors cursor-default"
          >
            ▲
          </button>
          <div onClick={handleTrackClick} className="relative flex-1 cursor-default">
            <div
              onMouseDown={handleThumbMouseDown}
              onClick={(e) => e.stopPropagation()}
              className="absolute left-1/2 -translate-x-1/2 w-2.5 bg-pink-300 hover:bg-pink-400 rounded-full transition-colors cursor-default"
              style={{ top: thumbMetrics.top, height: thumbMetrics.height }}
            />
          </div>
          <button
            onClick={scrollDown}
            aria-label="Scroll down"
            title="Scroll down"
            className="h-5 flex-shrink-0 flex items-center justify-center text-pink-300 hover:text-pink-400 text-[10px] leading-none transition-colors cursor-default"
          >
            ▼
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={updateThumbMetrics}
        className={`h-full overflow-y-auto ${thumbMetrics.visible ? 'md:pr-6' : ''} [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}
      >
        <div ref={contentRef} className={contentClassName}>{children}</div>
      </div>
    </div>
  );
}

export default function Chats() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedConversation = searchParams.get('conversation');
  const openedRequest = useRef(null);
  const {
    activeConversation,
    conversations = [],
    setActiveConversationId = () => {},
    error: chatError,
    hasMore,
    loading: chatLoading,
    loadingMessages,
    loadOlder,
    messages,
    sendMessage,
    setMessages,
    restricted,
  } = useChat({ autoCreate: true, initialConversationId: requestedConversation });

  useEffect(() => {
    if (
      requestedConversation &&
      openedRequest.current !== requestedConversation &&
      conversations.some((item) => item.id === requestedConversation)
    ) {
      setActiveConversationId(requestedConversation);
      openedRequest.current = requestedConversation;
    }
  }, [requestedConversation, conversations, setActiveConversationId]);
  const [inputText, setInputText] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [infoView, setInfoView] = useState('home'); // 'home' | 'pinned' | 'media'
  const [mediaTab, setMediaTab] = useState('media'); // 'media' | 'files' | 'links'
  const [highlightId, setHighlightId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null); // { id, sender, snippet }
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmittedQuery, setSearchSubmittedQuery] = useState('');
  const [mediaModalIndex, setMediaModalIndex] = useState(null);
  const [showPinnedModal, setShowPinnedModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [sessionAttachmentPerm, setSessionAttachmentPerm] = useState(false);
  const activeThumbRef = useRef(null);
  const mediaStripRef = useRef(null);
  const stripDragRef = useRef(null);
  const [stripThumb, setStripThumb] = useState({ leftPct: 0, widthPct: 0, visible: false });

  function updateStripThumb() {
    const el = mediaStripRef.current;
    if (!el) return;
    const { scrollWidth, clientWidth, scrollLeft } = el;
    let next;
    if (scrollWidth - clientWidth <= 1) {
      next = { leftPct: 0, widthPct: 0, visible: false };
    } else {
      const widthPct = Math.max(8, (clientWidth / scrollWidth) * 100);
      const maxLeftPct = 100 - widthPct;
      const maxScroll = scrollWidth - clientWidth;
      const leftPct = maxScroll > 0 ? (scrollLeft / maxScroll) * maxLeftPct : 0;
      next = { leftPct, widthPct, visible: true };
    }
    setStripThumb((prev) => {
      const same = prev.visible === next.visible && Math.abs(prev.leftPct - next.leftPct) < 0.2 && Math.abs(prev.widthPct - next.widthPct) < 0.2;
      return same ? prev : next;
    });
  }

  function handleStripTrackClick(e) {
    const el = mediaStripRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
    const maxLeftPct = 100 - stripThumb.widthPct;
    const targetLeftPct = Math.min(maxLeftPct, Math.max(0, clickPct - stripThumb.widthPct / 2));
    const maxScroll = el.scrollWidth - el.clientWidth;
    const ratio = maxLeftPct > 0 ? targetLeftPct / maxLeftPct : 0;
    el.scrollTo({ left: ratio * maxScroll, behavior: 'smooth' });
  }

  function handleStripThumbMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = mediaStripRef.current;
    if (!el) return;
    const trackWidth = e.currentTarget.parentElement.getBoundingClientRect().width;
    stripDragRef.current = { startX: e.clientX, startScrollLeft: el.scrollLeft, trackWidth };
    window.addEventListener('mousemove', handleStripThumbMouseMove);
    window.addEventListener('mouseup', handleStripThumbMouseUp);
  }

  function handleStripThumbMouseMove(e) {
    const el = mediaStripRef.current;
    const drag = stripDragRef.current;
    if (!el || !drag) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const deltaPct = ((e.clientX - drag.startX) / drag.trackWidth) * 100;
    el.scrollLeft = Math.min(maxScroll, Math.max(0, drag.startScrollLeft + (deltaPct / 100) * maxScroll));
    updateStripThumb();
  }

  const [isOnline] = useState(true);
  const [lastActiveAt] = useState(new Date(Date.now() - 5 * 60000));
  const [statusText, setStatusText] = useState('Active now');

  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const textInputRef = useRef(null);
  const dragCounterRef = useRef(0);
  const pendingIdRef = useRef(1);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [thumbMetrics, setThumbMetrics] = useState({ top: 0, height: 0, visible: false });
  const dragStateRef = useRef(null);
  const justDraggedRef = useRef(false);

  function scrollMessagesUp() {
    messagesScrollRef.current?.scrollBy({ top: -150, behavior: 'smooth' });
  }

  function scrollMessagesDown() {
    messagesScrollRef.current?.scrollBy({ top: 150, behavior: 'smooth' });
  }

  function getTrackMetrics(el) {
    const trackHeight = el.clientHeight - 40; // reserve 20px for each arrow
    const thumbHeight = Math.max(24, (el.clientHeight / el.scrollHeight) * trackHeight);
    const maxThumbTop = Math.max(0, trackHeight - thumbHeight);
    const maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
    return { thumbHeight, maxThumbTop, maxScroll };
  }

  function updateThumbMetrics() {
    const el = messagesScrollRef.current;
    if (!el) return;
    const { scrollHeight, clientHeight, scrollTop } = el;
    if (scrollHeight <= clientHeight) {
      setThumbMetrics({ top: 0, height: 0, visible: false });
      return;
    }
    const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
    const thumbTop = maxScroll > 0 ? (scrollTop / maxScroll) * maxThumbTop : 0;
    setThumbMetrics({ top: thumbTop, height: thumbHeight, visible: true });
  }

  // Click on empty track: jump straight to that position
  function handleTrackClick(e) {
    if (justDraggedRef.current) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const { thumbHeight, maxThumbTop, maxScroll } = getTrackMetrics(el);
    const desiredThumbTop = Math.min(maxThumbTop, Math.max(0, clickY - thumbHeight / 2));
    const scrollRatio = maxThumbTop > 0 ? desiredThumbTop / maxThumbTop : 0;
    el.scrollTo({ top: scrollRatio * maxScroll, behavior: 'smooth' });
  }

  // Drag the thumb: follow the mouse while the button is held
  function handleThumbMouseDown(e) {
    e.preventDefault();
    const el = messagesScrollRef.current;
    if (!el) return;
    dragStateRef.current = { startY: e.clientY, startScrollTop: el.scrollTop };
    window.addEventListener('mousemove', handleThumbMouseMove);
    window.addEventListener('mouseup', handleThumbMouseUp);
  }

  function handleThumbMouseMove(e) {
    const el = messagesScrollRef.current;
    const drag = dragStateRef.current;
    if (!el || !drag) return;
    const { maxThumbTop, maxScroll } = getTrackMetrics(el);
    if (maxThumbTop <= 0) return;
    const deltaScroll = ((e.clientY - drag.startY) / maxThumbTop) * maxScroll;
    el.scrollTop = Math.min(maxScroll, Math.max(0, drag.startScrollTop + deltaScroll));
    updateThumbMetrics();
  }

  function handleThumbMouseUp() {
    dragStateRef.current = null;
    justDraggedRef.current = true;
    setTimeout(() => { justDraggedRef.current = false; }, 0);
    window.removeEventListener('mousemove', handleThumbMouseMove);
    window.removeEventListener('mouseup', handleThumbMouseUp);
  }

  useEffect(() => {
    updateThumbMetrics();
    window.addEventListener('resize', updateThumbMetrics);
    return () => window.removeEventListener('resize', updateThumbMetrics);
  }, []);

  useEffect(() => {
    updateThumbMetrics();
  }, [messages.length, showInfo]);

  useEffect(() => {
    function refreshStatus() {
      setStatusText(isOnline ? 'Active now' : `Active ${getRelativeTime(lastActiveAt)} ago`);
    }
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [isOnline, lastActiveAt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!uploadError) return;
    const t = setTimeout(() => setUploadError(null), 4000);
    return () => clearTimeout(t);
  }, [uploadError]);

  // Keeps the active thumbnail scrolled into view in the media modal's indicator strip.
  // Does nothing (and scrolls nowhere) if every thumbnail already fits on screen.
  useEffect(() => {
    if (mediaModalIndex === null) return;

    const strip = mediaStripRef.current;
    const active = activeThumbRef.current;

    if (!strip || !active) return;

    const target =
      active.offsetLeft
      - strip.clientWidth / 2
      + active.clientWidth / 2;

    strip.scrollTo({
      left: target,
      behavior: "smooth",
    });
  }, [mediaModalIndex]);

  const mediaMessages = messages.filter((m) => m.type === 'image' || m.type === 'video');

  useEffect(() => {
    if (mediaModalIndex === null) return;
    updateStripThumb();
    window.addEventListener('resize', updateStripThumb);
    return () => window.removeEventListener('resize', updateStripThumb);
  }, [mediaModalIndex, mediaMessages.length]);

  function checkAttachmentPermission() {
    try {
      const permanent = localStorage.getItem('cakenmake_attachment_permission') === 'permanent';
      if (permanent || sessionAttachmentPerm) return true;
    } catch (e) {}
    return sessionAttachmentPerm;
  }

  function handleGrantPermission(type) {
    if (type === 'permanent') {
      try {
        localStorage.setItem('cakenmake_attachment_permission', 'permanent');
      } catch (e) {}
      setSessionAttachmentPerm(true);
    } else if (type === 'one-time') {
      setSessionAttachmentPerm(true);
    }
    setShowPermissionModal(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  }

  async function handleSendText() {
    if (restricted) { setUploadError('Chatting is restricted. Use Orders & Support.'); return; }
    const text = sanitizeInputText(inputText);
    if (!text && pendingAttachments.length === 0) return;

    const attachmentsToSend = [...pendingAttachments];
    setInputText('');
    setPendingAttachments([]);
    setUploadError(null);

    try {
      if (attachmentsToSend.length > 0) {
        // Create client message entries for each attachment
        const newMsgList = attachmentsToSend.map((att, idx) => ({
          id: `att_${Date.now()}_${idx}`,
          conversationId: activeConversation?.id,
          sender: 'user',
          senderRole: 'customer',
          type: att.kind,
          fileUrl: att.fileUrl,
          fileName: sanitizeFileName(att.fileName),
          fileSize: att.fileSize,
          duration: att.duration,
          text: idx === 0 ? text : '',
          createdAt: new Date(),
          pinned: false,
          replyTo: replyingTo?.id || null,
        }));
        setMessages((prev) => [...prev, ...newMsgList]);
        setReplyingTo(null);

        // Send summary or text to socket so conversation record is updated
        const summary = text || `Shared ${attachmentsToSend.length === 1 ? sanitizeFileName(attachmentsToSend[0].fileName) : `${attachmentsToSend.length} attachments`}`;
        await sendMessage(summary, { replyTo: replyingTo?.id || null }).catch(() => {});
      } else {
        await sendMessage(text, { replyTo: replyingTo?.id || null });
        setReplyingTo(null);
      }
    } catch (error) {
      setInputText(text);
      setUploadError(error.message || 'Your message could not be sent.');
    }
  }

  function handleSendLike() {
    sendMessage('👍').catch((error) => setUploadError(error.message || 'Your message could not be sent.'));
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendText();
    }
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
      if (att) URL.revokeObjectURL(att.fileUrl);
      return prev.filter((a) => a.id !== id);
    });
  }

  // Validates the file and adds it to the staging row above the composer.
  // Nothing gets sent to the conversation until the person hits Send/Enter.
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
      setUploadError(`"${file.name}" isn't a supported file type. Allowed: JPG, PNG, WEBP, MP4, MOV, WAV, MP3, PDF, DOC, DOCX, TXT.`);
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
    const attachment = { id, kind, fileUrl: url, fileName: cleanFileName, fileSize: file.size, duration: null };

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

  function focusComposer() {
    textInputRef.current?.focus();
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
    const files = Array.from(e.dataTransfer.files || []);
    files.forEach(stageFile);
  }

  // Pasting an image/file (e.g. a copied screenshot) stages it the same way as
  // drag-and-drop. Pasted plain text — including URLs — is left alone, since the
  // browser's default paste behavior already drops it into whichever field has focus.
  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0) return;
    const files = [];
    for (let i = 0; i < items.length; i++) {
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

  function togglePin(id) {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const newPinned = !m.pinned;
        return { ...m, pinned: newPinned, pinnedAt: newPinned ? new Date() : m.pinnedAt };
      })
    );
  }

  function startReply(m) {
    setReplyingTo({
      id: m.id,
      sender: m.sender,
      snippet: getSnippet(m),
      mediaType: m.type === 'image' || m.type === 'video' ? m.type : null,
      mediaUrl: m.fileUrl,
      illustration: m.illustration,
    });
  }

  function toggleInfo() {
  setShowInfo(prev => !prev);

    if (!showInfo) {
      setInfoView('home');
    }
  }

  function handleInfoBack() {
    if (infoView === 'home') {
      setShowInfo(false);
    } else {
      if (infoView === 'search') clearSearch();
      setInfoView('home');
    }
  }

  function jumpToMessage(id) {
    setHighlightId(id);
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => setHighlightId(null), 350);
  }

  function openMediaModal(index) {
    setMediaModalIndex(index);
  }

  function closeMediaModal() {
    setMediaModalIndex(null);
  }

  function openMediaModalForMessage(id) {
    const idx = mediaMessages.findIndex((mm) => mm.id === id);
    if (idx !== -1) openMediaModal(idx);
  }

  function showNextMedia() {
  setMediaModalIndex((i) => {
    if (i === null) return null;
    return Math.min(i + 1, mediaMessages.length - 1);
  });
}

  function showPrevMedia() {
  setMediaModalIndex((i) => {
    if (i === null) return null;
    return Math.max(i - 1, 0);
  });
}

  function handleDownloadMedia(m) {
    if (!m.fileUrl) return;
    if (!m.fileUrl.startsWith('blob:') && !isSafeLinkUrl(m.fileUrl)) return;
    const a = document.createElement('a');
    a.href = m.fileUrl;
    a.download = sanitizeFileName(m.fileName || 'file');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function renderTextWithLinks(text) {
    const parts = text.split(URL_REGEX);
    return parts.map((part, i) =>
      URL_REGEX.test(part) && isSafeLinkUrl(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title={part}
          className="cn-chat-inline-link underline hover:opacity-80"
        >
          {formatReadableUrl(part)}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }

  function formatReadableUrl(url) {
    try {
      const parsed = new URL(url);
      const readable = `${parsed.hostname.replace(/^www\./, '')}${parsed.pathname === '/' ? '' : parsed.pathname}`;
      return readable.length > 42 ? `${readable.slice(0, 39)}…` : readable;
    } catch {
      return url.length > 42 ? `${url.slice(0, 39)}…` : url;
    }
  }

  function getMatchingSentence(text, query) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const lower = query.toLowerCase();
    const match = sentences.find((s) => s.toLowerCase().includes(lower));
    return (match || text).trim();
  }

  function truncateSentence(text, maxLen = 60) {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen).trimEnd() + '...';
  }

  function formatPinnedDate(date) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function getReplyLabel(m) {
    const replierName = m.sender === 'user' ? 'You' : BAKERY_NAME;
    const originalName = m.replyTo.sender === 'user' ? 'You' : BAKERY_NAME;
    if (m.sender === m.replyTo.sender) {
      return m.sender === 'user' ? 'You replied to yourself' : `${BAKERY_NAME} replied to themselves`;
    }
    return `${replierName} replied to ${originalName}`;
  }

  function getLinkInfo(url) {
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
      { domains: ['twitter.com', 'x.com'], label: 'X (Twitter)', color: 'bg-gray-50 border-gray-200 text-gray-700' },
      { domains: ['tiktok.com'], label: 'TikTok', color: 'bg-gray-50 border-gray-200 text-gray-900' },
      { domains: ['pinterest.com', 'pin.it'], label: 'Pinterest', color: 'bg-red-50 border-red-100 text-red-600' },
      { domains: ['github.com'], label: 'GitHub', color: 'bg-gray-50 border-gray-200 text-gray-800' },
      { domains: ['linkedin.com'], label: 'LinkedIn', color: 'bg-blue-50 border-blue-100 text-blue-700' },
    ];
    const found = platforms.find((p) => p.domains.some((d) => hostname === d || hostname.endsWith(`.${d}`)));
    if (found) return found;
    const fallbackLabel = hostname.split('.')[0] || 'Link';
    return {
      label: fallbackLabel.charAt(0).toUpperCase() + fallbackLabel.slice(1),
      color: 'bg-pink-50 border-pink-100 text-pink-500',
    };
  }

  // Messenger only generates a rich preview for the first link in a message,
  // even if more links follow in the same text — this finds just that one.
  function getFirstUrl(text) {
    const found = text.match(URL_REGEX);
    return found ? found[0] : null;
  }

  // Renders just the message's content (no bubble color/sender chrome) for the Pinned modal.
  function renderPinnedPreview(m) {
    if (m.type === 'image') {
      return (
        <div className="w-full rounded-2xl overflow-hidden bg-pink-50">
          {m.illustration ? (
            <div className="w-full aspect-[3/2]">
              <CakeIllustration />
            </div>
          ) : (
            <img
              src={m.fileUrl}
              alt={m.fileName || 'Shared image'}
              className="block w-full h-auto max-h-72 object-contain"
            />
          )}
        </div>
      );
    }
    if (m.type === 'video') {
      return (
        <div className="relative w-full rounded-2xl overflow-hidden bg-black">
          <video
            src={m.fileUrl}
            className="block w-full h-auto max-h-72 object-contain"
            muted
            playsInline
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="w-7 h-7 text-white" fill="white" />
          </div>
        </div>
      );
    }
    if (m.type === 'file') {
      return (
        <div className="flex items-center gap-3 px-3 py-3 bg-white border border-pink-100 rounded-xl">
          <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{m.fileName}</p>
            <p className="text-xs text-gray-500">{formatFileSize(m.fileSize)}</p>
          </div>
        </div>
      );
    }
    if (m.type === 'text') {
    const url = (m.text.match(URL_REGEX) || [])[0];
    if (url) {
      return (
        <div className="inline-flex items-center gap-3 px-3 py-3 bg-white border border-pink-100 rounded-xl w-full">
          <Link2 className="w-5 h-5 text-pink-500 flex-shrink-0" />
          <span className="text-sm text-gray-800 truncate">{url}</span>
        </div>
      );
    }
    return (
      <p className="inline-block px-3 py-3 text-sm text-gray-800 bg-pink-50 border border-pink-100 rounded-xl w-full">{m.text}</p>
    );
  }
    if (m.type === 'image') {
      return (
        <div className="w-full rounded-2xl overflow-hidden">
          {m.illustration ? (
            <div className="w-full aspect-[3/2] bg-pink-50">
              <CakeIllustration />
            </div>
          ) : (
            <img
              src={m.fileUrl}
              alt={m.fileName || 'Shared image'}
              className="block w-auto max-w-full h-auto max-h-72 object-contain"
            />
          )}
        </div>
      );
    }
    return null;
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-pink-600 font-semibold">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  }

  function formatResultCount(n) {
    if (n > 99) return '99+ results';
    return `${n} ${n === 1 ? 'result' : 'results'}`;
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchSubmittedQuery('');
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = searchQuery.trim();
      if (trimmed) setSearchSubmittedQuery(trimmed);
    }
  }

  const pinnedMessages = messages.filter((m) => m.pinned);
  const fileMessages = messages.filter((m) => m.type === 'file');
  const isSubmittedMatch = searchSubmittedQuery !== '' && searchSubmittedQuery === searchQuery.trim();
  const searchResults = searchSubmittedQuery
    ? messages.filter(
        (m) => m.type === 'text' && m.text.toLowerCase().includes(searchSubmittedQuery.toLowerCase())
      )
    : [];
  const linkMessages = messages.flatMap((m) => {
    if (m.type !== 'text') return [];
    const found = m.text.match(URL_REGEX);
    return found ? found.map((url) => ({ id: `${m.id}-${url}`, url, createdAt: m.createdAt })) : [];
  });

  const decorated = messages.map((m, i) => {
    const prev = messages[i - 1];
    const next = messages[i + 1];
    return {
      ...m,
      isFirstInGroup: !prev || prev.sender !== m.sender,
      isLastInGroup: !next || next.sender !== m.sender,
    };
  });

  return (
    <div className="cn-chat-page h-screen w-full flex bg-pink-50 overflow-hidden">
      <style>{`
        @keyframes jumpBalloon {
          0% { transform: scale(1); }
          40% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .jump-balloon { animation: jumpBalloon 0.6s ease-out; }
      `}</style>
      <ClientNavbar />

      <div className="cn-chat-body flex flex-1 min-w-0 h-screen overflow-hidden p-4">
        <div className="cn-chat-frame flex flex-1 min-w-0 rounded-2xl border border-pink-100 shadow-xl overflow-hidden bg-white">
          {/* Main conversation column */}
          <div
            className="relative flex flex-col flex-1 min-w-0"
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            {/* Top nav: conversation info only */}
            <header className="flex-shrink-0 border-b border-pink-100 bg-white/90 backdrop-blur-sm px-4 sm:px-6 py-3">
              <div className="cn-chat-header-content flex items-center justify-between w-full">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
                      <Cake className="w-6 h-6 text-white" />
                    </div>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="font-bold text-gray-900 leading-tight truncate">
                      {activeConversation?.platform?.name || BAKERY_NAME}
                    </h1>
                    <p className="text-xs text-gray-500 leading-tight">
                      {statusText}
                    </p>
                  </div>
                </div>

                {/* Circular Info Button with expanded clickable area */}
                <button
                  onClick={toggleInfo}
                  className={`cn-chat-info-button p-2.5 sm:px-3 sm:py-2 rounded-full transition-all duration-200 outline-none focus:outline-none flex items-center justify-center gap-2 cursor-pointer ${
                    showInfo 
                      ? 'bg-pink-100 text-pink-600 shadow-md ring-2 ring-pink-200' 
                      : 'text-pink-500 hover:bg-gray-100 hover:text-pink-600 hover:shadow-md hover:ring-4 hover:ring-gray-100'
                  }`}
                  aria-label={showInfo ? "Close chat info" : "Open chat info"}
                  title="Chat info"
                >
                  <Info className="w-5.5 h-5.5 stroke-[2.4]" />
                  <span>Details</span>
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="relative flex-1 min-h-0" onClick={focusComposer}>
              {(chatLoading || (loadingMessages && messages.length === 0)) && (
                <div role="status" aria-label="Loading messages" className="absolute inset-0 z-20 space-y-5 bg-white/90 p-6">
                  <Skeleton className="h-14 w-2/5 rounded-2xl" />
                  <Skeleton className="ml-auto h-16 w-1/2 rounded-2xl" />
                  <Skeleton className="h-12 w-1/3 rounded-2xl" />
                </div>
              )}
              {chatError && <div className="px-4 py-2 text-xs text-red-600 bg-red-50" role="alert">{chatError}</div>}
              {hasMore && (
                <button type="button" onClick={loadOlder} className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-xs bg-white border border-pink-100 rounded-full px-3 py-1 text-pink-600 shadow-sm">Load earlier messages</button>
              )}
              <div className="cn-chat-scrollbar hidden md:flex absolute top-0 right-0 h-full w-4 flex-col z-10">
                <button
                  onClick={scrollMessagesUp}
                  aria-label="Scroll up"
                  title="Scroll up"
                  className="cn-chat-scroll-button h-5 flex-shrink-0 flex items-center justify-center text-[10px] leading-none transition-colors"
                >
                  ▲
                </button>
                <div onClick={handleTrackClick} className="cn-chat-scroll-track relative flex-1 cursor-pointer">
                  {thumbMetrics.visible && (
                    <div
                      onMouseDown={handleThumbMouseDown}
                      onClick={(e) => e.stopPropagation()}
                      className="cn-chat-scroll-thumb absolute left-1/2 -translate-x-1/2 w-1.5 rounded-full transition-colors cursor-grab active:cursor-grabbing"
                      style={{ top: thumbMetrics.top, height: thumbMetrics.height }}
                    />
                  )}
                </div>
                <button
                  onClick={scrollMessagesDown}
                  aria-label="Scroll down"
                  title="Scroll down"
                  className="cn-chat-scroll-button h-5 flex-shrink-0 flex items-center justify-center text-[10px] leading-none transition-colors"
                >
                  ▼
                </button>
              </div>

              <div
                ref={messagesScrollRef}
                onScroll={updateThumbMetrics}
                className="cn-chat-scroll h-full overflow-y-auto pl-3 sm:pl-6 pr-3 sm:pr-9 py-6 bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
              >
              <div className="cn-chat-stream">
              <div className="flex justify-center mb-6">
                <span className="text-xs font-medium text-gray-500 bg-white/70 px-3 py-1 rounded-full">
                  Today
                </span>
              </div>

              <div className="cn-chat-message-list space-y-1 px-2">
                {decorated.map((m) => {
                  const isUser = m.sender === 'user';
                  const isHighlighted = highlightId === m.id;

                  if (m.type === 'like' && !['held', 'rejected'].includes(m.moderation)) {
                    return (
                      <div
                        key={m.id}
                        id={`msg-${m.id}`}
                        className={`cn-chat-like-message group flex self-end mb-2 items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'} ${m.isFirstInGroup ? 'mt-4' : 'mt-1'}`}
                      >
                        {isUser && (
                        <div className="self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startReply(m)}
                              title="Reply"
                              aria-label="Reply"
                              className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => togglePin(m.id)}
                              title={m.pinned ? 'Unpin' : 'Pin'}
                              aria-label={m.pinned ? 'Unpin message' : 'Pin message'}
                              className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
                            >
                              <Pin className="w-3.5 h-3.5" fill={m.pinned ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        )}
                        <div
                          className={`cn-chat-like-bubble w-10 h-10 rounded-full flex items-center justify-center text-pink-500 transition-shadow ${
                            isHighlighted ? 'ring-1 ring-pink-300' : ''
                          }`}
                        >
                          <ThumbsUp className="w-6 h-6" />
                        </div>
                        <span className="cn-chat-like-time">{formatTime(m.createdAt)}</span>
                        {!isUser && (
                          <div className="self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => togglePin(m.id)}
                              title={m.pinned ? 'Unpin' : 'Pin'}
                              aria-label={m.pinned ? 'Unpin message' : 'Pin message'}
                              className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
                            >
                              <Pin className="w-3.5 h-3.5" fill={m.pinned ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={() => startReply(m)}
                              title="Reply"
                              aria-label="Reply"
                              className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50"
                            >
                              <Reply className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.id} className={`cn-chat-message-group ${m.isFirstInGroup ? 'mt-4' : 'mt-1'
                      }
                      `}
                    >
                  {['held', 'rejected'].includes(m.moderation) && <p className="text-xs text-amber-700 text-right">{m.moderation === 'held' ? 'Message held for review' : 'Message filtered after review'}</p>}
                  {/* Reply preview - its own row, above the message row, so it never
                      inflates the height the Pin/Reply buttons center against below */}
                  {m.replyTo && (
                    <div className={`flex mb-1 ${isUser ? 'justify-end' : 'justify-start pl-9'}`}>
                      <div className="max-w-[48%] sm:max-w-md">
                        <div className={`flex items-center gap-1.5 mb-1 text-[11px] text-gray-400 ${isUser ? 'justify-end pr-1' : 'pl-1'}`}>
                          <Reply className="w-3 h-3 flex-shrink-0" />
                          <span>{getReplyLabel(m)}</span>
                        </div>

                        {m.replyTo.mediaType ? (
                          <button
                            type="button"
                            onClick={() => jumpToMessage(m.replyTo.id)}
                            className={`block w-fit max-w-full ${isUser ? 'ml-auto' : ''}`}
                          >
                            <div className="w-20 h-20 rounded-xl overflow-hidden opacity-50 hover:opacity-70 transition-opacity">
                              {m.replyTo.illustration ? (
                                <CakeIllustration />
                              ) : m.replyTo.mediaType === 'video' ? (
                                <video src={m.replyTo.mediaUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                              ) : (
                                <img src={m.replyTo.mediaUrl} alt="" className="w-full h-full object-cover" />
                              )}
                            </div>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => jumpToMessage(m.replyTo.id)}
                            className={`block px-4 py-2 text-xs text-gray-500 bg-pink-50 border border-pink-100 rounded-2xl truncate w-fit max-w-full hover:bg-pink-100 transition-colors text-left ${
                              isUser ? 'ml-auto' : ''
                            }`}
                          >
                            {m.replyTo.snippet}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {/* Wrap both rows in a React Fragment */}
                <>
                  {/* Message Row */}
                  <div className={`cn-chat-message-row flex items-end gap-3 ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                    {/* Avatar placement */}
                    <div className="w-9 h-9 flex-shrink-0">
                      {m.isFirstInGroup && !isUser && (
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center shadow-sm">
                      <Cake className="w-5 h-5 text-white" />
                    </div>
                    )}
                  </div>

                  {/* Bubble Anchor & Action buttons block */}
                  <div className="cn-chat-message-cluster w-full flex flex-col">
                    {/* Pinned Indicator label row */}
                    {m.pinned && (
                      <p className={`cn-chat-pinned-badge ${isUser ? 'self-end' : 'self-start'}`}>
                        <Pin className="w-3 h-3" fill="currentColor" /> Pinned
                      </p>
                    )}

                  {/* Core Bubble Flex Container: Groups bubble-anchor and hover buttons tightly together */}
          <div className={`group flex items-center gap-1.5 ${isUser ? 'flex-row-reverse' : ''}`}>
            
            {/* Bubble Content Wrapper */}
            <div className="cn-chat-bubble-anchor bubble-anchor relative min-w-0 max-w-full">
              {m.type === 'text' && (
                <div className={`relative w-fit max-w-full ${isUser ? 'ml-auto' : ''}`}>
                  <div id={`msg-${m.id}`} className={`px-4 py-2 rounded-2xl text-sm break-words transition-shadow ${
                    isHighlighted ? 'ring-1 ring-pink-300' : ''
                  } ${
                    isUser ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white' : 'bg-white text-gray-800 shadow-sm border border-pink-100'
                  }`}
                  >
                    {renderTextWithLinks(m.text)}
                  </div>

                  {/* Rich link preview */}
                  {(() => {
                    const firstUrl = getFirstUrl(m.text);
                    if (!firstUrl || !isSafeLinkUrl(firstUrl)) return null;
                    const info = getLinkInfo(firstUrl);
                    return (
                      <div className={`cn-chat-link-preview mt-2 rounded-xl border p-2.5 text-xs bg-white text-gray-700 shadow-sm border-pink-100 max-w-xs ${isUser ? 'ml-auto' : ''}`}>
                        <div className="flex items-center gap-1.5 mb-1 font-semibold text-pink-600">
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{info.label}</span>
                        </div>
                        <p className="text-gray-500 truncate mb-1" title={firstUrl}>{formatReadableUrl(firstUrl)}</p>
                        <a href={firstUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-pink-500 font-medium hover:underline flex items-center gap-0.5">
                          Open Link <ChevronRight className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })()}
                </div>
              )}

              {m.type === 'image' && (
                <button id={`msg-${m.id}`} onClick={() => openMediaModalForMessage(m.id)} className={`relative block rounded-2xl overflow-hidden border bg-pink-50 text-left transition-shadow ${
                  isHighlighted ? 'ring-2 ring-pink-300' : ''
                } ${
                  isUser ? 'ml-auto border-pink-200' : 'border-pink-100 shadow-sm'
                }`}
                >
                  {m.illustration ? (
                    <div className="w-64 aspect-[3/2]">
                      <CakeIllustration />
                    </div>
                  ) : (
                    <img src={m.fileUrl} alt={m.fileName || 'Shared image'} className="block w-auto max-w-full h-auto max-h-72 object-contain" />
                  )}
                  {m.text && (
                    <p className="text-xs text-gray-600 bg-white px-3 py-2 border-t border-pink-50">
                      {m.text}
                    </p>
                  )}
                </button>
              )}

              {m.type === 'video' && (
                <button id={`msg-${m.id}`} onClick={() => openMediaModalForMessage(m.id)} className={`relative block rounded-2xl overflow-hidden border bg-black text-left transition-shadow ${
                  isHighlighted ? 'ring-2 ring-pink-300' : ''
                } ${
                  isUser ? 'ml-auto border-pink-200' : 'border-pink-100 shadow-sm'
                }`}
                >
                  <div className="relative inline-block">
                    <video src={m.fileUrl} className="block w-auto h-auto max-w-full max-h-[380px]" muted playsInline preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="w-8 h-8 text-white" fill="white" />
                    </div>
                    {m.duration && (
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">
                        {formatDuration(m.duration)}
                      </span>
                    )}
                  </div>
                  {m.text && (
                    <p className="text-xs text-gray-600 bg-white px-3 py-2">
                      {m.text}
                    </p>
                  )}
                </button>
              )}

              {m.type === 'file' && (
                <button id={`msg-${m.id}`} onClick={() => handleDownloadMedia(m)} disabled={!m.fileUrl} className={`relative flex items-center gap-3 rounded-xl border px-3 py-2.5 w-60 text-left transition-shadow ${
                  isHighlighted ? 'ring-2 ring-pink-300' : ''
                } ${
                  isUser ? 'ml-auto bg-white/90 border-pink-200' : 'bg-white border-pink-100 shadow-sm'
                } ${m.fileUrl ? 'hover:bg-pink-50' : 'cursor-default'}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4.5 h-4.5 text-pink-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{m.fileName}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(m.fileSize)}</p>
                  </div>
                </button>
              )}
            </div>

            {/* Action buttons (Pin / Reply) — sit as siblings to bubble-anchor, centering strictly against it */}
            <div className="cn-chat-message-actions self-center flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => startReply(m)} title="Reply" aria-label="Reply" className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50">
                <Reply className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => togglePin(m.id)} title={m.pinned ? 'Unpin' : 'Pin'} aria-label={m.pinned ? 'Unpin message' : 'Pin message'} className="w-7 h-7 rounded-full bg-white border border-pink-100 shadow-sm flex items-center justify-center text-pink-500 hover:bg-pink-50">
                <Pin className="w-3.5 h-3.5" fill={m.pinned ? 'currentColor' : 'none'} />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Timestamp Row */}
      {m.isLastInGroup && (
        <div
          className={`cn-chat-timestamp mt-1 ${
            isUser
              ? 'flex justify-end pr-2'
              : 'pl-9'
          }`}
        >
          <p className="text-[11px] text-gray-400">
            {m.moderation === 'held' ? 'Message held for review' : m.moderation === 'rejected' ? 'Message filtered after review' : formatTime(m.createdAt)}
          </p>
        </div>
      )}
    </>
    </div>
  );
 })}
 
                <div ref={bottomRef} />
              </div>
              </div>
              </div>
              
            </div>
            

            {/* Upload error banner */}
            {uploadError && (
              <div className="flex-shrink-0 px-4 sm:px-6 py-2 bg-rose-50 border-t border-rose-100">
                <p className="text-xs text-rose-600 w-full">{uploadError}</p>
              </div>
            )}

            {/* Composer: attach, text box, like/send */}
            <div className="cn-chat-composer flex-shrink-0 border-t border-pink-100 bg-white/95 backdrop-blur-sm px-3 sm:px-6 py-3">
              {replyingTo && (
                <div className="w-full flex items-center gap-2 px-1 pb-2">
                  <Reply className="w-3.5 h-3.5 text-pink-500 flex-shrink-0" />
                  <span className="flex-1 text-xs text-gray-500 truncate">
                    Replying to {replyingTo.sender === 'user' ? 'yourself' : BAKERY_NAME}:{' '}
                    <span className="text-gray-700">{replyingTo.snippet}</span>
                  </span>
                  <button
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
                    onClick={handleAttachClick}
                    aria-label="Upload another file"
                    title="Upload another file"
                    className="w-16 h-16 flex-shrink-0 rounded-xl border border-pink-100 bg-pink-50 hover:bg-pink-100 transition-colors flex items-center justify-center text-pink-400"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                  {pendingAttachments.map((att) => (
                    <div
                      key={att.id}
                      className={`relative flex-shrink-0 rounded-xl overflow-hidden border border-pink-100 bg-pink-50 ${
                        att.kind === 'audio' || att.kind === 'document' ? 'w-32 h-16' : 'w-16 h-16'
                      }`}
                    >
                      {att.kind === 'image' && (
                        <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />
                      )}
                      {att.kind === 'video' && (
                        <>
                          <video src={att.fileUrl} className="w-full h-full object-cover" muted playsInline />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-5 h-5 text-white" fill="white" />
                          </div>
                        </>
                      )}
                      {(att.kind === 'audio' || att.kind === 'document') && (
                        <div className="w-full h-full flex items-center gap-2 px-2.5">
                          <FileText className="w-6 h-6 text-pink-500 flex-shrink-0" />
                          <p className="text-[11px] leading-tight text-gray-700 line-clamp-2 break-all">
                            {att.fileName}
                          </p>
                        </div>
                      )}
                      <button
                        onClick={() => removePendingAttachment(att.id)}
                        aria-label="Remove attachment"
                        title="Remove attachment"
                        className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-black/90 text-white flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="cn-chat-composer-row w-full flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={handleAttachClick}
                  type="button"
                  disabled={restricted || !activeConversation || activeConversation.status === 'closed'}
                  aria-label="Attach a photo, video, or file"
                  title="Attach a photo, video, or file"
                  className="cn-chat-attach flex-shrink-0 h-10 rounded-full flex items-center justify-center gap-2 text-pink-500 hover:bg-pink-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span>Attach</span>
                </button>

                <input
                  ref={textInputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={restricted || !activeConversation || activeConversation.status === 'closed'}
                  placeholder={activeConversation?.status === 'closed' ? 'This conversation is closed' : `Message ${activeConversation?.platform?.name || BAKERY_NAME}`}
                  maxLength={4000}
                  className="flex-1 px-4 py-2.5 rounded-full bg-pink-50/70 border border-pink-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 focus:border-transparent"
                />

                <button
                  onClick={handleSendLike}
                  disabled={restricted || !activeConversation || activeConversation.status === 'closed'}
                  aria-label="Send a quick like"
                  title="Send a quick like"
                  className="cn-chat-quick-like flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-pink-500 hover:bg-pink-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                >
                  <ThumbsUp className="w-5 h-5" />
                </button>

                <button
                  onClick={handleSendText}
                  disabled={restricted || !activeConversation || activeConversation.status === 'closed' || (!inputText.trim() && pendingAttachments.length === 0)}
                  aria-label="Send message"
                  title="Press Enter to send"
                  className="cn-chat-send flex-shrink-0 h-10 rounded-full text-white flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300"
                >
                  <span>Send</span>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {isDraggingFile && (
              <div className="absolute inset-0 z-30 bg-pink-500/10 border-4 border-dashed border-pink-400 flex items-center justify-center pointer-events-none">
                <div className="bg-white px-6 py-4 rounded-xl shadow-lg flex flex-col items-center gap-2">
                  <ImageIcon className="w-8 h-8 text-pink-500" />
                  <p className="text-sm font-medium text-gray-700">Drop a photo, video, or file to send</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chat info panel - its own separate floating card now */}
        <div className={`cn-chat-info-panel flex-shrink-0 ${showInfo ? 'is-open w-[26rem] ml-4' : 'w-0 ml-0'
          }`}
        >
          <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-pink-100 shadow-xl overflow-hidden">
            {/* Header bar on top of info panel for clear navigation */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-pink-100 bg-white/95">
              <div className="flex items-center gap-2 min-w-0">
                {infoView !== 'home' && (
                  <button
                    onClick={handleInfoBack}
                    aria-label={infoView === 'search' ? 'Close search' : 'Back'}
                    title={infoView === 'search' ? 'Close search' : 'Back'}
                    className={`w-8 h-8 rounded-full items-center justify-center text-gray-600 hover:bg-pink-50 transition-colors flex-shrink-0 ${
                      infoView === 'media' ? 'hidden sm:flex' : 'flex'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <h2 className="font-semibold text-gray-900 truncate text-sm sm:text-base">
                  {infoView === 'home' && 'Chat Details'}
                  {infoView === 'pinned' && 'Pinned messages'}
                  {infoView === 'media' && 'Media, files and links'}
                  {infoView === 'search' && 'Search in chat'}
                </h2>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                aria-label="Close details"
                title="Close details"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-pink-50 transition-colors flex-shrink-0"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                {infoView === 'home' && (
                  <CustomScrollbar className="h-full">
                    <div className="flex flex-col items-center pt-8 pb-6">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 flex items-center justify-center">
                          <Cake className="w-14 h-14 text-white" />
                        </div>
                        {isOnline && (
                          <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 border-[3px] border-white" />
                        )}
                      </div>
                      <p className="font-bold text-gray-900 mt-4 text-lg">{BAKERY_NAME}</p>
                      <p className="text-xs text-gray-500">{statusText}</p>

                      <button
                        type="button"
                        onClick={() => setInfoView('search')}
                        aria-label="Search in conversation"
                        title="Search in conversation"
                        className="flex flex-col items-center gap-1.5 mt-4"
                      >
                        <span className="w-10 h-10 rounded-full bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-500 hover:bg-pink-100 transition-colors">
                          <Search className="w-4.5 h-4.5" />
                        </span>
                        <span className="text-xs text-gray-600">Search</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setShowInfo(false);
                        setShowPinnedModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-pink-50/60 transition-colors text-left"
                    >
                      <Pin className="w-5 h-5 text-pink-500" />
                      <span className="flex-1 text-sm text-gray-800">Pinned messages</span>
                      {pinnedMessages.length > 0 && (
                        <span className="text-xs text-gray-400">{pinnedMessages.length}</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>

                    <button
                      onClick={() => setInfoView('media')}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-pink-50/60 transition-colors text-left"
                    >
                      <ImageIcon className="w-5 h-5 text-pink-500" />
                      <span className="flex-1 text-sm text-gray-800">Media, files and links</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </CustomScrollbar>
                )}

                

                {infoView === 'media' && (
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 flex px-2 pt-0">
                      {[
                        { key: 'media', label: 'Media' },
                        { key: 'files', label: 'Files' },
                        { key: 'links', label: 'Links' },
                      ].map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => setMediaTab(tab.key)}
                          className={`flex-1 text-sm py-2.5 font-medium border-b-2 transition-colors ${
                            mediaTab === tab.key
                              ? 'border-pink-500 text-pink-600'
                              : 'border-transparent text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <CustomScrollbar className="flex-1" contentClassName="p-3">
                      {mediaTab === 'media' && (
                        mediaMessages.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No photos or videos shared yet.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2">
                            {mediaMessages.map((m, idx) => (
                              <button
                                key={m.id}
                                onClick={() => openMediaModal(idx)}
                                className="relative rounded-lg overflow-hidden border border-pink-100 aspect-square bg-pink-50"
                              >
                                {m.type === 'video' ? (
                                  <>
                                    <video src={m.fileUrl} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                      <Play className="w-6 h-6 text-white" fill="white" />
                                    </div>
                                    {m.duration && (
                                      <span className="absolute bottom-1 right-1 text-[10px] text-white bg-black/60 px-1 rounded">
                                        {formatDuration(m.duration)}
                                      </span>
                                    )}
                                  </>
                                ) : m.illustration ? (
                                  <CakeIllustration />
                                ) : (
                                  <img src={m.fileUrl} alt={m.fileName || 'Shared image'} className="w-full h-full object-cover" />
                                )}
                              </button>
                            ))}
                          </div>
                        )
                      )}

                      {mediaTab === 'files' && (
                        fileMessages.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No files shared yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {fileMessages.map((m) => (
                              <button
                                key={m.id}
                                onClick={() => jumpToMessage(m.id)}
                                className="w-full flex items-center gap-3 rounded-xl border border-pink-100 px-3 py-3 hover:bg-pink-50/60 transition-colors text-left"
                              >
                                <div className="w-12 h-12 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0">
                                  <FileText className="w-6 h-6 text-pink-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-800 truncate">{m.fileName}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(m.fileSize)}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        )
                      )}

                      {mediaTab === 'links' && (
                        linkMessages.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No links shared yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {linkMessages.map((l) => (
                              <a
                                key={l.id}
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 rounded-xl border border-pink-100 px-3 py-3 hover:bg-pink-50/60 transition-colors"
                              >
                                <div className="w-12 h-12 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                  {l.thumbnail ? (
                                    <img src={l.thumbnail} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <Link2 className="w-6 h-6 text-pink-500" />
                                  )}
                                </div>
                                <span className="text-sm text-gray-800 truncate">{l.url}</span>
                              </a>
                            ))}
                          </div>
                        )
                      )}
                    </CustomScrollbar>
                  </div>
                )}

                {infoView === 'search' && (
                  <div className="h-full flex flex-col">
                    <div className="flex-shrink-0 px-4 py-3">
                      <div className="relative">
                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-500">
                          <Search className="w-4 h-4" />
                        </span>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyDown={handleSearchKeyDown}
                          placeholder="Search in conversation"
                          autoFocus
                          className={`w-full pl-12 py-2.5 rounded-full bg-pink-50 border border-pink-100 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 ${
                            isSubmittedMatch ? 'pr-28' : 'pr-12'
                          }`}
                        />
                        {isSubmittedMatch && (
                          <span className="absolute right-11 top-1/2 -translate-y-1/2 text-xs text-gray-400 whitespace-nowrap">
                            {formatResultCount(searchResults.length)}
                          </span>
                        )}
                        {searchQuery && (
                          <button
                            onClick={clearSearch}
                            aria-label="Clear search"
                            title="Clear search"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-pink-100 hover:bg-pink-200 flex items-center justify-center text-pink-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {searchQuery.trim() && !isSubmittedMatch && (
                        <p className="text-xs text-gray-400 text-center mt-3">
                          Press "Enter" to search.
                        </p>
                      )}
                    </div>

                    <CustomScrollbar className="flex-1">
                      {isSubmittedMatch && (
                        searchResults.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-8">No messages found.</p>
                        ) : (
                          <div>
                            {searchResults.map((m) => {
                              const sentence = getMatchingSentence(m.text, searchSubmittedQuery);
                              const snippet = truncateSentence(sentence, 60);

                              return (
                                <button
                                  key={m.id}
                                  onClick={() => jumpToMessage(m.id)}
                                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-pink-50/60 transition-colors text-left"
                                >
                                  <div
                                    className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                                      m.sender === 'user'
                                        ? 'bg-gray-200 text-gray-500'
                                        : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white'
                                    }`}
                                  >
                                    {m.sender === 'user' ? (
                                      <User className="w-4 h-4" />
                                    ) : (
                                      <Cake className="w-4 h-4" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {m.sender === 'user' ? 'You' : BAKERY_NAME}
                                    </p>
                                    <p className="text-xs text-gray-500 flex items-baseline gap-1 min-w-0">
                                      <span className="truncate">{highlightMatch(snippet, searchSubmittedQuery)}</span>
                                      <span className="text-gray-400 flex-shrink-0 whitespace-nowrap"> · {getRelativeTime(m.createdAt)}</span>
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )
                      )}
                    </CustomScrollbar>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>

      {/* Media viewer modal */}
      {mediaModalIndex !== null && mediaMessages[mediaModalIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeMediaModal}
        >
          {/* Download + Exit, side by side, top-right */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadMedia(mediaMessages[mediaModalIndex]); }}
              disabled={!mediaMessages[mediaModalIndex].fileUrl}
              aria-label="Download"
              title="Download"
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors ${
                !mediaMessages[mediaModalIndex].fileUrl ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); closeMediaModal(); }}
              aria-label="Close"
              title="Close"
              className="w-10 h-10 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Back - always visible, full-height click zone with a hover tint showing the clickable area */}
          {mediaMessages.length > 1 && mediaModalIndex > 0 && (
            <div
              onClick={(e) => { e.stopPropagation(); showPrevMedia(); }}
              className="absolute left-0 top-0 h-full w-24 flex items-center justify-start pl-3 cursor-pointer z-10 transition-colors hover:bg-gradient-to-r hover:from-black/30 hover:to-transparent rounded-none"
            >
              <span className="w-9 h-9 rounded-none bg-white/10 border border-white/30 flex items-center justify-center text-white transition-colors hover:bg-white/20">
                <ChevronLeft className="w-5 h-5" />
              </span>
            </div>
        )}

          {/* Next - always visible, full-height click zone with a hover tint showing the clickable area */}
          {mediaMessages.length > 1 && mediaModalIndex < mediaMessages.length - 1 && (
            <div
              onClick={(e) => { e.stopPropagation(); showNextMedia(); }}
              className="absolute right-0 top-0 h-full w-24 flex items-center justify-end pr-3 cursor-pointer z-10 transition-colors hover:bg-gradient-to-l hover:from-black/30 hover:to-transparent"
            >
              <span className="w-9 h-9 rounded-full bg-white/10 border border-white/30 flex items-center justify-center text-white transition-colors hover:bg-white/20">
                <ChevronRight className="w-5 h-5" />
              </span>
            </div>
          )}

          {/* Image / video - centered, capped shorter so the strip below always has its own fixed space */}
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center max-w-[90vw] max-h-[70vh]">
            {mediaMessages[mediaModalIndex].type === 'video' ? (
              <video
                key={mediaMessages[mediaModalIndex].id}
                src={mediaMessages[mediaModalIndex].fileUrl}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[70vh] object-contain"
              />
            ) : mediaMessages[mediaModalIndex].illustration ? (
              <div className="w-full max-w-[480px] aspect-[3/2]">
                <CakeIllustration />
              </div>
            ) : (
              <img
                src={mediaMessages[mediaModalIndex].fileUrl}
                alt={mediaMessages[mediaModalIndex].fileName || 'Shared image'}
                className="max-w-[90vw] max-h-[70vh] object-contain"
              />
            )}
          </div>

          {/* Indicator strip - flush to the bottom edge, full width, native scrollbar hidden.
              A custom horizontal scrollbar appears below it only once there are too many
              thumbnails to fit, and it follows the active thumbnail automatically. */}
          {mediaMessages.length > 1 && (
            <div onClick={(e) => e.stopPropagation()} className="absolute bottom-0 inset-x-0 z-20 pb-2">
              <div
                ref={mediaStripRef}
                onScroll={updateStripThumb}
                className="flex items-center gap-2 overflow-x-auto px-4 py-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
              >
              {mediaMessages.map((m, idx) => (
                <button
                  key={m.id}
                  ref={idx === mediaModalIndex ? activeThumbRef : null}
                  onClick={(e) => { e.stopPropagation(); setMediaModalIndex(idx); }}
                  className={`relative flex-shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-colors ${
                    idx === mediaModalIndex ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  {m.type === 'video' ? (
                    <>
                      <video src={m.fileUrl} className="w-full h-full object-cover" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Play className="w-3.5 h-3.5 text-white" fill="white" />
                      </div>
                    </>
                  ) : m.illustration ? (
                    <CakeIllustration />
                  ) : (
                    <img src={m.fileUrl} alt={m.fileName || 'Shared image'} className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
              </div>

              {stripThumb.visible && (
                <div onClick={handleStripTrackClick} className="hidden md:block relative h-1.5 mx-4 rounded-full bg-white/15 cursor-default">
                  <div
                    onMouseDown={handleStripThumbMouseDown}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-0 h-1.5 rounded-full bg-white/70 hover:bg-white transition-colors cursor-default"
                    style={{ left: `${stripThumb.leftPct}%`, width: `${stripThumb.widthPct}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pinned messages modal */}
      {showPinnedModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setShowPinnedModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[580px] max-w-full h-[640px] bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden"
          >
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-pink-100">
              <h2 className="font-semibold text-gray-900">Pinned messages</h2>
              <button
                onClick={() => setShowPinnedModal(false)}
                aria-label="Close"
                title="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-pink-50 transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <CustomScrollbar className="flex-1" contentClassName="p-4">
              {pinnedMessages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No pinned messages yet.</p>
              ) : (
                <div className="divide-y divide-pink-100">
                  {pinnedMessages.map((m) => (
                    <div key={m.id} className="flex items-end gap-3 py-4">
                      <div
                        className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 ${
                          m.sender === 'user' ? 'bg-gray-200' : 'bg-gradient-to-br from-pink-500 to-rose-500'
                        }`}
                      >
                        {m.sender === 'user' ? (
                          <User className="w-4 h-4 text-gray-500" />
                        ) : (
                          <Cake className="w-4 h-4 text-white" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-semibold text-gray-900">
                            {m.sender === 'user' ? 'You' : BAKERY_NAME}
                          </p>
                          <p className="text-xs text-gray-400">
                            {m.pinnedAt ? formatPinnedDate(m.pinnedAt) : ''}
                          </p>
                        </div>

                        {renderPinnedPreview(m)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CustomScrollbar>
          </div>
        </div>
      )}

      {/* Attachment Access Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attachment-permission-title"
            className="w-full max-w-sm rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 shrink-0">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 id="attachment-permission-title" className="font-bold text-base text-gray-900 leading-tight">
                  Allow Attachment Access?
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">CakeNMake Client Chat</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              CakeNMake needs your permission to access your files, photos, and videos to attach cake references, photos, and documents in chat.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleGrantPermission('permanent')}
                className="w-full py-2.5 px-4 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Allow Everytime</span>
              </button>

              <button
                type="button"
                onClick={() => handleGrantPermission('one-time')}
                className="w-full py-2.5 px-4 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Allow Once</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPermissionModal(false)}
                className="w-full py-2 px-4 rounded-xl text-gray-500 hover:bg-gray-100 text-xs font-medium transition-colors cursor-pointer"
              >
                Don't Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
