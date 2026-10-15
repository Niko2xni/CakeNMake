import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GuestAuthModal from './GuestAuthModal';
import { authApi } from '@/services/api';
const session = vi.hoisted(() => ({ isAuthenticated: false, isLoadingAuth: false, authError: null }));
vi.mock('@/lib/AuthContext', () => ({ useAuth: () => session }));
const firebase = vi.hoisted(() => ({ popup: vi.fn(), custom: vi.fn(), redirect: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ auth: {}, firebaseConfigured: true, googleProvider: 'google', getAuxiliaryAuth: () => ({}) }));
vi.mock('firebase/auth', () => ({
  signInWithPopup: firebase.popup,
  signInWithRedirect: firebase.redirect,
  signInWithCustomToken: firebase.custom,
  signOut: vi.fn(),
}));
beforeEach(() => Object.assign(session, { isAuthenticated: false, isLoadingAuth: false, authError: null }));

vi.mock('@/services/api', () => ({
  authApi: {
    requestEmailOtp: vi.fn().mockResolvedValue({ expiresAt: Date.now() + 180000 }),
    verifyEmailOtp: vi.fn(),
  },
}));

describe('GuestAuthModal', () => {
  it('waits for app account readiness after Google sign-in and OTP verification before resuming a designer action', async () => {
    const user = { uid: 'guest', email: 'guest@google.com' };
    firebase.popup.mockResolvedValueOnce({ user });
    authApi.verifyEmailOtp.mockResolvedValueOnce({ token: 'guest-custom-token' });
    firebase.custom.mockResolvedValueOnce({ user });
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { rerender } = render(<GuestAuthModal isOpen onClose={onClose} onSuccess={onSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    const input = await screen.findByLabelText('Verification code');
    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('guest@google.com');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Verify/i }));
    await vi.waitFor(() => expect(authApi.verifyEmailOtp).toHaveBeenCalledWith('guest@google.com', '123456'));
    expect(firebase.custom).toHaveBeenCalledWith({}, 'guest-custom-token');
    await screen.findByText('Loading your account…');
    expect(onSuccess).not.toHaveBeenCalled();
    session.isAuthenticated = true;
    rerender(<GuestAuthModal isOpen onClose={onClose} onSuccess={onSuccess} />);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith(user);
  });
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
    expect(screen.getAllByRole('button', { name: /continue with/i })).toHaveLength(1);
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

  it('automatically triggers OTP request and shows verification code when initialEmail is provided', async () => {
    render(
      <GuestAuthModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="save"
        onSuccess={vi.fn()}
        initialEmail="returned-guest@google.com"
      />
    );

    expect(authApi.requestEmailOtp).toHaveBeenCalledWith('returned-guest@google.com');
    expect(await screen.findByText(/^Verification code$/i)).toBeInTheDocument();
  });

  it('falls back to signInWithRedirect when the popup is blocked in GuestAuthModal', async () => {
    const error = new Error('Popup blocked');
    error.code = 'auth/popup-blocked';
    firebase.popup.mockRejectedValueOnce(error);

    render(
      <GuestAuthModal
        isOpen={true}
        onClose={vi.fn()}
        actionType="save"
        onSuccess={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue with Google/ }));
    await vi.waitFor(() => {
      expect(firebase.redirect).toHaveBeenCalled();
    });
  });
});
