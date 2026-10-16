import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, firebaseConfigured } from '@/lib/firebase';
import { authApi } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const exchangeStartedRef = useRef(false);

  useEffect(() => {
    if (exchangeStartedRef.current) return;

    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(searchParams.get('error_description') || 'Google sign-in was cancelled or denied.');
      return;
    }

    if (!code) {
      setError('Authorization code missing from Google.');
      return;
    }

    exchangeStartedRef.current = true;
    const redirectUri = `${window.location.origin}/auth/google/callback`;

    let returnPath = '/login-success';
    try {
      let stateRaw = sessionStorage.getItem('cakenmake_oauth_state');
      if (!stateRaw && searchParams.get('state')) {
        try {
          stateRaw = decodeURIComponent(searchParams.get('state'));
        } catch {
          stateRaw = searchParams.get('state');
        }
      }
      if (stateRaw) {
        const parsed = typeof stateRaw === 'string' ? JSON.parse(stateRaw) : stateRaw;
        if (parsed?.returnPath) returnPath = parsed.returnPath;
        sessionStorage.removeItem('cakenmake_oauth_state');
      }
    } catch (e) {
      console.warn('Could not read state from sessionStorage or URL:', e);
    }

    async function completeSignIn() {
      try {
        if (!firebaseConfigured || !auth) {
          throw new Error('Firebase is not configured for this application.');
        }

        const { token } = await authApi.exchangeGoogleCode(code, redirectUri);
        await signInWithCustomToken(auth, token);
        navigate(returnPath, { replace: true });
      } catch (err) {
        console.error('Google callback error:', err);
        setError(err.message || 'Google sign-in could not be completed.');
      }
    }

    completeSignIn();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      {error ? (
        <div className="max-w-md w-full p-6 bg-card border border-destructive/30 rounded-2xl shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto text-destructive font-bold text-xl">
            !
          </div>
          <h2 className="text-lg font-bold text-foreground">Sign-In Notice</h2>
          <p className="text-sm text-destructive">{error}</p>
          <Button
            onClick={() => navigate('/login', { replace: true })}
            className="w-full"
            variant="outline"
          >
            Back to login
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-9 h-9 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">Completing Google sign-in…</p>
        </div>
      )}
    </div>
  );
}
