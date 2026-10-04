import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { moderationApi } from '@/services/chat-api';
import BakeryChatOverview from './BakeryChatOverview';

vi.mock('@/services/chat-api', () => ({ moderationApi: { overview: vi.fn(), evidence: vi.fn(), review: vi.fn(), restrict: vi.fn(), flag: vi.fn(), reply: vi.fn() } }));
vi.mock('@/lib/chat-socket', () => ({ getChatSocket: async () => ({ on: vi.fn(), off: vi.fn() }) }));
const customer = { _id: 'customer-1', displayName: 'Ana Cruz', email: 'ana@example.com', restriction: null, restrictionVersionId: null, moderationHistory: [] };
const flag = { _id: 'message-1', sender: customer, text: 'repeated promotion', flagReason: 'Repeated identical message', createdAt: '2026-10-04T00:00:00Z' };
beforeEach(() => {
  vi.resetAllMocks();
  moderationApi.overview.mockResolvedValue({ customers: [customer], flags: [flag], requests: [] });
  moderationApi.evidence.mockResolvedValue({ customer, messages: [{ ...flag, moderation: 'rejected', reviewedAt: '2026-10-04T00:00:00Z' }] });
  moderationApi.review.mockResolvedValue({});
  moderationApi.restrict.mockResolvedValue({});
});
describe('Chats Overview', () => {
  it('combines account status filters with customer search', async () => {
    moderationApi.overview.mockResolvedValue({ customers: [customer, { ...customer, _id: 'customer-2', displayName: 'Ben Santos', email: 'ben@example.com', restriction: { type: 'suspended' } }], flags: [], requests: [] });
    render(<BakeryChatOverview />);
    await screen.findByRole('button', { name: /Ana Cruz ana@example.com Unrestricted/ });
    fireEvent.click(screen.getByRole('button', { name: 'Suspended' }));
    expect(screen.queryByRole('button', { name: /Ana Cruz ana@example.com Unrestricted/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ben Santos ben@example.com suspended/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search customer accounts'), { target: { value: 'Ana' } });
    expect(screen.getByText('No customers found')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All customers' }));
    expect(screen.getByRole('button', { name: /Ana Cruz ana@example.com Unrestricted/ })).toBeInTheDocument();
  });
  it('requires a reason to release a flagged message', async () => {
    render(<BakeryChatOverview />);
    const release = await screen.findByRole('button', { name: 'Dismiss flag & release' });
    expect(release).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Message review reason'), { target: { value: 'Legitimate cake reference' } });
    fireEvent.click(release);
    await waitFor(() => expect(moderationApi.review).toHaveBeenCalledWith('message-1', 'release', 'Legitimate cake reference'));
  });
  it('requires an evidence review acknowledgement before banning', async () => {
    render(<BakeryChatOverview />);
    fireEvent.click(await screen.findByRole('button', { name: /Ana Cruz ana@example.com Unrestricted/ }));
    const ban = await screen.findByRole('button', { name: 'Ban indefinitely' });
    expect(ban).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Action / review reason'), { target: { value: 'Reviewed repeated abuse' } });
    fireEvent.change(screen.getByLabelText('Confirmed abuse evidence'), { target: { value: 'message-1' } });
    expect(ban).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(ban);
    await waitFor(() => expect(moderationApi.restrict).toHaveBeenCalledWith('customer-1', expect.objectContaining({ action: 'ban', acknowledged: true, messageId: 'message-1', expectedRestrictionId: null })));
  });
  it('shows a retryable loading failure', async () => {
    moderationApi.overview.mockRejectedValueOnce(new Error('Offline'));
    render(<BakeryChatOverview />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Offline');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByText('Messages awaiting review');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
