import React from 'react';
import { fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const render = (ui, route = '/bakery/chats?tab=messages') => renderComponent(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
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
const { selectConversation } = vi.hoisted(() => ({ selectConversation: vi.fn() }));

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
      setActiveConversationId: selectConversation,
    }),
  };
});

import BakeryChat from './BakeryChat';

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('BakeryChat conversation list', () => {
  it('selects the requested order conversation even when it is not the latest chat', () => {
    render(<BakeryChat />, '/bakery/chats?tab=messages&conversation=older');
    expect(selectConversation).toHaveBeenCalledWith('older');
  });
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
