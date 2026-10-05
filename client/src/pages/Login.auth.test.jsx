import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';
import { authApi } from '@/services/api';
const session = vi.hoisted(() => ({ account: null, isAuthenticated: false, isLoadingAuth: false, authError: null }));
const firebase = vi.hoisted(() => ({ popup: vi.fn(), custom: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ auth: {}, firebaseConfigured: true, googleProvider: 'google' }));
vi.mock('firebase/auth', () => ({ signInWithPopup: firebase.popup, signInWithCustomToken: firebase.custom }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => session }));
beforeEach(() => Object.assign(session, { account: null, isAuthenticated: false, isLoadingAuth: false, authError: null }));

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn().mockResolvedValue({ expiresAt: Date.now() + 180000 }),
    verifyEmailOtp: vi.fn(),
  },
}));

describe('Login auth experience', () => {
  it('passes Google sign-in to the correct provider and opens the completion page', async () => {
    firebase.popup.mockResolvedValueOnce({ user: { uid: 'google-user' } });
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/login-success" element={<div>Completing sign-in</div>} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    expect(await screen.findByText('Completing sign-in')).toBeInTheDocument();
    expect(firebase.popup).toHaveBeenCalledWith({}, 'google');
  });
  it('exchanges the verified email OTP for a Firebase session', async () => {
    authApi.verifyEmailOtp.mockResolvedValueOnce({ token: 'custom-token' });
    firebase.custom.mockResolvedValueOnce({ user: { uid: 'email-user' } });
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<Login />} /><Route path="/login-success" element={<div>Completing sign-in</div>} /></Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'demo@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));
    const input = await screen.findByLabelText('Verification code');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify and log in' }));
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
