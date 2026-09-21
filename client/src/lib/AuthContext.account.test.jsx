import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
  const { account, isAuthenticated, authError } = useAuth();

  return (
    <div>
      <span data-testid="authenticated">{String(isAuthenticated)}</span>
      <span data-testid="role">{account?.role || 'none'}</span>
      <span data-testid="error">{authError?.type || 'none'}</span>
    </div>
  );
}

describe('AuthProvider account hydration', () => {
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
});
