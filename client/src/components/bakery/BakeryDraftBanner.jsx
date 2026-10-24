import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Clock, Tag, LayoutTemplate, AlertCircle, X, ChevronRight } from 'lucide-react';
import { pricingApi } from '@/services/api';

export default function BakeryDraftBanner() {
  const location = useLocation();
  const [summary, setSummary] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  async function checkDrafts() {
    try {
      const data = await pricingApi.getDraftsSummary();
      setSummary(data);
    } catch {
      // Non-blocking: fail quietly if network error
    }
  }

  useEffect(() => {
    checkDrafts();
    const interval = setInterval(checkDrafts, 15000); // Check every 15s or on route change
    return () => clearInterval(interval);
  }, [location.pathname]);

  if (dismissed || !summary?.hasPendingChanges) {
    return null;
  }

  const items = [];
  if (summary.hasPricingDraft) {
    items.push('Unsaved pricing draft in progress');
  }
  if (summary.hasScheduledPricing) {
    items.push('Pricing update scheduled for 10:00 PM');
  }
  if (summary.pendingTemplatesCount > 0) {
    items.push(`${summary.pendingTemplatesCount} template change${summary.pendingTemplatesCount > 1 ? 's' : ''} waiting until 10:00 PM`);
  }

  return (
    <div
      role="status"
      className="mb-3 rounded-2xl border border-amber-200 bg-amber-50/95 p-3 text-xs text-amber-900 shadow-sm backdrop-blur-sm animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <div className="p-1 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-amber-900">
                Pending Changes on Hold
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/80 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                Auto-commits at 10:00 PM
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
              These are currently drafts waiting to be committed at 10:00 PM. None of these changes have reflected to client-facing screens yet. You can edit, modify, or delete your drafts anytime before 10:00 PM.
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {(summary.hasPricingDraft || summary.hasScheduledPricing) && (
                <Link
                  to="/bakery/pricing"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-200/90 hover:bg-amber-300 text-amber-900 font-semibold px-2 py-1 text-[11px] transition-colors"
                >
                  <Tag className="w-3 h-3" />
                  <span>Review Pricing Drafts</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
              {summary.pendingTemplatesCount > 0 && (
                <Link
                  to="/bakery/templates"
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-200/90 hover:bg-amber-300 text-amber-900 font-semibold px-2 py-1 text-[11px] transition-colors"
                >
                  <LayoutTemplate className="w-3 h-3" />
                  <span>Review Template Drafts</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg p-1 text-amber-700 hover:bg-amber-200/60 transition-colors shrink-0 self-start"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
