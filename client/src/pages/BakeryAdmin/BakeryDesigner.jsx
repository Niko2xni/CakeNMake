import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import CakeScene from '@/components/cake/CakeScene.jsx';
import ToolPanel from '@/components/cake/ToolPanel';
import PricingPanel from '@/components/cake/PricingPanel';
import {
  Camera,
  ArrowLeft,
  Loader2,
  Layers,
  Tag,
  Plus,
  X,
  Cake,
  RotateCcw,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Cloud,
  AlertCircle,
  Wand2,
  Palette,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { templateApi } from '@/services/api';
import { DEFAULT_CONFIG, getCenterItemLimit, getCenterItemCount } from '@/lib/cakeConfig';
import { adaptConfigToLegacy } from '@/lib/configAdapter';
import useCakeQuote from '@/hooks/use-cake-quote';
import PageLoadingSkeleton from '@/components/shared/PageLoadingSkeleton';
import TemplateBackgroundStudioModal from '@/components/bakery/TemplateBackgroundStudioModal';

const formatMoney = (minor = 0) =>
  new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);

function getActiveToolLabel(tool) {
  if (!tool) return null;
  const rawType = typeof tool === 'object' ? (tool.label || tool.type || '') : String(tool);
  if (rawType.includes('strawberry')) return 'Strawberry';
  if (rawType.includes('letterUpper') || rawType.includes('letterLower') || rawType.includes('number') || rawType.includes('center-letter') || rawType.includes('text')) {
    const letter = typeof tool === 'object' && tool.letter ? tool.letter : '';
    return letter ? `Letter "${letter}"` : 'Center Letter / Text';
  }
  if (rawType.includes('flower') || rawType.includes('rose')) return 'Flower';
  if (rawType.includes('piping')) return 'Piping';
  if (typeof tool === 'object' && tool.label) return tool.label;
  const cleaned = rawType.replace(/^center-/, '').replace(/-default$/, '').replace(/-/g, ' ');
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : 'Decoration';
}

function MobileDraggableToolPanel({
  panelOpen,
  onClose,
  mainAreaRef,
  activeTool,
  ...toolPanelProps
}) {
  const dragControls = useDragControls();
  const [panelPos, setPanelPos] = useState(() => {
    try {
      const saved = localStorage.getItem('cakenmake_toolpanel_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.side === 'left' || parsed.side === 'right') && typeof parsed.y === 'number') {
          return {
            side: parsed.side,
            y: Math.max(8, Math.min(300, parsed.y)),
          };
        }
      }
    } catch (e) {}
    return { side: 'right', y: 16 };
  });

  const [containerDimensions, setContainerDimensions] = useState({ width: 360, height: 640 });

  useEffect(() => {
    const updateDimensions = () => {
      if (mainAreaRef?.current) {
        setContainerDimensions({
          width: mainAreaRef.current.clientWidth || window.innerWidth,
          height: mainAreaRef.current.clientHeight || (window.innerHeight - 60),
        });
      } else if (typeof window !== 'undefined') {
        setContainerDimensions({
          width: window.innerWidth,
          height: window.innerHeight - 60,
        });
      }
    };
    updateDimensions();

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mainAreaRef?.current) {
      resizeObserver = new ResizeObserver(updateDimensions);
      resizeObserver.observe(mainAreaRef.current);
    }

    window.addEventListener('resize', updateDimensions);
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [mainAreaRef]);

  const panelWidth = Math.min(320, containerDimensions.width * 0.88);
  const panelHeight = Math.min(560, Math.max(280, containerDimensions.height - 32));
  const EDGE_PADDING = 8;
  const leftDockX = EDGE_PADDING;
  const rightDockX = Math.max(EDGE_PADDING, containerDimensions.width - panelWidth - EDGE_PADDING);
  const maxY = Math.max(EDGE_PADDING, containerDimensions.height - panelHeight - EDGE_PADDING);
  const safeY = Math.max(EDGE_PADDING, Math.min(maxY, panelPos.y));

  const targetX = panelPos.side === 'left' ? leftDockX : rightDockX;
  const slideStartX = panelPos.side === 'left' ? -panelWidth - 30 : containerDimensions.width + 30;

  const handleDragEnd = (event, info) => {
    const dropX = info.point.x;
    const isLeft = dropX < (containerDimensions.width / 2);
    const newSide = isLeft ? 'left' : 'right';

    const nextY = safeY + info.offset.y;
    const nextClampedY = Math.max(EDGE_PADDING, Math.min(maxY, nextY));

    const nextPos = { side: newSide, y: Math.round(nextClampedY) };
    setPanelPos(nextPos);
    try {
      localStorage.setItem('cakenmake_toolpanel_pos', JSON.stringify(nextPos));
    } catch (err) {}
  };

  return (
    <AnimatePresence>
      {panelOpen && (
        <motion.div
          key="mobile-draggable-toolpanel"
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragElastic={0.06}
          dragConstraints={{
            left: leftDockX,
            right: rightDockX,
            top: EDGE_PADDING,
            bottom: maxY,
          }}
          onDragEnd={handleDragEnd}
          initial={{ x: slideStartX, y: safeY, opacity: 0 }}
          animate={{ x: targetX, y: safeY, opacity: 1 }}
          exit={{ x: slideStartX, y: safeY, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${panelWidth}px`,
            height: `${panelHeight}px`,
            zIndex: 30,
          }}
          className="flex flex-col md:hidden drop-shadow-2xl"
        >
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="w-full flex items-center justify-between px-3 py-2 bg-card/95 backdrop-blur-md rounded-t-2xl border-t border-x border-border/70 cursor-grab active:cursor-grabbing select-none touch-none shadow-sm gap-2"
          >
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/80 hover:bg-muted transition-colors">
              <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] font-semibold text-muted-foreground">Drag to Move</span>
            </div>

            {activeTool && (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-[10px] font-bold truncate max-w-[120px]">
                  Placing: {getActiveToolLabel(activeTool)}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 bg-card rounded-b-2xl border-b border-x border-border/70 overflow-hidden shadow-2xl select-none">
            <ToolPanel
              {...toolPanelProps}
              activeTool={activeTool}
              hideScrollbar={true}
              onDragHandlePointerDown={(e) => dragControls.start(e)}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function extractSpecsFromConfig(config) {
  if (!config || typeof config !== 'object') return [];
  const specs = [];

  // Structure/Tiers - similar to pricing breakdown
  const tiers = config.structure?.tiers || config.cakeStructure?.tiers;
  const tierConfigs = config.structure?.tierConfigs || [];
  
  if (tiers === '2_tiers' && tierConfigs.length >= 2) {
    // Two-tier cake
    const tier1 = tierConfigs[0];
    const tier2 = tierConfigs[1];
    specs.push({ 
      label: 'Structure', 
      value: `2-Tier Cake (${tier1?.size || 'Medium'} + ${tier2?.size || 'Small'})` 
    });
  } else if (tiers === '1_tier' || tierConfigs.length === 1) {
    // Single tier cake
    const tier1 = tierConfigs[0];
    specs.push({ 
      label: 'Structure', 
      value: `1-Tier Cake (${tier1?.size || 'Medium'})` 
    });
  } else if (config.layers) {
    // Legacy structure format
    specs.push({ 
      label: 'Structure', 
      value: config.layers === 1 ? '1-Tier Cake' : `${config.layers}-Layer Cake` 
    });
  }

  // Sponge Base
  const spongeType = config.sponge?.type || config.base?.type;
  if (spongeType) {
    const spongeLabel = spongeType === 'vanilla' ? 'Vanilla Sponge' :
                       spongeType === 'chocolate' ? 'Chocolate Sponge' :
                       spongeType === 'red-velvet' ? 'Red Velvet Sponge' :
                       spongeType === 'ube' ? 'Ube Sponge' :
                       `${spongeType.charAt(0).toUpperCase() + spongeType.slice(1)} Sponge`;
    specs.push({ label: 'Sponge', value: spongeLabel });
  }

  // Filling
  const fillingType = config.filling?.type;
  if (fillingType && fillingType !== 'none') {
    const fillingLabel = fillingType === 'buttercream' ? 'Buttercream Filling' :
                        fillingType === 'cream-cheese' ? 'Cream Cheese Filling' :
                        fillingType === 'whipped-cream' ? 'Whipped Cream Filling' :
                        fillingType === 'ganache' ? 'Ganache Filling' :
                        `${fillingType.charAt(0).toUpperCase() + fillingType.slice(1)} Filling`;
    specs.push({ label: 'Filling', value: fillingLabel });
  }

  // Exterior Finish (Frosting)
  const finishStyle = config.exteriorFinish?.style || config.frosting?.style;
  if (finishStyle) {
    const finishLabel = finishStyle === 'smooth' ? 'Smooth Finish' :
                       finishStyle === 'textured' ? 'Textured Finish' :
                       finishStyle === 'rustic' ? 'Rustic Finish' :
                       finishStyle === 'naked' ? 'Naked Finish' :
                       `${finishStyle.charAt(0).toUpperCase() + finishStyle.slice(1)} Finish`;
    specs.push({ label: 'Exterior Finish', value: finishLabel });
  }

  // Sugar Color (Main color)
  const sugarColor = config.sugarColor?.top?.label || config.sugarColor?.top?.id;
  if (sugarColor) {
    specs.push({ label: 'Color', value: sugarColor });
  }

  // Side Design
  const sideDesign = config.side?.design?.type || config.side?.style;
  if (sideDesign && sideDesign !== 'none') {
    const sideLabel = sideDesign === 'piping-lines' ? 'Piping Lines' :
                     sideDesign === 'piping-dots' ? 'Piping Dots' :
                     sideDesign === 'fondant-ribbon' ? 'Fondant Ribbon' :
                     `${sideDesign.charAt(0).toUpperCase() + sideDesign.slice(1)}`;
    specs.push({ label: 'Side Design', value: sideLabel });
  }

  // Edge Design
  const edgeDesign = config.edge?.design?.type || config.edge?.style;
  if (edgeDesign && edgeDesign !== 'none') {
    const edgeLabel = edgeDesign === 'shell-border' ? 'Shell Border' :
                     edgeDesign === 'rope-border' ? 'Rope Border' :
                     edgeDesign === 'bead-border' ? 'Bead Border' :
                     edgeDesign === 'ruffle-border' ? 'Ruffle Border' :
                     `${edgeDesign.charAt(0).toUpperCase() + edgeDesign.slice(1)} Border`;
    specs.push({ label: 'Edge Border', value: edgeLabel });
  }

  // Center Items (Decorations)
  const centerItems = config.center?.items || [];
  if (centerItems.length > 0) {
    const decorationTypes = {};
    centerItems.forEach(item => {
      const type = item.type || 'decoration';
      decorationTypes[type] = (decorationTypes[type] || 0) + 1;
    });

    Object.entries(decorationTypes).forEach(([type, count]) => {
      const typeLabel = type === 'strawberry' ? 'Strawberries' :
                       type === 'flower' ? 'Flowers' :
                       type === 'rose' ? 'Roses' :
                       type === 'text' || type.includes('letter') ? 'Text/Letters' :
                       'Decorations';
      specs.push({ 
        label: 'Decoration', 
        value: count > 1 ? `${typeLabel} (${count}×)` : typeLabel 
      });
    });
  }

  return specs;
}

export default function BakeryDesigner() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const templateId = searchParams.get('templateId');
  const initialSectionId = searchParams.get('sectionId');

  const [cakeConfig, setCakeConfig] = useState(DEFAULT_CONFIG);
  const [templateName, setTemplateName] = useState('New Cake Template');
  const [panelOpen, setPanelOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [selectedCenterItemId, setSelectedCenterItemId] = useState(null);
  const [activeTab, setActiveTab] = useState('fundamentals');
  const [activeLayer, setActiveLayer] = useState(0);
  const [activeEdgeSlot, setActiveEdgeSlot] = useState('top');
  const [toolPanelModeUi, setToolPanelModeUi] = useState('design');
  const [expandedSections, setExpandedSections] = useState({
    structure: true,
    sponge: true,
    filling: true,
    exteriorFinish: true,
    surfaceTreatment: true,
  });

  const [overlapWarning, setOverlapWarning] = useState(false);
  const [overlapMessage, setOverlapMessage] = useState(null);
  const overlapTimerRef = useRef(null);

  const placeUndoStackRef = useRef([]);
  const placeRedoStackRef = useRef([]);
  const [placeHistoryVersion, setPlaceHistoryVersion] = useState(0);

  const cakeSceneRef = useRef(null);
  const mainAreaRef = useRef(null);
  const titleRef = useRef(null);

  const [loadingInitial, setLoadingInitial] = useState(Boolean(templateId));
  const [isCapturing, setIsCapturing] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [capturedViews, setCapturedViews] = useState([]);
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [backgroundStudioOpen, setBackgroundStudioOpen] = useState(false);

  // Sections
  const [sections, setSections] = useState([]);
  const [selectedSectionId, setSelectedSectionId] = useState(initialSectionId || '');
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSectionInline, setShowAddSectionInline] = useState(false);

  // Template metadata
  const [description, setDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamic Quote Pricing
  const { quote, loading: quoteLoading } = useCakeQuote(cakeConfig);

  // Auto-save cache key
  const CACHE_KEY = 'bakery_designer_autosave';
  const CACHE_TIMESTAMP_KEY = 'bakery_designer_autosave_timestamp';

  // Load cached design on mount
  useEffect(() => {
    // Only load cache if not editing an existing template
    if (!templateId) {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cached) {
          const data = JSON.parse(cached);
          const cacheAge = Date.now() - parseInt(timestamp || '0');
          const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
          
          // Only restore if cache is less than 1 week old
          if (cacheAge < ONE_WEEK) {
            if (data.cakeConfig) setCakeConfig(data.cakeConfig);
            if (data.templateName) setTemplateName(data.templateName);
            if (data.description) setDescription(data.description);
            if (data.longDescription) setLongDescription(data.longDescription);
            if (data.selectedSectionId) setSelectedSectionId(data.selectedSectionId);
            // Note: capturedViews are no longer cached to avoid storage quota issues
            
            console.log('Restored cached design from', new Date(parseInt(timestamp)));
          } else {
            // Clear old cache
            localStorage.removeItem(CACHE_KEY);
            localStorage.removeItem(CACHE_TIMESTAMP_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to load cached design:', err);
      }
    }
  }, [templateId]);

  // Auto-save to cache whenever important data changes
  useEffect(() => {
    // Don't cache if editing existing template (only for new designs)
    if (templateId) return;

    const timeoutId = setTimeout(() => {
      try {
        const dataToCache = {
          cakeConfig,
          templateName,
          description,
          longDescription,
          selectedSectionId,
          // Don't cache captured views to avoid QuotaExceededError (they're too large as base64)
          // capturedViews: capturedViews.length > 0 ? capturedViews : undefined,
        };
        
        localStorage.setItem(CACHE_KEY, JSON.stringify(dataToCache));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (err) {
        console.error('Failed to cache design:', err);
        // If quota exceeded, try clearing old cache and retrying with minimal data
        if (err.name === 'QuotaExceededError') {
          try {
            localStorage.removeItem(CACHE_KEY);
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              cakeConfig,
              templateName,
            }));
            localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (retryErr) {
            console.error('Failed to cache even minimal data:', retryErr);
          }
        }
      }
    }, 2000); // Debounce by 2 seconds

    return () => clearTimeout(timeoutId);
  }, [cakeConfig, templateName, description, longDescription, selectedSectionId, templateId]);

  // Clear cache when successfully publishing
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    } catch (err) {
      console.error('Failed to clear cache:', err);
    }
  };

  useEffect(() => {
    fetchSections();
    if (templateId) {
      loadExistingTemplate(templateId);
    }
  }, [templateId]);

  const fetchSections = async () => {
    try {
      const data = await templateApi.getSections();
      setSections(data || []);
      if (!selectedSectionId && data?.length > 0) {
        setSelectedSectionId(initialSectionId || data[0]._id);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const loadExistingTemplate = async (id) => {
    setLoadingInitial(true);
    try {
      const data = await templateApi.getPublicTemplateById(id);
      if (data) {
        setTemplateName(data.name || 'Untitled Template');
        setDescription(data.description || '');
        setLongDescription(data.longDescription || '');
        setSelectedSectionId(data.sectionId || '');
        if (data.config && typeof data.config === 'object') {
          setCakeConfig(data.config);
        }
      }
    } catch (err) {
      console.error('Failed to load template:', err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const handleConfigChange = useCallback((newConfig) => {
    setCakeConfig(newConfig);
  }, []);

  const setPlaceItems = useCallback((newItems) => {
    setCakeConfig((prev) => {
      const prevItems = prev.place?.items || [];
      placeUndoStackRef.current = [
        ...placeUndoStackRef.current.slice(-29),
        prevItems,
      ];
      placeRedoStackRef.current = [];
      setPlaceHistoryVersion((v) => v + 1);

      const resolvedItems = typeof newItems === 'function' ? newItems(prevItems) : newItems;
      return {
        ...prev,
        place: {
          ...(prev.place || {}),
          items: resolvedItems,
        },
        placedItems: resolvedItems,
      };
    });
  }, []);

  const handlePlaceUndo = useCallback(() => {
    if (placeUndoStackRef.current.length === 0) return;
    const previousSnapshot = placeUndoStackRef.current.pop();
    setCakeConfig((prev) => {
      const currentItems = prev.place?.items || [];
      placeRedoStackRef.current.unshift(currentItems);
      setPlaceHistoryVersion((v) => v + 1);
      return {
        ...prev,
        place: {
          ...(prev.place || {}),
          items: previousSnapshot,
        },
        placedItems: previousSnapshot,
      };
    });
  }, []);

  const handlePlaceRedo = useCallback(() => {
    if (placeRedoStackRef.current.length === 0) return;
    const nextSnapshot = placeRedoStackRef.current.shift();
    setCakeConfig((prev) => {
      const currentItems = prev.place?.items || [];
      placeUndoStackRef.current = [
        ...placeUndoStackRef.current.slice(-29),
        currentItems,
      ];
      setPlaceHistoryVersion((v) => v + 1);
      return {
        ...prev,
        place: {
          ...(prev.place || {}),
          items: nextSnapshot,
        },
        placedItems: nextSnapshot,
      };
    });
  }, []);

  const handlePlacementBlocked = useCallback((reason) => {
    if (reason === 'overlap' || reason === 'boundary' || reason === 'edge-overlap' || reason === 'text-overlap') {
      if (overlapTimerRef.current) clearTimeout(overlapTimerRef.current);
      let msg = "Can't place here — too close to another item";
      if (reason === 'boundary') {
        msg = "Can't place here — too close to the cake edge";
      } else if (reason === 'edge-overlap') {
        msg = "Can't place here — too close to the edge Ferrero Rocher";
      } else if (reason === 'text-overlap') {
        msg = "Can't place here — overlaps cake text";
      }
      setOverlapMessage(msg);
      setOverlapWarning(true);
      overlapTimerRef.current = setTimeout(() => {
        setOverlapWarning(false);
      }, 2000);
    }
  }, []);

  const handlePlace = useCallback((item) => {
    setPlaceItems((prevItems) => {
      if (item?.type && typeof item.type === 'string' && item.type.startsWith('center-')) {
        const designId = item.type.split('-')[1];
        const limit = getCenterItemLimit(designId);
        if (limit !== null) {
          const currentCount = getCenterItemCount(prevItems, designId);
          if (currentCount >= limit) {
            setActiveTool(null);
            return prevItems;
          }
          if (currentCount + 1 >= limit) {
            setActiveTool(null);
          }
        }
      }

      if (item?.slotId) {
        const alreadyInSlot = prevItems.find((it) => it.slotId === item.slotId);
        if (alreadyInSlot) {
          return prevItems.map((it) =>
            it.slotId === item.slotId ? { ...it, ...item, id: it.id || item.slotId } : it
          );
        }
        return [...prevItems, { ...item, id: item.slotId }];
      }

      const id = `${item.type || 'item'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      return [...prevItems, { ...item, id }];
    });
  }, [setPlaceItems]);

  const handleDeleteSelectedCenterItem = useCallback(() => {
    if (!selectedCenterItemId) return;
    setPlaceItems((items) => items.filter((item) => item.id !== selectedCenterItemId));
    setSelectedCenterItemId(null);
  }, [selectedCenterItemId, setPlaceItems]);

  const handleCenterTextColorModeChange = useCallback((nextMode) => {
    setCakeConfig((prev) => {
      const centerSugar = prev.sugarColorOverrides?.center;
      const resolvedColorId = centerSugar?.colorId || 'vanilla';
      const isFlavor = ['vanilla', 'chocolate', 'strawberry', 'cheese', 'ube', 'mocha'].includes(resolvedColorId);
      const sharedColor = {
        mode: centerSugar?.mode || (isFlavor ? 'default' : 'colorOverride'),
        colorId: resolvedColorId,
      };

      const nextItems = nextMode === 'individual'
        ? (prev.place?.items || []).map((item) => (
            item.type?.startsWith('center-letter')
              ? {
                  ...item,
                  colorId: item.colorId || item.sugarColor?.colorId || sharedColor.colorId,
                  sugarColor: item.sugarColor || sharedColor,
                }
              : item
          ))
        : (prev.place?.items || []).map((item) => (
            item.type?.startsWith('center-letter')
              ? {
                  ...item,
                  colorId: sharedColor.colorId,
                  sugarColor: sharedColor,
                }
              : item
          ));

      return {
        ...prev,
        sugarColorOverrides: {
          ...(prev.sugarColorOverrides || {}),
          center: sharedColor,
        },
        center: {
          ...(prev.center || {}),
          text: { ...(prev.center?.text || {}), colorMode: nextMode },
        },
        place: { ...(prev.place || {}), items: nextItems },
        placedItems: nextItems,
      };
    });
  }, []);

  // Trigger 8-Angle Camera Screenshot Capture
  const handleTrigger8AngleCapture = async () => {
    if (!cakeSceneRef.current?.captureTemplateViews) {
      alert('3D scene is not ready for capture yet.');
      return;
    }

    setIsCapturing(true);
    setErrorMessage('');

    setTimeout(() => {
      try {
        const views = cakeSceneRef.current.captureTemplateViews({ quality: 0.92, width: 800, height: 800 });
        if (views && views.length > 0) {
          setCapturedViews(views);
          setActiveViewIndex(0);
          setPublishModalOpen(true);
        } else {
          setErrorMessage('Could not capture 3D angles. Please try again.');
        }
      } catch (err) {
        console.error('Capture failed:', err);
        setErrorMessage('Failed to capture template screenshots.');
      } finally {
        setIsCapturing(false);
      }
    }, 150);
  };

  const handleCreateSectionInline = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    try {
      const created = await templateApi.createSection(newSectionName.trim());
      setSections((prev) => [...prev, created]);
      setSelectedSectionId(created._id);
      setNewSectionName('');
      setShowAddSectionInline(false);
    } catch (err) {
      console.error('Failed to create inline section:', err);
    }
  };

  const handlePublishTemplate = async (e) => {
    e.preventDefault();
    if (!templateName.trim()) {
      setErrorMessage('Please enter a template name.');
      return;
    }
    if (!selectedSectionId) {
      setErrorMessage('Please select a section for this template.');
      return;
    }

    setSavingTemplate(true);
    setErrorMessage('');

    try {
      // Check for duplicate template names (only when creating new templates)
      if (!templateId) {
        const data = await templateApi.getBakeryTemplates();
        const sections = Array.isArray(data?.sections) ? data.sections : [];
        
        // Flatten all templates from all sections into a single array
        const existingTemplates = sections.flatMap(section => 
          Array.isArray(section?.templates) ? section.templates : []
        );
        
        // Extra safety check
        if (Array.isArray(existingTemplates)) {
          const nameTaken = existingTemplates.some(
            (template) => template?.name?.trim().toLowerCase() === templateName.trim().toLowerCase()
          );
          
          if (nameTaken) {
            setErrorMessage(`The template name "${templateName.trim()}" is already taken. Please choose a different name.`);
            setSavingTemplate(false);
            return;
          }
        }
      }

      const specs = extractSpecsFromConfig(cakeConfig);
      const calculatedPriceMinor = Number(quote?.totalMinor) || 0;

      // Upload all view images to Cloudinary to reduce payload size
      const uploadedViews = await Promise.all(
        capturedViews.map(async (view) => {
          let currentUrl = view.url;
          let currentPublicId = view.cloudinaryPublicId || '';

          // Only upload if the URL is a data URL (base64)
          if (currentUrl && currentUrl.startsWith('data:')) {
            const uploadResult = await templateApi.uploadTemplateImage(currentUrl);
            currentUrl = uploadResult.secureUrl;
            currentPublicId = uploadResult.publicId;
          }
          
          // Return clean view with ONLY database fields.
          // Explicitly omit studio working fields (rawUrl, cutoutUrl, transparentUrl)
          // which contain megabytes of temporary base64 image data that cause HTTP 413.
          return {
            label: view.label || '',
            angle: view.angle || '',
            url: currentUrl,
            cloudinaryPublicId: currentPublicId,
          };
        })
      );

      // Create a clean config copy without any embedded image data
      const cleanConfig = JSON.parse(JSON.stringify(cakeConfig, (key, value) => {
        // Filter out any base64 data URLs that might be embedded in config
        if (typeof value === 'string' && (value.startsWith('data:') || (value.length > 5000 && value.startsWith('iVBORw')))) {
          return '[IMAGE_DATA_REMOVED]';
        }
        return value;
      }));

      const payload = {
        name: templateName.trim(),
        description: description.trim(),
        longDescription: longDescription.trim() || description.trim(),
        sectionId: selectedSectionId,
        priceMinor: calculatedPriceMinor,
        specs,
        views: uploadedViews,
        thumbnail: uploadedViews[0]?.url || '',
        config: cleanConfig,
      };

      if (templateId) {
        await templateApi.updateTemplate(templateId, payload);
      } else {
        await templateApi.createTemplate(payload);
      }

      // Clear the auto-save cache after successful publish
      clearCache();

      navigate('/bakery/templates');
    } catch (err) {
      console.error('Failed to save template:', err);
      setErrorMessage(
        err.message === 'This request is too large. Your latest changes could not be saved.' ||
        err.message?.toLowerCase().includes('upload')
          ? 'Failed to upload template images. Please try again.'
          : err.message || 'Failed to save template. Please check the fields and try again.'
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const extractedSpecs = extractSpecsFromConfig(cakeConfig);

  if (loadingInitial) {
    return <PageLoadingSkeleton path="/bakery/designer" />;
  }

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col overflow-hidden bg-background">
      {/* Top Header Navigation - Same sizing and layout as original designer */}
      <header className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-border/40 bg-card/80 backdrop-blur-sm z-20 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <Link
            to="/bakery/templates"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
            title="Back to Templates"
          >
            <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary-foreground" />
          </Link>
          <Input
            ref={titleRef}
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            placeholder="Template Name"
            className="font-display text-base sm:text-xl font-bold leading-tight tracking-tight border-none shadow-none bg-transparent p-0 h-auto w-[160px] sm:w-[220px] max-w-[260px] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/50 rounded-md px-1 -ml-1 truncate disabled:opacity-100"
          />

          <div className="hidden sm:flex items-center gap-1.5 text-xs shrink min-w-0 truncate">
            <Cloud className="w-3.5 h-3.5 text-green-500 shrink-0" />
            <span className="text-muted-foreground truncate">Template Studio</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            type="button"
            onClick={handleTrigger8AngleCapture}
            disabled={isCapturing || loadingInitial}
            className="flex items-center gap-2 rounded-xl font-semibold"
            size="sm"
          >
            {isCapturing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="inline sm:hidden">Capturing...</span>
                <span className="hidden sm:inline">Capturing 8 Angles...</span>
              </>
            ) : (
              <>
                <Camera className="w-4 h-4" />
                <span>Finish</span>
              </>
            )}
          </Button>

          {/* Mobile toolpanel toggle */}
          <div className="relative md:hidden">
            <Button
              variant={panelOpen ? 'default' : 'outline'}
              size="icon"
              disabled={isBreakdownOpen}
              className={`rounded-xl transition-all shadow-sm ${
                panelOpen
                  ? 'bg-primary text-primary-foreground shadow-primary/20'
                  : 'bg-card/90 border-border/70 text-foreground hover:bg-muted'
              } ${activeTool && !panelOpen ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              onClick={() => setPanelOpen(!panelOpen)}
              title={panelOpen ? 'Close Tools' : activeTool ? 'Placement Active - Open Tools' : 'Open Tools'}
              aria-label={panelOpen ? 'Close Tools' : 'Open Tools'}
            >
              {panelOpen ? <X className="w-5 h-5" /> : <SlidersHorizontal className="w-5 h-5" />}
            </Button>
            {activeTool && !panelOpen && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 pointer-events-none">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary border-2 border-card"></span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Studio Area - Exact layout & sizing structure */}
      <div ref={mainAreaRef} className="flex-1 flex relative overflow-hidden">
        {/* 3D View */}
        <motion.div
          className="flex-1 relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <CakeScene
            ref={cakeSceneRef}
            cakeConfig={adaptConfigToLegacy(cakeConfig)}
            activeTool={isBreakdownOpen ? null : activeTool}
            disabled={isBreakdownOpen}
            onPlace={handlePlace}
            onSelectTool={setActiveTool}
            onPlacementBlocked={handlePlacementBlocked}
            selectedCenterItemId={selectedCenterItemId}
            onCenterItemSelect={setSelectedCenterItemId}
            onDeleteCenterItem={handleDeleteSelectedCenterItem}
            onPlacedItemsChange={setPlaceItems}
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isBreakdownOpen}
            onClick={() => cakeSceneRef.current?.resetCamera()}
            title="Reset camera perspective"
            aria-label="Reset camera perspective"
            className="absolute top-4 right-4 z-10 gap-2 rounded-xl border-border/70 bg-card/90 px-3 shadow-sm backdrop-blur-sm hover:bg-card"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset view</span>
          </Button>

          {/* Pricing panel breakdown */}
          <div className="absolute top-4 left-4 z-10">
            <PricingPanel quote={quote} loading={quoteLoading} error={null} onOpenChange={setIsBreakdownOpen} />
          </div>

          {/* Placement Mode Active Floating Indicator Banner */}
          <AnimatePresence>
            {Boolean(activeTool) && !isBreakdownOpen && (
              <motion.div
                key="placement-mode-floating-indicator"
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto max-w-[calc(100vw-2rem)]"
              >
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-card/95 border border-primary/30 shadow-xl backdrop-blur-md text-foreground">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary truncate">
                      <span>Placement Mode Active</span>
                      <span className="text-[11px] font-semibold text-foreground/80 truncate">
                        ({getActiveToolLabel(activeTool)})
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight truncate">
                      Tap or drag on cake to place. Drag & drop is active.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTool(null)}
                    className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                    title="Exit Placement Mode"
                    aria-label="Exit Placement Mode"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  {overlapMessage || "Can't place here — too close to another item"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Desktop Panel - Clean floating card with exact width & padding as original */}
        <div className={`hidden md:block w-[280px] lg:w-[320px] xl:w-[340px] max-w-[40vw] p-2 sm:p-3 shrink-0 ${isBreakdownOpen ? 'pointer-events-none opacity-50 select-none' : ''}`}>
          <ToolPanel
            config={cakeConfig}
            onChange={handleConfigChange}
            onReset={() => {
              setCakeConfig(DEFAULT_CONFIG);
              setActiveTool(null);
              placeUndoStackRef.current = [];
              placeRedoStackRef.current = [];
              setPlaceHistoryVersion((v) => v + 1);
            }}
            activeTool={activeTool}
            onSelectTool={setActiveTool}
            onPlaceChange={setPlaceItems}
            onPlaceUndo={handlePlaceUndo}
            onPlaceRedo={handlePlaceRedo}
            canPlaceUndo={placeUndoStackRef.current.length > 0}
            canPlaceRedo={placeRedoStackRef.current.length > 0}
            selectedCenterItemId={selectedCenterItemId}
            onCenterItemSelect={setSelectedCenterItemId}
            onDeleteSelectedCenterItem={handleDeleteSelectedCenterItem}
            onCenterTextColorModeChange={handleCenterTextColorModeChange}
            tab={activeTab}
            onTabChange={setActiveTab}
            activeLayer={activeLayer}
            onActiveLayerChange={setActiveLayer}
            activeEdgeSlot={activeEdgeSlot}
            onActiveEdgeSlotChange={setActiveEdgeSlot}
            modeUi={toolPanelModeUi}
            onModeUiChange={setToolPanelModeUi}
            expandedSections={expandedSections}
            onExpandedSectionsChange={setExpandedSections}
            quote={quote}
          />
        </div>

        {/* Mobile Panel Overlay */}
        <AnimatePresence>
          {panelOpen && !isBreakdownOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden"
                onClick={() => setPanelOpen(false)}
              />
              <motion.div
                key="mobile-toolpanel"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                className="fixed inset-y-0 right-0 w-[340px] max-w-[88vw] z-40 p-2 sm:p-3 md:hidden flex flex-col"
              >
                <div className="flex-1 min-h-0 bg-card rounded-2xl border border-border/70 overflow-hidden shadow-2xl">
                  <ToolPanel
                    config={cakeConfig}
                    onChange={handleConfigChange}
                    onReset={() => {
                      setCakeConfig(DEFAULT_CONFIG);
                      setActiveTool(null);
                      placeUndoStackRef.current = [];
                      placeRedoStackRef.current = [];
                      setPlaceHistoryVersion((v) => v + 1);
                    }}
                    activeTool={activeTool}
                    onSelectTool={setActiveTool}
                    onPlaceChange={setPlaceItems}
                    onPlaceUndo={handlePlaceUndo}
                    onPlaceRedo={handlePlaceRedo}
                    canPlaceUndo={placeUndoStackRef.current.length > 0}
                    canPlaceRedo={placeRedoStackRef.current.length > 0}
                    selectedCenterItemId={selectedCenterItemId}
                    onCenterItemSelect={setSelectedCenterItemId}
                    onDeleteSelectedCenterItem={handleDeleteSelectedCenterItem}
                    onCenterTextColorModeChange={handleCenterTextColorModeChange}
                    tab={activeTab}
                    onTabChange={setActiveTab}
                    activeLayer={activeLayer}
                    onActiveLayerChange={setActiveLayer}
                    activeEdgeSlot={activeEdgeSlot}
                    onActiveEdgeSlotChange={setActiveEdgeSlot}
                    modeUi={toolPanelModeUi}
                    onModeUiChange={setToolPanelModeUi}
                    expandedSections={expandedSections}
                    onExpandedSectionsChange={setExpandedSections}
                    quote={quote}
                    onClose={() => setPanelOpen(false)}
                  />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* 8-ANGLE CAPTURE & PUBLISH TEMPLATE MODAL */}
      {publishModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground rounded-3xl w-full max-w-5xl max-h-[92vh] shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-foreground text-lg">
                    8 Camera Angles Captured Successfully!
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Review the automatic multi-angle shots and configure template catalog details.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBackgroundStudioOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" /> Studio Background Maker
                </button>
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body: 2 Columns */}
            <form onSubmit={handlePublishTemplate} className="flex-1 flex flex-col md:flex-row overflow-y-auto">
              {/* Left Column: 8-angle Carousel Preview */}
              <div className="md:w-1/2 p-6 bg-muted/20 border-b md:border-b-0 md:border-r border-border flex flex-col items-center justify-between">
                <div className="w-full">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
                      Angle Preview ({activeViewIndex + 1} of 8)
                    </span>
                  </div>

                  {/* Main Large View */}
                  <div className="w-full aspect-square rounded-2xl overflow-hidden bg-background border border-border shadow-sm relative group">
                    {capturedViews[activeViewIndex] && (
                      <img
                        src={capturedViews[activeViewIndex].url}
                        alt={capturedViews[activeViewIndex].label}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-xs text-white text-xs font-normal">
                      {capturedViews[activeViewIndex]?.label} ({capturedViews[activeViewIndex]?.angle})
                    </span>

                    {/* Nav buttons */}
                    <button
                      type="button"
                      onClick={() => setActiveViewIndex((prev) => (prev - 1 + 8) % 8)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 text-foreground hover:bg-background flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveViewIndex((prev) => (prev + 1) % 8)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/90 text-foreground hover:bg-background flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 w-full px-1">
                    <span className="text-[11px] text-muted-foreground">
                      {capturedViews[activeViewIndex]?.label || `Angle ${activeViewIndex + 1}`}
                    </span>
                  </div>
                </div>

                {/* 8 Thumbnails */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 w-full mt-4">
                  {capturedViews.map((v, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveViewIndex(idx)}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        activeViewIndex === idx
                          ? 'border-primary ring-2 ring-primary/20 scale-105'
                          : 'border-border opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={v.url} alt={v.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Template Info & Specs */}
              <div className="md:w-1/2 p-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4 text-xs">
                  {errorMessage && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMessage}
                    </div>
                  )}

                  {/* Template Name */}
                  <div>
                    <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1">
                      Template Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="e.g. Classic Birthday, Romantic Rose"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary font-normal text-sm text-foreground"
                    />
                  </div>

                  {/* Section Selector */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-foreground uppercase tracking-wider">
                        Client Section *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddSectionInline(!showAddSectionInline)}
                        className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
                      >
                        {showAddSectionInline ? (
                          <>
                            <X className="w-3 h-3" /> Cancel
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> New Section
                          </>
                        )}
                      </button>
                    </div>

                    {showAddSectionInline ? (
                      <div className="flex items-center gap-2 p-2 bg-muted/60 rounded-xl border border-border mb-2">
                        <input
                          type="text"
                          value={newSectionName}
                          onChange={(e) => setNewSectionName(e.target.value)}
                          placeholder="New section name..."
                          className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs font-normal focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleCreateSectionInline}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium text-xs hover:bg-primary/90"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <select
                          required
                          value={selectedSectionId}
                          onChange={(e) => setSelectedSectionId(e.target.value)}
                          className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-input focus:ring-2 focus:ring-primary bg-background font-normal text-sm text-foreground appearance-none"
                        >
                          <option value="" disabled>
                            {sections.length === 0 ? 'No sections created yet — click + New Section' : 'Select a section'}
                          </option>
                          {sections.map((sec) => (
                            <option key={sec._id} value={sec._id}>
                              {sec.name}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-4 h-4 text-muted-foreground absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>

                  {/* Pricing (Auto-calculated from Breakdown) */}
                  <div>
                    <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1">
                      Template Price (PHP)
                    </label>
                    <div className="flex items-center px-3.5 py-2.5 rounded-xl border border-input bg-muted/30 text-sm text-foreground">
                      <span className="text-muted-foreground mr-1.5 font-normal">₱</span>
                      <span className="font-normal text-foreground">
                        {((quote?.totalMinor || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </span>
                      <span className="ml-auto text-[11px] text-muted-foreground font-normal">(Auto-calculated from breakdown)</span>
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div>
                    <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1">
                      Short Tagline (Card description) *
                    </label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g. Perfect for birthdays and celebrations"
                      className="w-full px-3.5 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary font-normal text-sm text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-foreground uppercase tracking-wider mb-1">
                      Detailed Story Description (Popup modal) *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={longDescription}
                      onChange={(e) => setLongDescription(e.target.value)}
                      placeholder="A timeless birthday cake with soft buttercream layers and candle-ready top tier..."
                      className="w-full px-3.5 py-2 rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary font-normal text-sm text-foreground resize-none"
                    />
                  </div>

                  {/* Auto Specs Preview */}
                  <div className="bg-muted/40 p-3 rounded-xl border border-border">
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                      <Layers className="w-3 h-3" /> Auto-Extracted Cake Specs
                    </span>
                    <div className="space-y-1 text-[11px] text-muted-foreground">
                      {extractedSpecs.map((sp, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span className="font-normal text-muted-foreground">{sp.label}:</span>
                          <span className="font-normal text-foreground">{sp.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setPublishModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-input text-foreground hover:bg-muted text-xs font-medium transition-colors"
                  >
                    Back to Design
                  </button>
                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-all shadow-md shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {savingTemplate && <Loader2 className="w-4 h-4 animate-spin" />}
                    Publish Template to Catalog
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Background Maker & Photo Studio Modal */}
      {backgroundStudioOpen && (
        <TemplateBackgroundStudioModal
          isOpen={backgroundStudioOpen}
          onClose={() => setBackgroundStudioOpen(false)}
          views={capturedViews}
          templateName={templateName}
          onSaveViews={(newViews) => {
            setCapturedViews(newViews);
          }}
        />
      )}
    </div>
  );
}
