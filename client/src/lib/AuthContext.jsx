import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
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
  const sessionRevision = useRef(0);
  const accountSyncRetryCount = useRef(0);
  const accountSyncInProgress = useRef(false);
  const accountSyncRetryRevision = useRef(0);

  const refreshAccount = async () => {
    const revision = sessionRevision.current;
    const response = await accountApi.sync();
    if (revision !== sessionRevision.current) return response.user;
    setAccount(response.user);
    setAuthError(null);
    return response.user;
  };

  const retryAccountSync = useCallback(async () => {
    const currentUser = auth?.currentUser || user;
    if (!currentUser || accountSyncInProgress.current) return;

    accountSyncInProgress.current = true;
    const retryRevision = ++accountSyncRetryRevision.current;
    const revision = ++sessionRevision.current;
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const response = await accountApi.sync();
      if (revision !== sessionRevision.current) return;
      setUser(currentUser);
      setAccount(response.user);
      setIsAuthenticated(true);
      accountSyncRetryCount.current = 0;
    } catch (error) {
      if (revision !== sessionRevision.current) return;
      setUser(currentUser);
      setAccount(null);
      setIsAuthenticated(false);
      setAuthError({
        type: error.code || 'account_sync_failed',
        message: error.message || 'Your account could not be loaded.',
        status: error.status,
      });
    } finally {
      if (retryRevision === accountSyncRetryRevision.current) {
        accountSyncInProgress.current = false;
      }
      if (revision === sessionRevision.current) {
        setAuthChecked(true);
        setIsLoadingAuth(false);
      }
    }
  }, [user]);

  useEffect(() => {
    if (!user || !authError) {
      accountSyncRetryCount.current = 0;
      return undefined;
    }

    const permanentCodes = ['user_not_registered', 'ACCOUNT_SUSPENDED', 'AUTH_REQUIRED'];
    const permanentStatuses = [400, 401, 403, 404, 409, 422];
    if (permanentCodes.includes(authError.type) || permanentStatuses.includes(authError.status)) {
      return undefined;
    }

    let active = true;
    let timer;
    const scheduleRetry = () => {
      const delay = Math.min(1000 * (2 ** accountSyncRetryCount.current), 30000);
      accountSyncRetryCount.current += 1;
      timer = setTimeout(async () => {
        if (!active) return;
        await retryAccountSync();
        if (active) scheduleRetry();
      }, delay);
    };
    const retryOnReconnect = async () => {
      clearTimeout(timer);
      await retryAccountSync();
      if (active) scheduleRetry();
    };

    scheduleRetry();
    window.addEventListener('online', retryOnReconnect);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('online', retryOnReconnect);
    };
  }, [user?.uid, authError?.type, authError?.status, retryAccountSync]);

  useEffect(() => {
    if (!account || account.role !== 'customer') return undefined;
    let active = true;
    let socket;
    const refresh = async () => {
      const revision = sessionRevision.current;
      try {
        const response = await accountApi.getMe();
        if (active && revision === sessionRevision.current) setAccount(response.user);
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
      const revision = ++sessionRevision.current;
      accountSyncRetryRevision.current += 1;
      accountSyncInProgress.current = false;
      if ((nextUser?.uid || null) !== currentUid) disconnectChatSocket();
      currentUid = nextUser?.uid || null;

      setIsLoadingAuth(true);
      setAuthError(null);

      if (!nextUser) {
        setUser(null);
        setAccount(null);
        setIsAuthenticated(false);
        setAuthError(null);
        setAuthChecked(true);
        setIsLoadingAuth(false);
        return;
      }

      try {
        const synchronizedAccount = await refreshAccount();
        if (!active || revision !== sessionRevision.current) return;

        setUser(nextUser);
        setAccount(synchronizedAccount);
        setIsAuthenticated(true);
      } catch (error) {
        if (!active || revision !== sessionRevision.current) return;

        setUser(nextUser);
        setAccount(null);
        setIsAuthenticated(false);
        setAuthError({
          type: error.code || 'account_sync_failed',
          message: error.message || 'Your account could not be loaded.',
        });
      } finally {
        if (active && revision === sessionRevision.current) {
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

    sessionRevision.current++;
    accountSyncRetryRevision.current += 1;
    accountSyncInProgress.current = false;
    setUser(null);
    setAccount(null);
    setIsAuthenticated(false);
    setAuthError(null);
    setAuthChecked(true);
    setIsLoadingAuth(false);

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
      retryAccountSync,
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
