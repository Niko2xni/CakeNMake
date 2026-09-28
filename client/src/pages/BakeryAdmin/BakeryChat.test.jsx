import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const conversations = [
  {
    id: 'older',
    customer: { displayName: 'Ana Cruz', email: 'ana@example.com' },
    platform: { name: 'Mamshie Bakery' },
    status: 'open',
    lastMessageAt: '2026-09-28T08:00:00.000Z',
    lastMessagePreview: 'Older message',
    unreadCount: 0,
  },
  {
    id: 'newer',
    customer: { displayName: 'Nikolai Ng', email: 'nikolai@example.com' },
    platform: { name: 'Mamshie Bakery' },
    status: 'open',
    lastMessageAt: '2026-09-28T09:00:00.000Z',
    lastMessagePreview: 'Newest message',
    unreadCount: 2,
  },
];

vi.mock('@/hooks/useChat', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useChat: () => ({
      activeConversation: null,
      activeConversationId: null,
      conversations,
      error: '',
      hasMore: false,
      loading: false,
      loadingMessages: false,
      messages: [],
      loadOlder: vi.fn(),
      refreshConversations: vi.fn(),
      sendMessage: vi.fn(),
      setActiveConversationId: vi.fn(),
    }),
  };
});

import BakeryChat from './BakeryChat';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('BakeryChat conversation list', () => {
  it('shows unread activity and orders the newest conversation first', () => {
    render(<BakeryChat />);

    const rows = screen.getAllByRole('button', { name: /open conversation with/i });
    expect(rows[0]).toHaveAccessibleName('Open conversation with Nikolai Ng');
    expect(rows[1]).toHaveAccessibleName('Open conversation with Ana Cruz');
    expect(screen.getByLabelText('2 unread messages')).toBeVisible();
  });

  it('filters conversations by customer name or email', () => {
    render(<BakeryChat />);
    const search = screen.getByRole('searchbox', { name: 'Search customers' });

    fireEvent.change(search, { target: { value: 'ana@example.com' } });

    expect(screen.getByRole('button', { name: 'Open conversation with Ana Cruz' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Open conversation with Nikolai Ng' })).not.toBeInTheDocument();
  });
});
