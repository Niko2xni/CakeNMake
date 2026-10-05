import React, { useEffect, useMemo, useState } from 'react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { useAuth } from '@/lib/AuthContext';
import { useDragToScroll } from '@/hooks/useDragToScroll';
import { updateProfile } from 'firebase/auth';
import { AlertCircle, Bell, CheckCircle2, Loader2, LockKeyhole, Palette, Save, Shield, User } from 'lucide-react';

const DEFAULT_NOTIFICATIONS = { email: true, push: true, orderUpdates: true, promotions: false };
const NOTIFICATION_OPTIONS = [
  ['email', 'Email notifications', 'Design activity and account updates.'],
  ['push', 'Push notifications', 'Timely alerts while you are signed in.'],
  ['orderUpdates', 'Order updates', 'Production, pickup, and delivery progress.'],
  ['promotions', 'Promotional emails', 'Occasional CakeNMake news and offers.'],
];

const getPreferenceKey = (user) => `cakenmake-settings-${user?.uid || user?.email || 'guest'}`;

function readPreferences(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(getPreferenceKey(user)) || '{}');
    return { notifications: { ...DEFAULT_NOTIFICATIONS, ...stored.notifications } };
  } catch {
    return { notifications: DEFAULT_NOTIFICATIONS };
  }
}

function createFormState(user, preferences) {
  return {
    username: user?.displayName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Cake Lover',
    notifications: { ...preferences.notifications },
  };
}

export default function Settings() {
  const { user } = useAuth();
  const [savedSettings, setSavedSettings] = useState(() => createFormState(user, readPreferences(user)));
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
    const next = createFormState(user, readPreferences(user));
    setSavedSettings(next);
    setSettings(next);
    setFeedback(null);
  // A stable signature prevents provider array identity changes from resetting edits.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSignature]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);
  const usernameIsValid = settings.username.trim().length > 0;

  const updateNotification = (key) => {
    setFeedback(null);
    setSettings((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: !current.notifications[key] },
    }));
  };

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
      localStorage.setItem(getPreferenceKey(user), JSON.stringify({ notifications: nextSettings.notifications }));
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
          <span>Manage your account and the updates you want to receive.</span>
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

              <section className="cn-settings-card" aria-labelledby="appearance-settings-title">
                <div className="cn-settings-card-heading">
                  <span className="cn-settings-icon is-gold"><Palette aria-hidden="true" /></span>
                  <div><h2 id="appearance-settings-title">Appearance</h2><p>The current CakeNMake experience.</p></div>
                </div>
                <div className="cn-settings-static-row">
                  <div><strong>Theme</strong><span>Warm light</span></div>
                  <span className="cn-settings-status">Current</span>
                </div>
              </section>
            </div>

            <div className="cn-settings-column">
              <section className="cn-settings-card" aria-labelledby="notification-settings-title">
                <div className="cn-settings-card-heading">
                  <span className="cn-settings-icon"><Bell aria-hidden="true" /></span>
                  <div><h2 id="notification-settings-title">Notifications</h2><p>Choose which CakeNMake updates reach you.</p></div>
                </div>
                <div className="cn-settings-toggle-list">
                  {NOTIFICATION_OPTIONS.map(([key, label, description]) => (
                    <div className="cn-settings-toggle-row" key={key}>
                      <label htmlFor={`notification-${key}`}><strong>{label}</strong><span>{description}</span></label>
                      <button
                        id={`notification-${key}`}
                        type="button"
                        role="switch"
                        aria-checked={settings.notifications[key]}
                        aria-label={label}
                        className="cn-settings-switch"
                        onClick={() => updateNotification(key)}
                      ><span /></button>
                    </div>
                  ))}
                </div>
              </section>

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
