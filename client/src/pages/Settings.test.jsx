import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Settings from './Settings';

const mockUpdateProfile = vi.fn();

vi.mock('@/components/client/ClientNavbar', () => ({
  default: () => <div data-testid="client-navbar" />,
}));

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return { ...actual, updateProfile: (...args) => mockUpdateProfile(...args) };
});

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'settings-user',
      displayName: 'Jane Baker',
      email: 'jane@example.com',
      providerData: [{ providerId: 'google.com' }],
    },
  }),
}));

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('shows auth data accurately and starts with no pending changes', () => {
    render(<Settings />);

    expect(screen.getByLabelText(/display name/i)).toHaveValue('Jane Baker');
    expect(screen.getByLabelText(/email address/i)).toHaveValue('jane@example.com');
    expect(screen.getByLabelText(/email address/i)).toHaveAttribute('readonly');
    expect(screen.getByText(/google sign-in/i)).toBeInTheDocument();
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
    expect(screen.queryByText('Appearance')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel changes/i })).toBeDisabled();
  });

  it('resets edits to the last saved values', () => {
    render(<Settings />);

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Jane Cake' } });
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel changes/i }));
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Jane Baker');
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('updates the profile and reports success', async () => {
    mockUpdateProfile.mockResolvedValue(undefined);
    render(<Settings />);

    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: 'Jane Cake' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ uid: 'settings-user' }),
      { displayName: 'Jane Cake' },
    ));
    expect(await screen.findByRole('status')).toHaveTextContent(/settings were saved/i);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });

  it('prevents saving an empty display name', () => {
    render(<Settings />);
    fireEvent.change(screen.getByLabelText(/display name/i), { target: { value: ' ' } });

    expect(screen.getByText(/enter a display name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
  });
});
