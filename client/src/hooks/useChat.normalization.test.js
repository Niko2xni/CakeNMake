import { describe, expect, it } from 'vitest';
import { normalizeMessage } from './useChat';

describe('chat message normalization', () => {
  it('normalizes the persisted staff message returned after send', () => {
    const message = normalizeMessage({
      id: 'message-1',
      conversationId: 'conversation-1',
      sender: { id: 'staff-1', displayName: 'Bakery Admin' },
      senderRole: 'bakery_admin',
      type: 'text',
      text: 'Your order is ready.',
      clientMessageId: 'client_message_1',
      createdAt: '2026-09-28T12:04:29.270Z',
    });

    expect(message.sender).toBe('bakery');
    expect(message.senderProfile).toEqual({ id: 'staff-1', displayName: 'Bakery Admin' });
    expect(message.createdAt).toBeInstanceOf(Date);
    expect(message.createdAt.toISOString()).toBe('2026-09-28T12:04:29.270Z');
  });

  it('does not pass an invalid date into bakery rendering', () => {
    const message = normalizeMessage({
      id: 'message-2',
      senderRole: 'bakery_staff',
      text: 'Hello',
      createdAt: undefined,
    });

    expect(message.createdAt).toBeInstanceOf(Date);
    expect(Number.isNaN(message.createdAt.getTime())).toBe(false);
  });

  it('ignores empty socket payloads', () => {
    expect(normalizeMessage(null)).toBeNull();
  });
});
