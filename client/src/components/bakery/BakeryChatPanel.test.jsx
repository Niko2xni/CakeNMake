import React from 'react';
import { act, fireEvent, render, screen, cleanup, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BakeryChatPanel from './BakeryChatPanel';

const mocks = vi.hoisted(() => {
  const socket = { listeners: {} };
  socket.on = vi.fn((event, handler) => { socket.listeners[event] = handler; });
  socket.off = vi.fn((event) => { delete socket.listeners[event]; });
  socket.emit = vi.fn((event, payload, acknowledge) => {
    if (event === 'bakery:presence:watch') acknowledge?.({ ok: true, online: mocks.presenceOnline });
  });
  return {
    useChat: vi.fn(),
    auth: { account: null, isAuthenticated: false },
    presenceOnline: false,
    socket,
  };
});
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useChat', () => ({ useChat: mocks.useChat }));
vi.mock('@/lib/chat-socket', () => ({ getChatSocket: vi.fn(async () => mocks.socket) }));

afterEach(() => {
  cleanup();
  mocks.auth = { account: null, isAuthenticated: false };
  mocks.presenceOnline = false;
  mocks.socket.listeners = {};
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 });
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('guest bakery chat', () => {
  it('opens and exchanges simulated messages without authenticated chat', () => {
    vi.useFakeTimers();
    const view = render(<BakeryChatPanel config={{}} onChange={vi.fn()} aiChatSession={{}} />);
    expect(screen.getByText(/Demo chat/)).toBeInTheDocument();
    expect(screen.queryByText('Cake AI')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bakery Chat' })).not.toBeInTheDocument();
    expect(screen.getByText(/We received your order/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Message the bakery...'), {
      target: { value: 'Can we discuss delivery?' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Message the bakery...'), { key: 'Enter' });
    expect(screen.getByText('Can we discuss delivery?')).toBeInTheDocument();
    expect(screen.getByText('Can we discuss delivery?').closest('.flex.gap-2')).toHaveClass('justify-end');
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByText(/Thanks for reaching out/)).toBeInTheDocument();
    expect(screen.getByText(/Thanks for reaching out/).closest('.flex.gap-2')).toHaveClass('justify-start');
    expect(mocks.useChat).not.toHaveBeenCalled();
    view.unmount();
  });
  it('uses the demo for an unauthenticated session with stale account data', () => {
    mocks.auth = { account: { id: 'staff', role: 'staff' }, isAuthenticated: false };
    render(<BakeryChatPanel />);
    expect(screen.getByText(/Demo chat/)).toBeInTheDocument();
    expect(mocks.useChat).not.toHaveBeenCalled();
  });
  it('shows the current account messages on the right regardless of role', () => {
    mocks.auth = { account: { id: 'staff', role: 'staff' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({
      messages: [
        { id: 'one', text: 'My message', senderRole: 'staff', senderProfile: { id: 'staff' } },
        { id: 'two', text: 'Bakery reply', senderRole: 'staff', senderProfile: { id: 'other' } },
      ],
    });
    render(<BakeryChatPanel />);
    expect(screen.getByText('My message').closest('.flex.gap-2')).toHaveClass('justify-end');
    expect(screen.getByText('Bakery reply').closest('.flex.gap-2')).toHaveClass('justify-start');
  });

  it('shows live bakery presence and uses a single sent check for customer messages', async () => {
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.presenceOnline = true;
    mocks.useChat.mockReturnValue({
      activeConversation: { id: 'conversation-1', platform: { name: 'Mamsie Bakery' } },
      messages: [
        {
          id: 'message-sent',
          conversationId: 'conversation-1',
          text: 'Order sent',
          senderRole: 'customer',
          senderProfile: { id: 'customer' },
        },
      ],
    });
    render(<BakeryChatPanel />);

    await waitFor(() => expect(screen.getByText('Online')).toBeInTheDocument());
    const sentMessage = screen.getByText('Order sent').closest('.flex.gap-2');
    expect(sentMessage.querySelector('svg.lucide-check')).toBeInTheDocument();
    expect(sentMessage.querySelector('svg.lucide-check-check')).not.toBeInTheDocument();
    expect(mocks.socket.emit).toHaveBeenCalledWith(
      'bakery:presence:watch',
      { conversationId: 'conversation-1' },
      expect.any(Function),
    );
  });

  it('scrolls the mobile message list when the user holds and drags with a mouse', () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({
      messages: [{
        id: 'message-drag',
        conversationId: 'conversation-1',
        text: 'Drag to scroll',
        senderRole: 'bakery_staff',
        senderProfile: { id: 'bakery' },
      }],
    });
    render(<BakeryChatPanel />);

    const messageList = document.querySelector('.overflow-y-auto');
    messageList.scrollTop = 80;
    fireEvent.mouseDown(messageList, { button: 0, clientX: 100, clientY: 200 });
    fireEvent.mouseMove(window, { clientX: 100, clientY: 140 });

    expect(messageList.scrollTop).toBe(140);
    fireEvent.mouseUp(window);
    act(() => vi.advanceTimersByTime(100));
  });

  it('renders pasted web links safely and leaves markup as text', () => {
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({
      messages: [
        {
          id: 'message-1',
          conversationId: 'conversation-1',
          text: '<img src=x onerror=alert(1)> https://example.com/path',
          senderRole: 'customer',
          senderProfile: { id: 'customer' },
        },
      ],
    });

    render(<BakeryChatPanel />);

    expect(screen.getByText(/<img src=x onerror=alert\(1\)>/)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://example.com/path' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('button', { name: 'Add an image' })).toBeInTheDocument();
    expect(screen.queryByText(/share images or paste a link/i)).not.toBeInTheDocument();
  });

  it('does not turn unsafe URL schemes into links', () => {
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({
      messages: [
        {
          id: 'message-2',
          conversationId: 'conversation-1',
          text: 'javascript:alert(1)',
          senderRole: 'customer',
          senderProfile: { id: 'customer' },
        },
      ],
    });

    render(<BakeryChatPanel />);

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });

  it('renders only conversation-scoped Firebase image attachments inline', () => {
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({
      messages: [
        {
          id: 'message-3',
          conversationId: 'conversation-1',
          text: 'Image: https://firebasestorage.googleapis.com/v0/b/test-bucket/o/chat-attachments%2Fcustomer-uid%2Fconversation-1%2Fimage.png?alt=media&token=secret',
          senderRole: 'customer',
          senderProfile: { id: 'customer' },
        },
        {
          id: 'message-4',
          conversationId: 'conversation-1',
          text: 'Image: https://evil.example/image.png',
          senderRole: 'customer',
          senderProfile: { id: 'customer' },
        },
      ],
    });

    render(<BakeryChatPanel />);

    expect(screen.getAllByRole('img', { name: 'Image shared with the bakery' })).toHaveLength(1);
  });

  it('asks before opening the image picker and supports one-time or saved access', async () => {
    localStorage.clear();
    const pickerClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({ messages: [] });
    render(<BakeryChatPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Add an image' }));
    expect(screen.getByRole('dialog', { name: 'Allow Photo Access?' })).toBeInTheDocument();
    expect(pickerClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Allow Once' }));
    await waitFor(() => expect(pickerClick).toHaveBeenCalledTimes(1));
    expect(localStorage.getItem('cakenmake_attachment_permission')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Add an image' }));
    fireEvent.click(screen.getByRole('button', { name: 'Allow Everytime' }));
    await waitFor(() => expect(pickerClick).toHaveBeenCalledTimes(2));
    expect(localStorage.getItem('cakenmake_attachment_permission')).toBe('permanent');

    fireEvent.click(screen.getByRole('button', { name: 'Add an image' }));
    expect(pickerClick).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    pickerClick.mockRestore();
  });

  it('does not open the image picker when photo access is denied', () => {
    localStorage.clear();
    const pickerClick = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    mocks.auth = { account: { id: 'customer', role: 'customer' }, isAuthenticated: true };
    mocks.useChat.mockReturnValue({ messages: [] });
    render(<BakeryChatPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Add an image' }));
    fireEvent.click(screen.getByRole('button', { name: "Don't Allow" }));

    expect(pickerClick).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    pickerClick.mockRestore();
  });
});
