import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import CakeScene from '@/components/cake/CakeScene.jsx';
import PageLoadingSkeleton from '@/components/shared/PageLoadingSkeleton';
import ToolPanel from '@/components/cake/ToolPanel';
import PricingPanel from '@/components/cake/PricingPanel';
import SendBakeryModal from '@/components/bakery/SendBakeryModal';
import BakeryChatPanel from '@/components/bakery/BakeryChatPanel';
import useDesignAiChat from '@/hooks/useDesignAiChat';
import GuestAuthModal from '@/components/auth/GuestAuthModal';
import { Cake, X, Send, Cloud, CloudOff, Loader2, RotateCcw, GripHorizontal, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { blueprintApi, designApi, pricingApi, templateApi } from '@/services/api';
import { chatApi } from '@/services/chat-api';
import { format } from 'date-fns';
import { buildBlueprintDetails } from '@/lib/blueprintDetails';
import { buildBlueprintPdfBlob } from '@/lib/blueprintPdf';
import { DEFAULT_CONFIG, getCenterItemLimit, getCenterItemCount } from '@/lib/cakeConfig';
import { adaptConfigToLegacy, adaptConfigFromLegacy } from '@/lib/configAdapter';
import useCakeQuote from '@/hooks/use-cake-quote';
import { useAuth } from '@/lib/AuthContext';

// Use the new bakery-style config structure
const INITIAL_CONFIG = DEFAULT_CONFIG;

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

    // Calculate next Y: current base Y + gesture delta, clamped to safe boundaries
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
          {/* Draggable header bar */}
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

          {/* Panel content with internal drag-to-scroll & draggable footer */}
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

export default function DesignerWorkSpace() {
  const { account } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isDesignLoading, setIsDesignLoading] = useState(() => Boolean(searchParams.get('designId') || searchParams.get('templateId')));
  const [config, setConfig] = useState(INITIAL_CONFIG);
  const { quote, quotedConfig, loading: quoteLoading, error: quoteError, versionChanged, dismissVersionChanged } = useCakeQuote(config);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [selectedCenterItemId, setSelectedCenterItemId] = useState(null);
  const [title, setTitle] = useState('Unnamed 1');
  const [activeCategory, setActiveCategory] = useState(null);
  const [bakeryOpen, setBakeryOpen] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false); // true after first payment
  const [showBakeryChat, setShowBakeryChat] = useState(false); // which panel is visible
  const [chatNotifications, setChatNotifications] = useState(0);
  const [overlapWarning, setOverlapWarning] = useState(false);
  const [overlapMessage, setOverlapMessage] = useState(null);
  const overlapTimerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('fundamentals');
  const [activeLayer, setActiveLayer] = useState(0);
  const [activeEdgeSlot, setActiveEdgeSlot] = useState('top');
  const [toolPanelModeUi, setToolPanelModeUi] = useState('design');
  const [guestAuthModalOpen, setGuestAuthModalOpen] = useState(false);
  const [guestAuthAction, setGuestAuthAction] = useState('general');
  const [expandedSections, setExpandedSections] = useState({
    structure: true,
    sponge: true,
    filling: true,
    exteriorFinish: true,
    surfaceTreatment: true,
  });

  const placeUndoStackRef = useRef([]);
  const placeRedoStackRef = useRef([]);
  const [placeHistoryVersion, setPlaceHistoryVersion] = useState(0);

  const titleRef = useRef(null);
  const cakeSceneRef = useRef(null);
  const mainAreaRef = useRef(null);
  const blueprintViewsRef = useRef(null); // { hero, front, back, top, side } JPEG data URLs, set once on order complete
  const submittedBlueprintRef = useRef(null);

  // Auto-save state
  const [designId, setDesignId] = useState(null);
  const chatLocation = useLocation();
  const aiChatSession = useDesignAiChat({
    designId: searchParams.get('designId') || designId,
    accountId: account?.id || account?._id,
    guestId: `${chatLocation.key}:${searchParams.get('designId') || 'new'}`,
  });
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved' | 'saving' | 'error'
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isInitialMountRef = useRef(true);
  const isLoadingRef = useRef(false);

  const loadDesign = useCallback(async (id) => {
    try {
      setIsDesignLoading(true);
      isLoadingRef.current = true;
      const design = await designApi.getDesignById(id);
      // Convert legacy config to new format if needed
      const adaptedConfig = adaptConfigFromLegacy(design.config);
      setConfig(adaptedConfig);
      setTitle(design.name);
      setDesignId(design._id);
      if (design.sentToBakery) {
        setOrderComplete(true);
        setShowBakeryChat(true);
      } else {
        setOrderComplete(false);
        setShowBakeryChat(false);
      }
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to load design:', error);
    } finally {
      setIsDesignLoading(false);
    }
  }, []);

  // Load design from URL params if provided or initialize next Unnamed title
  useEffect(() => {
    const designIdParam = searchParams.get('designId');
    const templateIdParam = searchParams.get('templateId');
    if (designIdParam) {
      if (designIdParam !== designId) {
        loadDesign(designIdParam);
      }
    } else if (templateIdParam) {
      setIsDesignLoading(true);
      isLoadingRef.current = true;
      setDesignId(null);
      setOrderComplete(false);
      setShowBakeryChat(false);
      setSelectedCenterItemId(null);
      setActiveTool(null);
      placeUndoStackRef.current = [];
      placeRedoStackRef.current = [];
      templateApi.getPublicTemplateById(templateIdParam).then(async (tpl) => {
        if (tpl?.config) {
          const adapted = adaptConfigFromLegacy(tpl.config);
          const tplTitle = tpl.name || 'Template Cake';
          setConfig(adapted);
          setTitle(tplTitle);

          if (account) {
            try {
              const savedDesign = await designApi.createDesign({
                name: tplTitle,
                config: adapted,
                isPublic: false,
              });
              setDesignId(savedDesign._id);
              setTitle(savedDesign.name || tplTitle);
              setSaveStatus('saved');
              setHasUnsavedChanges(false);
              navigate(`/designer?designId=${savedDesign._id}`, { replace: true });
              setTimeout(() => saveThumbnail(savedDesign._id), 600);
            } catch (e) {
              console.warn('Could not auto-create template design:', e);
            }
          }
        }
      }).catch((err) => console.warn('Could not preload template in designer:', err))
        .finally(() => setIsDesignLoading(false));
    } else {
      setIsDesignLoading(false);
      // Completely new design
      isLoadingRef.current = true;
      setDesignId(null);
      setConfig(INITIAL_CONFIG);
      setOrderComplete(false);
      setShowBakeryChat(false);
      setSelectedCenterItemId(null);
      setActiveTool(null);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      placeUndoStackRef.current = [];
      placeRedoStackRef.current = [];
      try {
        localStorage.removeItem('cakenmake_draft_design');
      } catch (e) {}

      let isMounted = true;
      const initNewDesign = async () => {
        let defaultTitle = 'Unnamed 1';
        if (account) {
          try {
            const userDesigns = await designApi.getDesigns();
            const existingNames = new Set(
              (Array.isArray(userDesigns) ? userDesigns : [])
                .filter((d) => !d?.isTrashed)
                .map((d) => (d?.name || '').trim().toLowerCase())
                .filter(Boolean)
            );
            let num = 1;
            while (existingNames.has(`unnamed ${num}`) || existingNames.has(`untitled ${num}`)) {
              num++;
            }
            defaultTitle = `Unnamed ${num}`;

            if (!isMounted) return;

            const savedDesign = await designApi.createDesign({
              name: defaultTitle,
              config: INITIAL_CONFIG,
              isPublic: false,
            });

            // Capture was cached during exit if creation completed after unmount.
            void saveThumbnail(savedDesign._id);
            if (!isMounted) return;

            setDesignId(savedDesign._id);
            setTitle(savedDesign.name || defaultTitle);
            setSaveStatus('saved');
            setHasUnsavedChanges(false);
            navigate(`/designer?designId=${savedDesign._id}`, { replace: true });
            setTimeout(() => saveThumbnail(savedDesign._id), 600);
            return;
          } catch (err) {
            console.warn('Could not initialize new design in db:', err);
          }
        }

        if (!isMounted) return;
        setTitle(defaultTitle);
      };

      initNewDesign();
      return () => {
        isMounted = false;
      };
    }
  }, [searchParams, loadDesign, account, navigate]);

  const cachedThumbnailRef = useRef(null);
  const captureThumbnail = useCallback(() => {
    try {
      const image = cakeSceneRef.current?.captureThumbnail();
      if (image) cachedThumbnailRef.current = image;
      return image || cachedThumbnailRef.current;
    } catch (error) { console.warn('Thumbnail capture failed:', error); return cachedThumbnailRef.current; }
  }, []);
  const saveThumbnail = useCallback(async (id = null, image = null) => {
    const targetId = id || designId;
    const snapshot = image || captureThumbnail();
    if (targetId && snapshot) await designApi.uploadImage(targetId, snapshot);
  }, [designId, captureThumbnail]);

  useEffect(() => {
    cachedThumbnailRef.current = null;
    const timer = setTimeout(captureThumbnail, 200);
    return () => clearTimeout(timer);
  }, [config, captureThumbnail]);

  const saveDesign = useCallback(async ({ skipThumbnail = false, sentToBakery = false } = {}) => {
    if (!account) {
      try {
        localStorage.setItem('cakenmake_draft_design', JSON.stringify({
          name: title,
          config,
          lastEdited: new Date().toISOString(),
        }));
        setSaveStatus('saved');
        setHasUnsavedChanges(false);
      } catch (e) {}
      return null;
    }

    try {
      setSaveStatus('saving');

      const designData = {
        name: title,
        config: config,
        lastEstimate: quote ? {
          pricingVersion: quote.pricingVersion,
          currency: quote.currency,
          totalMinor: quote.totalMinor,
          lineItems: quote.lineItems || [],
          calculatedAt: new Date().toISOString(),
        } : null,
        isPublic: false,
        ...(sentToBakery ? { sentToBakery: true } : {}),
      };

      let savedDesign;
      if (designId) {
        // Update existing design
        savedDesign = await designApi.updateDesign(designId, designData);
      } else {
        // Create new design
        savedDesign = await designApi.createDesign(designData);
        setDesignId(savedDesign._id);
        if (savedDesign.name) {
          setTitle(savedDesign.name);
        }
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
  }, [account, config, title, designId, navigate, quote]);

  // Auto-save effect with 600ms debounce
  useEffect(() => {
    if (orderComplete || !hasUnsavedChanges) return;

    const saveTimer = setTimeout(async () => {
      const snapshot = captureThumbnail();
      const id = await saveDesign({ skipThumbnail: true });
      if (id) await saveThumbnail(id, snapshot);
    }, 600); // Fast auto-save after 600ms of inactivity

    return () => clearTimeout(saveTimer);
  }, [hasUnsavedChanges, saveDesign, saveThumbnail, captureThumbnail, orderComplete]);

  // Mark as having unsaved changes when config or title changes (skipping initial mount, design loading, and completed orders)
  useEffect(() => {
    if (orderComplete) return;
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
  }, [config, title, orderComplete]);

  const handleCategoryChange = useCallback((category) => {
    setActiveCategory(category);
  }, []);

  const latestConfigRef = useRef(config);
  const latestTitleRef = useRef(title);
  const latestDesignIdRef = useRef(designId);
  const latestHasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const latestQuoteRef = useRef(quote);

  useEffect(() => {
    latestConfigRef.current = config;
    latestTitleRef.current = title;
    latestDesignIdRef.current = designId;
    latestHasUnsavedChangesRef.current = hasUnsavedChanges;
    latestQuoteRef.current = quote;
  }, [config, title, designId, hasUnsavedChanges, quote]);

  // Layout cleanup captures before the scene is disposed. No delayed capture on exit.
  useLayoutEffect(() => {
    const handleExitFlush = () => {
      if (!account) return;
      const snapshot = captureThumbnail();
      const existingId = latestDesignIdRef.current;
      if (existingId && snapshot) void designApi.uploadImage(existingId, snapshot);
      if (latestHasUnsavedChangesRef.current && account) {
        const targetId = latestDesignIdRef.current;
        const designData = {
          name: latestTitleRef.current,
          config: latestConfigRef.current,
          lastEstimate: latestQuoteRef.current ? {
            pricingVersion: latestQuoteRef.current.pricingVersion,
            currency: latestQuoteRef.current.currency,
            totalMinor: latestQuoteRef.current.totalMinor,
            lineItems: latestQuoteRef.current.lineItems || [],
            calculatedAt: new Date().toISOString(),
          } : null,
          isPublic: false,
        };

        if (targetId) {
          designApi.updateDesign(targetId, designData).catch(() => {});

        } else {
          designApi.createDesign(designData).then(saved => {
            if (snapshot) return designApi.uploadImage(saved._id, snapshot);
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('pagehide', handleExitFlush);

    return () => {
      window.removeEventListener('pagehide', handleExitFlush);
      handleExitFlush();
    };
  }, [account?._id, account?.id, captureThumbnail]);

  const handlePaymentComplete = useCallback(async (selectedDate) => {
    // Blueprint captures: Start Page hero + Angle Page (Front / Back / Top / Side). Taken exactly once, right
    // when Send to Bakery succeeds and before any awaits, so the scene is
    // still exactly what the customer ordered. Kept in a ref for the
    // blueprint generator to pick up; users never see or trigger this.
    if (!blueprintViewsRef.current && cakeSceneRef.current) {
      try {
        blueprintViewsRef.current = cakeSceneRef.current.captureBlueprintViews();
      } catch (err) {
        console.warn('Failed to capture blueprint views:', err);
      }
    }

    // Internal artifact for future bakery handoff. Never expose a customer URL.
    if (!submittedBlueprintRef.current) {
      const submittedConfig = structuredClone(config);
      const submittedName = title;
      const submittedQuote = quotedConfig === config && quote ? structuredClone(quote) : null;
      const snapshot = { config: submittedConfig, designName: submittedName, views: blueprintViewsRef.current, quote: submittedQuote, pdf: null,
        submissionId: crypto.randomUUID(),
        deliveryDate: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
        customerName: account?.displayName || 'Guest',
      };
      submittedBlueprintRef.current = snapshot;
      try {
        if (!snapshot.quote) snapshot.quote = await pricingApi.quoteCake(submittedConfig);
      } catch (error) {
        console.warn('Blueprint pricing unavailable:', error);
      }
    }

    const snapshot = submittedBlueprintRef.current;
    if (!snapshot.views) throw new Error('Could not capture the cake. Please reload and try again.');
    if (!snapshot.pdf) {
      snapshot.details = buildBlueprintDetails(snapshot.config, snapshot.quote, snapshot.designName);
      snapshot.pdf = buildBlueprintPdfBlob({ views: snapshot.views, details: snapshot.details });
    }
    if (!snapshot.pdfBase64) {
      snapshot.pdfBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = () => reject(new Error('Could not prepare your order. Please retry.'));
        reader.readAsDataURL(snapshot.pdf);
      });
    }
    const result = await blueprintApi.submit({
      submissionId: snapshot.submissionId,
      designName: snapshot.designName,
      customerName: snapshot.customerName,
      deliveryDate: snapshot.deliveryDate,
      designSnapshot: snapshot.config,
      quoteSnapshot: snapshot.quote,
      pdfBase64: snapshot.pdfBase64,
      paymentMode: 'simulated',
      paymentCompleted: true,
    });
    if (result.status !== 'ready') throw new Error('Your order is still being processed. Please retry shortly.');
  }, [account, config, title, quote, quotedConfig]);

  const handleOrderComplete = useCallback(async (selectedDate) => {
    setOrderComplete(true);
    setBakeryOpen(false);

    if (!account) return;

    // Explicitly update and save the design configuration permanently with sentToBakery: true
    const savedId = await saveDesign({ sentToBakery: true });
    if (savedId) {
      await saveThumbnail(savedId);
    }

    // Post automated order brief into the bakery conversation
    try {
      const convos = await chatApi.listConversations();
      let convoId = convos.conversations?.[0]?.id || null;
      if (!convoId) {
        const created = await chatApi.createConversation();
        convoId = created?.conversation?.id;
      }
      if (convoId) {
        const totalPesos = quote ? quote.totalMinor / 100 : 0;
        const downpayment = Math.ceil(totalPesos / 2);
        const remaining = totalPesos - downpayment;
        const formattedDate = selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Scheduled Date';
        await chatApi.sendMessage(convoId, {
          clientMessageId: `order_${submittedBlueprintRef.current?.submissionId || crypto.randomUUID()}`,
          text: `🎂 Cake Order Submitted!\n• Design: "${title}"\n• Delivery Date: ${formattedDate}\n• Required Down Payment: ₱${downpayment} (Awaiting staff verification)\n• Remaining Balance: ₱${remaining} (Due upon delivery/pickup)\n\nCheckout was simulated; no money was collected. Please contact the bakery to arrange payment.`,
        });
      }
    } catch (err) {
      console.warn('Failed to send automated initial chat message:', err);
    }

    // Direct the user to the dedicated Client Chats page
    navigate('/chats');
  }, [account, saveDesign, saveThumbnail, quote, title, navigate]);

  const handleSaveDesign = async () => {
    if (!account) {
      try {
        localStorage.setItem('cakenmake_draft_design', JSON.stringify({
          name: title,
          config,
          lastEdited: new Date().toISOString(),
        }));
      } catch (e) {}
      setGuestAuthAction('save');
      setGuestAuthModalOpen(true);
      return;
    }
    const savedId = await saveDesign();
    if (savedId) {
      await saveThumbnail(savedId);
    }
  };

  const handleSendToBakery = () => {
    if (!account) {
      try {
        localStorage.setItem('cakenmake_draft_design', JSON.stringify({
          name: title,
          config,
          lastEdited: new Date().toISOString(),
        }));
      } catch (e) {}
      setGuestAuthAction('order');
      setGuestAuthModalOpen(true);
      return;
    }
    setBakeryOpen(true);
  };

  const handleGuestAuthSuccess = async (authenticatedUser) => {
    if (guestAuthAction === 'save') {
      const savedId = await saveDesign();
      if (savedId) {
        await saveThumbnail(savedId);
      }
    } else if (guestAuthAction === 'order') {
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
      if (isBreakdownOpen) return;
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

  useEffect(() => {
    return () => {
      if (overlapTimerRef.current) clearTimeout(overlapTimerRef.current);
    };
  }, []);

  const handlePlace = useCallback((item) => {
    setPlaceItems(prevItems => {
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
  }, [setPlaceItems, setActiveTool]);

  const handleDeleteSelectedCenterItem = useCallback(() => {
    if (!selectedCenterItemId) return;
    setPlaceItems((items) => items.filter((item) => item.id !== selectedCenterItemId));
    setSelectedCenterItemId(null);
  }, [selectedCenterItemId, setPlaceItems]);

  const handleCenterTextColorModeChange = useCallback((nextMode) => {
    setConfig((prev) => {
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
          ...prev.center,
          text: { ...(prev.center?.text || {}), colorMode: nextMode },
        },
        place: { ...prev.place, items: nextItems },
      };
    });
  }, []);

  if (isDesignLoading) {
    return <PageLoadingSkeleton path="/designer" />;
  }

  return (
    <div className="h-[100dvh] w-full max-w-full flex flex-col overflow-hidden bg-background">
      <AnimatePresence>
        {versionChanged && (
          <motion.div
            initial={{ opacity: 0, y: -12, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -12, x: '-50%' }}
            className="fixed left-1/2 top-20 z-50 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm shadow-xl"
          >
            <span>The bakery updated its prices. Your estimate has been recalculated.</span>
            <button type="button" onClick={dismissVersionChanged} className="shrink-0 font-semibold text-primary hover:underline">Got it</button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Top bar */}
      <header className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 border-b border-border/40 bg-card/80 backdrop-blur-sm z-20 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
          <Link
            to={account ? (account.role?.startsWith('bakery') ? '/bakery' : '/client') : '/'}
            className={account
              ? "w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer shrink-0"
              : "shrink-0 rounded-xl px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/10 transition-colors"}
            title="Back to home"
          >
            {account ? <Cake className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-primary-foreground" /> : 'Back'}
          </Link>
          {account && (
            <Input
              ref={titleRef}
              value={title}
              readOnly={orderComplete}
              disabled={orderComplete}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.target.blur();
                }
              }}
              className="font-display text-base sm:text-xl font-bold leading-tight tracking-tight border-none shadow-none bg-transparent p-0 h-auto w-[120px] sm:w-[180px] max-w-[180px] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/50 rounded-md px-1 -ml-1 truncate disabled:opacity-100"
            />
          )}

          {/* Save status indicator - only when order not complete */}
          {!orderComplete && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs shrink min-w-0 truncate">
              {saveStatus === 'saving' && (
                <>
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
                  <span className="text-muted-foreground truncate">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Cloud className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span className="text-green-600 truncate">
                    <span className="hidden sm:inline">All changes saved</span>
                    <span className="sm:hidden">All saved</span>
                  </span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <span className="text-destructive truncate">Save failed</span>
                </>
              )}
              {saveStatus === 'unsaved' && (
                <>
                  <CloudOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground truncate">Unsaved changes</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Save Design button - only when not sent to bakery */}
          {!orderComplete && (
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
                  <span className="inline sm:hidden">Saving...</span>
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4" />
                  <span className="inline sm:hidden">Save</span>
                  <span className="hidden sm:inline">Save Design</span>
                </>
              )}
            </Button>
          )}

          {/* Send Bakery - only when no order yet */}
          {!orderComplete && (
            <Button
              onClick={handleSendToBakery}
              className="flex items-center gap-2 rounded-xl font-semibold"
              size="sm"
            >
              <Send className="w-4 h-4" />
              <span className="inline sm:hidden">Send</span>
              <span className="hidden sm:inline">Send Bakery</span>
            </Button>
          )}

          {/* Mobile toolpanel toggle - only when not sent to bakery */}
          {!orderComplete && (
            <div className="relative md:hidden">
              <Button
                variant={panelOpen ? "default" : "outline"}
                size="icon"
                disabled={isBreakdownOpen}
                className={`rounded-xl transition-all shadow-sm ${
                  panelOpen
                    ? 'bg-primary text-primary-foreground shadow-primary/20'
                    : 'bg-card/90 border-border/70 text-foreground hover:bg-muted'
                } ${activeTool && !panelOpen ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                onClick={() => setPanelOpen(!panelOpen)}
                title={panelOpen ? "Close Tools" : activeTool ? "Placement Active - Open Tools" : "Open Tools"}
                aria-label={panelOpen ? "Close Tools" : "Open Tools"}
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
          )}
        </div>
      </header>

      {/* Main content */}
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
            cakeConfig={adaptConfigToLegacy(config)}
            activeTool={orderComplete || isBreakdownOpen ? null : activeTool}
            disabled={isBreakdownOpen}
            readOnly={orderComplete}
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

          {/* Pricing panel */}
          <div className="absolute top-4 left-4 z-10">
            <PricingPanel quote={quote} loading={quoteLoading} error={quoteError} onOpenChange={setIsBreakdownOpen} />
          </div>

          {/* Placement Mode Active Floating Indicator Banner */}
          <AnimatePresence>
            {Boolean(activeTool) && !orderComplete && !isBreakdownOpen && (
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

        {/* Desktop Panel */}
        <div className={`hidden md:block w-[280px] lg:w-[320px] xl:w-[340px] max-w-[40vw] p-2 sm:p-3 shrink-0 ${isBreakdownOpen ? 'pointer-events-none opacity-50 select-none' : ''}`}>
          {orderComplete ? (
            <div className="h-full">
              <BakeryChatPanel onNotificationChange={setChatNotifications} config={config} onChange={setConfig} quote={quote} aiChatSession={aiChatSession} />
            </div>
          ) : (
            <ToolPanel
              aiChatSession={aiChatSession}
              config={config}
              quote={quote}
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
            />
          )}
        </div>

        {/* Mobile Panel */}
        {orderComplete ? (
          <div className="md:hidden fixed bottom-0 inset-x-0 h-[360px] max-h-[50vh] bg-card border-t border-border/40 z-30 shadow-2xl p-2">
            <BakeryChatPanel onNotificationChange={setChatNotifications} config={config} onChange={setConfig} quote={quote} aiChatSession={aiChatSession} />
          </div>
        ) : (
          <MobileDraggableToolPanel
            aiChatSession={aiChatSession}
            panelOpen={panelOpen && !isBreakdownOpen}
            quote={quote}
            onClose={() => setPanelOpen(false)}
            mainAreaRef={mainAreaRef}
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
          />
        )}
      </div>


      <AnimatePresence>
        {bakeryOpen && (
          <SendBakeryModal
            config={config}
            total={quote ? quote.totalMinor / 100 : 0}
            onClose={() => setBakeryOpen(false)}
            onOrderComplete={handleOrderComplete}
            onPaymentComplete={handlePaymentComplete}
          />
        )}
      </AnimatePresence>

      <GuestAuthModal
        isOpen={guestAuthModalOpen}
        onClose={() => setGuestAuthModalOpen(false)}
        actionType={guestAuthAction}
        onSuccess={handleGuestAuthSuccess}
      />
    </div>
  );
}
