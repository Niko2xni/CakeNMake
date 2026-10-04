import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { moderationApi } from '@/services/chat-api';
import Support from './Support';

vi.mock('@/components/client/ClientNavbar', () => ({ default: () => <nav>Customer navigation</nav> }));
vi.mock('@/services/chat-api', () => ({ moderationApi: { mine: vi.fn(), createRequest: vi.fn(), reply: vi.fn(), blueprintAccess: vi.fn() } }));
const id = 'a'.repeat(24);
const restriction = { id: 'restriction-1', type: 'banned', reason: 'Repeated abuse', startedAt: '2026-10-04T00:00:00Z' };
const order = { _id: id, status: 'confirmed', totalPrice: 2000, createdAt: '2026-10-01', pickupDate: '2026-10-10', downPayment: { amount: 500, isPaid: true } };
beforeEach(() => {
  vi.resetAllMocks();
  moderationApi.mine.mockResolvedValue({ restriction, orders: [order], blueprints: [], requests: [] });
  moderationApi.createRequest.mockResolvedValue({});
});
describe('Customer support during restrictions', () => {
  it('keeps existing order and payment information visible and allows an appeal', async () => {
    render(<Support />);
    await screen.findByText('Account banned');
    expect(screen.getByText(/Total: ₱2,000/)).toBeVisible();
    fireEvent.change(screen.getByLabelText('Request type'), { target: { value: 'appeal' } });
    fireEvent.change(screen.getByLabelText('Request message'), { target: { value: 'Please review this decision' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));
    await waitFor(() => expect(moderationApi.createRequest).toHaveBeenCalledWith(expect.objectContaining({ kind: 'appeal', text: 'Please review this decision' })));
  });
  it('prevents another appeal while one is pending', async () => {
    moderationApi.mine.mockResolvedValue({ restriction, orders: [order], blueprints: [], requests: [{ _id: 'request-1', kind: 'appeal', restriction: 'restriction-1', status: 'waiting_staff', messages: [] }] });
    render(<Support />);
    await screen.findByText('Account banned');
    fireEvent.change(screen.getByLabelText('Request type'), { target: { value: 'appeal' } });
    fireEvent.change(screen.getByLabelText('Request message'), { target: { value: 'Again' } });
    expect(screen.getByRole('button', { name: 'Submit request' })).toBeDisabled();
    expect(screen.getByText('Wait for staff to reply before sending a follow-up.')).toBeVisible();
  });
  it('allows a follow-up after a staff response', async () => {
    moderationApi.mine.mockResolvedValue({ restriction, orders: [], blueprints: [], requests: [{ _id: 'request-1', kind: 'appeal', status: 'waiting_customer', messages: [{ role: 'staff', text: 'Can you explain?', at: '2026-10-04T00:00:00Z' }] }] });
    moderationApi.reply.mockResolvedValue({});
    render(<Support />);
    fireEvent.change(await screen.findByLabelText('Support reply'), { target: { value: 'Here is my explanation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    await waitFor(() => expect(moderationApi.reply).toHaveBeenCalledWith('request-1', 'Here is my explanation', false));
  });
});
