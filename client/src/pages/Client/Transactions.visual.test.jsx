import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Transactions from './Transactions';
import * as maintenanceModule from '@/utils/maintenance';

const apiMocks = vi.hoisted(() => ({
  getTransactions: vi.fn(),
  payBalance: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  accountApi: apiMocks,
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'John Doe', email: 'john@example.com' },
    account: { displayName: 'John Doe', email: 'john@example.com' },
  }),
}));

const mockTransactions = [
  {
    id: 'res-101-order-abc',
    reservationId: 'res-101-order-abc',
    blueprintId: 'bp-101',
    designId: 'des-101',
    designName: 'Floral Wedding Cake',
    thumbnail: 'https://example.com/cake.png',
    bakeryName: 'AH TINAPS BAKESHOP',
    totalPrice: 3200,
    downPayment: { amount: 1600, isPaid: true, method: 'gcash' },
    pickupDate: '2026-11-15T10:00:00.000Z',
    status: 'confirmed',
    createdAt: '2026-10-20T14:30:00.000Z',
    pricingSnapshot: {
      totalMinor: 320000,
      currency: 'PHP',
      lineItems: [
        { label: 'Tier 1 Round 8"', quantity: 1, unitPriceMinor: 150000, lineTotalMinor: 150000 },
        { label: 'Vanilla Buttercream', quantity: 1, unitPriceMinor: 80000, lineTotalMinor: 80000 },
        { label: 'Sugar Flowers', quantity: 3, unitPriceMinor: 30000, lineTotalMinor: 90000 },
      ],
    },
  },
  {
    id: 'res-102-order-xyz',
    reservationId: 'res-102-order-xyz',
    blueprintId: 'bp-102',
    designId: { _id: 'des-102' },
    designName: 'Chocolate Birthday Cake',
    thumbnail: null,
    bakeryName: 'Mamshie Bakeshop',
    totalPrice: 1800,
    downPayment: { amount: 900, isPaid: true, method: 'gcash' },
    pickupDate: '2026-11-20T10:00:00.000Z',
    status: 'completed',
    createdAt: '2026-10-18T12:00:00.000Z',
  },
  {
    id: 'res-103-order-inprod',
    reservationId: 'res-103-order-inprod',
    blueprintId: 'bp-103',
    designName: 'Ube Velvet Cake',
    thumbnail: null,
    bakeryName: 'AH TINAPS BAKESHOP',
    totalPrice: 2400,
    downPayment: { amount: 1200, isPaid: true, method: 'gcash' },
    remainingBalance: 1200,
    pickupDate: '2026-11-25T10:00:00.000Z',
    status: 'in_production',
    createdAt: '2026-10-22T08:00:00.000Z',
  },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/transactions']}>
      <Transactions />
    </MemoryRouter>,
  );
}

describe('Transactions page presentation and interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(maintenanceModule, 'isWithinThirtyMinutePaymentCutoff').mockReturnValue(false);
    apiMocks.getTransactions.mockResolvedValue({ transactions: mockTransactions });
  });

  it('renders customer cake orders list, filter tabs, and counts', async () => {
    renderPage();

    expect(await screen.findByText('My Cake Orders')).toBeInTheDocument();
    expect(screen.getByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();
    expect(screen.getByText('Ube Velvet Cake')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /all orders \(3\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ongoing \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed \(1\)/i })).toBeInTheDocument();
  });

  it('filters orders when clicking ongoing and completed tabs', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');

    // Click Completed tab
    fireEvent.click(screen.getByRole('button', { name: /completed \(1\)/i }));
    expect(screen.queryByText('Floral Wedding Cake')).not.toBeInTheDocument();
    expect(screen.queryByText('Ube Velvet Cake')).not.toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();

    // Click Ongoing tab
    fireEvent.click(screen.getByRole('button', { name: /ongoing \(2\)/i }));
    expect(screen.getByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.getByText('Ube Velvet Cake')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Birthday Cake')).not.toBeInTheDocument();

    // Click All Orders tab
    fireEvent.click(screen.getByRole('button', { name: /all orders \(3\)/i }));
    expect(screen.getByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();
    expect(screen.getByText('Ube Velvet Cake')).toBeInTheDocument();
  });

  it('filters orders by order ID with or without hash prefix', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');
    const searchInput = screen.getByPlaceholderText(/search by cake/i);

    // Search by partial ID
    fireEvent.change(searchInput, { target: { value: '#ORDER-ABC' } });
    expect(screen.getByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Birthday Cake')).not.toBeInTheDocument();

    // Search by clean partial ID without hash
    fireEvent.change(searchInput, { target: { value: 'order-xyz' } });
    expect(screen.queryByText('Floral Wedding Cake')).not.toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();
  });

  it('filters orders by status like "in production"', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');
    const searchInput = screen.getByPlaceholderText(/search by cake/i);

    fireEvent.change(searchInput, { target: { value: 'in production' } });
    expect(screen.getByText('Ube Velvet Cake')).toBeInTheDocument();
    expect(screen.queryByText('Floral Wedding Cake')).not.toBeInTheDocument();
    expect(screen.queryByText('Chocolate Birthday Cake')).not.toBeInTheDocument();
  });

  it('shows empty search state when no orders match and restores on Clear Search', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');
    const searchInput = screen.getByPlaceholderText(/search by cake/i);

    fireEvent.change(searchInput, { target: { value: 'NonexistentCake123' } });

    expect(await screen.findByText('No matching orders found')).toBeInTheDocument();
    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);

    expect(await screen.findByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();
    expect(screen.getByText('Ube Velvet Cake')).toBeInTheDocument();
  });

  it('opens receipt modal with itemized breakdown and allows opening balance payment', async () => {
    renderPage();

    const viewReceiptButtons = await screen.findAllByRole('button', { name: /view receipt/i });
    fireEvent.click(viewReceiptButtons[0]);

    expect(await screen.findByText('Price list breakdown')).toBeInTheDocument();
    expect(screen.getByText('Tier 1 Round 8"')).toBeInTheDocument();
    expect(screen.getByText('Vanilla Buttercream')).toBeInTheDocument();
    expect(screen.getByText('Sugar Flowers')).toBeInTheDocument();
    expect(screen.getByText(/balance to pay/i)).toBeInTheDocument();

    // Click Pay Remaining Balance inside the Receipt Modal
    const payFromModalBtn = screen.getByRole('button', { name: /pay remaining balance/i });
    expect(payFromModalBtn).toBeInTheDocument();

    fireEvent.click(payFromModalBtn);

    expect(await screen.findByText('Complete Cake Balance')).toBeInTheDocument();
  });

  it('completes simulated GCash balance payment and updates status to In Production', async () => {
    apiMocks.payBalance.mockResolvedValue({
      message: 'Balance payment completed successfully. Order is now in production!',
      reservationId: 'res-101-order-abc',
      status: 'in_production',
      finalPayment: { amount: 1600, isPaid: true, method: 'gcash' },
    });

    renderPage();

    const payBalanceBtn = await screen.findByRole('button', { name: /pay balance \(₱1,600\)/i });
    expect(payBalanceBtn).toBeInTheDocument();

    fireEvent.click(payBalanceBtn);

    expect(await screen.findByText('Complete Cake Balance')).toBeInTheDocument();
    expect(screen.getByText(/pay ₱1,600 with gcash/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pay ₱1,600 with gcash/i }));

    expect(await screen.findByText('Payment Complete!')).toBeInTheDocument();
    expect(screen.getByText(/status switched to in production!/i)).toBeInTheDocument();
  });

  it('handles simulated payment failure gracefully without crashing', async () => {
    apiMocks.payBalance.mockRejectedValue(new Error('Payment gateway timed out.'));

    renderPage();

    const payBalanceBtn = await screen.findByRole('button', { name: /pay balance \(₱1,600\)/i });
    fireEvent.click(payBalanceBtn);

    expect(await screen.findByText('Complete Cake Balance')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /pay ₱1,600 with gcash/i }));

    expect(await screen.findByText('Payment gateway timed out.')).toBeInTheDocument();
  });

  it('refreshes orders when clicking Refresh Orders button', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');
    const refreshBtn = screen.getByRole('button', { name: /refresh orders/i });

    fireEvent.click(refreshBtn);

    expect(apiMocks.getTransactions).toHaveBeenCalledTimes(2);
  });

  it('shows error state when getTransactions fails and allows Try Again', async () => {
    apiMocks.getTransactions.mockRejectedValueOnce(new Error('Network connection lost'));

    renderPage();

    expect(await screen.findByText('Network connection lost')).toBeInTheDocument();
    const tryAgainBtn = screen.getByRole('button', { name: /try again/i });

    apiMocks.getTransactions.mockResolvedValueOnce({ transactions: mockTransactions });
    fireEvent.click(tryAgainBtn);

    expect(await screen.findByText('Floral Wedding Cake')).toBeInTheDocument();
  });

  it('renders helpful empty state when user has no orders', async () => {
    apiMocks.getTransactions.mockResolvedValue({ transactions: [] });
    renderPage();

    expect(await screen.findByText('No cake orders yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start designing your cake/i })).toHaveAttribute('href', '/designer');
  });
});
