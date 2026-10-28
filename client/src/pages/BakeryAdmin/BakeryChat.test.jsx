import React from 'react';
import { fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const render = (ui, route = '/bakery/chats?tab=messages') =>
  renderComponent(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
import { beforeAll, describe, expect, it, vi } from 'vitest';

const conversations = [
  {
    id: 'older',
    customer: { displayName: 'Ana Cruz', email: 'ana@example.com' },
    platform: { name: 'AH TINAPS BAKESHOP' },
    status: 'open',
    lastMessageAt: '2026-09-28T08:00:00.000Z',
    lastMessagePreview: 'Older message',
    unreadCount: 0,
  },
  {
    id: 'newer',
    customer: { displayName: 'Nikolai Ng', email: 'nikolai@example.com' },
    platform: { name: 'AH TINAPS BAKESHOP' },
    status: 'open',
    lastMessageAt: '2026-09-28T09:00:00.000Z',
    lastMessagePreview: 'Newest message',
    unreadCount: 2,
  },
];

const { selectConversation, sendMessageMock, chatState } = vi.hoisted(() => ({
  selectConversation: vi.fn(),
  sendMessageMock: vi.fn().mockResolvedValue({}),
  chatState: {
    activeConversation: null,
    activeConversationId: null,
    messages: [],
  },
}));

vi.mock('@/hooks/useChat', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useChat: () => ({
      activeConversation: chatState.activeConversation,
      activeConversationId: chatState.activeConversationId,
      conversations,
      error: '',
      hasMore: false,
      loading: false,
      loadingMessages: false,
      messages: chatState.messages,
      loadOlder: vi.fn(),
      refreshConversations: vi.fn(),
      sendMessage: sendMessageMock,
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
    chatState.activeConversation = null;
    chatState.activeConversationId = null;
    chatState.messages = [];
    render(<BakeryChat />, '/bakery/chats?tab=messages&conversation=older');
    expect(selectConversation).toHaveBeenCalledWith('older');
  });

  it('shows unread activity and orders the newest conversation first', () => {
    chatState.activeConversation = null;
    chatState.activeConversationId = null;
    chatState.messages = [];
    render(<BakeryChat />);

    const rows = screen.getAllByRole('button', { name: /open conversation with/i });
    expect(rows[0]).toHaveAccessibleName('Open conversation with Nikolai Ng');
    expect(rows[1]).toHaveAccessibleName('Open conversation with Ana Cruz');
    expect(screen.getByLabelText('2 unread messages')).toBeVisible();
  });

  it('filters conversations by customer name or email', () => {
    chatState.activeConversation = null;
    chatState.activeConversationId = null;
    chatState.messages = [];
    render(<BakeryChat />);
    const search = screen.getByRole('searchbox', { name: 'Search customers' });

    fireEvent.change(search, { target: { value: 'ana@example.com' } });

    expect(screen.getByRole('button', { name: 'Open conversation with Ana Cruz' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Open conversation with Nikolai Ng' })
    ).not.toBeInTheDocument();
  });

  it('provides reply, pin, quick like, attachment, and chat details history in an active customer conversation', () => {
    chatState.activeConversation = conversations[1];
    chatState.activeConversationId = 'newer';
    chatState.messages = [
      {
        id: 'cust-msg-1',
        conversationId: 'newer',
        senderRole: 'customer',
        text: 'Can I add strawberries on top? https://instagram.com/cakeinspo',
        createdAt: '2026-09-28T09:00:00.000Z',
      },
    ];

    render(<BakeryChat />);

    // Reply to message
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByText(/Replying to/i)).toBeInTheDocument();

    // Pin message
    fireEvent.click(screen.getByRole('button', { name: 'Pin message' }));
    expect(screen.getByText('Pinned')).toBeInTheDocument();

    // Open Chat Details & History panel
    fireEvent.click(screen.getByRole('button', { name: 'Conversation info' }));
    expect(screen.getByText('Chat Details')).toBeInTheDocument();
    expect(screen.getByText('Pinned messages')).toBeInTheDocument();
    expect(screen.getByText('Media, files and links')).toBeInTheDocument();

    // View shared links in Media, files and links
    fireEvent.click(screen.getByText('Media, files and links'));
    fireEvent.click(screen.getByRole('button', { name: /Links \(1\)/i }));
    expect(screen.getAllByText('https://instagram.com/cakeinspo').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByRole('button', { name: /Close chat|Reopen chat/i })).not.toBeInTheDocument();

    // Quick like button and Attach button are available
    expect(
      screen.getByRole('button', { name: 'Attach a photo, video, or file' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send a quick like' }));
    expect(sendMessageMock).toHaveBeenCalledWith('👍', { replyTo: 'cust-msg-1' });
  });
});
