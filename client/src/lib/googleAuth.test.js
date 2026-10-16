import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { redirectToGoogleOAuth } from './googleAuth';

describe('redirectToGoogleOAuth', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    sessionStorage.clear();
    delete window.location;
    window.location = {
      origin: 'http://localhost:5173',
      href: '',
    };
  });

  afterEach(() => {
    window.location = originalLocation;
    vi.unstubAllEnvs();
  });

  it('throws an error if VITE_GOOGLE_CLIENT_ID is not configured', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '');
    expect(() => redirectToGoogleOAuth()).toThrow('Google Client ID is not configured');
  });

  it('redirects to accounts.google.com with code flow parameters and saves state', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', 'test-client-id.apps.googleusercontent.com');

    redirectToGoogleOAuth('/designer');

    expect(window.location.href).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    const url = new URL(window.location.href);
    expect(url.searchParams.get('client_id')).toBe('test-client-id.apps.googleusercontent.com');
    expect(url.searchParams.get('redirect_uri')).toBe('http://localhost:5173/auth/google/callback');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('prompt')).toBe('select_account');

    const savedState = JSON.parse(sessionStorage.getItem('cakenmake_oauth_state'));
    expect(savedState).toHaveProperty('csrf');
    expect(savedState.returnPath).toBe('/designer');
  });
});
