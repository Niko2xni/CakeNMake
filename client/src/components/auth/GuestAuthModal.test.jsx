import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuestAuthModal from './GuestAuthModal';
import { authApi } from '@/services/api';

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn().mockResolvedValue({ expiresAt: Date.now() + 180000 }),
    verifyEmailOtp: vi.fn(),
  },
}));

describe('GuestAuthModal', () => {
  it('renders modal with Save title when actionType is save', () => {
    render(
      <GuestAuthModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="save"
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/sign in to save your design/i)).toBeInTheDocument();
    expect(screen.getByText(/create a free account or log in to save this cake design/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
  });

  it('renders modal with Send to Bakery title when actionType is order', () => {
    render(
      <GuestAuthModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="order"
        onSuccess={vi.fn()}
      />
    );

    expect(screen.getByText(/sign in to send to bakery/i)).toBeInTheDocument();
    expect(screen.getByText(/log in or sign up to finalize your order/i)).toBeInTheDocument();
  });

  it('triggers email OTP flow within the modal', async () => {
    render(
      <GuestAuthModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="save"
        onSuccess={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'guest@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('guest@example.com');
    expect(await screen.findByText(/^Verification code$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();
  });
});
