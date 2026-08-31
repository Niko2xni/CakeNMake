import React, { createContext, useState, useContext, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(Boolean(auth));
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(!auth);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    if (!auth) {
      setAuthChecked(true);
      setIsLoadingAuth(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setIsAuthenticated(Boolean(nextUser));
      setAuthChecked(true);
      setIsLoadingAuth(false);
    });
    setIsLoadingPublicSettings(false);

    return unsubscribe;
  }, []);

  const logout = async (shouldRedirect = true) => {
    if (auth) {
      await signOut(auth);
    }

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
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
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
