import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
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
});

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn().mockResolvedValue({ expiresAt: Date.now() + 180000 }),
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
    expect(googleAuthMock.redirectToGoogleOAuth).toHaveBeenCalledWith('/login-success');
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

  it('exchanges the verified email OTP for a Firebase session', async () => {
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
});
