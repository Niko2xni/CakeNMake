import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Profile from './Profile';

const mockUpdateProfile = vi.fn();
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockLinkWithPopup = vi.fn();
const mockUnlink = vi.fn();

vi.mock('@/components/client/ClientNavbar', () => ({
  default: () => <div data-testid="client-navbar" />,
}));

vi.mock('firebase/storage', () => ({
  getDownloadURL: (...args) => mockGetDownloadURL(...args),
  ref: vi.fn(() => ({ fullPath: 'avatars/test-user/avatar.png' })),
  uploadBytes: (...args) => mockUploadBytes(...args),
}));

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    updateProfile: (...args) => mockUpdateProfile(...args),
    linkWithPopup: (...args) => mockLinkWithPopup(...args),
    unlink: (...args) => mockUnlink(...args),
  };
});

vi.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
  facebookProvider: {},
  storage: {},
}));

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user',
      displayName: 'Jane Doe',
      email: null,
      providerData: [
        {
          providerId: 'google.com',
          uid: 'google-123',
          displayName: 'Jane Doe',
          email: null,
          photoURL: 'https://example.com/google-avatar.jpg',
        },
      ],
    },
    account: {
      email: 'jane@example.com',
      displayName: 'Jane Doe',
      photoURL: null,
    },
  }),
}));

describe('Profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('uses real auth data and disables email editing while prompting for Facebook connect', () => {
    render(<Profile />);

    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Edit$/i })).toHaveLength(1);
    const emailRow = screen.getByText('Email address').closest('div');
    expect(emailRow).not.toHaveTextContent('Edit');
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /connect/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/using canva/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/what are you designing for/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^disconnect$/i })).toBeDisabled();
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
    mockLinkWithPopup.mockResolvedValue({
      user: {
        providerData: [
          { providerId: 'google.com', displayName: 'Jane Doe', email: 'jane@example.com' },
          { providerId: 'facebook.com', displayName: 'Jane Doe', email: 'jane@example.com' },
        ],
      },
    });
    render(<Profile />);

    fireEvent.click(screen.getByRole('button', { name: /^connect$/i }));

    await waitFor(() => expect(mockLinkWithPopup).toHaveBeenCalledTimes(1));
    expect(await screen.findAllByRole('button', { name: /^disconnect$/i })).toHaveLength(2);
  });

  it('uploads a selected photo to Firebase Storage and updates the profile', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    mockUploadBytes.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue('https://cdn.example.com/avatar.png');

    render(<Profile />);

    const input = screen.getByLabelText(/change photo/i);
    const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadBytes).toHaveBeenCalledTimes(1);
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
      expect(mockUpdateProfile).toHaveBeenCalledWith(expect.objectContaining({ uid: 'test-user' }), expect.objectContaining({ photoURL: 'https://cdn.example.com/avatar.png' }));
    });
  });
});
