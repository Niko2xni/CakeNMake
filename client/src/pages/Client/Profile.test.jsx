import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './Profile';

const mockUpdateProfile = vi.fn();
const mockUploadImage = vi.fn();
const mockLinkWithPopup = vi.fn();
const mockUnlink = vi.fn();
const mockReload = vi.fn();
const mockRefreshAccount = vi.fn();
const mockProfileState = vi.hoisted(() => ({ providerData: [] }));

vi.mock('@/components/client/ClientNavbar', () => ({
  default: () => <div data-testid="client-navbar" />,
}));

vi.mock('@/services/api', () => ({
  mediaApi: { uploadImage: (...args) => mockUploadImage(...args) },
  accountApi: { requestEmailLinkOtp: vi.fn(), verifyEmailLinkOtp: vi.fn() },
}));

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    updateProfile: (...args) => mockUpdateProfile(...args),
    linkWithPopup: (...args) => mockLinkWithPopup(...args),
    unlink: (...args) => mockUnlink(...args),
    reload: (...args) => mockReload(...args),
  };
});

vi.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
  storage: {},
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user',
      displayName: 'Jane Doe',
      email: null,
      providerData: mockProfileState.providerData,
      getIdToken: vi.fn().mockResolvedValue('refreshed-token'),
    },
    account: {
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane Doe',
      photoURL: null,
    },
    refreshAccount: (...args) => mockRefreshAccount(...args),
  }),
}));

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileState.providerData = [
      {
        providerId: 'google.com',
        uid: 'google-123',
        displayName: 'Jane Doe',
        email: null,
        photoURL: 'https://example.com/google-avatar.jpg',
      },
    ];
    mockRefreshAccount.mockResolvedValue({ firebaseUid: 'test-user' });
    mockReload.mockResolvedValue(undefined);
    localStorage.clear();
  });

  it('uses real auth data and disables email editing while showing connected accounts', () => {
    render(<Profile />);

    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Edit$/i })).toHaveLength(1);
    const emailRow = screen.getByText('Email address').closest('div');
    expect(emailRow).not.toHaveTextContent('Edit');
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.queryByText(/using canva/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/what are you designing for/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^disconnect$/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /remove photo/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute('src', 'https://example.com/google-avatar.jpg');
    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute('referrerpolicy', 'no-referrer');
  });

  it('persists profile preferences locally and confirms that they are device-only', async () => {
    render(<Profile />);

    fireEvent.change(screen.getByLabelText(/what are you designing for/i), { target: { value: 'events' } });
    fireEvent.change(screen.getByLabelText(/language/i), { target: { value: 'fil-PH' } });

    expect(screen.getByRole('status')).toHaveTextContent(/saved on this device/i);
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem('cakenmake-profile-preferences-test-user'))).toEqual({
        occasion: 'events',
        language: 'fil-PH',
      });
    });
  });

  it('edits the display name with the Firebase profile API', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    render(<Profile />);

    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }));
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Jane Baker' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ uid: 'test-user' }), { displayName: 'Jane Baker' }));
    expect(await screen.findByText('Jane Baker')).toBeVisible();
    expect(screen.getByText(/display name was updated/i).closest('[role="status"]')).toBeInTheDocument();
  });

  it('refreshes provider state after connecting another login method', async () => {
    mockProfileState.providerData = [];
    mockLinkWithPopup.mockResolvedValue({
      user: {
        providerData: [
          { providerId: 'google.com', displayName: 'Jane Doe', email: 'jane@example.com' },
        ],
        getIdToken: vi.fn().mockResolvedValue('refreshed-token'),
      },
    });
    render(<Profile />);

    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));

    await waitFor(() => expect(mockLinkWithPopup).toHaveBeenCalledTimes(1));
    expect(mockRefreshAccount).toHaveBeenCalledTimes(1);
    expect(await screen.findAllByRole('button', { name: /^disconnect$/i })).toHaveLength(1);
  });

  it('uploads a selected photo through Cloudinary and updates the Firebase profile', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    mockUploadImage.mockResolvedValue('https://cdn.example.com/avatar.png');

    render(<Profile />);

    const input = screen.getByLabelText(/change photo/i);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(file, 'avatar');
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ uid: 'test-user' }), expect.objectContaining({ photoURL: 'https://cdn.example.com/avatar.png' }));
    });
  });
});
