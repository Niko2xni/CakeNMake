import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { accountApi } from '@/services/api';
import { getChatSocket, disconnectChatSocket } from '@/lib/chat-socket';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(Boolean(auth));
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(!auth);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  const refreshAccount = async () => {
    const response = await accountApi.sync();
    setAccount(response.user);
    setAuthError(null);
    return response.user;
  };

  useEffect(() => {
    if (!account || account.role !== 'customer') return undefined;
    let active = true;
    let socket;
    const refresh = async () => {
      try {
        const response = await accountApi.getMe();
        if (active) setAccount(response.user);
      } catch { /* Keep existing-order access during a temporary connection failure. */ }
    };
    getChatSocket().then((value) => {
      if (!active) return;
      socket = value;
      socket.on('moderation:updated', refresh);
    }).catch(() => {});
    const timer = setInterval(refresh, 30000);
    return () => { active = false; clearInterval(timer); socket?.off('moderation:updated', refresh); };
  }, [account?._id, account?.id, account?.role]);

  useEffect(() => {
    if (!auth) {
      setAuthChecked(true);
      setIsLoadingAuth(false);
      return undefined;
    }

    let active = true;

    let currentUid = null;
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      if (!active) return;
      if ((nextUser?.uid || null) !== currentUid) disconnectChatSocket();
      currentUid = nextUser?.uid || null;

      setIsLoadingAuth(true);
      setAuthError(null);

      if (!nextUser) {
        setUser(null);
        setAccount(null);
        setIsAuthenticated(false);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const synchronizedAccount = await refreshAccount();
        if (!active) return;

        setUser(nextUser);
        setAccount(synchronizedAccount);
        setIsAuthenticated(true);
      } catch (error) {
        if (!active) return;

        setUser(nextUser);
        setAccount(null);
        setIsAuthenticated(false);
        setAuthError({
          type: error.code || 'account_sync_failed',
          message: error.message || 'Your account could not be loaded.',
        });
      } finally {
        if (active) {
          setAuthChecked(true);
          setIsLoadingAuth(false);
        }
      }
    });
    setIsLoadingPublicSettings(false);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const logout = async (shouldRedirect = true) => {
    disconnectChatSocket();
    if (auth) {
      await signOut(auth);
    }

    setAccount(null);

    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    window.location.href = '/login';
  };

  const checkUserAuth = async () => {
    setAuthChecked(Boolean(auth));
  };

  const checkAppState = async () => {
    // Placeholder for future app state implementation
    setIsLoadingPublicSettings(true);
    setIsLoadingPublicSettings(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user,
      firebaseUser: user,
      account,
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState,
      refreshAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
