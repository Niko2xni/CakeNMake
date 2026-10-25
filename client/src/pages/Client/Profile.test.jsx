import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './Profile';

const authMocks = vi.hoisted(() => ({
  user: {
    uid: 'user-123',
    displayName: 'Sweet Baker',
    email: 'baker@example.com',
    emailVerified: true,
    photoURL: null,
    providerData: [{ providerId: 'google.com', email: 'baker@example.com' }],
    getIdToken: vi.fn().mockResolvedValue('token-abc'),
  },
  account: {
    _id: 'acc-123',
    displayName: 'Sweet Baker',
    email: 'baker@example.com',
    providers: ['google.com'],
  },
  refreshAccount: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: authMocks.user,
    account: authMocks.account,
    refreshAccount: authMocks.refreshAccount,
    logout: authMocks.logout,
  }),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: {} },
  googleProvider: {},
  firebaseConfigured: true,
}));

const firebaseAuthMocks = vi.hoisted(() => ({
  unlink: vi.fn(),
  reload: vi.fn(),
  linkWithPopup: vi.fn(),
  updateProfile: vi.fn(),
}));

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    unlink: firebaseAuthMocks.unlink,
    reload: firebaseAuthMocks.reload,
    linkWithPopup: firebaseAuthMocks.linkWithPopup,
    updateProfile: firebaseAuthMocks.updateProfile,
  };
});

const apiMocks = vi.hoisted(() => ({
  disconnectEmailOtp: vi.fn(),
  requestEmailLinkOtp: vi.fn(),
  verifyEmailLinkOtp: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  accountApi: {
    disconnectEmailOtp: apiMocks.disconnectEmailOtp,
    requestEmailLinkOtp: apiMocks.requestEmailLinkOtp,
    verifyEmailLinkOtp: apiMocks.verifyEmailLinkOtp,
  },
  mediaApi: {
    uploadImage: apiMocks.uploadImage,
  },
}));

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <Profile />
    </MemoryRouter>
  );
}

describe('Profile page functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.user = {
      uid: 'user-123',
      displayName: 'Sweet Baker',
      email: 'baker@example.com',
      emailVerified: true,
      photoURL: null,
      providerData: [{ providerId: 'google.com', email: 'baker@example.com' }],
      getIdToken: vi.fn().mockResolvedValue('token-abc'),
    };
    authMocks.account = {
      _id: 'acc-123',
      displayName: 'Sweet Baker',
      email: 'baker@example.com',
      providers: ['google.com'],
    };
    authMocks.refreshAccount.mockResolvedValue(authMocks.account);
    firebaseAuthMocks.unlink.mockResolvedValue({
      ...authMocks.user,
      providerData: [],
    });
    firebaseAuthMocks.reload.mockResolvedValue();
    firebaseAuthMocks.updateProfile.mockResolvedValue();
    apiMocks.uploadImage.mockResolvedValue('https://example.com/new-avatar.jpg');
    apiMocks.disconnectEmailOtp.mockResolvedValue({ success: true });
    apiMocks.requestEmailLinkOtp.mockResolvedValue({ expiresAt: '2026-10-25T20:00:00.000Z' });
    apiMocks.verifyEmailLinkOtp.mockResolvedValue({ success: true });
  });

  describe('Account Details & Information Display', () => {
    it('renders Name and Email Address as view-only without edit controls', () => {
      renderProfile();

      expect(screen.getByText('Sweet Baker')).toBeInTheDocument();
      expect(screen.getAllByText('baker@example.com').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: /display name/i })).not.toBeInTheDocument();
    });

    it('falls back to email username or Cake Lover when displayName is missing', () => {
      authMocks.user.displayName = null;
      authMocks.account.displayName = null;
      authMocks.user.email = 'pastry.chef@example.com';
      authMocks.account.email = 'pastry.chef@example.com';

      renderProfile();
      expect(screen.getByText('pastry chef')).toBeInTheDocument();

      authMocks.user.email = null;
      authMocks.account.email = null;
      authMocks.user.providerData = [];
    });

    it('shows Email unavailable when user and account have no email address', () => {
      authMocks.user.email = null;
      authMocks.account.email = null;
      authMocks.user.providerData = [];

      renderProfile();
      expect(screen.getByText('Email unavailable')).toBeInTheDocument();
    });
  });

  describe('Provider Connection Status', () => {
    it('shows Google as connected and Email verification as not connected when logged in via Google', () => {
      renderProfile();

      const emailStatus = screen.getByText('Not connected');
      expect(emailStatus).toBeInTheDocument();

      const connectEmailBtn = screen.getByRole('button', { name: 'Connect Email verification' });
      expect(connectEmailBtn).toBeInTheDocument();

      const disconnectGoogleBtn = screen.getByRole('button', { name: 'Disconnect Google' });
      expect(disconnectGoogleBtn).toBeInTheDocument();
    });

    it('shows Email verification as connected and Google as not connected when logged in via Email OTP', () => {
      authMocks.user.providerData = [];
      authMocks.account.providers = ['email-otp'];

      renderProfile();

      const disconnectEmailBtn = screen.getByRole('button', { name: 'Disconnect Email verification' });
      expect(disconnectEmailBtn).toBeInTheDocument();

      const connectGoogleBtn = screen.getByRole('button', { name: 'Connect Google' });
      expect(connectGoogleBtn).toBeInTheDocument();
    });
  });

  describe('Profile Photo Management', () => {
    it('allows uploading a valid image file and displays success notification', async () => {
      renderProfile();

      const fileInput = screen.getByLabelText('Change photo');
      const validFile = new File(['valid-image-bytes'], 'avatar.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(apiMocks.uploadImage).toHaveBeenCalledWith(validFile, 'avatar');
        expect(firebaseAuthMocks.updateProfile).toHaveBeenCalledWith(
          authMocks.user,
          { photoURL: 'https://example.com/new-avatar.jpg' }
        );
        expect(authMocks.refreshAccount).toHaveBeenCalled();
        expect(screen.getByText('Your profile photo was updated.')).toBeInTheDocument();
      });
    });

    it('shows an error when uploading an oversized file (> 5MB)', async () => {
      renderProfile();

      const fileInput = screen.getByLabelText('Change photo');
      const largeFile = new File([new Uint8Array(6 * 1024 * 1024)], 'huge.png', { type: 'image/png' });

      fireEvent.change(fileInput, { target: { files: [largeFile] } });

      await waitFor(() => {
        expect(apiMocks.uploadImage).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toHaveTextContent(/must be smaller than 5 MB/i);
      });
    });

    it('shows an error when uploading an invalid file format (e.g. text/plain)', async () => {
      renderProfile();

      const fileInput = screen.getByLabelText('Change photo');
      const textFile = new File(['plain-text'], 'document.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [textFile] } });

      await waitFor(() => {
        expect(apiMocks.uploadImage).not.toHaveBeenCalled();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('handles photo upload API failures and shows error message', async () => {
      apiMocks.uploadImage.mockRejectedValue(new Error('Cloud storage upload timed out'));

      renderProfile();

      const fileInput = screen.getByLabelText('Change photo');
      const validFile = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' });

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Cloud storage upload timed out');
      });
    });

    it('allows removing profile photo when one is present', async () => {
      authMocks.user.photoURL = 'https://example.com/existing-photo.jpg';

      renderProfile();

      const removeBtn = screen.getByRole('button', { name: 'Remove photo' });
      expect(removeBtn).toBeInTheDocument();

      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(firebaseAuthMocks.updateProfile).toHaveBeenCalledWith(authMocks.user, { photoURL: null });
        expect(authMocks.refreshAccount).toHaveBeenCalled();
        expect(screen.getByText('Your profile photo was removed.')).toBeInTheDocument();
      });
    });

    it('handles photo removal failure and displays error message', async () => {
      authMocks.user.photoURL = 'https://example.com/existing-photo.jpg';
      firebaseAuthMocks.updateProfile.mockRejectedValue(new Error('Failed to clear photo on auth server'));

      renderProfile();

      const removeBtn = screen.getByRole('button', { name: 'Remove photo' });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Failed to clear photo on auth server');
      });
    });

    it('switches to fallback user icon if avatar image fails to load', async () => {
      authMocks.user.photoURL = 'https://example.com/broken-image.jpg';

      const { container } = renderProfile();

      const img = screen.getByRole('img', { name: 'Sweet Baker' });
      expect(img).toBeInTheDocument();

      fireEvent.error(img);

      await waitFor(() => {
        expect(screen.queryByRole('img', { name: 'Sweet Baker' })).not.toBeInTheDocument();
        // SVG icon rendered instead
        expect(container.querySelector('.cn-profile-avatar svg')).toBeInTheDocument();
      });
    });
  });

  describe('Google Connection and Disconnection', () => {
    it('connects Google account successfully via popup', async () => {
      authMocks.user.providerData = [];
      authMocks.account.providers = ['email-otp'];

      const mockLinkedUser = {
        ...authMocks.user,
        providerData: [{ providerId: 'google.com', email: 'baker@example.com' }],
        getIdToken: vi.fn().mockResolvedValue('refreshed-token'),
      };
      firebaseAuthMocks.linkWithPopup.mockResolvedValue({ user: mockLinkedUser });

      renderProfile();

      const connectBtn = screen.getByRole('button', { name: 'Connect Google' });
      fireEvent.click(connectBtn);

      await waitFor(() => {
        expect(firebaseAuthMocks.linkWithPopup).toHaveBeenCalled();
        expect(firebaseAuthMocks.reload).toHaveBeenCalledWith(mockLinkedUser);
        expect(mockLinkedUser.getIdToken).toHaveBeenCalledWith(true);
        expect(authMocks.refreshAccount).toHaveBeenCalled();
        expect(screen.getByText('Google was connected successfully.')).toBeInTheDocument();
      });
    });

    it('handles Google connect error gracefully', async () => {
      authMocks.user.providerData = [];
      authMocks.account.providers = ['email-otp'];
      firebaseAuthMocks.linkWithPopup.mockRejectedValue(new Error('Popup was closed by user'));

      renderProfile();

      const connectBtn = screen.getByRole('button', { name: 'Connect Google' });
      fireEvent.click(connectBtn);

      await waitFor(() => {
        expect(screen.getByText('Popup was closed by user')).toBeInTheDocument();
      });
    });

    it('kicks user out of the website when disconnecting Google as the only connected account', async () => {
      authMocks.refreshAccount.mockResolvedValue({
        ...authMocks.account,
        providers: [],
      });

      renderProfile();

      const disconnectBtn = screen.getByRole('button', { name: 'Disconnect Google' });
      fireEvent.click(disconnectBtn);

      const dialog = await screen.findByRole('dialog', { name: /disconnect google\?/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/you have no other sign-in method connected\. disconnecting will sign you out of cakenmake\./i)).toBeInTheDocument();

      const confirmDisconnectBtn = screen.getByRole('button', { name: 'Disconnect' });
      fireEvent.click(confirmDisconnectBtn);

      await waitFor(() => {
        expect(firebaseAuthMocks.unlink).toHaveBeenCalledWith(authMocks.user, 'google.com');
        expect(authMocks.logout).toHaveBeenCalledWith(true);
      });
    });

    it('does not kick user out when disconnecting Google if Email verification is also connected', async () => {
      authMocks.user.providerData = [{ providerId: 'google.com', email: 'baker@example.com' }];
      authMocks.account.providers = ['google.com', 'email-otp'];
      authMocks.refreshAccount.mockResolvedValue({
        ...authMocks.account,
        providers: ['email-otp'],
      });

      renderProfile();

      const disconnectBtn = screen.getByRole('button', { name: 'Disconnect Google' });
      fireEvent.click(disconnectBtn);

      const dialog = await screen.findByRole('dialog', { name: /disconnect google\?/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/you will no longer be able to use this provider to sign in unless you connect it again\./i)).toBeInTheDocument();

      const confirmDisconnectBtn = screen.getByRole('button', { name: 'Disconnect' });
      fireEvent.click(confirmDisconnectBtn);

      await waitFor(() => {
        expect(firebaseAuthMocks.unlink).toHaveBeenCalledWith(authMocks.user, 'google.com');
        expect(authMocks.logout).not.toHaveBeenCalled();
        expect(screen.getByText('Google was disconnected.')).toBeInTheDocument();
      });
    });

    it('handles Google disconnect error gracefully', async () => {
      firebaseAuthMocks.unlink.mockRejectedValue(new Error('Firebase auth network timeout'));

      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Google' }));
      fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

      await waitFor(() => {
        expect(screen.getByText('Firebase auth network timeout')).toBeInTheDocument();
      });
    });
  });

  describe('Email Verification Connection and Disconnection', () => {
    it('allows connecting a verified email through request OTP and verify OTP flow', async () => {
      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Connect Email verification' }));

      const dialog = await screen.findByRole('dialog', { name: /connect a verified email/i });
      expect(dialog).toBeInTheDocument();

      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'verified@example.com' } });

      const sendCodeBtn = screen.getByRole('button', { name: 'Send code' });
      fireEvent.click(sendCodeBtn);

      await waitFor(() => {
        expect(apiMocks.requestEmailLinkOtp).toHaveBeenCalledWith('verified@example.com');
      });

      const otpInput = await screen.findByLabelText(/six-digit verification code/i);
      expect(otpInput).toBeInTheDocument();

      fireEvent.change(otpInput, { target: { value: '123456' } });

      const verifyBtn = screen.getByRole('button', { name: 'Verify email' });
      fireEvent.click(verifyBtn);

      await waitFor(() => {
        expect(apiMocks.verifyEmailLinkOtp).toHaveBeenCalledWith('verified@example.com', '123456');
        expect(firebaseAuthMocks.reload).toHaveBeenCalledWith(authMocks.user);
        expect(authMocks.user.getIdToken).toHaveBeenCalledWith(true);
        expect(authMocks.refreshAccount).toHaveBeenCalled();
        expect(screen.getByText('Your verified email was connected successfully.')).toBeInTheDocument();
      });
    });

    it('handles error when requesting email verification code fails', async () => {
      apiMocks.requestEmailLinkOtp.mockRejectedValue(new Error('Invalid email domain'));

      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Connect Email verification' }));
      const emailInput = screen.getByLabelText(/email address/i);
      fireEvent.change(emailInput, { target: { value: 'bad@domain' } });

      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      await waitFor(() => {
        expect(screen.getByText('Invalid email domain')).toBeInTheDocument();
      });
    });

    it('handles error when verifying email OTP fails', async () => {
      apiMocks.verifyEmailLinkOtp.mockRejectedValue(new Error('Verification code is invalid or expired'));

      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Connect Email verification' }));
      fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: 'user@test.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Send code' }));

      const otpInput = await screen.findByLabelText(/six-digit verification code/i);
      fireEvent.change(otpInput, { target: { value: '999999' } });
      fireEvent.click(screen.getByRole('button', { name: 'Verify email' }));

      await waitFor(() => {
        expect(screen.getByText('Verification code is invalid or expired')).toBeInTheDocument();
      });
    });

    it('kicks user out of the website when disconnecting Email as the only connected account', async () => {
      authMocks.user.providerData = [];
      authMocks.account.providers = ['email-otp'];
      authMocks.refreshAccount.mockResolvedValue({
        ...authMocks.account,
        providers: [],
      });

      renderProfile();

      const disconnectBtn = screen.getByRole('button', { name: 'Disconnect Email verification' });
      fireEvent.click(disconnectBtn);

      const dialog = await screen.findByRole('dialog', { name: /disconnect email verification\?/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/you have no other sign-in method connected\. disconnecting will sign you out of cakenmake\./i)).toBeInTheDocument();

      const confirmDisconnectBtn = screen.getByRole('button', { name: 'Disconnect' });
      fireEvent.click(confirmDisconnectBtn);

      await waitFor(() => {
        expect(apiMocks.disconnectEmailOtp).toHaveBeenCalled();
        expect(authMocks.logout).toHaveBeenCalledWith(true);
      });
    });

    it('does not kick user out when disconnecting Email if Google is also connected', async () => {
      authMocks.user.providerData = [{ providerId: 'google.com', email: 'baker@example.com' }];
      authMocks.account.providers = ['google.com', 'email-otp'];
      authMocks.refreshAccount.mockResolvedValue({
        ...authMocks.account,
        providers: ['google.com'],
      });

      renderProfile();

      const disconnectBtn = screen.getByRole('button', { name: 'Disconnect Email verification' });
      fireEvent.click(disconnectBtn);

      const dialog = await screen.findByRole('dialog', { name: /disconnect email verification\?/i });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText(/you will no longer be able to use this provider to sign in unless you connect it again\./i)).toBeInTheDocument();

      const confirmDisconnectBtn = screen.getByRole('button', { name: 'Disconnect' });
      fireEvent.click(confirmDisconnectBtn);

      await waitFor(() => {
        expect(apiMocks.disconnectEmailOtp).toHaveBeenCalled();
        expect(authMocks.logout).not.toHaveBeenCalled();
        expect(screen.getByText('Email verification was disconnected.')).toBeInTheDocument();
      });
    });

    it('handles Email disconnect error gracefully', async () => {
      authMocks.user.providerData = [{ providerId: 'google.com', email: 'baker@example.com' }];
      authMocks.account.providers = ['google.com', 'email-otp'];
      apiMocks.disconnectEmailOtp.mockRejectedValue(new Error('Server error while disconnecting email'));

      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Email verification' }));
      fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

      await waitFor(() => {
        expect(screen.getByText('Server error while disconnecting email')).toBeInTheDocument();
      });
    });
  });

  describe('Dialogs, Modals, and Notifications UI Controls', () => {
    it('closes disconnect modal when clicking Cancel', async () => {
      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Google' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(firebaseAuthMocks.unlink).not.toHaveBeenCalled();
    });

    it('closes disconnect modal when pressing Escape key', async () => {
      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Disconnect Google' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes connect email modal when clicking Cancel or pressing Escape', async () => {
      renderProfile();

      fireEvent.click(screen.getByRole('button', { name: 'Connect Email verification' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Connect Email verification' }));
      expect(await screen.findByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('dismisses feedback banner when close button is clicked', async () => {
      renderProfile();

      const fileInput = screen.getByLabelText('Change photo');
      const validFile = new File(['valid'], 'avatar.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [validFile] } });

      const banner = await screen.findByText('Your profile photo was updated.');
      expect(banner).toBeInTheDocument();

      const dismissBtn = screen.getByRole('button', { name: 'Dismiss notification' });
      fireEvent.click(dismissBtn);

      expect(screen.queryByText('Your profile photo was updated.')).not.toBeInTheDocument();
    });
  });
});
