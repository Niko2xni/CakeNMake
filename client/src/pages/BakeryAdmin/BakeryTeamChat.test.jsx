import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import BakeryChatsSection from './BakeryChatsSection';
import BakeryTeamChat from './BakeryTeamChat';
import { teamChatApi, moderationApi } from '@/services/chat-api';

const authState = vi.hoisted(() => ({
  account: {
    _id: 'staff-1',
    displayName: 'Pastry Worker',
    email: 'worker1@cakenmake.com',
    role: 'bakery_staff',
  },
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    account: authState.account,
  }),
}));

vi.mock('@/lib/chat-socket', () => ({
  getChatSocket: async () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock('@/services/chat-api', () => ({
  teamChatApi: {
    getChannels: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    markRead: vi.fn(),
  },
  moderationApi: {
    overview: vi.fn().mockResolvedValue({ customers: [], flags: [], requests: [] }),
  },
  chatApi: {
    listConversations: vi.fn().mockResolvedValue({ conversations: [] }),
  },
}));

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  authState.account = {
    _id: 'staff-1',
    displayName: 'Pastry Worker',
    email: 'worker1@cakenmake.com',
    role: 'bakery_staff',
  };

  teamChatApi.getChannels.mockResolvedValue({
    generalChannel: {
      channelKey: 'general',
      channelType: 'group',
      name: 'Bakery Team Room',
      subtitle: 'All Admin & Staff Members',
      memberCount: 3,
      lastMessageAt: '2026-10-28T10:00:00.000Z',
      lastMessagePreview: 'Head Baker: Good morning team!',
      unreadCount: 0,
    },
    members: [
      {
        id: 'admin-1',
        channelKey: 'dm:admin-1:staff-1',
        channelType: 'direct',
        displayName: 'Head Baker',
        email: 'admin@cakenmake.com',
        role: 'bakery_admin',
        lastMessageAt: '2026-10-28T09:30:00.000Z',
        lastMessagePreview: 'Please check the 2pm cake order.',
        unreadCount: 1,
      },
      {
        id: 'staff-2',
        channelKey: 'dm:staff-1:staff-2',
        channelType: 'direct',
        displayName: 'Cake Decorator',
        email: 'decorator@cakenmake.com',
        role: 'bakery_staff',
        lastMessageAt: null,
        lastMessagePreview: '',
        unreadCount: 0,
      },
    ],
    totalTeamMembers: 3,
  });

  teamChatApi.getMessages.mockImplementation(async ({ channelKey }) => {
    if (channelKey === 'general') {
      return {
        channelKey: 'general',
        messages: [
          {
            id: 'msg-1',
            channelKey: 'general',
            channelType: 'group',
            sender: { id: 'admin-1', displayName: 'Head Baker', role: 'bakery_admin' },
            senderRole: 'bakery_admin',
            text: 'Good morning team!',
            createdAt: '2026-10-28T10:00:00.000Z',
          },
        ],
      };
    }
    return {
      channelKey,
      messages: [
        {
          id: 'msg-dm-1',
          channelKey,
          channelType: 'direct',
          sender: { id: 'admin-1', displayName: 'Head Baker', role: 'bakery_admin' },
          senderRole: 'bakery_admin',
          text: 'Please check the 2pm cake order.',
          createdAt: '2026-10-28T09:30:00.000Z',
        },
      ],
    };
  });

  teamChatApi.sendMessage.mockImplementation(async ({ channelKey, text }) => ({
    message: {
      id: 'msg-new',
      channelKey,
      channelType: channelKey === 'general' ? 'group' : 'direct',
      sender: {
        id: authState.account._id,
        displayName: authState.account.displayName,
        role: authState.account.role,
      },
      senderRole: authState.account.role,
      text,
      createdAt: '2026-10-28T10:05:00.000Z',
    },
  }));
});

describe('BakeryChatsSection & BakeryTeamChat', () => {
  it('renders Overview, Messages, and Team Chat navigation tabs in /bakery/chats', async () => {
    render(
      <MemoryRouter initialEntries={['/bakery/chats?tab=team']}>
        <BakeryChatsSection />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: 'Overview' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Messages' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Team Chat' })).toHaveAttribute('aria-current', 'page');

    expect(await screen.findByText('Team & Staff Chat')).toBeInTheDocument();
    expect(screen.getByText('Good morning team!')).toBeInTheDocument();
  });

  it('allows communicating in the shared Bakery Team Room and switching to direct chat with Admin or other Staff', async () => {
    render(
      <MemoryRouter>
        <BakeryTeamChat />
      </MemoryRouter>
    );

    expect(await screen.findByText('Good morning team!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open direct chat with Head Baker' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open direct chat with Cake Decorator' })).toBeInTheDocument();

    // Send message in Bakery Team Room
    const input = screen.getByLabelText('Message team');
    fireEvent.change(input, { target: { value: 'On it, starting frosting now!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send team message' }));

    await waitFor(() => {
      expect(teamChatApi.sendMessage).toHaveBeenCalledWith({
        channelKey: 'general',
        recipientId: undefined,
        text: 'On it, starting frosting now!',
      });
      expect(screen.getByText('On it, starting frosting now!')).toBeInTheDocument();
    });

    // Switch to direct chat with Head Baker (Admin)
    fireEvent.click(screen.getByRole('button', { name: 'Open direct chat with Head Baker' }));

    await waitFor(() => {
      expect(screen.getAllByText('Please check the 2pm cake order.').length).toBeGreaterThanOrEqual(1);
    });

    fireEvent.change(screen.getByLabelText('Message team'), {
      target: { value: 'I checked the 2pm order, all ready!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send team message' }));

    await waitFor(() => {
      expect(teamChatApi.sendMessage).toHaveBeenCalledWith({
        channelKey: 'dm:admin-1:staff-1',
        recipientId: 'admin-1',
        text: 'I checked the 2pm order, all ready!',
      });
      expect(screen.getAllByText('I checked the 2pm order, all ready!').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('supports reply, pin, quick like, attachments, and chat details history in Team Chat', async () => {
    render(
      <MemoryRouter>
        <BakeryTeamChat />
      </MemoryRouter>
    );

    expect(await screen.findByText('Good morning team!')).toBeInTheDocument();

    // Reply to a team message
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByText(/Replying to/i)).toBeInTheDocument();

    // Pin a team message
    fireEvent.click(screen.getByRole('button', { name: 'Pin message' }));
    expect(screen.getByText('Pinned')).toBeInTheDocument();

    // Open Chat Details & History panel
    fireEvent.click(screen.getByRole('button', { name: 'Conversation info' }));
    expect(screen.getByText('Chat Details')).toBeInTheDocument();
    expect(screen.getByText('Pinned messages')).toBeInTheDocument();
    expect(screen.getByText('Media, files and links')).toBeInTheDocument();

    // Attach button is present
    expect(
      screen.getByRole('button', { name: 'Attach a photo, video, or file' })
    ).toBeInTheDocument();
  });
});
