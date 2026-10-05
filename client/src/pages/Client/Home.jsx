import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Copy,
  Sparkles,
  MoreVertical,
  ExternalLink,
  Info,
  Trash2,
  Pencil,
  RefreshCw,
  X,
  Cake,
  ReceiptText,
  Calendar,
  Layers,
  Palette,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Home as HomeIcon,
  LayoutTemplate,
  Search,
  Heart,
  PartyPopper,
  CornerDownLeft,
} from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { designApi, pricingApi } from '@/services/api';
import { useDragToScroll } from '@/hooks/useDragToScroll';

const formatMoney = (minor = 0) => new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
}).format(minor / 100);

function getCakeSpecs(config) {
  if (!config || typeof config !== 'object') return [];
  const specs = [];

  // Tiers / Structure
  if (config.cakeStructure?.tiers) {
    const tierText = config.cakeStructure.tiers === '2_tiers' ? '2 Tiers' : '1 Tier';
    const sizeText = config.cakeStructure.size ? ` (${config.cakeStructure.size})` : '';
    specs.push({ label: 'Structure', value: `${tierText}${sizeText}` });
  } else if (config.layers) {
    specs.push({ label: 'Structure', value: `${config.layers} Layers` });
  }

  // Frosting
  const frostStyle = config.frosting?.style;
  const frostFlavor = config.frosting?.flavor || config.frostingColor;
  if (frostStyle || frostFlavor) {
    specs.push({
      label: 'Frosting',
      value: [frostStyle ? `${frostStyle} finish` : null, frostFlavor].filter(Boolean).join(' · '),
    });
  }

  // Side
  if (config.side?.style && config.side.style !== 'none') {
    specs.push({ label: 'Side Design', value: config.side.style });
  }

  // Edge
  if (config.edge?.style && config.edge.style !== 'none') {
    specs.push({ label: 'Edge Border', value: config.edge.style });
  }

  return specs;
}

export default function ClientHome() {
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [renameModal, setRenameModal] = useState({ open: false, designId: null, currentName: '' });
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [isEditingDetailsName, setIsEditingDetailsName] = useState(false);
  const [detailsNameInput, setDetailsNameInput] = useState('');
  const [activeQuote, setActiveQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [trashNotification, setTrashNotification] = useState(null);
  const [trashConfirmTarget, setTrashConfirmTarget] = useState(null);
  const [showTrashFullWarning, setShowTrashFullWarning] = useState(false);
  const [neverShowTrashWarning, setNeverShowTrashWarning] = useState(false);
  const trashNotificationTimerRef = useRef(null);
  const detailsInputRef = useRef(null);
  const isSavingRenameRef = useRef(false);

  useDragToScroll();

  useEffect(() => {
    if (isEditingDetailsName && detailsInputRef.current) {
      detailsInputRef.current.focus();
      detailsInputRef.current.select();
    }
  }, [isEditingDetailsName]);

  useEffect(() => {
    fetchRecentDesigns();
    return () => {
      if (trashNotificationTimerRef.current) {
        clearTimeout(trashNotificationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeMenu && !event.target.closest('.dropdown-menu')) {
        setActiveMenu(null);
      }
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setActiveMenu(null);
        if (renameModal.open) setRenameModal({ open: false, designId: null, currentName: '' });
        if (trashConfirmTarget) setTrashConfirmTarget(null);
        if (selectedDesign) setSelectedDesign(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [activeMenu, renameModal.open, trashConfirmTarget, selectedDesign]);

  // Fetch or resolve full pricing breakdown whenever selectedDesign changes
  useEffect(() => {
    if (!selectedDesign) {
      setActiveQuote(null);
      return;
    }

    if (Array.isArray(selectedDesign.lastEstimate?.lineItems) && selectedDesign.lastEstimate.lineItems.length > 0) {
      setActiveQuote(selectedDesign.lastEstimate);
      return;
    }

    if (selectedDesign.config && typeof selectedDesign.config === 'object' && pricingApi?.quoteCake) {
      let active = true;
      setQuoteLoading(true);
      pricingApi.quoteCake(selectedDesign.config)
        .then((res) => {
          if (active) setActiveQuote(res);
        })
        .catch(() => {
          if (active) setActiveQuote(selectedDesign.lastEstimate || null);
        })
        .finally(() => {
          if (active) setQuoteLoading(false);
        });
      return () => { active = false; };
    } else {
      setActiveQuote(selectedDesign.lastEstimate || null);
    }
  }, [selectedDesign]);

  const fetchRecentDesigns = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const designs = await designApi.getDesigns();
      const activeDesigns = (Array.isArray(designs) ? designs : [])
        .filter((design) => !design.isTrashed)
        .sort((first, second) => new Date(second.lastEdited || 0) - new Date(first.lastEdited || 0));
      setRecentDesigns(activeDesigns);
      if (selectedDesign) {
        const refreshed = activeDesigns.find((d) => d._id === selectedDesign._id);
        setSelectedDesign(refreshed || null);
      }
    } catch (error) {
      console.error('Failed to fetch recent designs:', error);
      setLoadError('We could not load your recent designs.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'recently';
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

  const formatAbsoluteDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleRename = async (designId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

    // Optimistically update right away so the name immediately changes on screen without reverting or flashing
    const prevDesigns = [...recentDesigns];
    const prevSelected = selectedDesign;

    setRecentDesigns((designs) =>
      designs.map((d) => (d._id === designId ? { ...d, name: trimmedName } : d))
    );
    setSelectedDesign((prev) =>
      prev && prev._id === designId ? { ...prev, name: trimmedName } : prev
    );
    setRenameModal({ open: false, designId: null, currentName: '' });

    try {
      await designApi.updateDesign(designId, { name: trimmedName });
    } catch (error) {
      console.error('Failed to rename design:', error);
      // Revert if API call failed
      setRecentDesigns(prevDesigns);
      setSelectedDesign(prevSelected);
    }
  };

  const handleCommitDetailsRename = () => {
    if (isSavingRenameRef.current) return;
    isSavingRenameRef.current = true;

    const trimmed = detailsNameInput.trim();
    setIsEditingDetailsName(false);

    if (trimmed && selectedDesign && trimmed !== selectedDesign.name) {
      handleRename(selectedDesign._id, trimmed);
    } else {
      setDetailsNameInput(selectedDesign?.name || '');
    }

    setTimeout(() => {
      isSavingRenameRef.current = false;
    }, 200);
  };

  const handleMoveToTrash = async (designId) => {
    try {
      const design = await designApi.moveToTrash(designId);
      setRecentDesigns((designs) => designs.filter((d) => d._id !== designId));
      if (selectedDesign && selectedDesign._id === designId) {
        setSelectedDesign(null);
      }
      setActiveMenu(null);
      
      if (trashNotificationTimerRef.current) {
        clearTimeout(trashNotificationTimerRef.current);
      }

      setTrashNotification({
        designId,
        designName: design.name,
        show: true,
      });

      trashNotificationTimerRef.current = setTimeout(() => {
        setTrashNotification(null);
      }, 5000);

      if (!neverShowTrashWarning) {
        const trashedCount = recentDesigns.filter((d) => d.isTrashed).length;
        if (trashedCount >= 19) {
          setShowTrashFullWarning(true);
        }
      }
    } catch (error) {
      console.error('Failed to move to trash:', error);
    }
  };

  const handleDuplicate = async (design) => {
    setActiveMenu(null);
    setSelectedDesign(null);
    try {
      const copyableDesign = { ...design };
      ['_id', 'userId', 'createdAt', 'lastEdited', 'isTrashed', 'trashedAt', 'sentToBakery'].forEach((key) => delete copyableDesign[key]);
      const duplicate = await designApi.createDesign({
        ...copyableDesign,
        name: `${design.name || 'Untitled design'} copy`,
        sentToBakery: false,
        isDuplicated: true,
      });
      setRecentDesigns((designs) => [{ ...duplicate, isDuplicated: true }, ...designs.filter((d) => d._id !== duplicate._id)]);
    } catch (error) {
      console.error('Failed to duplicate design:', error);
      setLoadError('The design could not be duplicated. Please try again.');
    }
  };

  const handleUndoTrash = async () => {
    if (!trashNotification) return;
    if (trashNotificationTimerRef.current) {
      clearTimeout(trashNotificationTimerRef.current);
    }
    
    try {
      await designApi.restoreFromTrash(trashNotification.designId);
      const restoredDesign = await designApi.getDesignById(trashNotification.designId);
      setRecentDesigns((designs) => [restoredDesign, ...designs]);
      setSelectedDesign(restoredDesign);
      setTrashNotification(null);
    } catch (error) {
      console.error('Failed to undo trash:', error);
    }
  };

  const handleOpenInNewTab = (designId) => {
    window.open(`/designer?designId=${designId}`, '_blank');
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

  const handleSelectDesignDetails = (design) => {
    setSelectedDesign((prev) => (prev?._id === design._id ? null : design));
    setActiveMenu(null);
  };

  const displayedDesigns = recentDesigns.filter((design) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (design.name && design.name.toLowerCase().includes(q)) ||
      (design.config?.sponge?.flavor && design.config.sponge.flavor.toLowerCase().includes(q)) ||
      (design.config?.frosting?.style && design.config.frosting.style.toLowerCase().includes(q)) ||
      (design.config?.cakeStructure?.size && design.config.cakeStructure.size.toLowerCase().includes(q))
    );
  });

  const selectedSpecs = selectedDesign ? getCakeSpecs(selectedDesign.config) : [];
  const lineItems = activeQuote?.lineItems || selectedDesign?.lastEstimate?.lineItems || [];
  const displayTotal = activeQuote?.totalMinor != null
    ? formatMoney(activeQuote.totalMinor)
    : selectedDesign?.lastEstimate?.totalMinor != null
    ? formatMoney(selectedDesign.lastEstimate.totalMinor)
    : null;

  return (
    <div className="cn-app-page cn-home-page min-h-screen">
      <ClientNavbar />
      <main className={`cn-home-shell ${selectedDesign ? 'has-details-open' : ''}`}>
        <header className="cn-page-header cn-home-header max-w-3xl mx-auto text-center pt-6 pb-8">
          <div className="cn-home-heading">
            <Sparkles aria-hidden="true" />
            <h1 className="cn-home-title">Welcome to CakeNMake</h1>
            <Sparkles aria-hidden="true" />
          </div>
          <p>Pick up where you left off, or begin a new cake for your next occasion.</p>

          <div className="relative max-w-2xl mx-auto my-6">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recent designs"
              className="w-full pl-11 pr-10 py-3 rounded-full border border-pink-100 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-300 text-sm text-gray-700"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </header>

        <section className="cn-recent-section" aria-labelledby="recent-designs-title" aria-busy={loading}>
          <div className="cn-recent-heading">
            <div>
              <p>YOUR CAKE TABLE</p>
              <h2 id="recent-designs-title">Recent designs</h2>
            </div>
            {!loading && recentDesigns.length > 0 && (
              <span>
                {displayedDesigns.length} {displayedDesigns.length === 1 ? 'design' : 'designs'}
                {searchQuery ? ' found' : ' (up to 20)'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="cn-design-grid" role="status" aria-label="Loading recent designs">
              {[0, 1, 2, 3].map((item) => (
                <div className="cn-design-skeleton" key={item}>
                  <span /><span /><span />
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="cn-home-state is-error" role="alert">
              <AlertCircle aria-hidden="true" />
              <div>
                <h3>Recent designs are unavailable</h3>
                <p>{loadError}</p>
              </div>
              <div>
                <button type="button" onClick={fetchRecentDesigns}>
                  <RefreshCw aria-hidden="true" /> Retry
                </button>
                <Link to="/designer">Create a new cake</Link>
              </div>
            </div>
          ) : recentDesigns.length === 0 ? (
            <div className="cn-home-state is-empty">
              <Sparkles aria-hidden="true" />
              <div>
                <h3>Your cake table is ready</h3>
                <p>Create your first design from scratch or start with a little inspiration.</p>
              </div>
              <div>
                <Link to="/designer">Create a cake</Link>
                <Link to="/templates">Browse templates</Link>
              </div>
            </div>
          ) : displayedDesigns.length === 0 ? (
            <div className="cn-home-state is-empty">
              <Search aria-hidden="true" />
              <div>
                <h3>No designs found</h3>
                <p>No recent designs match &ldquo;{searchQuery}&rdquo;.</p>
              </div>
              <div>
                <button type="button" onClick={() => setSearchQuery('')}>Clear search</button>
                <Link to="/designer">Create a new cake</Link>
              </div>
            </div>
          ) : (
            <div className="cn-design-grid">
                  {displayedDesigns.slice(0, 20).map((design, index) => {
                    const isSelected = selectedDesign?._id === design._id;
                    const isMenuOpen = (typeof activeMenu === 'string' ? activeMenu === design._id : activeMenu?.id === design._id);
                    return (
                      <article
                        key={design._id}
                        className={`cn-design-card ${isSelected ? 'is-selected' : ''} ${isMenuOpen ? 'is-menu-open' : ''}`}
                      >
                        <Link
                          to={`/designer?designId=${design._id}`}
                          className="cn-design-thumbnail-link"
                          tabIndex={-1}
                          aria-hidden="true"
                        >
                          <div className="cn-design-thumbnail">
                            {index === 0 && <span className="cn-latest-badge">Latest</span>}
                            {design.thumbnail ? (
                              <img
                                src={design.thumbnail}
                                alt=""
                                onError={(event) => {
                                  if (design.thumbnailFallback && event.currentTarget.src !== design.thumbnailFallback) {
                                    event.currentTarget.src = design.thumbnailFallback;
                                  }
                                }}
                              />
                            ) : (
                              <span className="cn-design-placeholder">
                                <Sparkles aria-hidden="true" />
                              </span>
                            )}
                          </div>
                        </Link>

                        <div className="cn-design-meta">
                          <div className="cn-design-meta-info">
                            <Link
                              to={`/designer?designId=${design._id}`}
                              className="cn-design-title-link"
                              aria-label={`Open ${design.name || 'untitled design'}, ${design.isDuplicated ? 'duplicated' : `edited ${formatDate(design.lastEdited)}`}`}
                            >
                              <h3>{design.name || 'Untitled design'}</h3>
                            </Link>
                            <p>{design.isDuplicated ? 'Duplicated' : `Edited ${formatDate(design.lastEdited)}`}</p>
                            {index === 0 && (
                              <Link to={`/designer?designId=${design._id}`} className="cn-continue-label">
                                Continue designing →
                              </Link>
                            )}
                          </div>

                          <div className="cn-design-menu-wrap">
                            <button
                              type="button"
                              className="cn-design-menu-trigger"
                              aria-label={`Actions for ${design.name || 'untitled design'}`}
                              aria-haspopup="menu"
                              aria-expanded={(typeof activeMenu === 'string' ? activeMenu === design._id : activeMenu?.id === design._id)}
                              onClick={(event) => handleMenuToggle(event, design._id)}
                            >
                              <MoreVertical aria-hidden="true" />
                            </button>

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
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setActiveMenu(null);
                                    setRenameModal({ open: true, designId: design._id, currentName: design.name });
                                  }}
                                >
                                  <Pencil aria-hidden="true" /> Rename
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleDuplicate(design)}
                                >
                                  <Copy aria-hidden="true" /> Duplicate
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleOpenInNewTab(design._id)}
                                >
                                  <ExternalLink aria-hidden="true" /> Open in new tab
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleSelectDesignDetails(design)}
                                >
                                  <Info aria-hidden="true" /> Details
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="is-danger"
                                  onClick={() => {
                                    setActiveMenu(null);
                                    setTrashConfirmTarget(design);
                                  }}
                                >
                                  <Trash2 aria-hidden="true" /> Move to trash
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </main>

      {/* Right-Side Full-Height Details & Pricing Breakdown Section */}
      {selectedDesign && (
        <div
          className="cn-home-details-wrapper"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedDesign(null);
          }}
        >
          <aside
            className="cn-home-details-panel animate-in fade-in slide-in-from-right-4 duration-200"
            aria-label="Design details and price breakdown"
          >
            <div className="pb-3 border-b border-[var(--cn-line)]">
              {/* Top Row: Category title and exit button alone */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--cn-rose-deep)]">
                  Design & Price Details
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedDesign(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--cn-muted)] hover:bg-[var(--cn-paper)] hover:text-[var(--cn-ink)] transition-colors"
                  aria-label="Close details"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Lower down: Clickable / Editable Design Name */}
              <div className="mt-3">
                {isEditingDetailsName ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCommitDetailsRename();
                    }}
                    className="relative flex items-center w-full"
                  >
                    <input
                      ref={detailsInputRef}
                      type="text"
                      enterKeyHint="done"
                      autoComplete="off"
                      value={detailsNameInput}
                      onChange={(e) => setDetailsNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.keyCode === 13 || e.which === 13) {
                          e.preventDefault();
                          handleCommitDetailsRename();
                        } else if (e.key === 'Escape') {
                          e.preventDefault();
                          setIsEditingDetailsName(false);
                          setDetailsNameInput(selectedDesign?.name || '');
                        }
                      }}
                      onBlur={(e) => {
                        // Don't cancel or double commit if the user clicked the Enter submit button inside the input
                        if (e.relatedTarget && e.relatedTarget.closest('.details-rename-submit-btn')) {
                          return;
                        }
                        handleCommitDetailsRename();
                      }}
                      placeholder="Enter design name..."
                      maxLength={100}
                      className="w-full font-heading text-lg font-bold text-[var(--cn-ink)] bg-white border-2 border-[var(--cn-cherry)] rounded-2xl pl-3.5 pr-22 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300 shadow-xs transition-all"
                    />
                    <button
                      type="submit"
                      title="Save design name (Enter)"
                      aria-label="Confirm rename"
                      className="details-rename-submit-btn absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-xl bg-[var(--cn-cherry,#ff4d8d)] hover:bg-[var(--cn-cherry-dark,#e03577)] active:scale-95 text-white flex items-center gap-1 shadow-xs transition-transform cursor-pointer"
                    >
                      <span className="text-xs font-bold">Enter</span>
                      <CornerDownLeft className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDetailsNameInput(selectedDesign.name || '');
                      setIsEditingDetailsName(true);
                    }}
                    title="Click to rename design"
                    className="group/name w-full text-left flex items-center justify-between gap-2 p-1 -m-1 rounded-lg hover:bg-[var(--cn-paper)] transition-colors cursor-pointer"
                  >
                    <h3
                      className="font-heading text-lg font-bold text-[var(--cn-ink)] truncate group-hover/name:text-[var(--cn-cherry-dark)] transition-colors"
                      title={selectedDesign.name}
                    >
                      {selectedDesign.name || 'Untitled design'}
                    </h3>
                    <Pencil className="w-3.5 h-3.5 text-[var(--cn-muted)] opacity-0 group-hover/name:opacity-100 transition-opacity shrink-0" />
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnail / Image Preview */}
            <div className="my-4 rounded-xl overflow-hidden border border-[var(--cn-line)] bg-[var(--cn-paper)] aspect-video relative group">
              {selectedDesign.thumbnail ? (
                <img
                  src={selectedDesign.thumbnail}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    if (selectedDesign.thumbnailFallback && e.currentTarget.src !== selectedDesign.thumbnailFallback) {
                      e.currentTarget.src = selectedDesign.thumbnailFallback;
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[var(--cn-muted)] gap-1">
                  <Cake className="w-8 h-8 opacity-40 text-[var(--cn-cherry)]" />
                  <span className="text-xs">No preview available</span>
                </div>
              )}
              <Link
                to={`/designer?designId=${selectedDesign._id}`}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5"
              >
                Open in Designer <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <Link
              to={`/designer?designId=${selectedDesign._id}`}
              className="w-full mb-5 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--cn-cherry)] hover:bg-[var(--cn-cherry-dark)] text-white text-xs font-bold shadow-md shadow-[rgba(var(--cn-brand-rgb),0.2)] transition-colors"
            >
              Open in Designer <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Design Specifications */}
            <div className="space-y-3 pb-4 border-b border-[var(--cn-line)] text-xs">
              <h4 className="font-bold text-[var(--cn-ink)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[var(--cn-cherry)]" /> Design Specifications
              </h4>
              <div className="space-y-1.5 text-[var(--cn-muted)]">
                {selectedSpecs.map((spec, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="font-medium text-[var(--cn-muted)]">{spec.label}</span>
                    <span className="font-semibold text-[var(--cn-ink)] text-right">{spec.value}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Sent to Bakery</span>
                  <span className="font-semibold text-[var(--cn-ink)]">
                    {selectedDesign.sentToBakery ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Last Modified</span>
                  <span className="font-semibold text-[var(--cn-ink)]">
                    {selectedDesign.isDuplicated ? 'Duplicated' : formatDate(selectedDesign.lastEdited)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">Created</span>
                  <span className="font-semibold text-[var(--cn-ink)]">{formatAbsoluteDate(selectedDesign.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Full Pricing Breakdown */}
            <div className="my-4 space-y-3 pb-4 border-b border-[var(--cn-line)] text-xs">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-[var(--cn-ink)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ReceiptText className="w-3.5 h-3.5 text-[var(--cn-cherry)]" /> Price Breakdown
                </h4>
                {quoteLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--cn-cherry)]" />}
              </div>

              {lineItems.length > 0 ? (
                <div className="space-y-2 bg-[var(--cn-paper)] p-3 rounded-xl border border-[var(--cn-line)]">
                  {lineItems.map((item, idx) => {
                    const isCenterText = item.label?.startsWith('Center Text') || (Array.isArray(item.details) && item.details.some(d => typeof d === 'string' && d.startsWith('Letters x')));
                    let displayLabel = item.label;
                    let displayDetails = item.details || [];
                    if (isCenterText) {
                      displayLabel = 'Center Text:';
                      if (!displayDetails.length) {
                        const match = item.label?.match(/Center Text\s*(?:x|×)\s*(\d+)/i);
                        const letterCount = match ? match[1] : (item.quantity > 1 ? item.quantity : null);
                        if (letterCount) displayDetails = [`Letters x ${letterCount}`];
                      }
                    }

                    return (
                      <div key={idx} className="flex items-start justify-between gap-2 text-xs border-b border-[rgba(44,23,19,0.06)] pb-1.5 last:border-b-0 last:pb-0">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--cn-ink)] leading-tight">{displayLabel}</p>
                          {Array.isArray(displayDetails) && displayDetails.length > 0 && (
                            <p className="text-[10px] text-[var(--cn-muted)] mt-0.5 leading-tight">
                              {displayDetails.join(' · ')}
                            </p>
                          )}
                          {!isCenterText && item.quantity > 1 && (
                            <span className="text-[10px] text-[var(--cn-muted)]">
                              ({item.quantity} × {formatMoney(item.unitPriceMinor)})
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-[var(--cn-ink)] tabular-nums shrink-0">
                          {formatMoney(item.lineTotalMinor)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : displayTotal ? (
                <div className="bg-[var(--cn-paper)] p-3 rounded-xl border border-[var(--cn-line)] text-center text-[var(--cn-muted)]">
                  <span>Base price calculated</span>
                </div>
              ) : (
                <div className="bg-[var(--cn-paper)] p-3 rounded-xl border border-[var(--cn-line)] text-center text-[var(--cn-muted)]">
                  <span>Open in designer to calculate full breakdown</span>
                </div>
              )}

              {/* Total Price Row */}
              <div className="flex items-center justify-between pt-1">
                <span className="font-heading font-bold text-sm text-[var(--cn-ink)]">Total</span>
                <span className="font-heading font-bold text-base text-[var(--cn-cherry)] tabular-nums">
                  {displayTotal || '—'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--cn-muted)] leading-tight">
                Cake price only. Delivery fee is not included.
              </p>
            </div>

            {/* Secondary Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleDuplicate(selectedDesign)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[var(--cn-line)] bg-white hover:bg-[var(--cn-paper)] text-[var(--cn-ink)] text-xs font-semibold transition-colors shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-[var(--cn-muted)]" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => setTrashConfirmTarget(selectedDesign)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-[var(--cn-line)] bg-white hover:bg-rose-50 text-[var(--cn-cherry)] text-xs font-semibold transition-colors shadow-xs"
                title="Move to trash"
              >
                <Trash2 className="w-3.5 h-3.5 text-[var(--cn-cherry)]" /> Move to trash
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Move to Trash Confirmation Dialog */}
      {trashConfirmTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[120]"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTrashConfirmTarget(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="trash-confirm-title"
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-[var(--cn-line)] animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-[var(--cn-cherry)] mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 id="trash-confirm-title" className="font-heading text-lg font-bold text-[var(--cn-ink)] mb-2 break-words">
              Move “{trashConfirmTarget.name || 'Untitled design'}” to trash?
            </h3>
            <p className="text-xs text-[var(--cn-muted)] leading-relaxed mb-6">
              This design will be moved to your Trash folder. You can retrieve and restore it at any time within <strong>30 days</strong>. After 30 days, it may be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setTrashConfirmTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-[var(--cn-muted)] hover:bg-[var(--cn-paper)] rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetId = trashConfirmTarget._id;
                  setTrashConfirmTarget(null);
                  handleMoveToTrash(targetId);
                }}
                className="px-4 py-2 bg-[var(--cn-cherry)] hover:bg-[var(--cn-cherry-dark)] text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
              >
                Move to trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renameModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="presentation">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="rename-design-title">
            <h3 id="rename-design-title" className="text-lg font-bold mb-4 text-gray-900">Rename Design</h3>
            <input
              type="text"
              aria-label="Design name"
              value={renameModal.currentName}
              onChange={(event) => setRenameModal((current) => ({ ...current, currentName: event.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRename(renameModal.designId, e.target.value);
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRenameModal({ open: false, designId: null, currentName: '' })}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRename(renameModal.designId, renameModal.currentName)}
                disabled={!renameModal.currentName.trim()}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 text-sm font-medium disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Notification Toast */}
      {trashNotification && trashNotification.show && (
        <div className="fixed bottom-[calc(80px+env(safe-area-inset-bottom,0px))] md:bottom-6 right-4 left-4 md:left-auto md:right-6 max-w-sm w-auto md:w-full bg-white/95 dark:bg-card/95 backdrop-blur-md border border-border/80 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate" title={trashNotification.designName}>
                {trashNotification.designName}
              </p>
              <p className="text-xs text-muted-foreground">Moved to Trash</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleUndoTrash}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-semibold shadow-sm hover:bg-primary/90 transition-colors"
              >
                Undo
              </button>
              <button
                onClick={() => {
                  if (trashNotificationTimerRef.current) clearTimeout(trashNotificationTimerRef.current);
                  setTrashNotification(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trash Full Warning */}
      {showTrashFullWarning && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-yellow-100 border border-yellow-400 rounded-xl p-4 shadow-xl z-50">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Trash is almost full</p>
              <p className="text-sm text-yellow-700">Your Trash folder has a maximum capacity of 20 designs. Any more items moved to Trash will permanently delete the oldest trashed file.</p>
            </div>
            <button
              onClick={() => setShowTrashFullWarning(false)}
              className="text-yellow-800 hover:text-yellow-900"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="neverShow"
              checked={neverShowTrashWarning}
              onChange={(e) => setNeverShowTrashWarning(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="neverShow" className="text-sm text-yellow-700">Never show again</label>
          </div>
        </div>
      )}
    </div>
  );
}
