import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bakeryApi, transactionApi } from '@/services/api';
import BakeryOrders from './BakeryOrders';

vi.mock('@/services/api', () => ({
  bakeryApi: { getReservations: vi.fn(), updateReservationStatus: vi.fn() },
  transactionApi: { getTransactions: vi.fn() },
}));
vi.mock('@/components/shared/CustomScrollbar', () => ({ default: ({ children, className }) => <div className={className}>{children}</div> }));

const order = {
  _id: 'order-1', user: { displayName: 'Ana Cruz', email: 'ana@example.com' },
  status: 'confirmed', totalPrice: 2000, pickupDate: '2026-10-15', createdAt: '2026-10-01',
  downPayment: { amount: 500, isPaid: true, paidAt: '2026-10-02' },
};
const unpaid = { ...order, _id: 'order-2', user: { displayName: 'Ben Reyes' }, status: 'pending_payment', downPayment: { amount: 500, isPaid: false } };
const summary = { totalDownPaymentsCollected: 500, totalRevenueExpected: 4000, pendingCount: 1 };

function Location() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname}{location.search}</output>;
}
function setup(route = '/bakery/orders') {
  render(<MemoryRouter initialEntries={[route]}><BakeryOrders /><Location /></MemoryRouter>);
}
const tab = (name) => screen.getByRole('tab', { name });

beforeEach(() => {
  vi.resetAllMocks();
  bakeryApi.getReservations.mockResolvedValue([order, unpaid]);
  transactionApi.getTransactions.mockResolvedValue({ transactions: [order, unpaid], summary });
});

describe('Orders', () => {
  it('preserves reservation search and status filters when switching tabs', async () => {
    setup();
    await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('Ana Cruz');
    const search = screen.getByLabelText('Search reservations by customer name');
    fireEvent.change(search, { target: { value: 'Ana' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmed' }));
    fireEvent.click(tab('Payment History'));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('?tab=payments');
    fireEvent.click(tab('Reservations'));
    expect(search).toHaveValue('Ana');
    expect(screen.getByRole('button', { name: 'Confirmed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByText('Ben Reyes')).not.toBeVisible();
  });

  it('opens a linked reservation from a directly loaded payment tab', async () => {
    setup('/bakery/orders?tab=payments');
    expect(tab('Payment History')).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' }));
    expect(tab('Reservations')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Reservation Details')).toBeVisible();
    expect(screen.getByText('ana@example.com')).toBeVisible();
  });

  it('distinguishes paid dates, reservation dates and unpaid down payments', async () => {
    setup('/bakery/orders?tab=payments');
    const paidRow = await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' });
    expect(within(paidRow).getByText(/Reservation date:/)).toBeVisible();
    expect(within(paidRow).getByText(/Down payment date:/)).toBeVisible();
    const unpaidRow = screen.getByRole('button', { name: 'Open reservation for Ben Reyes' });
    expect(within(unpaidRow).getByText('Unpaid')).toBeVisible();
    expect(within(unpaidRow).queryByText(/Down payment date:/)).not.toBeInTheDocument();
  });

  it('refreshes both views after an update and keeps customer details', async () => {
    setup('/bakery/orders?tab=payments');
    fireEvent.click(await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' }));
    const updated = { ...order, status: 'in_production' };
    bakeryApi.updateReservationStatus.mockResolvedValue({ ...updated, user: 'raw-user-id' });
    bakeryApi.getReservations.mockResolvedValue([updated, unpaid]);
    transactionApi.getTransactions.mockResolvedValue({ transactions: [updated, unpaid], summary });
    const detail = screen.getByText('Reservation Details').parentElement.parentElement;
    fireEvent.click(within(detail).getByRole('button', { name: 'In Production' }));
    await waitFor(() => expect(bakeryApi.getReservations).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(transactionApi.getTransactions).toHaveBeenCalledTimes(2));
    expect(screen.getByText('ana@example.com')).toBeVisible();
    fireEvent.click(tab('Payment History'));
    expect(within(await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' })).getByText('Order status: In Production')).toBeVisible();
  });

  it('shows a retryable payment error while reservations remain usable', async () => {
    transactionApi.getTransactions.mockRejectedValueOnce(new Error('offline'));
    setup();
    await screen.findByText('Could not load payment information. Please try again.');
    expect(screen.getByText('Ana Cruz')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('₱4,000');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows an update failure without changing the displayed order', async () => {
    bakeryApi.updateReservationStatus.mockRejectedValue(new Error('offline'));
    setup('/bakery/orders?tab=payments');
    fireEvent.click(await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' }));
    const detail = screen.getByText('Reservation Details').parentElement.parentElement;
    fireEvent.click(within(detail).getByRole('button', { name: 'Completed' }));
    await screen.findByText('Could not update the order status. Please try again.');
    expect(bakeryApi.getReservations).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard navigation between tabs', async () => {
    setup();
    await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('Ana Cruz');
    fireEvent.keyDown(tab('Reservations'), { key: 'ArrowRight' });
    expect(tab('Payment History')).toHaveFocus();
    expect(tab('Payment History')).toHaveAttribute('aria-selected', 'true');
  });

  it('shows distinct empty states for each view', async () => {
    bakeryApi.getReservations.mockResolvedValue([]);
    transactionApi.getTransactions.mockResolvedValue({ transactions: [], summary: { totalDownPaymentsCollected: 0, totalRevenueExpected: 0, pendingCount: 0 } });
    setup();
    expect(await screen.findByText('No reservations found.')).toBeVisible();
    fireEvent.click(tab('Payment History'));
    expect(await screen.findByText('No payment records yet.')).toBeVisible();
  });

  it('retries failed reservations independently of payment information', async () => {
    bakeryApi.getReservations.mockRejectedValueOnce(new Error('offline'));
    setup();
    await screen.findByText('Could not load reservations. Please try again.');
    expect(screen.queryByText('No reservations found.')).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('Ana Cruz')).toBeVisible();
    expect(transactionApi.getTransactions).toHaveBeenCalledTimes(1);
  });
});
