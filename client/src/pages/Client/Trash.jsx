import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, Sparkles, Loader2, MoreVertical, Info } from 'lucide-react';
import ClientNavbar from '@/components/client/ClientNavbar';
import { designApi } from '@/services/api';

export default function Trash() {
  const [trashedDesigns, setTrashedDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState(null);
  const [detailsModal, setDetailsModal] = useState({ open: false, design: null });

  useEffect(() => {
    fetchTrashedDesigns();
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

  const fetchTrashedDesigns = async () => {
    try {
      const designs = await designApi.getDesigns();
      const trashed = designs.filter(d => d.isTrashed);
      setTrashedDesigns(trashed);
    } catch (error) {
      console.error('Failed to fetch trashed designs:', error);
      setTrashedDesigns([]);
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
    try {
      await designApi.restoreFromTrash(id);
      setTrashedDesigns(designs => designs.filter(d => d._id !== id));
      setActiveMenu(null);
    } catch (error) {
      console.error('Failed to restore design:', error);
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      await designApi.permanentlyDelete(id);
      setTrashedDesigns(designs => designs.filter(d => d._id !== id));
      setActiveMenu(null);
    } catch (error) {
      console.error('Failed to permanently delete design:', error);
    }
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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trash2 className="w-8 h-8 text-pink-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 bg-clip-text text-transparent">
              Trash
            </h1>
            <Sparkles className="w-8 h-8 text-orange-400" />
          </div>
          <p className="text-xl text-gray-600 font-light">
            Manage your deleted designs (max 5 items)
          </p>
        </div>

        {/* Trash Content */}
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
          ) : trashedDesigns.length === 0 ? (
            <div className="text-center py-12">
              <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">Trash is empty</p>
              <p className="text-sm text-gray-500">Deleted designs will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {trashedDesigns.map((design) => (
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
                            <span className="font-medium text-gray-800 truncate">{design.name}</span>
                          </div>
                          <p className="text-xs text-gray-500">Deleted {formatDate(design.lastEdited)}</p>
                        </div>
                        <div className="p-1">
                          <button
                            onClick={() => handleRestore(design._id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md transition-colors"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore
                          </button>
                          <button
                            onClick={() => handleShowDetails(design)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            <Info className="w-4 h-4" />
                            Details
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(design._id)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Permanently
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="aspect-video bg-white rounded-xl flex items-center justify-center overflow-hidden">
                      {design.thumbnail ? (
                        <img 
                          src={design.thumbnail} 
                          alt={design.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            if (design.thumbnailFallback) {
                              e.target.src = design.thumbnailFallback;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <Trash2 className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-1 truncate mt-3">{design.name}</h3>
                  <p className="text-sm">Deleted {formatDate(design.lastEdited)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-pink-100">
            <h3 className="font-bold text-gray-800 mb-2">About Trash</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Designs in trash are kept for 30 days</li>
              <li>• Maximum 5 designs can be in trash at once</li>
              <li>• Restore designs anytime before permanent deletion</li>
              <li>• Permanently deleted designs cannot be recovered</li>
            </ul>
          </div>
        </div>
      </div>

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
    </div>
  );
}
