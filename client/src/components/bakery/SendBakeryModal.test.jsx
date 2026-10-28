import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SendBakeryModal from './SendBakeryModal';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

const mocks = vi.hoisted(() => ({
  auth: { account: { id: 'cust1', displayName: 'Jane Doe', role: 'customer' } },
  moderationMine: vi.fn().mockResolvedValue({ restriction: null }),
}));

vi.mock('@/lib/AuthContext', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/services/chat-api', () => ({ moderationApi: { mine: mocks.moderationMine } }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SendBakeryModal 2-step flow', () => {
  it('renders Step 1 of 2: Reservation Date initially', () => {
    render(
      <MemoryRouter>
        <SendBakeryModal config={{}} total={2000} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.getByText('Step 1 of 2: Reservation Date')).toBeInTheDocument();
    expect(screen.queryByText(/Step 2 of 3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Choose Fulfillment Method/i)).not.toBeInTheDocument();
  });

  it('navigates directly to Step 2 of 2: Payment when Continue to Payment is clicked', async () => {
    render(
      <MemoryRouter>
        <SendBakeryModal config={{}} total={2000} onClose={vi.fn()} />
      </MemoryRouter>
    );

    // Find enabled date button in DeliveryCalendar
    const dateButtons = screen.getAllByRole('button').filter(b => !b.disabled && /^\d{1,2}$/.test(b.textContent || ''));
    expect(dateButtons.length).toBeGreaterThan(0);
    fireEvent.click(dateButtons[0]);

    const continueBtn = await screen.findByRole('button', { name: 'Continue to Payment' });
    expect(continueBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(continueBtn);
    });

    expect(mocks.moderationMine).toHaveBeenCalled();
    expect(await screen.findByText('Step 2 of 2: Payment')).toBeInTheDocument();
    expect(screen.getByText('GCash demo')).toBeInTheDocument();
    expect(screen.queryByText(/Choose Fulfillment Method/i)).not.toBeInTheDocument();
  });

  it('navigates back to Step 1 of 2 when the back button is clicked in payment step', async () => {
    render(
      <MemoryRouter>
        <SendBakeryModal config={{}} total={2000} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const dateButtons = screen.getAllByRole('button').filter(b => !b.disabled && /^\d{1,2}$/.test(b.textContent || ''));
    fireEvent.click(dateButtons[0]);

    const continueBtn = await screen.findByRole('button', { name: 'Continue to Payment' });
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    expect(await screen.findByText('Step 2 of 2: Payment')).toBeInTheDocument();

    // Click back to date selection inside GCashPayment
    const backBtn = screen.getByRole('button', { name: /Back to date selection/i });
    fireEvent.click(backBtn);

    expect(screen.getByText('Step 1 of 2: Reservation Date')).toBeInTheDocument();
  });

  it('navigates back to Step 1 of 2 when the header ChevronLeft button is clicked in payment step', async () => {
    render(
      <MemoryRouter>
        <SendBakeryModal config={{}} total={2000} onClose={vi.fn()} />
      </MemoryRouter>
    );

    const dateButtons = screen.getAllByRole('button').filter(b => !b.disabled && /^\d{1,2}$/.test(b.textContent || ''));
    fireEvent.click(dateButtons[0]);

    const continueBtn = await screen.findByRole('button', { name: 'Continue to Payment' });
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    expect(await screen.findByText('Step 2 of 2: Payment')).toBeInTheDocument();

    // Click header back button
    const headerBackBtn = screen.getByRole('button', { name: 'Back to calendar' });
    fireEvent.click(headerBackBtn);

    expect(screen.getByText('Step 1 of 2: Reservation Date')).toBeInTheDocument();
  });

  it('updates header to Order Confirmed and disables back navigation once payment is submitted', async () => {
    const onPaymentComplete = vi.fn().mockResolvedValue();
    render(
      <MemoryRouter>
        <SendBakeryModal config={{}} total={2000} onClose={vi.fn()} onPaymentComplete={onPaymentComplete} />
      </MemoryRouter>
    );

    const dateButtons = screen.getAllByRole('button').filter(b => !b.disabled && /^\d{1,2}$/.test(b.textContent || ''));
    fireEvent.click(dateButtons[0]);

    const continueBtn = await screen.findByRole('button', { name: 'Continue to Payment' });
    await act(async () => {
      fireEvent.click(continueBtn);
    });

    expect(await screen.findByText('Step 2 of 2: Payment')).toBeInTheDocument();

    // Trigger payment
    const checkoutBtn = screen.getByRole('button', { name: /Continue GCash demo/i });
    fireEvent.click(checkoutBtn);

    const confirmModalBtn = await screen.findByRole('button', { name: /Submit demo order/i });
    await act(async () => {
      fireEvent.click(confirmModalBtn);
    });

    // Wait for the simulated checkout timer & submission
    await vi.waitFor(() => {
      expect(onPaymentComplete).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(await screen.findByText('Order Confirmed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Back to calendar' })).not.toBeInTheDocument();
  });
});
