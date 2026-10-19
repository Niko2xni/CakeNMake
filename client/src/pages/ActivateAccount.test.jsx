import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivateAccount from './ActivateAccount';
import { accountApi } from '@/services/api';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockRefreshAccount = vi.fn();
const mockUseAuth = vi.fn();
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/services/api', () => ({
  accountApi: {
    payRegistrationFee: vi.fn(),
  },
}));

describe('ActivateAccount Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      account: { role: 'customer', registrationFee: { isPaid: false } },
      isAuthenticated: true,
      isLoadingAuth: false,
      refreshAccount: mockRefreshAccount,
    });
    accountApi.payRegistrationFee.mockResolvedValue({ user: { registrationFee: { isPaid: true } } });
  });

  it('renders the ₱25 registration fee, legitimacy details, and disabled pay button by default', () => {
    render(
      <MemoryRouter>
        <ActivateAccount />
      </MemoryRouter>
    );

    expect(screen.getByText('Account Activation')).toBeVisible();
    expect(screen.getByText('₱25.00')).toBeVisible();
    expect(screen.getByText('AH TINAPS BAKESHOP')).toBeVisible();
    expect(screen.getByText('6752278')).toBeVisible();
    expect(screen.getByText('648-577-458-00000')).toBeVisible();

    const payBtn = screen.getByRole('button', { name: /Pay ₱25 with GCash/i });
    expect(payBtn).toBeDisabled();
  });

  it('enables the payment button when terms checkbox is checked', () => {
    render(
      <MemoryRouter>
        <ActivateAccount />
      </MemoryRouter>
    );

    const checkbox = screen.getByRole('checkbox', { name: /I agree to the Terms of Service & Registration Policy/i });
    expect(checkbox).not.toBeChecked();

    const payBtn = screen.getByRole('button', { name: /Pay ₱25 with GCash/i });
    expect(payBtn).toBeDisabled();

    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    expect(payBtn).toBeEnabled();
  });

  it('opens DTI and BIR compliance modal when link is clicked', () => {
    render(
      <MemoryRouter>
        <ActivateAccount />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText(/View Official DTI & BIR Registration Certificates/i));
    expect(screen.getByRole('dialog', { name: /Business Registration & Tax Compliance/i })).toBeVisible();
  });

  it('opens simulated GCash checkout modal and processes payment upon confirmation', async () => {
    vi.useFakeTimers();
    render(
      <MemoryRouter>
        <ActivateAccount />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('checkbox', { name: /I agree to the Terms of Service & Registration Policy/i }));
    fireEvent.click(screen.getByRole('button', { name: /Pay ₱25 with GCash/i }));

    expect(screen.getByRole('dialog', { name: /Simulated GCash Payment/i })).toBeVisible();
    expect(screen.getByText('Simulated GCash Checkout')).toBeVisible();

    const confirmBtn = screen.getByRole('button', { name: /Confirm Simulated ₱25 Payment/i });
    fireEvent.click(confirmBtn);

    await vi.advanceTimersByTimeAsync(2000);

    expect(accountApi.payRegistrationFee).toHaveBeenCalledWith(
      expect.objectContaining({
        agreedToTerms: true,
        method: 'gcash',
      })
    );

    vi.useRealTimers();
  });
});
