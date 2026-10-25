import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Radio, RefreshCw, Clock, ShieldAlert } from 'lucide-react';
import { systemApi } from '@/services/api';

export default function ClientAccessGuard({ children }) {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const data = await systemApi.getStatus();
        if (active) setSystemStatus(data);
      } catch (err) {
        // silent
      }
    };

    fetchStatus();
    // Poll every 8 seconds during potential maintenance windows
    const timer = setInterval(fetchStatus, 8000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [location.pathname]);

  // Never block Bakery Admin / Staff routes from this guard (Bakery Admin is the control/monitoring room)
  const isBakeryRoute = location.pathname.startsWith('/bakery');
  if (isBakeryRoute) {
    return children;
  }

  // If website is turned OFF during an update
  if (systemStatus?.isWebsiteOff) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white/95 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-rose-200 text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center animate-pulse">
            <Radio className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              Website Off • Scheduled Update In Progress
            </div>
            <h1 className="text-2xl font-black text-gray-900 font-heading">
              Scheduled Update in Progress
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              Our bakery systems are currently applying scheduled catalog and pricing updates starting from 10:00 PM.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100 text-xs text-rose-900 space-y-1">
            <div className="flex items-center justify-center gap-1.5 font-bold text-rose-950">
              <Clock className="w-4 h-4 text-rose-600" />
              <span>Automatic Restoration</span>
            </div>
            <p className="text-rose-800">
              The website will automatically switch back to <strong>Website On</strong> as soon as the update finishes. This page refreshes automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={async () => {
              setChecking(true);
              try {
                const fresh = await systemApi.getStatus();
                setSystemStatus(fresh);
              } finally {
                setChecking(false);
              }
            }}
            disabled={checking}
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-white font-semibold text-sm transition-all shadow-md shadow-primary/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>Check Website Status</span>
          </button>
        </div>
      </div>
    );
  }

  return children;
}
