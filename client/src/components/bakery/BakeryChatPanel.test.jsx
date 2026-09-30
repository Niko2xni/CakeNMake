import React from 'react';
import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BakeryChatPanel from './BakeryChatPanel';

const mocks = vi.hoisted(() => ({ useChat: vi.fn(), auth: { account: null, isAuthenticated: false } }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/hooks/useChat', () => ({ useChat: mocks.useChat }));

afterEach(() => {
  cleanup();
  mocks.auth = { account: null, isAuthenticated: false };
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('guest bakery chat', () => {
  it('opens and exchanges simulated messages without authenticated chat', () => {
    vi.useFakeTimers();
    const view = render(<BakeryChatPanel />);
    expect(screen.getByText(/Demo chat/)).toBeInTheDocument();
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
});
