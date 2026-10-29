import React, { createContext, useContext, useState, useEffect } from 'react';
import { systemApi } from '@/services/api';

const BakeryControlPanelContext = createContext(null);

export function BakeryControlPanelProvider({ children }) {
  const existing = useContext(BakeryControlPanelContext);
  if (existing) {
    return <>{children}</>;
  }

  const [isControlPanelVisible, setIsControlPanelVisible] = useState(() => {
    try {
      const saved = localStorage.getItem('cakenmake_control_panel_visible');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [systemStatus, setSystemStatus] = useState(null);
  const [totalDrafts, setTotalDrafts] = useState(0);

  const setVisible = (val) => {
    setIsControlPanelVisible(val);
    try {
      localStorage.setItem('cakenmake_control_panel_visible', String(val));
      window.dispatchEvent(
        new CustomEvent('cakenmake-control-panel-visibility', { detail: { visible: val } })
      );
    } catch {
      // quiet fallback
    }
  };

  const openControlPanel = () => {
    setVisible(true);
    // Smoothly scroll to top of bakery main container if possible
    try {
      const main = document.querySelector('.cn-bakery-content');
      if (main) main.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {}
  };

  const closeControlPanel = () => setVisible(false);
  const toggleControlPanel = () => {
    if (!isControlPanelVisible) {
      openControlPanel();
    } else {
      closeControlPanel();
    }
  };

  // Sync visibility with custom events and storage changes across components/tabs
  useEffect(() => {
    const handleVisibilityEvent = (e) => {
      const nextVal = e.detail?.visible;
      if (typeof nextVal === 'boolean') {
        setIsControlPanelVisible(nextVal);
      }
    };
    const handleStorageEvent = (e) => {
      if (e.key === 'cakenmake_control_panel_visible' && e.newValue !== null) {
        setIsControlPanelVisible(e.newValue === 'true');
      }
    };
    window.addEventListener('cakenmake-control-panel-visibility', handleVisibilityEvent);
    window.addEventListener('storage', handleStorageEvent);
    return () => {
      window.removeEventListener('cakenmake-control-panel-visibility', handleVisibilityEvent);
      window.removeEventListener('storage', handleStorageEvent);
    };
  }, []);

  // Poll lightweight status and draft counts for navbar badge
  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      try {
        const [statusRes, draftsRes] = await Promise.all([
          systemApi.getStatus().catch(() => null),
          systemApi.getUnifiedDrafts().catch(() => null),
        ]);
        if (!mounted) return;
        if (statusRes) setSystemStatus(statusRes);
        if (draftsRes) {
          setTotalDrafts(draftsRes.totalCount || draftsRes.drafts?.length || 0);
        }
      } catch {
        // quiet fallback
      }
    };

    fetchSummary();
    const timer = setInterval(fetchSummary, 15000);

    const handleDraftsChanged = () => {
      fetchSummary();
    };
    window.addEventListener('bakery-drafts-changed', handleDraftsChanged);

    return () => {
      mounted = false;
      clearInterval(timer);
      window.removeEventListener('bakery-drafts-changed', handleDraftsChanged);
    };
  }, []);

  return (
    <BakeryControlPanelContext.Provider
      value={{
        isControlPanelVisible,
        setIsControlPanelVisible: setVisible,
        openControlPanel,
        closeControlPanel,
        toggleControlPanel,
        systemStatus,
        totalDrafts,
      }}
    >
      {children}
    </BakeryControlPanelContext.Provider>
  );
}

export function useBakeryControlPanel() {
  const context = useContext(BakeryControlPanelContext);
  if (!context) {
    const isVisibleFallback = (() => {
      try {
        const s = localStorage.getItem('cakenmake_control_panel_visible');
        return s !== null ? s === 'true' : true;
      } catch {
        return true;
      }
    })();

    const updateVisibilityFallback = (val) => {
      try {
        localStorage.setItem('cakenmake_control_panel_visible', String(val));
        window.dispatchEvent(
          new CustomEvent('cakenmake-control-panel-visibility', { detail: { visible: val } })
        );
      } catch {}
    };

    return {
      isControlPanelVisible: isVisibleFallback,
      openControlPanel: () => updateVisibilityFallback(true),
      closeControlPanel: () => updateVisibilityFallback(false),
      toggleControlPanel: () => updateVisibilityFallback(!isVisibleFallback),
      systemStatus: null,
      totalDrafts: 0,
    };
  }
  return context;
}
