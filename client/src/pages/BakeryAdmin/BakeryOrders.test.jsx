import React from 'react';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bakeryApi, transactionApi } from '@/services/api';
import BakeryOrders from './BakeryOrders';
import { chatApi } from '@/services/chat-api';
vi.mock('@/services/chat-api', () => ({ chatApi: { openReservationChat: vi.fn() } }));

vi.mock('@/services/api', () => ({
  bakeryApi: { getReservations: vi.fn(), updateReservationStatus: vi.fn(), recordDownPayment: vi.fn(), getBlueprintAccess: vi.fn() },
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
  it('searches reservations by cake and clears unmatched filters', async () => {
    bakeryApi.getReservations.mockResolvedValue([{ ...order, designName: 'Chocolate celebration' }, unpaid]);
    setup();
    await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('Ana Cruz');
    fireEvent.change(screen.getByLabelText('Search reservations by customer name'), { target: { value: 'Chocolate' } });
    const list = within(screen.getByRole('tabpanel', { name: 'Reservations' }));
    expect(list.getByText('Ana Cruz')).toBeVisible();
    expect(list.queryByText('Ben Reyes')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Search reservations by customer name'), { target: { value: 'missing' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(list.getByText('Ben Reyes')).toBeVisible();
  });
  it('filters payment history by paid status and receipt reference', async () => {
    transactionApi.getTransactions.mockResolvedValue({ transactions: [{ ...order, downPayment: { ...order.downPayment, paymentReference: 'GC-123' } }, unpaid], summary });
    setup('/bakery/orders?tab=payments');
    await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' });
    fireEvent.change(screen.getByLabelText('Filter payment history'), { target: { value: 'unpaid' } });
    expect(screen.queryByRole('button', { name: 'Open reservation for Ana Cruz' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open reservation for Ben Reyes' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Filter payment history'), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText('Search payment history'), { target: { value: 'GC-123' } });
    expect(screen.getByRole('button', { name: 'Open reservation for Ana Cruz' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Open reservation for Ben Reyes' })).not.toBeInTheDocument();
  });
  it('opens the private checkout blueprint through authorized temporary access', async () => {
    bakeryApi.getReservations.mockResolvedValue([{ ...order, blueprint: 'blueprint-1' }]);
    bakeryApi.getBlueprintAccess.mockResolvedValue({ url: 'https://example.com/private.pdf' });
    setup();
    fireEvent.click(await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('Ana Cruz'));
    fireEvent.click(screen.getByRole('button', { name: 'View blueprint PDF' }));
    expect(await screen.findByRole('dialog', { name: 'Blueprint PDF preview' })).toBeVisible();
    expect(screen.getByTitle('Order blueprint PDF')).toHaveAttribute('src', 'https://example.com/private.pdf');
    expect(bakeryApi.getBlueprintAccess).toHaveBeenCalledWith('blueprint-1');
  });
  it('opens the exact customer conversation from reservation details', async () => {
    chatApi.openReservationChat.mockResolvedValue({ conversation: { id: 'conversation-1' } });
    setup('/bakery/orders?tab=payments');
    fireEvent.click(await screen.findByRole('button', { name: 'Open reservation for Ana Cruz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open chat with customer' }));
    await waitFor(() => expect(screen.getByLabelText('Current route')).toHaveTextContent('/bakery/chats?tab=messages&conversation=conversation-1'));
    expect(chatApi.openReservationChat).toHaveBeenCalledWith('order-1');
  });
  it('records a verified down payment and refreshes orders and totals', async () => {
    bakeryApi.recordDownPayment.mockResolvedValue({});
    setup('/bakery/orders?tab=payments');
    fireEvent.click(await screen.findByRole('button', { name: 'Open reservation for Ben Reyes' }));
    expect(screen.getByRole('button', { name: 'Record verified payment' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Receipt / payment reference'), { target: { value: 'GC-12345' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record verified payment' }));
    await waitFor(() => expect(bakeryApi.recordDownPayment).toHaveBeenCalledWith('order-2', { amount: 500, method: 'gcash', reference: 'GC-12345' }));
    await waitFor(() => expect(transactionApi.getTransactions).toHaveBeenCalledTimes(2));
  });
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

  it('displays fulfillment details and pay-to-bake payment schedule in reservation details', async () => {
    const deliveryOrder = {
      ...order,
      _id: 'order-delivery',
      user: { displayName: 'Carla Gomez', email: 'carla@example.com' },
      fulfillment: {
        type: 'delivery',
        deliveryAddress: 'Unit 402, Pioneer Woodlands, Mandaluyong',
        deliveryLandmark: 'Tower 2 Lobby',
        timeSlot: '2:00 PM – 4:00 PM',
        recipientPhone: '09171234567',
        notes: 'Please keep refrigerated until rider pickup',
      },
    };
    bakeryApi.getReservations.mockResolvedValue([deliveryOrder]);
    setup();
    const row = await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('Carla Gomez');
    expect(within(row.closest('button')).getByText('🛵 Courier Delivery')).toBeVisible();
    fireEvent.click(row);
    expect(screen.getByText('Client-Booked Courier Delivery')).toBeVisible();
    expect(screen.getByText('Unit 402, Pioneer Woodlands, Mandaluyong')).toBeVisible();
    expect(screen.getByText(/Tower 2 Lobby/)).toBeVisible();
    expect(screen.getByText('2:00 PM – 4:00 PM')).toBeVisible();
    expect(screen.getByText('Pay-to-Bake Policy Status')).toBeVisible();
  });

  it('displays reservation schedule and chat coordination notice when order has no fulfillment method', async () => {
    const streamlinedOrder = {
      ...order,
      _id: 'order-streamlined',
      user: { displayName: 'David Lee', email: 'david@example.com' },
      pickupDate: '2026-10-26',
    };
    bakeryApi.getReservations.mockResolvedValue([streamlinedOrder]);
    setup();
    const row = await within(screen.getByRole('tabpanel', { name: 'Reservations' })).findByText('David Lee');
    expect(within(row.closest('button')).queryByText('🏪 Store Pickup')).not.toBeInTheDocument();
    expect(within(row.closest('button')).queryByText('🛵 Courier Delivery')).not.toBeInTheDocument();
    expect(within(row.closest('button')).getByText(/Reservation:/)).toBeVisible();
    expect(within(row.closest('button')).getByText(/2026/)).toBeVisible();
    fireEvent.click(row);
    expect(screen.getByText('Reservation Schedule')).toBeVisible();
    expect(screen.getByText('Reservation Date:')).toBeVisible();
    expect(screen.getByText('Coordinated in chat')).toBeVisible();
    expect(screen.queryByText('AH Tinaps Hub')).not.toBeInTheDocument();
  });
});
