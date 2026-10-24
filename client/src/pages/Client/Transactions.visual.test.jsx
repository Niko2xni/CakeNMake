import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Transactions from './Transactions';

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
    id: 'res-101',
    reservationId: 'res-101',
    blueprintId: 'bp-101',
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
    id: 'res-102',
    reservationId: 'res-102',
    blueprintId: 'bp-102',
    designName: 'Chocolate Birthday Cake',
    thumbnail: null,
    bakeryName: 'AH TINAPS BAKESHOP',
    totalPrice: 1800,
    downPayment: { amount: 900, isPaid: true, method: 'gcash' },
    pickupDate: '2026-11-20T10:00:00.000Z',
    status: 'completed',
    createdAt: '2026-10-18T12:00:00.000Z',
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
    apiMocks.getTransactions.mockResolvedValue({ transactions: mockTransactions });
  });

  it('renders customer cake orders list, filter tabs, and search input', async () => {
    renderPage();

    expect(await screen.findByText('My Cake Orders')).toBeInTheDocument();
    expect(screen.getByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all orders \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ongoing \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /completed \(1\)/i })).toBeInTheDocument();
  });

  it('filters orders when clicking ongoing and completed tabs', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');

    fireEvent.click(screen.getByRole('button', { name: /completed \(1\)/i }));
    expect(screen.queryByText('Floral Wedding Cake')).not.toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ongoing \(1\)/i }));
    expect(screen.getByText('Floral Wedding Cake')).toBeInTheDocument();
    expect(screen.queryByText('Chocolate Birthday Cake')).not.toBeInTheDocument();
  });

  it('filters orders when typing in search input', async () => {
    renderPage();

    await screen.findByText('Floral Wedding Cake');
    const searchInput = screen.getByPlaceholderText(/search by cake/i);

    fireEvent.change(searchInput, { target: { value: 'Chocolate' } });

    expect(screen.queryByText('Floral Wedding Cake')).not.toBeInTheDocument();
    expect(screen.getByText('Chocolate Birthday Cake')).toBeInTheDocument();
  });

  it('opens receipt modal with customer itemized breakdown when clicking View Receipt', async () => {
    renderPage();

    const viewReceiptButtons = await screen.findAllByRole('button', { name: /view receipt/i });
    fireEvent.click(viewReceiptButtons[0]);

    expect(await screen.findByText('Price list breakdown')).toBeInTheDocument();
    expect(screen.getByText('Tier 1 Round 8"')).toBeInTheDocument();
    expect(screen.getByText('Vanilla Buttercream')).toBeInTheDocument();
    expect(screen.getByText('Sugar Flowers')).toBeInTheDocument();
    expect(screen.getByText(/balance to pay/i)).toBeInTheDocument();
  });

  it('completes simulated GCash balance payment and updates status to In Production', async () => {
    apiMocks.payBalance.mockResolvedValue({
      message: 'Balance payment completed successfully. Order is now in production!',
      reservationId: 'res-101',
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

  it('renders helpful empty state when user has no orders', async () => {
    apiMocks.getTransactions.mockResolvedValue({ transactions: [] });
    renderPage();

    expect(await screen.findByText('No cake orders yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /start designing your cake/i })).toHaveAttribute('href', '/designer');
  });
});
