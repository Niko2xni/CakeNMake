import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { systemApi } from '@/services/api';

export default function ClientUpdateAdvanceWarning() {
  const location = useLocation();
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkStatus = async () => {
      try {
        const data = await systemApi.getStatus();
        if (mounted) setStatus(data);
      } catch (err) {
        // silent fail
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // If user is inside bakery admin routes, don't show the client warning (they have the control panel)
  if (location.pathname.startsWith('/bakery')) {
    return null;
  }

  // Warning must show 3 hours ahead (from 7:00 PM to 10:00 PM) when updates are scheduled
  // Or whenever showClientWarning / isWarningWindow with scheduled changes is true
  if (dismissed || !status?.showClientWarning) {
    return null;
  }

  return (
    <aside
      role="alert"
      className="fixed z-[95] top-2 left-2 right-2 md:left-24 mx-auto max-w-4xl rounded-2xl border border-amber-300 bg-amber-50/98 p-3.5 text-xs text-amber-950 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 rounded-xl bg-amber-200/80 text-amber-900 shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="font-bold text-amber-950 text-xs sm:text-sm">
                Scheduled Server Maintenance Notice
              </strong>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                10:00 PM Update
              </span>
            </div>
            <p className="mt-1 text-xs text-amber-900 leading-relaxed">
              The server will update and will be temporarily off starting from <strong>10:00 PM</strong>. Please save your custom cake designs and complete your orders prior to the update window.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-amber-700 hover:bg-amber-200/60 transition-colors shrink-0"
          title="Dismiss notice"
          aria-label="Dismiss notice"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
