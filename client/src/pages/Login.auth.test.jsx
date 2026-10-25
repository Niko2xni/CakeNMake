import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';
import { authApi } from '@/services/api';

const session = vi.hoisted(() => ({ account: null, isAuthenticated: false, isLoadingAuth: false, authError: null }));
const firebase = vi.hoisted(() => ({ custom: vi.fn() }));
const googleAuthMock = vi.hoisted(() => ({ redirectToGoogleOAuth: vi.fn() }));

vi.mock('@/lib/firebase', () => ({ auth: {}, firebaseConfigured: true, googleProvider: 'google', getAuxiliaryAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({
  signInWithCustomToken: firebase.custom,
  signOut: vi.fn(),
}));
vi.mock('@/lib/googleAuth', () => ({
  redirectToGoogleOAuth: googleAuthMock.redirectToGoogleOAuth,
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => session }));

beforeEach(() => {
  Object.assign(session, { account: null, isAuthenticated: false, isLoadingAuth: false, authError: null });
  firebase.custom.mockReset();
  googleAuthMock.redirectToGoogleOAuth.mockReset();
  authApi.requestEmailOtp.mockReset();
  authApi.requestEmailOtp.mockResolvedValue({ expiresAt: Date.now() + 180000 });
  authApi.verifyEmailOtp.mockReset();
});

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn(),
    verifyEmailOtp: vi.fn(),
  },
}));

describe('Login auth experience', () => {
  it('triggers redirectToGoogleOAuth when Continue with Google is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(googleAuthMock.redirectToGoogleOAuth).toHaveBeenCalledWith('/login');
  });

  it('displays a helpful message when Google redirect throws an error', async () => {
    googleAuthMock.redirectToGoogleOAuth.mockImplementationOnce(() => {
      throw new Error('Google Client ID is not configured.');
    });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Google Client ID is not configured.');
  });

  it('prefills email and shows OTP input when returning from Google OAuth with state', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { email: 'google-user@example.com', otpSent: true, expiresAt: Date.now() + 180000 } }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('A 6-digit verification code was sent to google-user@example.com.')).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    expect(screen.getByText('google-user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^verify$/i })).toBeInTheDocument();
  });

  it('exchanges the verified email OTP for a Firebase session and navigates to login-success', async () => {
    authApi.verifyEmailOtp.mockResolvedValueOnce({ token: 'custom-token' });
    firebase.custom.mockResolvedValueOnce({ user: { uid: 'email-user' } });
    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/login-success" element={<div>Completing sign-in</div>} />
        </Routes>
      </MemoryRouter>
    );
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    const input = await screen.findByLabelText('Verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    expect(await screen.findByText('Completing sign-in')).toBeInTheDocument();
    expect(authApi.verifyEmailOtp).toHaveBeenCalledWith('demo@example.com', '123456');
    expect(firebase.custom).toHaveBeenCalledWith({}, 'custom-token');
  });

  it('redirects when account hydration completes after returning to login', () => {
    const view = () => (
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/client" element={<div>Customer dashboard</div>} />
          <Route path="/bakery/orders" element={<div>Bakery dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(view());
    Object.assign(session, { account: { role: 'customer' }, isAuthenticated: true });
    rerender(view());
    expect(screen.getByText('Customer dashboard')).toBeInTheDocument();
  });

  it('redirects bakery admin accounts to /bakery/orders', () => {
    const view = () => (
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/client" element={<div>Customer dashboard</div>} />
          <Route path="/bakery/orders" element={<div>Bakery dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(view());
    Object.assign(session, { account: { role: 'bakery_admin' }, isAuthenticated: true });
    rerender(view());
    expect(screen.getByText('Bakery dashboard')).toBeInTheDocument();
  });

  it('shows account synchronization failures instead of silently remaining at login', () => {
    session.authError = { message: 'Could not connect to the account server.' };
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not connect to the account server.');
  });

  it('offers Google and numeric email OTP sign-in', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /continue with/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument();
  });

  it('shows a resend OTP action and countdown after sending a code', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('demo@example.com');
    expect(await screen.findByText(/^Verification code$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^verify$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend otp/i })).toBeInTheDocument();
    expect(screen.getByText(/^0[23]:[0-5][0-9]$/i)).toBeInTheDocument();
  });

  it('disables the Verify button once the timer expires', async () => {
    vi.useFakeTimers();
    authApi.requestEmailOtp.mockResolvedValueOnce({ expiresAt: Date.now() + 5000 });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /^verify$/i })).toBeInTheDocument();
    });

    // Fast-forward past expiry
    vi.advanceTimersByTime(6000);

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /^verify$/i })).toBeDisabled();
      expect(screen.getByText(/your verification code has expired/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it('allows user to navigate Back from OTP step to re-check email without losing email address', async () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByText(/^Verification code$/i)).toBeInTheDocument();

    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveValue('test@example.com');
  });

  it('handles API error when requesting email OTP', async () => {
    authApi.requestEmailOtp.mockRejectedValueOnce(new Error('Rate limit exceeded. Try again in 5 minutes.'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'rate-limited@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Rate limit exceeded. Try again in 5 minutes.');
  });

  it('handles API error when verifying email OTP', async () => {
    authApi.verifyEmailOtp.mockRejectedValueOnce(new Error('Invalid or expired verification code.'));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    const input = await screen.findByLabelText('Verification code');
    fireEvent.change(input, { target: { value: '000000' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid or expired verification code.');
  });

  it('allows resending a new OTP code after expiry', async () => {
    vi.useFakeTimers();
    authApi.requestEmailOtp.mockResolvedValueOnce({ expiresAt: Date.now() + 2000 });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'resend@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /^login$/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole('button', { name: /^verify$/i })).toBeInTheDocument();
    });

    vi.advanceTimersByTime(3000);

    const resendBtn = await vi.waitFor(() => {
      const btn = screen.getByRole('button', { name: /resend otp/i });
      expect(btn).not.toBeDisabled();
      return btn;
    });

    authApi.requestEmailOtp.mockResolvedValueOnce({ expiresAt: Date.now() + 180000 });
    fireEvent.click(resendBtn);

    await vi.waitFor(() => {
      expect(authApi.requestEmailOtp).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/a new 6-digit verification code was sent to resend@example\.com/i)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });
});
