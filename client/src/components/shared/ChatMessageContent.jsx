import React from 'react';

const CHAT_URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

function safeMessageUrl(value) {
  if (/[\u0000-\u001f\u007f-\u009f]/.test(value)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isChatImageUrl(value, conversationId) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.hostname !== 'firebasestorage.googleapis.com' || url.username || url.password) return false;
    const path = decodeURIComponent(url.pathname).split('/');
    const attachmentIndex = path.indexOf('chat-attachments');
    return path[0] === '' && path[1] === 'v0' && path[2] === 'b'
      && Boolean(path[3]) && attachmentIndex > 0 && path[attachmentIndex - 1] === 'o'
      && path[attachmentIndex + 2] === conversationId
      && Boolean(path[attachmentIndex + 3]);
  } catch {
    return false;
  }
}

function renderLinks(text, messageId) {
  const chunks = [];
  let cursor = 0;
  for (const match of text.matchAll(CHAT_URL_REGEX)) {
    const rawUrl = match[0];
    let linkText = rawUrl;
    while (/[.,!?;:)\]}]$/.test(linkText)) linkText = linkText.slice(0, -1);
    const safeLink = safeMessageUrl(linkText);
    if (!safeLink || !linkText) continue;
    const start = match.index;
    if (start > cursor) chunks.push(text.slice(cursor, start));
    chunks.push(
      <React.Fragment key={`${messageId}-${start}`}>
        <a href={safeLink} target="_blank" rel="noopener noreferrer" className="underline break-all">
          {linkText}
        </a>
        {rawUrl.slice(linkText.length)}
      </React.Fragment>,
    );
    cursor = start + rawUrl.length;
  }
  if (cursor < text.length) chunks.push(text.slice(cursor));
  return chunks.length ? chunks : text;
}

export default function ChatMessageContent({ text = '', messageId, conversationId }) {
  if (typeof text !== 'string') return null;
  const imageMatch = /^Image: (https:\/\/\S+)$/i.exec(text);
  if (imageMatch && isChatImageUrl(imageMatch[1], conversationId)) {
    return (
      <a href={imageMatch[1]} target="_blank" rel="noopener noreferrer" aria-label="Open shared image">
        <img src={imageMatch[1]} alt="Image shared with the bakery" loading="lazy" className="max-h-48 max-w-full rounded-lg object-contain" />
      </a>
    );
  }
  return renderLinks(text, messageId || 'chat-message');
}
