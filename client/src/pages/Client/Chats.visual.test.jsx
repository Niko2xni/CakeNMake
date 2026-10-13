import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import Chats from './Chats';

const chatMocks = vi.hoisted(() => ({ sendMessage: vi.fn() }));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Jane Doe', email: 'jane@example.com' },
  }),
}));

vi.mock('@/hooks/useChat', () => ({
  useChat: () => ({
    activeConversation: {
      id: 'conversation-1',
      status: 'open',
      platform: { name: 'AH TINAPS BAKESHOP' },
    },
    error: '',
    hasMore: false,
    loading: false,
    loadingMessages: false,
    loadOlder: vi.fn(),
    messages: [
      {
        id: 'message-1',
        sender: 'user',
        senderRole: 'customer',
        type: 'text',
        createdAt: new Date(),
        pinned: true,
        text: 'Reference: https://pinterest.com/pin/cake-inspo-2201',
      },
    ],
    sendMessage: chatMocks.sendMessage,
    setMessages: vi.fn(),
  }),
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/chats']}>
      <Chats />
    </MemoryRouter>,
  );
}

describe('Chats presentation', () => {
  it('keeps quick-like and send actions distinct and visible', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /send a quick like/i })).toBeVisible();

    const sendButton = screen.getByRole('button', { name: /^send message$/i });
    expect(sendButton).toBeVisible();
    expect(sendButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/message ah tinaps bakeshop/i), {
      target: { value: 'Could you confirm the pickup time?' },
    });

    expect(sendButton).toBeEnabled();
  });

  it('renders readable links, pinned badges, and a labeled details control', () => {
    renderPage();

    const referenceLink = screen.getByRole('link', { name: 'pinterest.com/pin/cake-inspo-2201' });
    expect(referenceLink).toHaveAttribute('href', 'https://pinterest.com/pin/cake-inspo-2201');
    expect(screen.getAllByText('Pinned').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /open chat info/i })).toHaveTextContent('Details');
  });
});
