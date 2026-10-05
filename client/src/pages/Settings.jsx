import React, { useEffect, useMemo, useState } from 'react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { useAuth } from '@/lib/AuthContext';
import { useDragToScroll } from '@/hooks/useDragToScroll';
import { updateProfile } from 'firebase/auth';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole, Save, Shield, User } from 'lucide-react';

function createFormState(user) {
  return {
    username: user?.displayName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Cake Lover',
  };
}

export default function Settings() {
  const { user } = useAuth();
  const [savedSettings, setSavedSettings] = useState(() => createFormState(user));
  const [settings, setSettings] = useState(savedSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useDragToScroll();

  const userSignature = `${user?.uid || ''}:${user?.displayName || ''}:${user?.email || ''}`;
  const email = user?.email || 'No email address available';
  const providerIds = useMemo(
    () => new Set((user?.providerData || []).map((provider) => provider.providerId)),
    [user?.providerData],
  );
  const hasPasswordProvider = providerIds.has('password');
  const hasOtpProvider = providerIds.has('emailLink');
  const securityMethod = providerIds.has('google.com')
    ? 'Google sign-in'
    : hasPasswordProvider
      ? 'Password sign-in'
      : hasOtpProvider
        ? 'Email verification code'
        : 'Authentication provider';

  useEffect(() => {
    const next = createFormState(user);
    setSavedSettings(next);
    setSettings(next);
    setFeedback(null);
  // A stable signature prevents provider array identity changes from resetting edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSignature]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const usernameIsValid = settings.username.trim().length > 0;

  const handleReset = () => {
    setSettings(savedSettings);
    setFeedback(null);
  };

  const handleSave = async () => {
    if (!isDirty || !usernameIsValid || isSaving) return;
    setIsSaving(true);
    setFeedback(null);
    try {
      const nextSettings = { ...settings, username: settings.username.trim() };
      if (user && nextSettings.username !== savedSettings.username) {
        await updateProfile(user, { displayName: nextSettings.username });
      }
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
      setFeedback({ type: 'success', message: 'Your settings were saved.' });
    } catch (error) {
      console.error('Could not save settings:', error);
      setFeedback({ type: 'error', message: error?.message || 'Unable to save your settings right now.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="cn-app-page cn-settings-page min-h-screen">
      <ClientNavbar />
      <main className="cn-settings-shell">
        <header className="cn-settings-header">
          <p>MAKE IT WORK FOR YOU</p>
          <h1 className="cn-settings-title">Settings</h1>
          <span>Manage your account details and view your sign-in method.</span>
        </header>

        {feedback && (
          <div className={`cn-settings-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
            {feedback.type === 'success' ? <CheckCircle2 aria-hidden="true" /> : <AlertCircle aria-hidden="true" />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={(event) => { event.preventDefault(); handleSave(); }}>
          <div className="cn-settings-columns">
            <div className="cn-settings-column">
              <section className="cn-settings-card" aria-labelledby="account-settings-title">
                <div className="cn-settings-card-heading">
                  <span className="cn-settings-icon"><User aria-hidden="true" /></span>
                  <div><h2 id="account-settings-title">Account</h2><p>Your public name and sign-in address.</p></div>
                </div>
                <div className="cn-settings-account-grid">
                  <label className="cn-settings-field">
                    <span>Display name</span>
                    <input
                      type="text"
                      value={settings.username}
                      onChange={(event) => {
                        setFeedback(null);
                        setSettings((current) => ({ ...current, username: event.target.value }));
                      }}
                      aria-invalid={!usernameIsValid}
                      aria-describedby={!usernameIsValid ? 'username-error' : undefined}
                    />
                    <small id={!usernameIsValid ? 'username-error' : undefined} className={!usernameIsValid ? 'is-error' : ''}>
                      {!usernameIsValid ? 'Enter a display name.' : 'Shown on shared cake briefs and messages.'}
                    </small>
                  </label>
                  <label className="cn-settings-field">
                    <span>Email address</span>
                    <input type="email" value={email} readOnly aria-readonly="true" />
                    <small>Your sign-in email is managed by your login provider.</small>
                  </label>
                </div>
              </section>


            </div>

            <div className="cn-settings-column">


              <section className="cn-settings-card" aria-labelledby="security-settings-title">
                <div className="cn-settings-card-heading">
                  <span className="cn-settings-icon"><Shield aria-hidden="true" /></span>
                  <div><h2 id="security-settings-title">Security</h2><p>Your current sign-in method.</p></div>
                </div>
                <div className="cn-settings-static-row">
                  <div>{hasPasswordProvider ? <LockKeyhole aria-hidden="true" /> : <Shield aria-hidden="true" />}<span>{securityMethod}</span></div>
                  <span className="cn-settings-status">Active</span>
                </div>
              </section>
            </div>
          </div>

          <div className="cn-settings-actions">
            <p aria-live="polite">{isDirty ? 'You have unsaved changes.' : 'Everything is up to date.'}</p>
            <div>
              <button type="button" className="cn-settings-cancel" onClick={handleReset} disabled={!isDirty || isSaving}>Cancel changes</button>
              <button type="submit" className="cn-settings-save" disabled={!isDirty || !usernameIsValid || isSaving}>
                {isSaving ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
                {isSaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
