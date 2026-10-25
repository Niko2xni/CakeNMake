import React, { createContext, useContext, useState, useEffect } from 'react';
import { systemApi } from '@/services/api';

const BakeryControlPanelContext = createContext(null);

export function BakeryControlPanelProvider({ children }) {
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
    return {
      isControlPanelVisible: true,
      openControlPanel: () => {},
      closeControlPanel: () => {},
      toggleControlPanel: () => {},
      systemStatus: null,
      totalDrafts: 0,
    };
  }
  return context;
}
