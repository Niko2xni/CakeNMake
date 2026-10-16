import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import GoogleCallback from './GoogleCallback';

const firebaseAuth = vi.hoisted(() => ({
  signInWithCustomToken: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signInWithCustomToken: firebaseAuth.signInWithCustomToken,
}));

vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
  firebaseConfigured: true,
}));

const authApiMock = vi.hoisted(() => ({
  exchangeGoogleCode: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  authApi: {
    exchangeGoogleCode: authApiMock.exchangeGoogleCode,
  },
}));

describe('GoogleCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('displays error if error param is present in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/google/callback?error=access_denied&error_description=User%20denied%20access']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: /Sign-In Notice/i })).toBeInTheDocument();
    expect(screen.getByText('User denied access')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to login/i })).toBeInTheDocument();
  });

  it('displays error if authorization code is missing', async () => {
    render(
      <MemoryRouter initialEntries={['/auth/google/callback']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Authorization code missing from Google.')).toBeInTheDocument();
  });

  it('exchanges code for custom token and navigates to saved returnPath', async () => {
    sessionStorage.setItem('cakenmake_oauth_state', JSON.stringify({ returnPath: '/designer' }));
    authApiMock.exchangeGoogleCode.mockResolvedValueOnce({ token: 'mock-custom-token' });
    firebaseAuth.signInWithCustomToken.mockResolvedValueOnce({});

    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=mock-google-code']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
          <Route path="/designer" element={<div>Designer Page Loaded</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(authApiMock.exchangeGoogleCode).toHaveBeenCalledWith(
        'mock-google-code',
        expect.stringContaining('/auth/google/callback')
      );
      expect(firebaseAuth.signInWithCustomToken).toHaveBeenCalledWith(
        expect.anything(),
        'mock-custom-token'
      );
    });

    expect(await screen.findByText('Designer Page Loaded')).toBeInTheDocument();
    expect(sessionStorage.getItem('cakenmake_oauth_state')).toBeNull();
  });

  it('displays friendly message if token exchange fails', async () => {
    authApiMock.exchangeGoogleCode.mockRejectedValueOnce(new Error('Invalid authorization code'));

    render(
      <MemoryRouter initialEntries={['/auth/google/callback?code=expired-code']}>
        <Routes>
          <Route path="/auth/google/callback" element={<GoogleCallback />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Invalid authorization code')).toBeInTheDocument();
  });
});
