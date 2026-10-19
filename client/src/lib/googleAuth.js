export function redirectToGoogleOAuth(returnPath = '/login') {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('Google Client ID is not configured. Add VITE_GOOGLE_CLIENT_ID to your client environment.');
  }

  const redirectUri = `${window.location.origin}/auth/google/callback`;
  const stateObj = {
    csrf: Math.random().toString(36).substring(2),
    returnPath,
  };
  const stateString = JSON.stringify(stateObj);

  try {
    sessionStorage.setItem('cakenmake_oauth_state', stateString);
  } catch (e) {
    console.warn('Could not save oauth state in sessionStorage:', e);
  }

  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', clientId);
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'openid email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'select_account');
  googleAuthUrl.searchParams.set('state', encodeURIComponent(stateString));

  window.location.href = googleAuthUrl.toString();
}
