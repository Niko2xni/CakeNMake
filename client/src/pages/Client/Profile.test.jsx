import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Profile from './Profile';

const mockUpdateProfile = vi.fn();
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();

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
    linkWithPopup: vi.fn(),
    unlink: vi.fn(),
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
      email: 'jane@example.com',
      providerData: [
        {
          providerId: 'google.com',
          uid: 'google-123',
          displayName: 'Jane Doe',
          email: 'jane@example.com',
          photoURL: 'https://example.com/google-avatar.jpg',
        },
      ],
    },
  }),
}));

describe('Profile', () => {
  it('uses real auth data and disables email editing while prompting for Facebook connect', () => {
    render(<Profile />);

    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('jane@example.com').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Edit$/i })).toHaveLength(1);
    const emailRow = screen.getByText('Email address').closest('div');
    expect(emailRow).not.toHaveTextContent('Edit');
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /connect/i }).length).toBeGreaterThan(0);
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
