import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Copy, Sparkles, MoreVertical, ExternalLink, Info, Trash2, Pencil, RefreshCw } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { designApi } from '@/services/api';

export default function ClientHome() {
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeMenu, setActiveMenu] = useState(null);
  const [renameModal, setRenameModal] = useState({ open: false, designId: null, currentName: '' });
  const [detailsModal, setDetailsModal] = useState({ open: false, design: null });
  const [trashNotification, setTrashNotification] = useState(null);
  const [showTrashFullWarning, setShowTrashFullWarning] = useState(false);
  const [neverShowTrashWarning, setNeverShowTrashWarning] = useState(false);

  useEffect(() => {
    fetchRecentDesigns();
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

  const fetchRecentDesigns = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const designs = await designApi.getDesigns();
      const activeDesigns = (Array.isArray(designs) ? designs : [])
        .filter((design) => !design.isTrashed)
        .sort((first, second) => new Date(second.lastEdited || 0) - new Date(first.lastEdited || 0));
      setRecentDesigns(activeDesigns);
    } catch (error) {
      console.error('Failed to fetch recent designs:', error);
      setLoadError('We could not load your recent designs.');
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

  const handleRename = async (designId, newName) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    try {
      await designApi.updateDesign(designId, { name: trimmedName });
      setRecentDesigns(designs => designs.map(d => 
        d._id === designId ? { ...d, name: trimmedName } : d
      ));
      setRenameModal({ open: false, designId: null, currentName: '' });
    } catch (error) {
      console.error('Failed to rename design:', error);
    }
  };

  const handleMoveToTrash = async (designId) => {
    try {
      const design = await designApi.moveToTrash(designId);
      setRecentDesigns(designs => designs.filter(d => d._id !== designId));
      setActiveMenu(null);
      
      // Show undo notification
      setTrashNotification({
        designId,
        designName: design.name,
        show: true
      });

      // Check if trash is full and show warning
      if (!neverShowTrashWarning) {
        const trashedCount = recentDesigns.filter(d => d.isTrashed).length;
        if (trashedCount >= 4) { // About to reach limit
          setShowTrashFullWarning(true);
        }
      }
    } catch (error) {
      console.error('Failed to move to trash:', error);
    }
  };

  const handleDuplicate = async (design) => {
    setActiveMenu(null);
    try {
      const copyableDesign = { ...design };
      ['_id', 'userId', 'createdAt', 'lastEdited', 'isTrashed', 'sentToBakery'].forEach((key) => delete copyableDesign[key]);
      const duplicate = await designApi.createDesign({
        ...copyableDesign,
        name: `${design.name || 'Untitled design'} copy`,
        sentToBakery: false,
      });
      setRecentDesigns((designs) => [duplicate, ...designs]);
    } catch (error) {
      console.error('Failed to duplicate design:', error);
      setLoadError('The design could not be duplicated. Please try again.');
    }
  };

  const handleUndoTrash = async () => {
    if (!trashNotification) return;
    
    try {
      await designApi.restoreFromTrash(trashNotification.designId);
      const restoredDesign = await designApi.getDesignById(trashNotification.designId);
      setRecentDesigns(designs => [...designs, restoredDesign]);
      setTrashNotification(null);
    } catch (error) {
      console.error('Failed to undo trash:', error);
    }
  };

  const handleOpenInNewTab = (designId) => {
    window.open(`/designer?designId=${designId}`, '_blank');
    setActiveMenu(null);
  };

  const handleShowDetails = (design) => {
    setDetailsModal({ open: true, design });
    setActiveMenu(null);
  };

  const calculateTotal = (config) => {
    const CAKE_FLAVOR_PRICES = { vanilla: 15, chocolate: 18, strawberry: 18, cheese: 20, ube: 22, mocha: 20 };
    const FROSTING_PRICES = { vanilla: 5, chocolate: 7, strawberry: 7, cheese: 8, ube: 9, mocha: 8 };
    const LAYER_PRICES = { 1: 10, 2: 15, 3: 20 };
    const TOPPING_PRICES = { cherry: 3, sprinkles: 2, candles: 4, strawberries: 5, chocolateChips: 3, rosettes: 6 };
    const PLACED_ITEM_PRICES = { cherry: 3, strawberry: 4, candle: 4, chocolateChip: 2, rosette: 5 };
    const PIPING_PRICE = 5;

    const { layers = 2, frostingColor = 'vanilla', cakeColor = 'vanilla', toppings = [], placedItems = [] } = config;
    const layerCost = LAYER_PRICES[Math.min(layers, 3)] || 10;
    const cakeCost = CAKE_FLAVOR_PRICES[cakeColor] || 15;
    const frostingCost = FROSTING_PRICES[frostingColor] || 5;
    const toppingsCost = toppings.reduce((s, t) => s + (TOPPING_PRICES[t] || 0), 0);
    const placedCost = (placedItems || []).reduce((s, item) => s + (item.type === 'piping' ? PIPING_PRICE : (PLACED_ITEM_PRICES[item.type] || 0)), 0);
    return layerCost + cakeCost + frostingCost + toppingsCost + placedCost;
  };

  return (
    <div className="cn-app-page cn-home-page min-h-screen">
      <ClientNavbar />
      <main className="cn-home-shell">
        <header className="cn-page-header cn-home-header text-center">
          <div className="cn-home-heading">
            <Sparkles aria-hidden="true" />
            <h1 className="cn-home-title">Welcome to CakeNMake</h1>
            <Sparkles aria-hidden="true" />
          </div>
          <p>Pick up where you left off, or begin a new cake for your next occasion.</p>
          <Link to="/designer" className="cn-home-primary-action">Start a new cake <span aria-hidden="true">✦</span></Link>
        </header>

        <section className="cn-recent-section" aria-labelledby="recent-designs-title" aria-busy={loading}>
          <div className="cn-recent-heading">
            <div>
              <p>YOUR CAKE TABLE</p>
              <h2 id="recent-designs-title">Recent designs</h2>
            </div>
            {!loading && recentDesigns.length > 0 && <span>{Math.min(recentDesigns.length, 3)} most recent</span>}
          </div>

          {loading ? (
            <div className="cn-design-grid" role="status" aria-label="Loading recent designs">
              {[0, 1, 2].map((item) => <div className="cn-design-skeleton" key={item}><span /><span /><span /></div>)}
            </div>
          ) : loadError ? (
            <div className="cn-home-state is-error" role="alert">
              <AlertCircle aria-hidden="true" />
              <div><h3>Recent designs are unavailable</h3><p>{loadError}</p></div>
              <button type="button" onClick={fetchRecentDesigns}><RefreshCw aria-hidden="true" /> Retry</button>
            </div>
          ) : recentDesigns.length === 0 ? (
            <div className="cn-home-state is-empty">
              <Sparkles aria-hidden="true" />
              <div><h3>Your cake table is ready</h3><p>Create your first design from scratch or start with a little inspiration.</p></div>
              <div><Link to="/designer">Create a cake</Link><Link to="/templates">Browse templates</Link></div>
            </div>
          ) : (
            <div className="cn-design-grid">
              {recentDesigns.slice(0, 3).map((design, index) => (
                <article key={design._id} className="cn-design-card">
                  <Link
                    to={`/designer?designId=${design._id}`}
                    className="cn-design-card-link"
                    aria-label={`Open ${design.name || 'untitled design'}, edited ${formatDate(design.lastEdited)}`}
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
                      ) : <span className="cn-design-placeholder"><Sparkles aria-hidden="true" /></span>}
                    </div>
                    <div className="cn-design-meta">
                      <h3>{design.name || 'Untitled design'}</h3>
                      <p>Edited {formatDate(design.lastEdited)}</p>
                      {index === 0 && <span className="cn-continue-label">Continue designing →</span>}
                    </div>
                  </Link>

                  <button
                    type="button"
                    className="cn-design-menu-trigger"
                    aria-label={`Actions for ${design.name || 'untitled design'}`}
                    aria-haspopup="menu"
                    aria-expanded={activeMenu === design._id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveMenu(activeMenu === design._id ? null : design._id);
                    }}
                  ><MoreVertical aria-hidden="true" /></button>

                  {activeMenu === design._id && (
                    <div className="dropdown-menu cn-design-menu" role="menu">
                      <button type="button" role="menuitem" onClick={() => { setActiveMenu(null); setRenameModal({ open: true, designId: design._id, currentName: design.name }); }}><Pencil aria-hidden="true" /> Rename</button>
                      <button type="button" role="menuitem" onClick={() => handleDuplicate(design)}><Copy aria-hidden="true" /> Duplicate</button>
                      <button type="button" role="menuitem" onClick={() => handleOpenInNewTab(design._id)}><ExternalLink aria-hidden="true" /> Open in new tab</button>
                      <button type="button" role="menuitem" onClick={() => handleShowDetails(design)}><Info aria-hidden="true" /> Details</button>
                      <button type="button" role="menuitem" className="is-danger" onClick={() => handleMoveToTrash(design._id)}><Trash2 aria-hidden="true" /> Move to trash</button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Rename Modal */}
      {renameModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="presentation">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" aria-labelledby="rename-design-title">
            <h3 id="rename-design-title" className="text-lg font-bold mb-4">Rename Design</h3>
            <input
              type="text"
              aria-label="Design name"
              value={renameModal.currentName}
              onChange={(event) => setRenameModal((current) => ({ ...current, currentName: event.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
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
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRename(renameModal.designId, renameModal.currentName)}
                disabled={!renameModal.currentName.trim()}
                className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsModal.open && detailsModal.design && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg mx-4">
            <h3 className="text-lg font-bold mb-4">Design Details</h3>
            <div className="space-y-3 text-sm">
              <p><span className="font-medium">Name:</span> {detailsModal.design.name}</p>
              <p><span className="font-medium">Layers:</span> {detailsModal.design.config?.layers || 2}</p>
              <p><span className="font-medium">Cake Flavor:</span> {detailsModal.design.config?.cakeColor || 'vanilla'}</p>
              <p><span className="font-medium">Frosting:</span> {detailsModal.design.config?.frostingColor || 'vanilla'}</p>
              <p><span className="font-medium">Toppings:</span> {(detailsModal.design.config?.toppings || []).join(', ') || 'None'}</p>
              <p><span className="font-medium">Total Price:</span> ₱{calculateTotal(detailsModal.design.config)}</p>
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

      {/* Trash Notification */}
      {trashNotification && trashNotification.show && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gray-800 text-white rounded-xl p-4 shadow-xl z-50">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium">{trashNotification.designName}</p>
              <p className="text-sm text-gray-300">Sent to Trash</p>
            </div>
            <button
              onClick={handleUndoTrash}
              className="px-3 py-1 bg-white text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* Trash Full Warning */}
      {showTrashFullWarning && (
        <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-yellow-100 border border-yellow-400 rounded-xl p-4 shadow-xl z-50">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Trash is almost full</p>
              <p className="text-sm text-yellow-700">Your Trash folder has a maximum capacity of 5 designs. Any more items moved to Trash will permanently delete the oldest trashed file.</p>
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
