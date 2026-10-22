import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, RotateCcw, Loader2, MoreVertical, Info, AlertCircle, ArrowRight, ArrowLeft, ChevronDown, CheckCircle2 } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { designApi } from '@/services/api';
import { useDragToScroll } from '@/hooks/useDragToScroll';

export default function Trash() {
  const [trashedDesigns, setTrashedDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [operationError, setOperationError] = useState('');
  const [operationFeedback, setOperationFeedback] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ open: false, design: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  useDragToScroll();

  useEffect(() => {
    fetchTrashedDesigns();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenu && !event.target.closest('.dropdown-menu')) {
        setActiveMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setActiveMenu(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeMenu]);

  useEffect(() => {
    if (!detailsModal.open && !deleteTarget && !showDeleteAllConfirm) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setDetailsModal({ open: false, design: null });
      setDeleteTarget(null);
      setShowDeleteAllConfirm(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [detailsModal.open, deleteTarget, showDeleteAllConfirm]);

  const fetchTrashedDesigns = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const designs = await designApi.getDesigns({ trashOnly: true });
      const trashed = designs.filter(d => d.isTrashed);
      setTrashedDesigns(trashed);
    } catch (error) {
      console.error('Failed to fetch trashed designs:', error);
      setLoadError('We could not load your deleted designs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSeconds < 60) return 'just now';
    if (diffMinutes === 1) return 'a minute ago';
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
    if (diffHours === 1) return 'an hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return 'a day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffWeeks === 1) return 'a week ago';
    if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
    if (diffMonths === 1) return 'a month ago';
    if (diffMonths < 12) return `${diffMonths} months ago`;
    if (diffYears === 1) return 'a year ago';
    return `${diffYears} years ago`;
  };

  const handleRestore = async (id) => {
    setPendingAction(`restore-${id}`);
    setOperationError('');
    setOperationFeedback('');
    try {
      const restoredDesign = trashedDesigns.find((design) => design._id === id);
      await designApi.restoreFromTrash(id);
      setTrashedDesigns(designs => designs.filter(d => d._id !== id));
      setActiveMenu(null);
      setOperationFeedback(`“${restoredDesign?.name || 'Design'}” was restored to your designs.`);
    } catch (error) {
      console.error('Failed to restore design:', error);
      setOperationError('That design could not be restored. Please try again.');
    } finally {
      setPendingAction('');
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget._id;
    setPendingAction(`delete-${id}`);
    setOperationError('');
    setOperationFeedback('');
    try {
      const deletedName = deleteTarget.name;
      await designApi.permanentlyDelete(id);
      setTrashedDesigns(designs => designs.filter(d => d._id !== id));
      setActiveMenu(null);
      setDeleteTarget(null);
      setOperationFeedback(`“${deletedName}” was permanently deleted.`);
    } catch (error) {
      console.error('Failed to permanently delete design:', error);
      setOperationError('That design could not be permanently deleted. Please try again.');
    } finally {
      setPendingAction('');
    }
  };

  const handleDeleteAll = async () => {
    setPendingAction('delete-all');
    setOperationError('');
    setOperationFeedback('');
    try {
      const count = trashedDesigns.length;
      await designApi.deleteAllTrash();
      setTrashedDesigns([]);
      setShowDeleteAllConfirm(false);
      setActiveMenu(null);
      setOperationFeedback(`All ${count} designs were permanently deleted.`);
    } catch (error) {
      console.error('Failed to delete all trashed designs:', error);
      setOperationError('Could not permanently delete all designs. Please try again.');
    } finally {
      setPendingAction('');
    }
  };

  const handleShowDetails = (design) => {
    setDetailsModal({ open: true, design });
    setActiveMenu(null);
  };

  const handleMenuToggle = (event, id) => {
    event.stopPropagation();
    const currentActiveId = typeof activeMenu === 'string' ? activeMenu : activeMenu?.id;
    if (currentActiveId === id) {
      setActiveMenu(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement = spaceBelow < 250 ? 'up' : 'down';
    setActiveMenu({ id, placement });
  };

  const daysRemaining = (design) => {
    const trashedAt = new Date(design.trashedAt || design.lastEdited);
    if (Number.isNaN(trashedAt.getTime())) return 30;
    const elapsedDays = (Date.now() - trashedAt.getTime()) / 86400000;
    return Math.max(0, Math.ceil(30 - elapsedDays));
  };

  const formatEstimate = (design) => design.lastEstimate?.totalMinor == null
    ? 'Open design to refresh'
    : new Intl.NumberFormat('en-PH', { style: 'currency', currency: design.lastEstimate.currency || 'PHP' }).format(design.lastEstimate.totalMinor / 100);

  return (
    <div className="cn-app-page cn-trash-page min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50">
      <ClientNavbar />
      <div className="cn-trash-shell max-w-6xl mx-auto px-6 py-8">
        <div className="cn-page-header cn-trash-header text-center mb-8">
          <h1 className="cn-trash-title">
            Trash
          </h1>
          <p className="cn-trash-subtitle">
            Restore deleted work or remove it permanently.
          </p>
        </div>

        <div className="cn-trash-summary">
          <div>
            <span aria-label={`${loading ? 'Loading' : trashedDesigns.length} of 20 designs`}>
              <strong aria-hidden="true">{loading ? '—' : trashedDesigns.length}</strong>
              <span aria-hidden="true"> of 20 designs</span>
            </span>
            <span aria-hidden="true">·</span>
            <span>Kept for 30 days</span>
            {!loading && trashedDesigns.length >= 19 && <em>Almost full</em>}
          </div>
          <div className="flex items-center gap-3">
            {!loading && trashedDesigns.length > 0 && (
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(true)}
                disabled={Boolean(pendingAction)}
                className="cn-trash-delete-all-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-white hover:bg-rose-50 text-[var(--cn-cherry)] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                aria-label="Delete all designs in trash permanently"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                Delete all
              </button>
            )}
            <button
              type="button"
              aria-expanded={infoOpen}
              aria-controls="trash-information"
              onClick={() => setInfoOpen((open) => !open)}
            >
              <Info aria-hidden="true" />
              How Trash works
              <ChevronDown className={infoOpen ? 'is-open' : ''} aria-hidden="true" />
            </button>
          </div>
        </div>

        {infoOpen && (
          <aside id="trash-information" className="cn-trash-info" aria-labelledby="trash-information-title">
            <h2 id="trash-information-title">How Trash works</h2>
            <ul>
              <li><strong>30-day recovery</strong><span>Deleted designs remain available before automatic removal.</span></li>
              <li><strong>Twenty-design capacity</strong><span>Moving a 21st design to Trash removes the oldest one.</span></li>
              <li><strong>Restore anytime</strong><span>Move a design back to your recent work during its recovery window.</span></li>
              <li><strong>Permanent deletion</strong><span>A permanently deleted design cannot be recovered.</span></li>
            </ul>
          </aside>
        )}

        {operationFeedback && (
          <p className="cn-trash-operation-feedback" role="status">
            <CheckCircle2 aria-hidden="true" /> {operationFeedback}
          </p>
        )}
        {operationError && <p className="cn-trash-operation-error" role="alert">{operationError}</p>}

        {/* Trash Content */}
        <div className="cn-trash-content">
          {loading ? (
            <div className="cn-trash-grid" role="status" aria-label="Loading deleted designs">
              {[0, 1, 2].map((item) => <div className="cn-trash-skeleton" key={item}><span /><span /><span /></div>)}
            </div>
          ) : loadError ? (
            <div className="cn-trash-status-panel cn-trash-error" role="alert">
              <span className="cn-trash-status-icon"><AlertCircle className="w-7 h-7" /></span>
              <div>
                <h2>Trash could not be loaded</h2>
                <p>{loadError}</p>
                <button type="button" onClick={fetchTrashedDesigns}>Try again</button>
              </div>
            </div>
          ) : trashedDesigns.length === 0 ? (
            <div className="cn-trash-empty text-center">
              <span className="cn-trash-empty-icon"><Trash2 className="w-6 h-6 stroke-[1.8]" /></span>
              <h2>Trash is empty</h2>
              <p>Deleted designs will appear here. Until then, you can return to creating something worth celebrating.</p>
              <div className="cn-trash-empty-actions">
                <Link to="/client" className="cn-trash-secondary-action">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to my designs
                </Link>
                <Link to="/designer" className="cn-trash-primary-action">
                  Create a design <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/templates" className="cn-trash-secondary-action">Browse templates</Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="cn-trash-grid">
              {trashedDesigns.map((design) => {
                const isMenuOpen = (typeof activeMenu === 'string' ? activeMenu === design._id : activeMenu?.id === design._id);
                return (
                <article key={design._id} className={`cn-design-card cn-trash-card ${isMenuOpen ? 'is-menu-open' : ''}`}>
                  <div className="cn-design-thumbnail cn-trash-thumbnail">
                    {design.thumbnail ? (
                      <img 
                        src={design.thumbnail} 
                        alt={design.name} 
                        onError={(e) => {
                          if (design.thumbnailFallback && e.currentTarget.src !== design.thumbnailFallback) {
                            e.currentTarget.src = design.thumbnailFallback;
                          }
                        }}
                      />
                    ) : (
                      <span className="cn-design-placeholder">
                        <Trash2 className="w-8 h-8 opacity-40 text-[var(--cn-cherry)]" aria-hidden="true" />
                      </span>
                    )}
                  </div>

                  <div className="cn-design-meta cn-trash-meta">
                    <div className="cn-design-meta-info">
                      <h3>{design.name || 'Untitled design'}</h3>
                      <p>Deleted {formatDate(design.trashedAt || design.lastEdited)}</p>
                      <div className="cn-trash-badge-row">
                        <span className="cn-trash-days-badge">{daysRemaining(design)} days left to restore</span>
                      </div>
                      <div className="mt-2.5">
                        <button
                          type="button"
                          className="cn-trash-restore-btn"
                          onClick={() => handleRestore(design._id)}
                          disabled={Boolean(pendingAction)}
                          aria-label={`Restore design ${design.name || ''}`}
                        >
                          {pendingAction === `restore-${design._id}` ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                          Restore design
                        </button>
                      </div>
                    </div>

                    <div className="cn-design-menu-wrap">
                      <button
                        type="button"
                        className="cn-design-menu-trigger"
                        onClick={(e) => handleMenuToggle(e, design._id)}
                        aria-label={`Open actions for ${design.name}`}
                        aria-haspopup="menu"
                        aria-expanded={(typeof activeMenu === 'string' ? activeMenu === design._id : activeMenu?.id === design._id)}
                      >
                        <MoreVertical className="w-4 h-4" aria-hidden="true" />
                      </button>

                      {/* Dropdown menu */}
                      {(typeof activeMenu === 'string' ? activeMenu === design._id : activeMenu?.id === design._id) && (
                        <div
                          ref={(node) => {
                            if (!node) return;
                            const rect = node.getBoundingClientRect();
                            const bottomLimit = window.innerHeight - 76;
                            if (rect.bottom > bottomLimit && rect.top > 180) {
                              node.classList.add('is-up');
                            }
                          }}
                          className={`dropdown-menu cn-design-menu ${activeMenu?.placement === 'up' ? 'is-up' : ''}`}
                          role="menu"
                        >
                          <div className="p-2 border-b border-[var(--cn-line)] mb-1">
                            <span className="font-semibold text-xs text-[var(--cn-ink)] truncate block">{design.name}</span>
                            <p className="text-[10px] text-[var(--cn-muted)] mt-0.5">Deleted {formatDate(design.trashedAt || design.lastEdited)}</p>
                          </div>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleShowDetails(design)}
                          >
                            <Info className="w-3.5 h-3.5" aria-hidden="true" />
                            Details
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="is-danger"
                            onClick={() => { setDeleteTarget(design); setActiveMenu(null); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            Delete permanently
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteAllConfirm && (
        <div
          className="cn-trash-dialog-backdrop fixed inset-0 flex items-center justify-center z-[120]"
          onMouseDown={(event) => event.target === event.currentTarget && setShowDeleteAllConfirm(false)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="delete-all-title" className="cn-trash-dialog w-full max-w-md mx-4">
            <span className="cn-trash-dialog-icon"><Trash2 className="w-6 h-6" /></span>
            <h2 id="delete-all-title">Delete all {trashedDesigns.length} designs permanently?</h2>
            <p>This action cannot be undone. All deleted designs in your Trash will be permanently removed.</p>
            {operationError && <p className="cn-trash-dialog-error" role="alert">{operationError}</p>}
            <div className="cn-trash-dialog-actions">
              <button type="button" onClick={() => setShowDeleteAllConfirm(false)} disabled={Boolean(pendingAction)}>Cancel</button>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={Boolean(pendingAction)}
                className="is-danger"
              >
                {pendingAction === 'delete-all' ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete all permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="cn-trash-dialog-backdrop fixed inset-0 flex items-center justify-center z-[120]"
          onMouseDown={(event) => event.target === event.currentTarget && setDeleteTarget(null)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="permanent-delete-title" className="cn-trash-dialog w-full max-w-md mx-4">
            <span className="cn-trash-dialog-icon"><Trash2 className="w-6 h-6" /></span>
            <h2 id="permanent-delete-title">Delete “{deleteTarget.name}” permanently?</h2>
            <p>This action cannot be undone. The design and its saved configuration will be permanently removed.</p>
            {operationError && <p className="cn-trash-dialog-error" role="alert">{operationError}</p>}
            <div className="cn-trash-dialog-actions">
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={Boolean(pendingAction)}>Cancel</button>
              <button type="button" onClick={handlePermanentDelete} disabled={Boolean(pendingAction)} className="is-danger">
                {pendingAction === `delete-${deleteTarget._id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.open && detailsModal.design && (
        <div
          className="cn-trash-dialog-backdrop fixed inset-0 flex items-center justify-center z-[120]"
          onMouseDown={(event) => event.target === event.currentTarget && setDetailsModal({ open: false, design: null })}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="design-details-title" className="cn-trash-dialog cn-trash-details-dialog w-full max-w-lg mx-4 text-left">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[var(--cn-line)]">
              <span className="cn-trash-details-icon"><Info className="w-5 h-5 text-[var(--cn-cherry)]" /></span>
              <div>
                <h3 id="design-details-title" className="text-xl font-bold font-serif text-[var(--cn-ink)] leading-snug">Design Details</h3>
                <p className="text-xs text-[var(--cn-muted)]">Configuration & saved specs</p>
              </div>
            </div>
            <div className="cn-trash-details-list space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Name</span> <strong className="text-[var(--cn-ink)]">{detailsModal.design.name}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Layers</span> <strong className="text-[var(--cn-ink)]">{detailsModal.design.config?.layers || 2}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Cake Flavor</span> <strong className="text-[var(--cn-ink)] capitalize">{detailsModal.design.config?.cakeColor || 'vanilla'}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Frosting</span> <strong className="text-[var(--cn-ink)] capitalize">{detailsModal.design.config?.frostingColor || 'vanilla'}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Toppings</span> <strong className="text-[var(--cn-ink)]">{(detailsModal.design.config?.toppings || []).join(', ') || 'None'}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Saved estimate</span> <strong className="text-[var(--cn-ink)]">{formatEstimate(detailsModal.design)}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Sent to Bakery</span> <strong className="text-[var(--cn-ink)]">{detailsModal.design.sentToBakery ? 'Yes' : 'No'}</strong></div>
              <div className="flex justify-between py-1 border-b border-[rgba(44,23,19,0.06)]"><span className="text-[var(--cn-muted)]">Date Modified</span> <strong className="text-[var(--cn-ink)]">{formatDate(detailsModal.design.lastEdited)}</strong></div>
              <div className="flex justify-between py-1"><span className="text-[var(--cn-muted)]">Date Created</span> <strong className="text-[var(--cn-ink)]">{formatDate(detailsModal.design.createdAt)}</strong></div>
            </div>
            <div className="cn-trash-dialog-actions mt-5">
              <button
                type="button"
                onClick={() => setDetailsModal({ open: false, design: null })}
                className="w-full justify-center"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
