import React, { useEffect, useMemo, useRef, useState } from 'react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { useAuth } from '@/lib/AuthContext';
import { auth, facebookProvider, googleProvider, storage } from '@/lib/firebase';
import { accountApi } from '@/services/api';
import { User, Facebook, Globe, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { linkWithPopup, reload, unlink, updateProfile } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { safeMediaUrl } from '@/lib/safe-url';
import { validateUploadedFile } from '@/lib/file-validation';

const SOCIAL_CONFIG = {
  'email-otp': {
    provider: 'Email verification',
    color: 'bg-pink-50',
    icon: Mail,
    letter: '@',
    letterClassName: 'text-[#EE4F84]',
  },
  'google.com': {
    provider: 'Google',
    color: 'bg-white',
    icon: Globe,
    letter: 'G',
    letterClassName: 'text-[#EA4335]',
  },
  'facebook.com': {
    provider: 'Facebook',
    color: 'bg-[#1877F2]',
    icon: Facebook,
    letter: 'f',
    letterClassName: 'text-white',
  },
};

export default function Profile() {
  const { user, account, refreshAccount } = useAuth();
  const fileInputRef = useRef(null);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [photoLoadFailed, setPhotoLoadFailed] = useState(false);
  // `undefined` means no local choice has been made, so provider/account data
  // can continue to hydrate after Firebase restores the session.
  const [photoOverride, setPhotoOverride] = useState(undefined);
  const [providerData, setProviderData] = useState(user?.providerData || []);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [disconnectTarget, setDisconnectTarget] = useState(null);
  const [emailLinkOpen, setEmailLinkOpen] = useState(false);
  const [emailLinkAddress, setEmailLinkAddress] = useState('');
  const [emailLinkCode, setEmailLinkCode] = useState('');
  const [emailLinkExpiresAt, setEmailLinkExpiresAt] = useState(null);
  const [isLinkingEmail, setIsLinkingEmail] = useState(false);
  const [preferenceStatus, setPreferenceStatus] = useState('Preferences save automatically on this device.');

  const preferenceKey = `cakenmake-profile-preferences-${user?.uid || user?.email || 'guest'}`;
  const [preferences, setPreferences] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(preferenceKey) || '{}');
    } catch {
      return {};
    }
  });

  const providerProfile = (providerData || []).find((profile) => profile.providerId === 'facebook.com')
    || (providerData || []).find((profile) => profile.email || profile.photoURL)
    || null;
  const synchronizedPhotoURL = user?.photoURL || providerProfile?.photoURL || account?.photoURL || null;
  const displayPhotoURL = safeMediaUrl(photoOverride === undefined ? synchronizedPhotoURL : photoOverride);
  const fallbackDisplayName = user?.displayName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Cake Lover';
  const displayName = nameValue.trim() || fallbackDisplayName;
  const email = user?.email || providerProfile?.email || account?.email || '';
  const hasVerifiedEmail = Boolean(email && (user?.emailVerified || account?.emailVerified));
  const signInMethodCount = providerData.length + (hasVerifiedEmail ? 1 : 0);
  const authProviderSignature = (user?.providerData || [])
    .map((profile) => `${profile.providerId}:${profile.uid || profile.email || ''}`)
    .join('|');

  useEffect(() => {
    setProviderData(user?.providerData || []);
  // The signature avoids resetting locally refreshed provider state merely
  // because an auth context consumer receives a new object reference.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authProviderSignature]);

  useEffect(() => {
    setNameValue(user?.displayName || '');
  }, [user?.displayName]);

  useEffect(() => {
    // Reset only when the signed-in identity changes. This lets asynchronously
    // loaded Firebase/provider/Mongo data render without overwriting a photo
    // the user has just uploaded or removed in this session.
    setPhotoOverride(undefined);
  }, [user?.uid]);

  useEffect(() => {
    setPhotoLoadFailed(false);
  }, [displayPhotoURL]);

  useEffect(() => {
    localStorage.setItem(preferenceKey, JSON.stringify(preferences));
  }, [preferenceKey, preferences]);

  useEffect(() => {
    if (!disconnectTarget) return undefined;
    const handleEscape = (event) => event.key === 'Escape' && setDisconnectTarget(null);
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [disconnectTarget]);

  const showFeedback = (type, message) => setFeedback({ type, message });

  const handlePreferenceChange = (key, value) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setPreferenceStatus('Saved on this device.');
  };

  const handlePhotoUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !user || !auth || !storage) {
      return;
    }

    const fileError = validateUploadedFile(selectedFile, {
      allowedTypes: {
        'image/png': ['png'],
        'image/jpeg': ['jpg', 'jpeg'],
        'image/webp': ['webp'],
      },
      maxBytes: 5 * 1024 * 1024,
    });
    if (fileError) {
      setPhotoError(fileError);
      event.target.value = '';
      return;
    }

    try {
      setPhotoError('');
      setIsUploadingPhoto(true);

      const extension = selectedFile.name.split('.').pop().toLowerCase();
      const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}.${extension}`);
      await uploadBytes(avatarRef, selectedFile, { contentType: selectedFile.type });

      const photoURL = await getDownloadURL(avatarRef);
      await updateProfile(user, { photoURL });
      await refreshAccount();
      setPhotoOverride(photoURL);
      showFeedback('success', 'Your profile photo was updated.');
    } catch (error) {
      console.error('Could not upload profile photo:', error);
      setPhotoError(error?.message || 'Unable to upload your profile photo right now.');
    } finally {
      setIsUploadingPhoto(false);
      event.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!user || !auth) {
      return;
    }

    try {
      setPhotoError('');
      setIsUploadingPhoto(true);
      await updateProfile(user, { photoURL: null });
      await refreshAccount();
      setPhotoOverride(null);
      showFeedback('success', 'Your profile photo was removed.');
    } catch (error) {
      console.error('Could not remove profile photo:', error);
      setPhotoError(error?.message || 'Unable to remove your profile photo right now.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const socialAccounts = useMemo(() => {
    const providerMap = new Map(providerData.map((profile) => [profile.providerId, profile]));

    return Object.entries(SOCIAL_CONFIG).map(([providerId, config]) => {
      if (providerId === 'email-otp') {
        return {
          ...config,
          providerId,
          connected: hasVerifiedEmail,
          accountName: email || null,
          accountEmail: null,
          disconnectable: false,
        };
      }

      const account = providerMap.get(providerId);
      return {
        ...config,
        providerId,
        connected: Boolean(account),
        accountName: account?.displayName || account?.email || null,
        accountEmail: account?.email || null,
        disconnectable: true,
      };
    });
  }, [email, hasVerifiedEmail, providerData]);

  const handleSaveName = async () => {
    const nextName = nameValue.trim();
    if (!nextName || !user || !auth) return;

    setIsSavingName(true);
    setFeedback(null);
    try {
      await updateProfile(user, { displayName: nextName });
      await refreshAccount();
      setIsEditingName(false);
      showFeedback('success', 'Your display name was updated.');
    } catch (error) {
      console.error('Could not update display name:', error);
      showFeedback('error', error?.message || 'Unable to update your display name right now.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleConnectProvider = async (providerId) => {
    if (!user || !auth) return;

    if (providerId === 'email-otp') {
      setEmailLinkAddress('');
      setEmailLinkCode('');
      setEmailLinkExpiresAt(null);
      setEmailLinkOpen(true);
      return;
    }

    const provider = providerId === 'facebook.com' ? facebookProvider : googleProvider;
    setConnectingProvider(providerId);

    try {
      const result = await linkWithPopup(user, provider);
      await reload(result.user);
      await result.user.getIdToken(true);
      await refreshAccount();
      setProviderData(result.user.providerData || []);
      showFeedback('success', `${SOCIAL_CONFIG[providerId].provider} was connected successfully.`);
    } catch (error) {
      console.error(`Could not connect ${providerId}:`, error);
      showFeedback('error', error?.message || `Unable to connect ${SOCIAL_CONFIG[providerId].provider}.`);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleRequestEmailLink = async (event) => {
    event.preventDefault();
    if (!emailLinkAddress.trim()) return;

    setIsLinkingEmail(true);
    setFeedback(null);
    try {
      const response = await accountApi.requestEmailLinkOtp(emailLinkAddress.trim());
      setEmailLinkExpiresAt(response.expiresAt);
      setEmailLinkCode('');
    } catch (error) {
      showFeedback('error', error.message || 'Unable to send the verification code.');
    } finally {
      setIsLinkingEmail(false);
    }
  };

  const handleVerifyEmailLink = async (event) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(emailLinkCode)) return;

    setIsLinkingEmail(true);
    setFeedback(null);
    try {
      await accountApi.verifyEmailLinkOtp(emailLinkAddress.trim(), emailLinkCode);
      await reload(user);
      await user.getIdToken(true);
      await refreshAccount();
      setEmailLinkOpen(false);
      setEmailLinkCode('');
      setEmailLinkExpiresAt(null);
      showFeedback('success', 'Your verified email was connected successfully.');
    } catch (error) {
      showFeedback('error', error.message || 'Unable to verify this email.');
    } finally {
      setIsLinkingEmail(false);
    }
  };

  const handleDisconnectProvider = async (providerId) => {
    if (!user || !auth) return;

    if (signInMethodCount <= 1) {
      showFeedback('error', 'Connect another sign-in method before disconnecting your only provider.');
      return;
    }

    setDisconnectingProvider(providerId);

    try {
      const updatedUser = await unlink(user, providerId);
      await reload(updatedUser);
      await updatedUser.getIdToken(true);
      await refreshAccount();
      setProviderData(updatedUser.providerData || []);
      setDisconnectTarget(null);
      showFeedback('success', `${SOCIAL_CONFIG[providerId].provider} was disconnected.`);
    } catch (error) {
      console.error(`Could not disconnect ${providerId}:`, error);
      showFeedback('error', error?.message || `Unable to disconnect ${SOCIAL_CONFIG[providerId].provider}.`);
    } finally {
      setDisconnectingProvider(null);
    }
  };

  return (
    <div className="cn-app-page cn-profile-page min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 ml-[70px]">
      <ClientNavbar />

      <div className="cn-profile-shell max-w-5xl mx-auto px-6 py-8">
          <header className="cn-profile-header">
            <p className="cn-profile-eyebrow">Made personal</p>
            <h1 className="cn-profile-title text-5xl font-bold text-gray-800">Your profile</h1>
            <p className="cn-profile-intro">Keep your account details, preferences, and sign-in methods in one place.</p>
          </header>

          <div className="cn-profile-feedback-region" aria-live="polite">
            {feedback && (
              <div className={`cn-profile-feedback is-${feedback.type}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
                {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{feedback.message}</span>
                <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss notification">×</button>
              </div>
            )}
          </div>

          <section className="cn-profile-section">
            <div className="cn-profile-section-heading">
              <div>
                <h2>Account details</h2>
                <p>Manage the information that shapes your CakeNMake experience.</p>
              </div>
              <span className="cn-profile-save-status" role="status" aria-live="polite">{preferenceStatus}</span>
            </div>

            <div className="cn-profile-card bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="cn-profile-photo-row flex flex-col gap-4 px-6 py-5 border-b border-gray-200 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <div className="cn-profile-avatar w-20 h-20 rounded-full bg-gradient-to-br from-pink-200 via-rose-200 to-orange-200 flex items-center justify-center overflow-hidden border border-gray-200">
                    {displayPhotoURL && !photoLoadFailed ? (
                      <img
                        src={displayPhotoURL}
                        alt={displayName}
                        referrerPolicy="no-referrer"
                        onError={() => setPhotoLoadFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-pink-500" />
                    )}
                  </div>

                  <div>
                    <div className="text-lg font-semibold text-left text-gray-800">Profile photo</div>
                    <p className="cn-profile-helper">PNG, JPG, or WebP.</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {displayPhotoURL && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      disabled={isUploadingPhoto || !user}
                      className="cn-profile-button px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      {isUploadingPhoto ? 'Removing...' : 'Remove photo'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto || !user}
                    className="cn-profile-button px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Uploading...' : 'Change photo'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    aria-label="Change photo"
                  />
                </div>
              </div>

              {photoError && (
                <div role="alert" className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">{photoError}</div>
              )}

              <div className="cn-profile-fields divide-y divide-gray-200">
                <div className="cn-profile-field-row flex flex-col gap-3 px-6 py-4 text-left md:flex-row md:items-center md:justify-between">
                  <div className="cn-profile-field-label">Name</div>
                  <div className="cn-profile-field-value flex items-center gap-3">
                    {isEditingName ? (
                      <>
                        <input
                          value={nameValue}
                          onChange={(event) => setNameValue(event.target.value)}
                          onKeyDown={(event) => event.key === 'Enter' && handleSaveName()}
                          aria-label="Display name"
                          autoFocus
                          maxLength={60}
                        />
                        <button type="button" onClick={handleSaveName} disabled={isSavingName || !nameValue.trim()} className="cn-profile-button is-primary">
                          {isSavingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                        </button>
                        <button type="button" onClick={() => { setNameValue(user?.displayName || ''); setIsEditingName(false); }} disabled={isSavingName} className="cn-profile-button">Cancel</button>
                      </>
                    ) : (
                      <>
                        <span>{displayName}</span>
                        <button type="button" onClick={() => setIsEditingName(true)} className="cn-profile-button">Edit</button>
                      </>
                    )}
                  </div>
                </div>

                <div className="cn-profile-field-row flex flex-col gap-3 px-6 py-4 text-left md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="cn-profile-field-label">Email address</div>
                    <p className="cn-profile-helper">Managed by your sign-in method.</p>
                  </div>
                  <div className="cn-profile-field-value">
                    <span className="cn-profile-email" title={email || 'Email unavailable'}>{email || 'Email unavailable'}</span>
                  </div>
                </div>

                <div className="cn-profile-field-row flex flex-col gap-3 px-6 py-4 text-left md:flex-row md:items-center md:justify-between">
                  <div>
                    <label className="cn-profile-field-label" htmlFor="profile-occasion">What are you designing for?</label>
                    <p className="cn-profile-helper">Choose the occasion that best matches your usual designs.</p>
                  </div>
                  <select
                    id="profile-occasion"
                    value={preferences.occasion || ''}
                    onChange={(event) => handlePreferenceChange('occasion', event.target.value)}
                    className="cn-profile-select"
                  >
                    <option value="">Choose an occasion</option>
                    <option value="personal">Personal celebrations</option>
                    <option value="gifts">Gifts for friends and family</option>
                    <option value="events">Events and gatherings</option>
                    <option value="business">Bakery or business projects</option>
                  </select>
                </div>

                <div className="cn-profile-field-row flex flex-col gap-3 px-6 py-4 text-left md:flex-row md:items-center md:justify-between">
                  <label className="cn-profile-field-label" htmlFor="profile-language">Language</label>
                  <select
                    id="profile-language"
                    value={preferences.language || 'en-US'}
                    onChange={(event) => handlePreferenceChange('language', event.target.value)}
                    className="cn-profile-select"
                  >
                    <option value="en-US">English (US)</option>
                    <option value="en-PH">English (Philippines)</option>
                    <option value="fil-PH">Filipino</option>
                  </select>
                </div>
              </div>
            </div>
          </section>

          <section className="cn-profile-section cn-profile-social-section">
            <div className="cn-profile-section-heading">
              <div>
                <h2>Connected accounts</h2>
                <p>Choose the services you can use to sign in to CakeNMake.</p>
              </div>
            </div>

            <div className="cn-profile-card bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {socialAccounts.map(({ providerId, provider, color, letter, letterClassName, connected, accountName, accountEmail, disconnectable }) => {
                const isBusy = connectingProvider === providerId || disconnectingProvider === providerId;

                return (
                  <div
                    key={providerId}
                    className="cn-profile-provider-row flex flex-col gap-4 px-6 py-4 border-b border-gray-200 last:border-b-0 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shadow-sm border border-gray-200`}>
                        <span className={`text-2xl font-bold ${letterClassName}`}>{letter}</span>
                      </div>

                      <div className="text-left">
                        <div className="cn-profile-provider-name">{provider}</div>
                        <div className={`cn-profile-provider-status${connected ? '' : ' is-disconnected'}`}>{connected ? (accountName || accountEmail || displayName) : 'Not connected'}</div>
                        {connected && accountEmail && <div className="text-sm text-gray-500">{accountEmail}</div>}
                      </div>
                    </div>

                    {connected && disconnectable ? (
                      <button
                        type="button"
                        onClick={() => setDisconnectTarget({ providerId, provider })}
                        disabled={isBusy || signInMethodCount <= 1}
                        title={signInMethodCount <= 1 ? 'Connect another sign-in method before disconnecting this provider.' : `Disconnect ${provider}`}
                        className="cn-profile-button px-5 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        {isBusy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Disconnecting</span> : 'Disconnect'}
                      </button>
                    ) : connected ? (
                      <button type="button" disabled className="cn-profile-button px-5 py-2 opacity-60">
                        Connected
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnectProvider(providerId)}
                        disabled={isBusy}
                        className="cn-profile-button is-connect px-5 py-2 rounded-xl border border-pink-200 bg-pink-50 text-sm font-medium text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-60"
                      >
                        {isBusy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting</span> : 'Connect'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
      </div>

      {disconnectTarget && (
        <div className="cn-profile-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setDisconnectTarget(null)}>
          <div className="cn-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="disconnect-provider-title">
            <h2 id="disconnect-provider-title">Disconnect {disconnectTarget.provider}?</h2>
            <p>You will no longer be able to use this provider to sign in unless you connect it again.</p>
            <div>
              <button type="button" onClick={() => setDisconnectTarget(null)} disabled={Boolean(disconnectingProvider)} className="cn-profile-button">Cancel</button>
              <button type="button" onClick={() => handleDisconnectProvider(disconnectTarget.providerId)} disabled={Boolean(disconnectingProvider)} className="cn-profile-button is-danger">
                {disconnectingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {emailLinkOpen && (
        <div className="cn-profile-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setEmailLinkOpen(false)}>
          <div className="cn-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-email-title">
            <h2 id="connect-email-title">Connect a verified email</h2>
            <p>Use this address for CakeNMake email-code sign-in without creating another account.</p>
            <form onSubmit={emailLinkExpiresAt ? handleVerifyEmailLink : handleRequestEmailLink} className="space-y-4">
              <label className="block text-sm font-semibold" htmlFor="email-link-address">Email address</label>
              <input
                id="email-link-address"
                type="email"
                value={emailLinkAddress}
                onChange={(event) => setEmailLinkAddress(event.target.value)}
                disabled={Boolean(emailLinkExpiresAt) || isLinkingEmail}
                required
                className="w-full rounded-xl border px-3 py-2"
              />
              {emailLinkExpiresAt && (
                <>
                  <label className="block text-sm font-semibold" htmlFor="email-link-code">Six-digit verification code</label>
                  <input
                    id="email-link-code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={emailLinkCode}
                    onChange={(event) => setEmailLinkCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    className="w-full rounded-xl border px-3 py-2 tracking-[0.35em]"
                  />
                </>
              )}
              <div>
                <button type="button" onClick={() => setEmailLinkOpen(false)} disabled={isLinkingEmail} className="cn-profile-button">Cancel</button>
                <button type="submit" disabled={isLinkingEmail || (emailLinkExpiresAt && emailLinkCode.length !== 6)} className="cn-profile-button is-primary">
                  {isLinkingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {emailLinkExpiresAt ? 'Verify email' : 'Send code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
