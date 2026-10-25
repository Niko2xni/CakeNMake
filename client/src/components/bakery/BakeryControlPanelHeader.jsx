import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import {
  Radio,
  Layers,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
  Power,
  Clock,
  History,
  Tag,
  LayoutTemplate,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  X,
  Minus,
} from 'lucide-react';
import { systemApi } from '@/services/api';

const formatMoney = (minor = 0) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);

const formatTime = (isoString) => {
  if (!isoString) return '';
  return new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
    timeZone: 'Asia/Manila',
  }).format(new Date(isoString));
};

export default function BakeryControlPanelHeader({ onDraftsChange, onMinimize, className = '' }) {
  const location = useLocation();
  const [systemStatus, setSystemStatus] = useState(null);
  const [unifiedDrafts, setUnifiedDrafts] = useState({
    drafts: [],
    templateDrafts: [],
    pricingDrafts: [],
    totalCount: 0,
    templatesCount: 0,
    pricingCount: 0,
  });
  const [dailyLog, setDailyLog] = useState([]);
  const [activeTab, setActiveTab] = useState('drafts'); // 'drafts' | 'log'
  const [isExpanded, setIsExpanded] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [notification, setNotification] = useState('');
  const [showTurnOffModal, setShowTurnOffModal] = useState(false);
  const [turnOffInput, setTurnOffInput] = useState('');

  const loadData = async () => {
    try {
      const [statusRes, draftsRes, logRes] = await Promise.all([
        systemApi.getStatus().catch(() => null),
        systemApi.getUnifiedDrafts().catch(() => ({
          drafts: [],
          templateDrafts: [],
          pricingDrafts: [],
          totalCount: 0,
          templatesCount: 0,
          pricingCount: 0,
        })),
        systemApi.getDailyLog().catch(() => ({ logs: [] })),
      ]);
      if (statusRes) setSystemStatus(statusRes);
      if (draftsRes) setUnifiedDrafts(draftsRes);
      if (logRes?.logs) setDailyLog(logRes.logs);
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 10000);
    return () => clearInterval(timer);
  }, [location.pathname]);

  const handleDiscardSingle = async (draftId, draftName) => {
    try {
      setActionInProgress(draftId);
      await systemApi.discardUnifiedDraft(draftId);
      setNotification(`Draft "${draftName}" was discarded/reverted.`);
      setTimeout(() => setNotification(''), 4000);
      await loadData();
      if (onDraftsChange) onDraftsChange();
      try {
        window.dispatchEvent(new CustomEvent('bakery-drafts-changed'));
      } catch {}
    } catch (err) {
      console.error('Failed to discard draft edit:', err);
      alert('Failed to discard draft edit. Please try again.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDiscardAll = async () => {
    if (!window.confirm('Are you sure you want to discard ALL pending Template and Pricing drafts?')) {
      return;
    }
    try {
      setActionInProgress('all');
      await systemApi.discardAllUnifiedDrafts();
      setNotification('All template and pricing draft edits discarded.');
      setTimeout(() => setNotification(''), 4000);
      await loadData();
      if (onDraftsChange) onDraftsChange();
      try {
        window.dispatchEvent(new CustomEvent('bakery-drafts-changed'));
      } catch {}
    } catch (err) {
      console.error('Failed to discard all drafts:', err);
      alert('Failed to discard all drafts.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleWebsite = async () => {
    const isCurrentlyOff = Boolean(systemStatus?.isWebsiteOff);
    if (isCurrentlyOff) {
      // Restore website back ON
      if (!window.confirm('Switch website back ON? Client-side access will be immediately restored.')) {
        return;
      }
      try {
        setActionInProgress('toggle');
        const res = await systemApi.toggleWebsite(false, 'Website restored to active');
        if (res?.status) setSystemStatus(res.status);
        setNotification('Website status switched to Website On. Client access is live.');
        setTimeout(() => setNotification(''), 4000);
      } catch (err) {
        console.error('Failed to restore website on:', err);
        alert('Failed to restore website on.');
      } finally {
        setActionInProgress(null);
      }
    } else {
      // Opening modal to type "Turn off the website"
      setTurnOffInput('');
      setShowTurnOffModal(true);
    }
  };

  const handleConfirmTurnOff = async () => {
    if (turnOffInput.trim() !== 'Turn off the website') return;
    try {
      setActionInProgress('toggle');
      const res = await systemApi.toggleWebsite(true, 'Manual maintenance shutdown via Control Panel');
      if (res?.status) setSystemStatus(res.status);
      setNotification('Website status switched to Website Off. Client access is restricted.');
      setTimeout(() => setNotification(''), 4000);
      setShowTurnOffModal(false);
      setTurnOffInput('');
    } catch (err) {
      console.error('Failed to turn website off:', err);
      alert('Failed to turn website off.');
    } finally {
      setActionInProgress(null);
    }
  };

  const isWebsiteOff = Boolean(systemStatus?.isWebsiteOff);
  const totalCount = unifiedDrafts.totalCount || unifiedDrafts.drafts?.length || 0;
  const isDesignerPage = location.pathname.includes('/bakery/designer');
  const isPricingPage = location.pathname.includes('/bakery/pricing');
  const isTemplatesPage = location.pathname.includes('/bakery/templates');

  let currentPageLabel = 'Control Center';
  if (isDesignerPage) currentPageLabel = 'Template 3D Studio';
  else if (isTemplatesPage) currentPageLabel = 'Template Catalog';
  else if (isPricingPage) currentPageLabel = 'Pricing Rules';

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 shadow-xs ${
        isWebsiteOff
          ? 'bg-rose-50/98 border-rose-300 text-rose-950'
          : 'bg-white/95 border-pink-200/90 text-gray-800'
      } p-2.5 sm:p-4 mb-2.5 sm:mb-4 ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Control Panel Badge & Room Details */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`p-2 sm:p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              isWebsiteOff
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-sm'
            }`}
          >
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Control Panel & Monitoring Room
              </span>
              <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full font-semibold bg-pink-100 text-pink-700">
                {currentPageLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-xs sm:text-base font-bold text-gray-900 leading-tight">
                Templates & Pricing Control Panel
              </h2>
            </div>
          </div>
        </div>

        {/* Right: Client Access Status Pill + Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap sm:flex-nowrap">
          {/* Status Governing Client Access */}
          <div
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all shadow-xs ${
              isWebsiteOff
                ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
            title={
              isWebsiteOff
                ? 'Client side is shut down. Status: Website Off'
                : 'Client side is active and accessible. Status: Website On'
            }
          >
            <span
              className={`h-2 sm:h-2.5 w-2 sm:w-2.5 rounded-full ${
                isWebsiteOff ? 'bg-white animate-ping' : 'bg-emerald-500'
              }`}
            />
            <span>{isWebsiteOff ? 'Website Off' : 'Website On'}</span>
          </div>

          {/* Website Toggle Button */}
          <button
            type="button"
            onClick={handleToggleWebsite}
            disabled={actionInProgress === 'toggle'}
            className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
              isWebsiteOff
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                : 'bg-white hover:bg-rose-50 text-rose-700 border-rose-200 hover:border-rose-300'
            }`}
            title="Toggle client-side access during updates"
          >
            <Power className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isWebsiteOff ? 'Turn Website On' : 'Set Website Off'}
            </span>
          </button>

          {/* Unified Drafts Dropdown Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('drafts');
              setIsExpanded(isExpanded && activeTab === 'drafts' ? false : true);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
              isExpanded && activeTab === 'drafts'
                ? 'bg-pink-100 text-pink-900 border-pink-400 ring-2 ring-pink-400/30 font-bold'
                : totalCount > 0
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-200 shadow-2xs'
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${isExpanded && activeTab === 'drafts' ? 'text-pink-700' : totalCount > 0 ? 'text-amber-700' : 'text-gray-500'}`} />
            <span>
              {totalCount} Drafted Edit{totalCount === 1 ? '' : 's'}
            </span>
            {isExpanded && activeTab === 'drafts' ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Single Daily Track Log Button */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('log');
              setIsExpanded(isExpanded && activeTab === 'log' ? false : true);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
              isExpanded && activeTab === 'log'
                ? 'bg-pink-100 text-pink-900 border-pink-400 ring-2 ring-pink-400/30 font-bold'
                : 'bg-white hover:bg-pink-50 text-gray-700 border-gray-200 shadow-2xs'
            }`}
            title="View today's combined audit track log for Templates & Pricing"
          >
            <History className="w-3.5 h-3.5 text-pink-600" />
            <span className="hidden sm:inline">Today's Track Log</span>
            <span className="text-[10px] bg-pink-200/80 text-pink-900 px-1.5 py-0.2 rounded-full font-bold">
              {dailyLog.length}
            </span>
            {isExpanded && activeTab === 'log' ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          {/* Minimize / Remove from Top Button */}
          {onMinimize && (
            <button
              type="button"
              onClick={onMinimize}
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors shadow-2xs"
              title="Minimize Control Panel (Click Control in nav bar to summon it back)"
            >
              <Minus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Minimize</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Changes on Hold Embedded Message inside Control Panel Box */}
      {totalCount > 0 && (
        <div className="mt-2.5 sm:mt-3 rounded-xl border border-amber-300 bg-amber-50/95 p-2.5 sm:p-3 text-xs text-amber-950 shadow-xs animate-in fade-in duration-200">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
              <div className="p-1 sm:p-1.5 rounded-lg bg-amber-200 text-amber-900 shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="font-bold text-amber-950 text-xs sm:text-sm">
                    Pending Changes on Hold
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-amber-900 border border-amber-300">
                    Auto-commits at 10:00 PM
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] sm:text-[11px] text-amber-900 leading-relaxed">
                  These are currently drafts waiting to be committed at 10:00 PM. None of these changes have reflected to client-facing screens yet. You can edit, modify, or delete your drafts anytime before 10:00 PM.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('drafts');
                      setIsExpanded(true);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-950 font-semibold px-2.5 py-1 text-xs transition-colors shadow-2xs"
                  >
                    <Layers className="w-3.5 h-3.5 text-amber-800" />
                    <span>Review {totalCount} Drafted Edit{totalCount === 1 ? '' : 's'}</span>
                    <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </button>
                  {unifiedDrafts.pricingCount > 0 && !location.pathname.includes('/bakery/pricing') && (
                    <Link
                      to="/bakery/pricing"
                      className="inline-flex items-center gap-1 rounded-lg bg-white/80 hover:bg-white text-amber-950 font-semibold px-2 py-1 text-xs border border-amber-300 transition-colors"
                    >
                      <Tag className="w-3 h-3 text-amber-700" />
                      <span>Review Pricing Drafts</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                  {unifiedDrafts.templatesCount > 0 && !location.pathname.includes('/bakery/templates') && (
                    <Link
                      to="/bakery/templates"
                      className="inline-flex items-center gap-1 rounded-lg bg-white/80 hover:bg-white text-amber-950 font-semibold px-2 py-1 text-xs border border-amber-300 transition-colors"
                    >
                      <LayoutTemplate className="w-3 h-3 text-pink-700" />
                      <span>Review Template Drafts</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Expanded Inline Drawer: Combined Drafts vs Single Daily Track Log */}
      {isExpanded && (
        <div className="mt-3 rounded-2xl bg-gray-50/90 border border-gray-200/90 p-3 sm:p-4 animate-in fade-in slide-in-from-top-1">
          {/* Subtabs Header */}
          <div className="flex items-center justify-between border-b border-gray-200/80 pb-2.5 mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('drafts')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'drafts'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Pending Drafts ({totalCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('log')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'log'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Today's Track Log ({dailyLog.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeTab === 'drafts' && totalCount > 0 && (
                <button
                  type="button"
                  onClick={handleDiscardAll}
                  disabled={actionInProgress === 'all'}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                  title="Discard all pending template and pricing edits"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Discard All Edits</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-white hover:text-gray-700 border border-transparent hover:border-gray-200 transition-colors"
                title="Close drawer"
                aria-label="Close drawer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Unified Drafts List */}
          {activeTab === 'drafts' && (
            <div>
              {totalCount === 0 ? (
                <div className="py-8 px-4 rounded-xl bg-white border border-gray-200 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-800">Everything is Live & Synchronized</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 max-w-md">
                    No pending drafts or uncommitted edits found across Templates or Pricing. Any changes you make will be held here until 10:00 PM.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {unifiedDrafts.drafts.map((draft) => {
                    const isItemActioning = actionInProgress === draft.id;
                    const isTemplate = draft.category === 'template';

                    let actionBadgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                    if (draft.pendingAction === 'create') {
                      actionBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                    } else if (draft.pendingAction === 'delete') {
                      actionBadgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                    } else if (draft.pendingAction === 'update') {
                      actionBadgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                    } else if (draft.pendingAction === 'scheduled') {
                      actionBadgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                    }

                    return (
                      <div
                        key={draft.id}
                        className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-white border border-gray-200 hover:border-pink-300 transition-all shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {isTemplate ? (
                            draft.thumbnail ? (
                              <img
                                src={draft.thumbnail}
                                alt={draft.name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0 bg-gray-50"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center font-bold text-xs shrink-0 border border-pink-100">
                                <LayoutTemplate className="w-4 h-4" />
                              </div>
                            )
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0 border border-amber-200">
                              <Tag className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                  isTemplate ? 'bg-pink-100 text-pink-800' : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {isTemplate ? 'Template' : 'Pricing'}
                              </span>
                              <span className="font-bold text-xs text-gray-900 truncate">
                                {draft.name}
                              </span>
                              <span
                                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${actionBadgeColor}`}
                              >
                                {draft.pendingAction}
                              </span>
                              {draft.priceMinor > 0 && (
                                <span className="text-xs font-semibold text-pink-600">
                                  {formatMoney(draft.priceMinor)}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5 truncate">
                              {draft.summary}
                            </p>
                          </div>
                        </div>

                        {/* Discard Individual Edit Button */}
                        <button
                          type="button"
                          disabled={isItemActioning}
                          onClick={() => handleDiscardSingle(draft.id, draft.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50 shrink-0"
                          title="Revert or remove this specific drafted change"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>{draft.hasOriginal ? 'Revert Change' : 'Remove Draft'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Single Daily Track Log */}
          {activeTab === 'log' && (
            <div>
              <div className="mb-2 text-[11px] text-gray-500 flex items-center justify-between">
                <span>All changes that happened today (Philippine Time):</span>
                <span className="font-semibold text-gray-700">{dailyLog.length} events recorded today</span>
              </div>

              {dailyLog.length === 0 ? (
                <div className="py-8 px-4 rounded-xl bg-white border border-gray-200 text-center flex flex-col items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center mb-2">
                    <History className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-800">No Changes Recorded Yet Today</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 max-w-md">
                    All updates to templates and pricing are logged here in real time as they occur.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {dailyLog.map((log) => {
                    const isTpl = log.type === 'template';
                    return (
                      <div
                        key={log._id}
                        className="p-2.5 rounded-xl bg-white border border-gray-200 flex items-start justify-between gap-3 text-xs shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <div
                            className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${
                              isTpl ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isTpl ? <LayoutTemplate className="w-3.5 h-3.5" /> : <Tag className="w-3.5 h-3.5" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${
                                  isTpl ? 'bg-pink-50 text-pink-700 border border-pink-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {isTpl ? 'Template' : 'Pricing'}
                              </span>
                              <strong className="text-gray-900 text-xs font-semibold">{log.title}</strong>
                              <span className="text-[10px] text-gray-400">by {log.changedByName}</span>
                            </div>
                            {log.description && (
                              <p className="text-[11px] text-gray-600 mt-0.5">{log.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="text-right text-[11px] text-gray-400 shrink-0">
                          {formatTime(log.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Advance 10 PM Schedule Notification Bar - Always clean at bottom of panel */}
      <div className="mt-2 pt-2 sm:mt-2.5 sm:pt-2.5 border-t border-pink-100/80 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 text-gray-700 flex-wrap">
          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-pink-600 shrink-0" />
          <span>
            Scheduled update window: <strong className="text-gray-900">10:00 PM</strong> daily. Both Template and Pricing edits commit together. Warning banner active 3 hours ahead (from 7:00 PM). No payments available 30 minutes before the update (from 9:30 PM).
          </span>
        </div>
        <div className="flex items-center gap-3">
          {systemStatus?.showClientWarning && (
            <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
              <AlertTriangle className="w-3 h-3 text-amber-600" /> 3-Hour Advance Warning Active on Client Side
            </span>
          )}
        </div>
      </div>
      {/* Turn Off Website Confirmation Modal with Required Text Input - Portaled to document.body so z-index affects entire screen */}
      {typeof document !== 'undefined' && showTurnOffModal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-rose-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                    <Power className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Turn Off Website Access</h3>
                    <p className="text-xs text-rose-600 font-semibold">Immediate Client-Side Shutdown</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowTurnOffModal(false);
                    setTurnOffInput('');
                  }}
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-950 space-y-2">
                <p className="leading-relaxed">
                  Turning off the website will immediately block client-facing screens and show an offline maintenance screen to all customer visitors.
                </p>
                <p className="font-semibold text-rose-900">
                  To confirm this shutdown, please type <strong className="font-mono bg-white px-2 py-0.5 rounded border border-rose-300 text-rose-700 select-all">Turn off the website</strong> below:
                </p>
              </div>

              <div className="space-y-1.5">
                <input
                  type="text"
                  value={turnOffInput}
                  onChange={(e) => setTurnOffInput(e.target.value)}
                  placeholder='Type "Turn off the website"'
                  className="w-full rounded-xl border border-gray-300 bg-gray-50 px-3.5 py-2.5 text-sm font-semibold text-gray-900 outline-none focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-200 transition-all"
                  autoFocus
                />
                {turnOffInput.length > 0 && turnOffInput.trim() !== 'Turn off the website' && (
                  <p className="text-[11px] text-rose-600 font-medium">
                    Input must exactly match: "Turn off the website"
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowTurnOffModal(false);
                    setTurnOffInput('');
                  }}
                  className="rounded-xl px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={turnOffInput.trim() !== 'Turn off the website' || actionInProgress === 'toggle'}
                  onClick={handleConfirmTurnOff}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-rose-600 disabled:shadow-none"
                >
                  {actionInProgress === 'toggle' ? 'Turning Off...' : 'Confirm & Turn Website Off'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
