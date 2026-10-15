import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';
import { authApi } from '@/services/api';
const session = vi.hoisted(() => ({ account: null, isAuthenticated: false, isLoadingAuth: false, authError: null }));
const firebase = vi.hoisted(() => ({ popup: vi.fn(), custom: vi.fn(), redirect: vi.fn(), getRedirectResult: vi.fn().mockResolvedValue(null) }));
vi.mock('@/lib/firebase', () => ({ auth: {}, firebaseConfigured: true, googleProvider: 'google', getAuxiliaryAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({
  signInWithPopup: firebase.popup,
  signInWithRedirect: firebase.redirect,
  getRedirectResult: firebase.getRedirectResult,
  signInWithCustomToken: firebase.custom,
  signOut: vi.fn(),
}));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => session }));
beforeEach(() => {
  Object.assign(session, { account: null, isAuthenticated: false, isLoadingAuth: false, authError: null });
  firebase.getRedirectResult.mockResolvedValue(null);
});

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn().mockResolvedValue({ expiresAt: Date.now() + 180000 }),
    verifyEmailOtp: vi.fn(),
  },
}));

describe('Login auth experience', () => {
  it('passes Google sign-in to the provider and requires OTP verification before completing sign-in', async () => {
    firebase.popup.mockResolvedValueOnce({ user: { uid: 'google-user', email: 'google@example.com' } });
    authApi.verifyEmailOtp.mockResolvedValueOnce({ token: 'google-custom-token' });
    firebase.custom.mockResolvedValueOnce({ user: { uid: 'google-user' } });
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/login-success" element={<div>Completing sign-in</div>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    const input = await screen.findByLabelText('Verification code');
    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('google@example.com');
    fireEvent.change(input, { target: { value: '654321' } });
    expect(await screen.findByText('Completing sign-in')).toBeInTheDocument();
    expect(authApi.verifyEmailOtp).toHaveBeenCalledWith('google@example.com', '654321');
    expect(firebase.custom).toHaveBeenCalledWith({}, 'google-custom-token');
  });
  it('exchanges the verified email OTP for a Firebase session', async () => {
    authApi.verifyEmailOtp.mockResolvedValueOnce({ token: 'custom-token' });
    firebase.custom.mockResolvedValueOnce({ user: { uid: 'email-user' } });
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/login-success" element={<div>Completing sign-in</div>} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    const input = await screen.findByLabelText('Verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    expect(await screen.findByText('Completing sign-in')).toBeInTheDocument();
    expect(authApi.verifyEmailOtp).toHaveBeenCalledWith('demo@example.com', '123456');
    expect(firebase.custom).toHaveBeenCalledWith({}, 'custom-token');
  });
  it('redirects when account hydration completes after returning to login', () => {
    const view = () => <MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/client" element={<div>Customer dashboard</div>} /><Route path="/bakery/orders" element={<div>Bakery dashboard</div>} /></Routes></MemoryRouter>;
    const { rerender } = render(view());
    Object.assign(session, { account: { role: 'customer' }, isAuthenticated: true });
    rerender(view());
    expect(screen.getByText('Customer dashboard')).toBeInTheDocument();
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

  it('shows a resend OTP action and a 3 minute countdown after sending a code', async () => {
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
    });

    vi.useRealTimers();
  });

  it('falls back to signInWithRedirect when the popup is blocked', async () => {
    const error = new Error('Popup blocked');
    error.code = 'auth/popup-blocked';
    firebase.popup.mockRejectedValueOnce(error);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    await vi.waitFor(() => {
      expect(firebase.redirect).toHaveBeenCalled();
    });
  });

  it('processes redirect sign-in credentials from getRedirectResult on mount', async () => {
    firebase.getRedirectResult.mockResolvedValueOnce({
      user: { uid: 'redirect-user', email: 'redirect@example.com' },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Login />
      </MemoryRouter>
    );

    expect(await screen.findByLabelText('Verification code')).toBeInTheDocument();
    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('redirect@example.com');
  });
});
