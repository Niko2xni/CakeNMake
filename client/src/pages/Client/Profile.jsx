import React, { useMemo, useRef, useState } from 'react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { useAuth } from '@/lib/AuthContext';
import { auth, facebookProvider, googleProvider, storage } from '@/lib/firebase';
import { Camera, User, Facebook, Globe, Loader2 } from 'lucide-react';
import { linkWithPopup, unlink, updateProfile } from 'firebase/auth';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const SOCIAL_CONFIG = {
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
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [connectingProvider, setConnectingProvider] = useState(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [localPhotoURL, setLocalPhotoURL] = useState(user?.photoURL || null);

  const displayPhotoURL = localPhotoURL || user?.photoURL || null;
  const displayName = user?.displayName || user?.email?.split('@')[0]?.replace(/[._-]/g, ' ') || 'Cake Lover';
  const email = user?.email || 'user@example.com';

  const handlePhotoUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile || !user || !auth || !storage) {
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setPhotoError('Please choose a PNG, JPG, or WebP image.');
      event.target.value = '';
      return;
    }

    try {
      setPhotoError('');
      setIsUploadingPhoto(true);

      const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}-${selectedFile.name}`);
      await uploadBytes(avatarRef, selectedFile);

      const photoURL = await getDownloadURL(avatarRef);
      await updateProfile(user, { photoURL });
      setLocalPhotoURL(photoURL);
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
      setLocalPhotoURL(null);
    } catch (error) {
      console.error('Could not remove profile photo:', error);
      setPhotoError(error?.message || 'Unable to remove your profile photo right now.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const socialAccounts = useMemo(() => {
    const providerMap = new Map((user?.providerData || []).map((profile) => [profile.providerId, profile]));

    return Object.entries(SOCIAL_CONFIG).map(([providerId, config]) => {
      const account = providerMap.get(providerId);
      return {
        ...config,
        providerId,
        connected: Boolean(account),
        accountName: account?.displayName || account?.email || null,
        accountEmail: account?.email || null,
      };
    });
  }, [user]);

  const handleConnectProvider = async (providerId) => {
    if (!user || !auth) return;

    const provider = providerId === 'facebook.com' ? facebookProvider : googleProvider;
    setConnectingProvider(providerId);

    try {
      await linkWithPopup(user, provider);
    } catch (error) {
      console.error(`Could not connect ${providerId}:`, error);
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnectProvider = async (providerId) => {
    if (!user || !auth) return;

    setDisconnectingProvider(providerId);

    try {
      await unlink(user, providerId);
    } catch (error) {
      console.error(`Could not disconnect ${providerId}:`, error);
    } finally {
      setDisconnectingProvider(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 ml-[70px]">
      <ClientNavbar />

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-center text-gray-800 mb-10">Your profile</h1>

          <div className="mb-12">
            <h2 className="text-3xl font-bold text-left text-gray-800 mb-6">Your account</h2>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex flex-col gap-4 px-6 py-6 border-b border-gray-200 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-200 via-rose-200 to-orange-200 flex items-center justify-center overflow-hidden border border-gray-200">
                    {displayPhotoURL ? (
                      <img src={displayPhotoURL} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-pink-500" />
                    )}
                  </div>

                  <div className="text-xl font-semibold text-left text-gray-800">Profile Photo</div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={isUploadingPhoto || !user}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {isUploadingPhoto ? 'Updating...' : 'Remove photo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto || !user}
                    className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
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
                <div className="px-6 py-3 text-sm text-red-600 bg-red-50 border-b border-red-100">{photoError}</div>
              )}

              <div className="divide-y divide-gray-200">
                <div className="flex flex-col gap-3 px-6 py-5 text-left md:flex-row md:items-center md:justify-between">
                  <div className="text-xl font-semibold text-gray-800">Name</div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg text-gray-700">{displayName}</span>
                    <button className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Edit
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 px-6 py-5 text-left md:flex-row md:items-center md:justify-between">
                  <div className="text-xl font-semibold text-gray-800">Email address</div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg text-gray-700">{email}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 px-6 py-5 text-left md:flex-row md:items-center md:justify-between">
                  <div className="text-xl font-semibold text-gray-800">What will you be using Canva for?</div>
                  <button className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors md:min-w-[220px] text-left">
                    Select a journey
                  </button>
                </div>

                <div className="flex flex-col gap-3 px-6 py-5 text-left md:flex-row md:items-center md:justify-between">
                  <div className="text-xl font-semibold text-gray-800">Language</div>
                  <button className="px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-500 text-sm font-medium hover:bg-gray-50 transition-colors md:min-w-[220px] text-left">
                    English (US)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold text-left text-gray-800 mb-4">Connected social accounts</h2>
            <p className="text-xl text-left text-gray-600 mb-6">Services that you use to log in to CakeNMake</p>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {socialAccounts.map(({ providerId, provider, color, letter, letterClassName, connected, accountName, accountEmail }) => {
                const isBusy = connectingProvider === providerId || disconnectingProvider === providerId;

                return (
                  <div
                    key={providerId}
                    className="flex flex-col gap-4 px-6 py-5 border-b border-gray-200 last:border-b-0 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center shadow-sm border border-gray-200`}>
                        <span className={`text-2xl font-bold ${letterClassName}`}>{letter}</span>
                      </div>

                      <div className="text-left">
                        <div className="text-2xl font-medium text-gray-800">{provider}</div>
                        <div className="text-lg text-gray-700">{connected ? (accountName || accountEmail || displayName) : 'Not connected'}</div>
                        {connected && accountEmail && <div className="text-sm text-gray-500">{accountEmail}</div>}
                      </div>
                    </div>

                    {connected ? (
                      <button
                        type="button"
                        onClick={() => handleDisconnectProvider(providerId)}
                        disabled={isBusy}
                        className="px-5 py-3 rounded-xl border border-gray-300 bg-white text-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                      >
                        {isBusy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Disconnecting</span> : 'Disconnect'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnectProvider(providerId)}
                        disabled={isBusy}
                        className="px-5 py-3 rounded-xl border border-pink-200 bg-pink-50 text-lg font-medium text-pink-700 hover:bg-pink-100 transition-colors disabled:opacity-60"
                      >
                        {isBusy ? <span className="inline-flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Connecting</span> : 'Connect'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
