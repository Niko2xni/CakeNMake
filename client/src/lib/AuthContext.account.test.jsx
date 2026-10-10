import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const authMocks = vi.hoisted(() => ({
  sync: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('@/services/api', () => ({
  accountApi: {
    sync: authMocks.sync,
  },
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: authMocks.onAuthStateChanged,
  signOut: vi.fn(),
}));

import { AuthProvider, useAuth } from './AuthContext';

function AccountProbe() {
  const { account, isAuthenticated, authError, user, logout, retryAccountSync } = useAuth();

  return (
    <div>
      <button onClick={() => logout(false)}>Sign out</button>
      <button onClick={retryAccountSync}>Retry account sync</button>
      <span data-testid="user">{user?.uid || 'none'}</span>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="role">{account?.role || 'none'}</span>
      <span data-testid="error">{authError?.type || 'none'}</span>
    </div>
  );
}

describe('AuthProvider account hydration', () => {
  it('clears the session and ignores account hydration that finishes after logout', async () => {
    let finish;
    authMocks.sync.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    authMocks.onAuthStateChanged.mockImplementationOnce((_auth, callback) => {
      callback({ uid: 'old-user' });
      return vi.fn();
    });
    render(<AuthProvider><AccountProbe /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { finish({ user: { firebaseUid: 'old-user', role: 'customer' } }); });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('role')).toHaveTextContent('none');
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });
  it('synchronizes and exposes the MongoDB account after Firebase restores a user', async () => {
    authMocks.sync.mockResolvedValueOnce({
      user: { firebaseUid: 'firebase-user-1', role: 'customer' },
    });
    authMocks.onAuthStateChanged.mockImplementationOnce((_auth, callback) => {
      callback({ uid: 'firebase-user-1' });
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AccountProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('role')).toHaveTextContent('customer');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('does not authenticate the application account when synchronization fails', async () => {
    authMocks.sync.mockRejectedValueOnce(Object.assign(
      new Error('This account has been suspended.'),
      { code: 'ACCOUNT_SUSPENDED' },
    ));
    authMocks.onAuthStateChanged.mockImplementationOnce((_auth, callback) => {
      callback({ uid: 'firebase-user-1' });
      return vi.fn();
    });

    render(
      <AuthProvider>
        <AccountProbe />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('ACCOUNT_SUSPENDED');
    });
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('role')).toHaveTextContent('none');
  });

  it('keeps the restored Firebase session and recovers the account after a temporary sync failure', async () => {
    authMocks.sync
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ user: { firebaseUid: 'firebase-user-1', role: 'customer' } });
    authMocks.onAuthStateChanged.mockImplementationOnce((_auth, callback) => {
      callback({ uid: 'firebase-user-1' });
      return vi.fn();
    });

    render(<AuthProvider><AccountProbe /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('account_sync_failed');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('firebase-user-1');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Retry account sync' }));

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('role')).toHaveTextContent('customer');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('retries account synchronization when the browser reconnects', async () => {
    authMocks.sync
      .mockRejectedValueOnce(new Error('Network unavailable'))
      .mockResolvedValueOnce({ user: { firebaseUid: 'firebase-user-1', role: 'customer' } });
    authMocks.onAuthStateChanged.mockImplementationOnce((_auth, callback) => {
      callback({ uid: 'firebase-user-1' });
      return vi.fn();
    });

    render(<AuthProvider><AccountProbe /></AuthProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('account_sync_failed');
    });
    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
    });
    expect(screen.getByTestId('role')).toHaveTextContent('customer');
  });
});
