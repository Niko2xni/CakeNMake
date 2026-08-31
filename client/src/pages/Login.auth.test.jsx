import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';
import { authApi } from '@/services/api';

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn().mockResolvedValue({ expiresAt: Date.now() + 180000 }),
    verifyEmailOtp: vi.fn(),
  },
}));

describe('Login auth experience', () => {
  it('offers Google, Facebook, and numeric email OTP sign-in', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with facebook/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
  });

  it('shows a resend OTP action and a 3 minute countdown after sending a code', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send otp/i }));

    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('demo@example.com');
    expect(await screen.findByText(/^Verification code$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();
    expect(screen.getByText(/^03:00$/i)).toBeInTheDocument();
  });
});
