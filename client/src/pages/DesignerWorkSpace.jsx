import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import CakeScene from '@/components/cake/CakeScene.jsx';
import ToolPanel from '@/components/cake/ToolPanel';
import PricingPanel from '@/components/cake/PricingPanel';
import SendBakeryModal from '@/components/bakery/SendBakeryModal';
import BakeryChatPanel from '@/components/bakery/BakeryChatPanel';
import { Cake, Menu, X, Send, MessageCircle, Palette, Cloud, CloudOff, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { designApi } from '@/services/api';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { adaptConfigToLegacy, adaptConfigFromLegacy } from '@/lib/configAdapter';

// Mirrors PricingPanel price logic
const CAKE_FLAVOR_PRICES = { vanilla: 15, chocolate: 18, strawberry: 18, cheese: 20, ube: 22, mocha: 20 };
const FILLING_PRICES = { vanilla: 8, chocolate: 10, strawberry: 10, cheese: 12, ube: 14, mocha: 12 };
const FROSTING_PRICES = { vanilla: 5, chocolate: 7, strawberry: 7, cheese: 8, ube: 9, mocha: 8 };
const LAYER_PRICES = { 1: 10, 2: 15, 3: 20 };
const SIZE_PRICES = { big: 20, small: 10 };
const TOPPING_PRICES = { cherry: 3, sprinkles: 2, candles: 4, strawberries: 5, chocolateChips: 3, rosettes: 6 };
const PLACED_ITEM_PRICES = { cherry: 3, strawberry: 4, candle: 4, chocolateChip: 2, rosette: 5 };
const PIPING_PRICE = 5;

function calcTotal(config) {
  // Adapt new config to legacy format for pricing calculation
  const legacyConfig = adaptConfigToLegacy(config);
  const { layers = 2, cakeSize = 'big', frostingColor = 'vanilla', cakeColor = 'vanilla', fillingColor = 'vanilla', toppings = [], placedItems = [] } = legacyConfig;
  const layerCost = LAYER_PRICES[Math.min(layers, 3)] || 10;
  const sizeCost = SIZE_PRICES[cakeSize] || 20;
  const cakeCost = CAKE_FLAVOR_PRICES[cakeColor] || 15;
  const fillingCost = FILLING_PRICES[fillingColor] || 8;
  const frostingCost = FROSTING_PRICES[frostingColor] || 5;
  const toppingsCost = toppings.reduce((s, t) => s + (TOPPING_PRICES[t] || 0), 0);
  const placedCost = (placedItems || []).reduce((s, item) => s + (item.type === 'piping' ? PIPING_PRICE : (PLACED_ITEM_PRICES[item.type] || 0)), 0);
  return layerCost + sizeCost + cakeCost + fillingCost + frostingCost + toppingsCost + placedCost;
}

// Use the new bakery-style config structure
const INITIAL_CONFIG = DEFAULT_CONFIG;

export default function DesignerWorkSpace() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [title, setTitle] = useState('Unnamed 1');
  const [activeCategory, setActiveCategory] = useState(null);
  const [bakeryOpen, setBakeryOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false); // true after first payment
  const [showBakeryChat, setShowBakeryChat] = useState(false); // which panel is visible
  const [chatNotifications, setChatNotifications] = useState(0);
  const [overlapWarning, setOverlapWarning] = useState(false);
  const overlapTimerRef = useRef(null);

  const placeUndoStackRef = useRef([]);
  const placeRedoStackRef = useRef([]);
  const [placeHistoryVersion, setPlaceHistoryVersion] = useState(0);

  const titleRef = useRef(null);
  const cakeSceneRef = useRef(null);

  // Auto-save state
  const [designId, setDesignId] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitialMountRef = useRef(true);
  const isLoadingRef = useRef(false);

  const loadDesign = useCallback(async (id) => {
    try {
      isLoadingRef.current = true;
      const design = await designApi.getDesignById(id);
      // Convert legacy config to new format if needed
      const adaptedConfig = adaptConfigFromLegacy(design.config);
      setConfig(adaptedConfig);
      setTitle(design.name);
      setDesignId(design._id);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to load design:', error);
    }
  }, []);

  // Load design from URL params if provided
  useEffect(() => {
    const designIdParam = searchParams.get('designId');
    if (designIdParam && designIdParam !== designId) {
      loadDesign(designIdParam);
    }
  }, [searchParams, designId, loadDesign]);

  const saveDesign = useCallback(async ({ skipThumbnail = false } = {}) => {
    try {
      setSaveStatus('saving');

      // Capture 3D scene thumbnail before saving (skip during background auto-save)
      let previewImageUrl = null;
      if (!skipThumbnail && cakeSceneRef.current) {
        try {
          previewImageUrl = cakeSceneRef.current.captureThumbnail();
        } catch (err) {
          console.warn('Failed to capture 3D preview thumbnail:', err);
        }
      }

      // Convert new config format to legacy format for backend compatibility
      const legacyConfig = adaptConfigToLegacy(config);

      const designData = {
        name: title,
        config: legacyConfig,
        totalPrice: calcTotal(config),
        previewImage: previewImageUrl,
        isPublic: false,
      };

      let savedDesign;
      if (designId) {
        // Update existing design
        savedDesign = await designApi.updateDesign(designId, designData);
      } else {
        // Create new design
        savedDesign = await designApi.createDesign(designData);
        setDesignId(savedDesign._id);
        // Update URL with new design ID without reloading
        navigate(`/designer?designId=${savedDesign._id}`, { replace: true });
      }

      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      return savedDesign._id || designId;
    } catch (error) {
      console.error('Failed to save design:', error);
      setSaveStatus('error');
      return null;
    }
  }, [config, title, designId, navigate]);

  // Auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const saveTimer = setTimeout(async () => {
      await saveDesign({ skipThumbnail: true });
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [hasUnsavedChanges, saveDesign]);

  // Mark as having unsaved changes when config or title changes (skipping initial mount and design loading)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    if (isLoadingRef.current) {
      isLoadingRef.current = false;
      return;
    }
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  }, [config, title]);

  const handleCategoryChange = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  const saveThumbnail = useCallback(async (id = null) => {
    console.log('[DEBUG] saveThumbnail called with id:', id);
    if (!cakeSceneRef.current) {
      console.log('[DEBUG] saveThumbnail - cakeSceneRef.current is null');
      return;
    }

    const targetDesignId = id || designId;
    if (!targetDesignId) {
      console.log('[DEBUG] saveThumbnail - No design ID available');
      return;
    }

    try {
      console.log('[DEBUG] saveThumbnail - Capturing thumbnail from cake scene');
      // Ensure scene is fully updated before render
      await new Promise(resolve => setTimeout(resolve, 300));
      const thumbnail = cakeSceneRef.current.captureThumbnail();
      if (thumbnail) {
        console.log('[DEBUG] saveThumbnail - Thumbnail captured, uploading');
        const thumbnailUrl = await designApi.uploadImage(thumbnail);
        console.log('[DEBUG] saveThumbnail - Thumbnail uploaded:', thumbnailUrl);
        console.log('[DEBUG] saveThumbnail - Updating design with thumbnail');
        await designApi.updateDesign(targetDesignId, { thumbnail: thumbnailUrl });
        console.log('[DEBUG] saveThumbnail - Design updated successfully');
      } else {
        console.log('[DEBUG] saveThumbnail - Thumbnail is null/empty');
      }
    } catch (error) {
      console.error('[ERROR] saveThumbnail - Failed to save thumbnail:', error);
    }
  }, [designId]);

  // Save thumbnail when user exits the page
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges && designId) {
        // Save thumbnail in the background
        saveThumbnail();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Also save thumbnail on component unmount (when navigating away via React Router)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (hasUnsavedChanges && designId) {
        console.log('[DEBUG] Component unmounting, saving thumbnail');
        saveThumbnail();
      }
    };
  }, [hasUnsavedChanges, designId, saveThumbnail]);

  const handleOrderComplete = useCallback(async () => {
    setOrderComplete(true);
    setShowBakeryChat(true);
    setBakeryOpen(false);

    // Explicitly update and save the design configuration and generate thumbnail
    const savedId = await saveDesign();
    if (savedId) {
      await saveThumbnail(savedId);
    }
  }, [saveDesign, saveThumbnail]);

  const handleSaveDesign = async () => {
    const savedId = await saveDesign();
    if (savedId) {
      await saveThumbnail(savedId);
    }
  };

  const handleSendToBakery = async () => {
    const savedId = await saveDesign();
    if (savedId) {
      await saveThumbnail(savedId);
      setBakeryOpen(true);
    }
  };

  // Helper that records previous place.items to undo stack before updating
  const setPlaceItems = useCallback((newItems) => {
    setConfig(prev => {
      const prevItems = prev.place?.items || [];
      placeUndoStackRef.current = [
        ...placeUndoStackRef.current.slice(-29),
        prevItems,
      ];
      placeRedoStackRef.current = [];
      setPlaceHistoryVersion(v => v + 1);

      const resolvedItems = typeof newItems === 'function' ? newItems(prevItems) : newItems;
      return {
        ...prev,
        place: {
          ...prev.place,
          items: resolvedItems,
        },
      };
    });
  }, []);

  const handlePlaceUndo = useCallback(() => {
    if (placeUndoStackRef.current.length === 0) return;
    const previousSnapshot = placeUndoStackRef.current.pop();
    setConfig(prev => {
      const currentItems = prev.place?.items || [];
      placeRedoStackRef.current.unshift(currentItems);
      setPlaceHistoryVersion(v => v + 1);
      return {
        ...prev,
        place: {
          ...prev.place,
          items: previousSnapshot,
        },
      };
    });
  }, []);

  const handlePlaceRedo = useCallback(() => {
    if (placeRedoStackRef.current.length === 0) return;
    const nextSnapshot = placeRedoStackRef.current.shift();
    setConfig(prev => {
      const currentItems = prev.place?.items || [];
      placeUndoStackRef.current = [
        ...placeUndoStackRef.current.slice(-29),
        currentItems,
      ];
      setPlaceHistoryVersion(v => v + 1);
      return {
        ...prev,
        place: {
          ...prev.place,
          items: nextSnapshot,
        },
      };
    });
  }, []);

  // Keyboard shortcut listener for Undo / Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      if (isCmdOrCtrl && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handlePlaceUndo();
      } else if (
        (isCmdOrCtrl && e.key.toLowerCase() === 'y') ||
        (isCmdOrCtrl && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handlePlaceRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePlaceUndo, handlePlaceRedo]);

  const handlePlace = useCallback((item) => {
    setPlaceItems(prevItems => {
      if (item?.slotId) {
        const alreadyInSlot = prevItems.find(it => it.slotId === item.slotId);
        if (alreadyInSlot) {
          return prevItems.map(it =>
            it.slotId === item.slotId ? { ...it, ...item, id: it.id || item.slotId } : it
          );
        }
        return [...prevItems, { ...item, id: item.slotId }];
      }

      const id = `${item.type || 'item'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [...prevItems, { ...item, id }];
    });
  }, [setPlaceItems]);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/40 bg-card/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <Link to="/client" className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer">
            <Cake className="w-5 h-5 text-primary-foreground" />
          </Link>
          <Input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className="font-display text-xl font-bold leading-tight tracking-tight border-none shadow-none bg-transparent p-0 h-auto w-[180px] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/50 rounded-md px-1 -ml-1"
          />

          {/* Save status indicator */}
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                <span className="text-muted-foreground">Saving...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Cloud className="w-3.5 h-3.5 text-green-500" />
                <span className="text-green-600">All changes saved</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <CloudOff className="w-3.5 h-3.5 text-destructive" />
                <span className="text-destructive">Save failed</span>
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <CloudOff className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Unsaved changes</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Save Design button */}
          <Button
            onClick={handleSaveDesign}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-2 rounded-xl font-semibold"
            size="sm"
            variant="outline"
          >
            {saveStatus === 'saving' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Save Design</span>
              </>
            )}
          </Button>

          {/* Send Bakery (only when no order yet) */}
          {!orderComplete && (
            <Button
              onClick={handleSendToBakery}
              disabled={saveStatus === 'saving'}
              className="flex items-center gap-2 rounded-xl font-semibold"
              size="sm"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send Bakery</span>
            </Button>
          )}

          {/* Bakery Chat / Customize toggle (after order) */}
          {orderComplete && (
            <div className="relative">
              <Button
                onClick={() => setShowBakeryChat((v) => { if (!v) setChatNotifications(0); return !v; })}
                className="flex items-center gap-2 rounded-xl font-semibold"
                size="sm"
                variant={showBakeryChat ? 'outline' : 'default'}
              >
                {showBakeryChat ? (
                  <><Palette className="w-4 h-4" /><span className="hidden sm:inline">Customize</span></>
                ) : (
                  <><MessageCircle className="w-4 h-4" /><span className="hidden sm:inline">Bakery Chat</span></>
                )}
              </Button>
              {!showBakeryChat && chatNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow pointer-events-none">
                  {chatNotifications > 9 ? '9+' : chatNotifications}
                </span>
              )}
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-full"
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D View */}
        <motion.div
          className="flex-1 relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <CakeScene
            ref={cakeSceneRef}
            cakeConfig={adaptConfigToLegacy(config)}
            activeTool={activeTool}
            onPlace={handlePlace}
            onSelectTool={setActiveTool}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => cakeSceneRef.current?.resetCamera()}
            title="Reset camera perspective"
            aria-label="Reset camera perspective"
            className="absolute top-4 right-4 z-10 gap-2 rounded-xl border-border/70 bg-card/90 px-3 shadow-sm backdrop-blur-sm hover:bg-card"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset view</span>
          </Button>

          {/* Pricing panel */}
          <div className="absolute top-4 left-4 z-10">
            <PricingPanel config={config} />
          </div>

          {/* Overlap / clipping warning toast */}
          <AnimatePresence>
            {overlapWarning && (
              <motion.div
                key="overlap-warning"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.18 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              >
                <div className="bg-destructive text-destructive-foreground text-sm font-medium px-4 py-2 rounded-xl shadow-lg">
                  Can't place here — too close to another item
                </div>
              </motion.div>
            )}
          </AnimatePresence>


        </motion.div>

        {/* Desktop Panel */}
        <div className="hidden lg:block w-[340px] p-3 shrink-0">
          <AnimatePresence mode="wait">
            {showBakeryChat ? (
              <motion.div key="bakery" className="h-full" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.22 }}>
                <BakeryChatPanel onNotificationChange={setChatNotifications} />
              </motion.div>
            ) : (
              <motion.div key="tool" className="h-full" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.22 }}>
                <ToolPanel
                  config={config}
                  onChange={setConfig}
                  onReset={() => {
                    setConfig(INITIAL_CONFIG);
                    setActiveTool(null);
                    placeUndoStackRef.current = [];
                    placeRedoStackRef.current = [];
                    setPlaceHistoryVersion(v => v + 1);
                  }}
                  activeTool={activeTool}
                  onSelectTool={setActiveTool}
                  onPlaceChange={setPlaceItems}
                  onPlaceUndo={handlePlaceUndo}
                  onPlaceRedo={handlePlaceRedo}
                  canPlaceUndo={placeUndoStackRef.current.length > 0}
                  canPlaceRedo={placeRedoStackRef.current.length > 0}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Panel Overlay */}
        {panelOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="absolute inset-y-0 right-0 w-[320px] max-w-[85vw] z-30 p-2 lg:hidden"
          >
            <ToolPanel
              config={config}
              onChange={setConfig}
              onReset={() => {
                setConfig(INITIAL_CONFIG);
                setActiveTool(null);
                placeUndoStackRef.current = [];
                placeRedoStackRef.current = [];
                setPlaceHistoryVersion(v => v + 1);
              }}
              activeTool={activeTool}
              onSelectTool={setActiveTool}
              onPlaceChange={setPlaceItems}
              onPlaceUndo={handlePlaceUndo}
              onPlaceRedo={handlePlaceRedo}
              canPlaceUndo={placeUndoStackRef.current.length > 0}
              canPlaceRedo={placeRedoStackRef.current.length > 0}
            />
          </motion.div>
        )}

        {/* Mobile backdrop */}
        {panelOpen && (
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}
      </div>


      <AnimatePresence>
        {bakeryOpen && (
          <SendBakeryModal
            config={config}
            total={calcTotal(config)}
            onClose={() => setBakeryOpen(false)}
            onOrderComplete={handleOrderComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
