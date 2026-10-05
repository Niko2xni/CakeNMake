import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Loader2, Send, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/lib/AuthContext';
import { getChatSocket } from '@/lib/chat-socket';
import { auth, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { validateUploadedFile } from '@/lib/file-validation';
import ChatMessageContent from '@/components/shared/ChatMessageContent';
import BakeryChat from './BakeryChat';
import { useDragToScroll } from '@/hooks/useDragToScroll';

const CHAT_IMAGE_TYPES = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
};
const MAX_CHAT_IMAGE_BYTES = 5 * 1024 * 1024;

function hasValidImageSignature(file, bytes) {
  if (file.type === 'image/png') {
    return bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      .every((value, index) => bytes[index] === value);
  }
  if (file.type === 'image/jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (file.type === 'image/webp') {
    return bytes.length >= 12
      && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

export default function BakeryChatPanel() {
  return (
    <div className="flex flex-col h-full min-h-0">
      <BakerySupportPanel />
    </div>
  );
}

function BakerySupportPanel() {
  const { account, isAuthenticated } = useAuth();
  if (!isAuthenticated || !account) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden bg-card rounded-2xl shadow-xl border border-border/50 p-5">
        <p className="shrink-0 text-xs text-muted-foreground mb-4">Demo chat — messages are simulated.</p>
        <BakeryChat />
      </div>
    );
  }
  return <AuthenticatedBakeryChatPanel />;
}

function AuthenticatedBakeryChatPanel() {
  const { account, user } = useAuth();
  const chat = useChat({ autoCreate: true });
  const [input, setInput] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [bakeryOnline, setBakeryOnline] = useState(false);
  const [showImagePermission, setShowImagePermission] = useState(false);
  const bottomRef = useRef(null);
  const imageInputRef = useRef(null);
  const messagesScrollRef = useDragToScroll({ isContainer: true });

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [chat.messages.length]);

  useEffect(() => {
    const conversationId = chat.activeConversation?.id;
    if (!conversationId || account?.role !== 'customer') {
      setBakeryOnline(false);
      return undefined;
    }

    let active = true;
    let socket;
    setBakeryOnline(false);
    const onPresence = ({ online } = {}) => {
      if (active) setBakeryOnline(Boolean(online));
    };
    const watchPresence = () => {
      socket?.emit('bakery:presence:watch', { conversationId }, (result) => {
        if (active && result?.ok) setBakeryOnline(Boolean(result.online));
      });
    };

    getChatSocket().then((connectedSocket) => {
      if (!active) return;
      socket = connectedSocket;
      socket.on('bakery:presence', onPresence);
      socket.on('connect', watchPresence);
      watchPresence();
    }).catch((error) => {
      if (active) console.error('Could not check bakery online status:', error);
    });

    return () => {
      active = false;
      socket?.off('bakery:presence', onPresence);
      socket?.off('connect', watchPresence);
      socket?.emit('bakery:presence:unwatch', { conversationId });
    };
  }, [account?.role, chat.activeConversation?.id]);

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

  async function sendImage(file) {
    if (!file || uploadingImage || sending) return;
    const validationError = validateUploadedFile(file, {
      allowedTypes: CHAT_IMAGE_TYPES,
      maxBytes: MAX_CHAT_IMAGE_BYTES,
    });
    if (validationError) {
      setSendError(validationError);
      return;
    }
    if (!user?.uid || !auth?.currentUser || auth.currentUser.uid !== user.uid || !storage || !chat.activeConversationId) {
      setSendError('Sign in again before sharing an image.');
      return;
    }

    setSendError('');
    setUploadingImage(true);
    try {
      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      if (!hasValidImageSignature(file, bytes)) throw new Error('Choose a valid JPEG, PNG, or WebP image.');
      const extension = file.name.split('.').pop().toLowerCase();
      const imageRef = ref(
        storage,
        `chat-attachments/${user.uid}/${chat.activeConversationId}/${crypto.randomUUID()}.${extension}`,
      );
      await uploadBytes(imageRef, file, { contentType: file.type });
      if (auth.currentUser?.uid !== user.uid) throw new Error('Your account changed. Please try again.');
      const imageUrl = await getDownloadURL(imageRef);
      await chat.sendMessage(`Image: ${imageUrl}`);
    } catch (error) {
      setSendError(error.message || 'Image could not be shared.');
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  function requestImageAccess() {
    if (chat.restricted || uploadingImage || sending) return;
    let allowEveryTime = false;
    try {
      allowEveryTime = localStorage.getItem('cakenmake_attachment_permission') === 'permanent';
    } catch (error) {
      console.warn('Could not read saved attachment permission:', error);
    }
    if (allowEveryTime) {
      imageInputRef.current?.click();
      return;
    }
    setShowImagePermission(true);
  }

  function grantImageAccess(always) {
    if (always) {
      try {
        localStorage.setItem('cakenmake_attachment_permission', 'permanent');
      } catch (error) {
        console.warn('Could not save attachment permission:', error);
      }
    }
    setShowImagePermission(false);
    window.setTimeout(() => imageInputRef.current?.click(), 100);
  }

  const bakeryName = chat.activeConversation?.platform?.name || 'Bakery';

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
      <div className="px-3 sm:px-5 pt-3 sm:pt-5 pb-3 sm:pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center"><Store className="w-5 h-5 text-primary-foreground" /></div>
          <div className="min-w-0">
            <h2 className="font-display text-base sm:text-lg font-bold leading-tight truncate">{bakeryName}</h2>
            <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className={`h-2 w-2 rounded-full ${bakeryOnline ? 'bg-green-500' : 'bg-gray-400'}`} aria-label={bakeryOnline ? 'Bakery admin online' : 'Bakery admin offline'} />
              {bakeryOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
      </div>
      <Separator />
      <div
        ref={messagesScrollRef}
        className="flex-1 overflow-y-auto overscroll-y-contain touch-pan-y [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-3 sm:p-4 py-3 space-y-3 min-h-0 cursor-grab active:cursor-grabbing md:cursor-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
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
                <div className={`rounded-2xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${isBakery ? 'bg-muted text-foreground rounded-bl-sm' : 'bg-primary text-primary-foreground rounded-br-sm'} ${message.failed ? 'ring-2 ring-destructive' : ''}`}><ChatMessageContent text={message.text} messageId={message.id} conversationId={message.conversationId} /></div>
                <div className={`flex items-center gap-1 mt-0.5 ${isBakery ? 'justify-start' : 'justify-end'}`}>
                  <span className="text-[10px] text-muted-foreground">{message.moderation === 'held' ? 'Message held for review' : message.moderation === 'rejected' ? 'Message filtered after review' : message.pending ? 'Sending…' : message.failed ? 'Failed' : new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {!isBakery && !message.pending && !message.failed && !['held', 'rejected'].includes(message.moderation) && <Check className="w-3 h-3 text-primary" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-2 sm:pt-3 border-t border-border/50 bg-muted/20 shrink-0">
        {(sendError || chat.error) && <p className="text-[11px] text-destructive mb-2" role="alert">{sendError || chat.error}</p>}
        <div className="flex gap-2 items-end">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Choose an image to share"
            onChange={(event) => sendImage(event.target.files?.[0])}
          />
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-xl h-9 w-9 shrink-0"
            onClick={requestImageAccess}
            disabled={chat.restricted || sending || uploadingImage}
            aria-label="Add an image"
            title="Share a JPEG, PNG, or WebP image (max 5 MB)"
          >
            {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          </Button>
          <Input disabled={chat.restricted || uploadingImage} value={input} maxLength={4000} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); send(); } }} placeholder={chat.restricted ? 'Chatting is restricted — use Orders & Support' : 'Message the bakery...'} className="h-10 min-h-10 text-xs rounded-xl" />
          <Button size="icon" className="rounded-xl h-9 w-9 shrink-0" onClick={send} disabled={chat.restricted || !input.trim() || sending || uploadingImage}>{sending || uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
        </div>
      </div>
      {showImagePermission && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="bakery-image-permission-title"
            className="w-full max-w-sm space-y-4 rounded-2xl border border-pink-100 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600">
                <ImagePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 id="bakery-image-permission-title" className="text-base font-bold leading-tight text-gray-900">Allow Photo Access?</h3>
                <p className="mt-0.5 text-xs text-gray-500">CakeNMake Bakery Chat</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-gray-600">
              Choose an image from your device to share with the bakery. CakeNMake only uploads the image you select.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => grantImageAccess(true)}
                className="flex w-full items-center justify-center rounded-xl bg-pink-500 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-pink-600"
              >
                Allow Everytime
              </button>
              <button
                type="button"
                onClick={() => grantImageAccess(false)}
                className="w-full rounded-xl bg-pink-50 px-4 py-2.5 text-xs font-semibold text-pink-700 transition-colors hover:bg-pink-100"
              >
                Allow Once
              </button>
              <button
                type="button"
                onClick={() => setShowImagePermission(false)}
                className="w-full rounded-xl px-4 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-100"
              >
                Don&apos;t Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
