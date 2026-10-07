import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, RotateCcw, Sparkles, Loader2, MoreVertical, Info, AlertCircle, ArrowRight, ChevronDown, CheckCircle2 } from 'lucide-react';
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
    if (!detailsModal.open && !deleteTarget) return undefined;
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      setDetailsModal({ open: false, design: null });
      setDeleteTarget(null);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [detailsModal.open, deleteTarget]);

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
        <div className="cn-page-header cn-trash-header text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trash2 className="w-8 h-8 text-pink-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
              Trash
            </h1>
            <Sparkles className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-xl text-gray-600 font-light">
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
              <span className="cn-trash-empty-icon"><Trash2 className="w-8 h-8" /></span>
              <h2>Trash is empty</h2>
              <p>Deleted designs will appear here. Until then, you can return to creating something worth celebrating.</p>
              <div className="cn-trash-empty-actions">
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onMouseDown={(event) => event.target === event.currentTarget && setDetailsModal({ open: false, design: null })}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="design-details-title" className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 id="design-details-title" className="text-lg font-bold mb-4">Design Details</h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Name:</span> {detailsModal.design.name}</p>
              <p><span className="font-medium">Layers:</span> {detailsModal.design.config?.layers || 2}</p>
              <p><span className="font-medium">Cake Flavor:</span> {detailsModal.design.config?.cakeColor || 'vanilla'}</p>
              <p><span className="font-medium">Frosting:</span> {detailsModal.design.config?.frostingColor || 'vanilla'}</p>
              <p><span className="font-medium">Toppings:</span> {(detailsModal.design.config?.toppings || []).join(', ') || 'None'}</p>
              <p><span className="font-medium">Saved estimate:</span> {formatEstimate(detailsModal.design)}</p>
              <p><span className="font-medium">Sent to Bakery:</span> {detailsModal.design.sentToBakery ? 'Yes' : 'No'}</p>
              <p><span className="font-medium">Date Modified:</span> {formatDate(detailsModal.design.lastEdited)}</p>
              <p><span className="font-medium">Date Created:</span> {formatDate(detailsModal.design.createdAt)}</p>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setDetailsModal({ open: false, design: null })}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
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
