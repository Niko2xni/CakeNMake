import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Settings, Cake, Sparkles, Loader2, MoreVertical, ExternalLink, Info, Trash2, Pencil, Undo } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { designApi } from '@/services/api';

export default function ClientHome() {
  const [recentDesigns, setRecentDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu]);

  const fetchRecentDesigns = async () => {
    try {
      const designs = await designApi.getDesigns();
      console.log('Fetched designs:', designs);
      designs.forEach(design => {
        console.log('Design:', design.name, 'Thumbnail:', design.thumbnail);
      });
      setRecentDesigns(designs);
    } catch (error) {
      console.error('Failed to fetch recent designs:', error);
      // Fallback to empty array if API fails
      setRecentDesigns([]);
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
    try {
      await designApi.updateDesign(designId, { name: newName });
      setRecentDesigns(designs => designs.map(d => 
        d._id === designId ? { ...d, name: newName } : d
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
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-orange-50 ml-[70px]">
      <ClientNavbar />
      
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-pink-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
              Welcome to CakeNMake
            </h1>
            <Sparkles className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-xl text-gray-600 font-light">
            Design your dream cake with our fluffy, sweet bakery experience
          </p>
          <Link 
            to="/designer"
            className="inline-block mt-6 px-8 py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-semibold text-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Start Designing Your Cake ✨
          </Link>
        </div>

        {/* Recent Designs Section */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            Your Recent Designs
          </h2>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : recentDesigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No designs yet. Start creating your first cake!</p>
              <Link 
                to="/designer"
                className="inline-block px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-full font-semibold hover:from-pink-600 hover:to-rose-600 transition-all"
              >
                Create Your First Design
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentDesigns.map((design) => (
                <div key={design._id} className="flex flex-col">
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-pink-100 hover:bg-gray-800 transition-colors group">
                    {/* 3-dot menu icon */}
<button
  onClick={(e) => {
    e.stopPropagation();
    setActiveMenu(activeMenu === design._id ? null : design._id);
  }}
  className={`absolute top-2 right-2 p-2 rounded shadow-md z-10 transition-all duration-200
    ${
      activeMenu === design._id
        ? 'bg-gray-700 text-white opacity-100'
        : 'bg-white text-gray-600 opacity-0 group-hover:opacity-100 hover:bg-gray-700 hover:text-white'
    }
  `}
>
  <MoreVertical className="w-4 h-4 transition-colors duration-200" />
</button>

                    {/* Dropdown menu */}
                    {activeMenu === design._id && (
                      <div className="dropdown-menu absolute top-10 right-2 bg-white rounded-lg shadow-xl border border-gray-200 z-20 w-48">
                        <div className="p-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 mb-2">
                            <Pencil className="w-4 h-4 text-gray-500" />
                            <span className="font-medium text-gray-800 truncate">{design.name}</span>
                          </div>
                          <p className="text-xs text-gray-500">Edited {formatDate(design.lastEdited)}</p>
                        </div>
                        <div className="p-1">
                          <button
                            onClick={() => setRenameModal({ open: true, designId: design._id, currentName: design.name })}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                            Rename
                          </button>
                          <button
                            onClick={() => handleOpenInNewTab(design._id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open in new tab
                          </button>
                          <button
                            onClick={() => handleShowDetails(design)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Info className="w-4 h-4" />
                            Details
                          </button>
                          <button
                            onClick={() => handleMoveToTrash(design._id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Move to Trash
                          </button>
                        </div>
                      </div>
                    )}

                    <Link 
                      to={`/designer?designId=${design._id}`}
                      className="block"
                    >
                      <div className="aspect-video bg-white rounded-xl flex items-center justify-center overflow-hidden">
                        {design.thumbnail ? (
                          <img 
                            src={design.thumbnail} 
                            alt={design.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.log('[DEBUG] Thumbnail load error for design:', design.name);
                              console.log('[DEBUG] Current thumbnail URL:', design.thumbnail);
                              console.log('[DEBUG] Fallback thumbnail URL:', design.thumbnailFallback);
                              if (design.thumbnailFallback) {
                                console.log('[DEBUG] Falling back to thumbnailFallback');
                                e.target.src = design.thumbnailFallback;
                              } else {
                                console.log('[DEBUG] No fallback available');
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-white"></div>
                        )}
                      </div>
                    </Link>
                  </div>
                  <h3 
                    className="text-lg font-bold mb-1 truncate mt-3 cursor-pointer hover:text-pink-500 transition-colors"
                    onClick={() => setRenameModal({ open: true, designId: design._id, currentName: design.name })}
                  >
                    {design.name}
                  </h3>
                  <p className="text-sm">Edited {formatDate(design.lastEdited)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Features Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-pink-100">
              <Cake className="w-12 h-12 text-pink-500 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 mb-2">Custom Design</h3>
              <p className="text-sm text-gray-600">Create unique cakes with our 3D designer</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-rose-100">
              <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 mb-2">Premium Quality</h3>
              <p className="text-sm text-gray-600">Made with the finest ingredients</p>
            </div>
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-orange-100">
              <Settings className="w-12 h-12 text-orange-400 mx-auto mb-4" />
              <h3 className="font-bold text-gray-800 mb-2">Easy Ordering</h3>
              <p className="text-sm text-gray-600">Simple and convenient process</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rename Modal */}
      {renameModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold mb-4">Rename Design</h3>
            <input
              type="text"
              defaultValue={renameModal.currentName}
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
                onClick={(e) => handleRename(renameModal.designId, e.target.previousElementSibling.value)}
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
