import React, { useState, useRef, useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import CakeScene from '@/components/cake/CakeScene.jsx';
import PageLoadingSkeleton from '@/components/shared/PageLoadingSkeleton';
import ToolPanel from '@/components/cake/ToolPanel';
import PricingPanel from '@/components/cake/PricingPanel';
import SendBakeryModal from '@/components/bakery/SendBakeryModal';
import useDesignAiChat from '@/hooks/useDesignAiChat';
import GuestAuthModal from '@/components/auth/GuestAuthModal';
import DesignerTutorial, { TUTORIAL_STEPS } from '@/components/tutorial/DesignerTutorial';
import { Home, X, Send, Cloud, CloudOff, Loader2, RotateCcw, SlidersHorizontal, HelpCircle, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { blueprintApi, designApi, pricingApi, templateApi } from '@/services/api';
import { chatApi } from '@/services/chat-api';
import { format } from 'date-fns';
import { buildBlueprintDetails } from '@/lib/blueprintDetails';
import { buildBlueprintPdfBlob } from '@/lib/blueprintPdf';
import { buildBlueprintTierPlan } from '@/lib/blueprintStages';
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

/**
 * Computes constrained positioning styles for the floating Placement Mode Active banner
 * so it is always completely visible, centered, and never exceeds or clips the available space.
 */
function getConstrainedPlacementBannerLayout({
  containerWidth,
  containerHeight,
  bannerWidth = 320,
  bannerHeight = 44,
  isMobile = false,
  safeMargin = 12,
}) {
  const safeWidth = Math.max(100, containerWidth || 360);
  const maxAvailableWidth = Math.max(220, safeWidth - (safeMargin * 2));
  const effectiveWidth = Math.min(bannerWidth || 300, maxAvailableWidth);

  // In mobile view or narrow viewport (< 640px), place banner below the top-left pricing panel (which is ~36px tall at top: 12-16px)
  // so it never collides with PricingPanel or gets pushed off-screen.
  // On desktop, top: 16px centered has plenty of clearance between PricingPanel and Reset view button.
  const isNarrow = isMobile || safeWidth < 640;
  const top = isNarrow ? 56 : 16;

  // Center horizontally within the container, strictly clamped between safeMargin and (safeWidth - effectiveWidth - safeMargin)
  const left = Math.max(
    safeMargin,
    Math.min(
      safeWidth - effectiveWidth - safeMargin,
      Math.round((safeWidth - effectiveWidth) / 2)
    )
  );

  return {
    top: `${top}px`,
    left: `${left}px`,
    maxWidth: `${maxAvailableWidth}px`,
    width: 'max-content',
  };
}

export default function DesignerWorkSpace({ isGuestPage = false }) {
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
  const [overlapWarning, setOverlapWarning] = useState(false);
  const [overlapMessage, setOverlapMessage] = useState(null);
  const overlapTimerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('fundamentals');
  const [activeLayer, setActiveLayer] = useState(0);
  const [activeEdgeSlot, setActiveEdgeSlot] = useState('top');
  const [toolPanelModeUi, setToolPanelModeUi] = useState('design');
  const location = useLocation();
  const [guestAuthModalOpen, setGuestAuthModalOpen] = useState(() => Boolean(location.state?.guestAuthOpen));
  const [guestAuthAction, setGuestAuthAction] = useState(() => location.state?.action || 'general');
  const [guestAuthInitialEmail, setGuestAuthInitialEmail] = useState(() => location.state?.email || '');
  const [guestAuthInitialExpiresAt, setGuestAuthInitialExpiresAt] = useState(() => location.state?.expiresAt || null);

  useEffect(() => {
    if (location.state?.guestAuthOpen && location.state?.email) {
      setGuestAuthInitialEmail(location.state.email);
      setGuestAuthInitialExpiresAt(location.state.expiresAt || null);
      if (location.state.action) setGuestAuthAction(location.state.action);
      setGuestAuthModalOpen(true);
    }
  }, [location.state]);


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

  const cakeContainerRef = useRef(null);
  const placementBannerRef = useRef(null);
  const [placementContainerDims, setPlacementContainerDims] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 500,
    height: typeof window !== 'undefined' ? 350 : 350,
  });
  const [bannerDims, setBannerDims] = useState({ width: 320, height: 44 });

  useEffect(() => {
    if (!cakeContainerRef.current) return;
    const updateDims = () => {
      if (cakeContainerRef.current) {
        const rect = cakeContainerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setPlacementContainerDims({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    };
    updateDims();
    const ro = new ResizeObserver(updateDims);
    ro.observe(cakeContainerRef.current);
    window.addEventListener('resize', updateDims);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDims);
    };
  }, []);

  useEffect(() => {
    if (!placementBannerRef.current || !activeTool) return;
    const updateBanner = () => {
      if (placementBannerRef.current) {
        const rect = placementBannerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setBannerDims((prev) => {
            const w = Math.round(rect.width);
            const h = Math.round(rect.height);
            if (prev.width === w && prev.height === h) return prev;
            return { width: w, height: h };
          });
        }
      }
    };
    updateBanner();
    const ro = new ResizeObserver(updateBanner);
    ro.observe(placementBannerRef.current);
    return () => ro.disconnect();
  }, [activeTool]);

  const placementBannerStyle = useMemo(() => {
    return getConstrainedPlacementBannerLayout({
      containerWidth: placementContainerDims.width,
      containerHeight: placementContainerDims.height,
      bannerWidth: bannerDims.width,
      bannerHeight: bannerDims.height,
      isMobile: placementContainerDims.width < 768,
    });
  }, [placementContainerDims.width, placementContainerDims.height, bannerDims.width, bannerDims.height]);

  const titleRef = useRef(null);
  const cakeSceneRef = useRef(null);
  const mainAreaRef = useRef(null);
  const blueprintTiersRef = useRef(null); // { groups, images } for the Tier "DETAILS:" pages
  const blueprintViewsRef = useRef(null); // { hero, front, back, top, side } JPEG data URLs, set once on order complete
  const submittedBlueprintRef = useRef(null);
  const activeOrderConvoIdRef = useRef(null);

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

  // ── Designer Tutorial ───────────────────────────────────────────────
  // Driven entirely by TUTORIAL_STEPS (see tutorialSteps.js). The workspace only does three
  // generic things: apply a step's `setup`, lock the page to the step's `allow` list, and
  // watch the step's `done` condition. The user's own cake is backed up on start and
  // restored on finish/skip, so the tutorial always runs on a separate default cake.
  const TUTORIAL_DONE_KEY = 'cakenmake_has_completed_tutorial';
  const TUTORIAL_SECTION_KEYS = ['structure', 'sponge', 'filling', 'exteriorFinish', 'surfaceTreatment'];
  const TUTORIAL_CANVAS_SELECTOR = '[data-tutorial="cake-canvas"] canvas';
  const TUTORIAL_LOCKABLE =
    'button, a, input, select, textarea, label, canvas, [role="button"], [role="slider"], [role="tab"], [role="switch"], [role="checkbox"], [data-radix-collection-item]';

  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const [tutorialStepDone, setTutorialStepDone] = useState(false);
  const [tutorialEvents, setTutorialEvents] = useState({});
  const preTutorialStateRef = useRef(null);
  const tutorialStartRef = useRef(null);
  const hasAutoStartedTutorialRef = useRef(false);
  const tutorialStep = tutorialOpen ? TUTORIAL_STEPS[tutorialStepIndex] || null : null;
  const tutorialLockCamera = Boolean(tutorialStep?.lockCamera);

  const restorePreTutorialState = useCallback(() => {
    if (preTutorialStateRef.current) {
      const backup = preTutorialStateRef.current;
      preTutorialStateRef.current = null;

      setConfig(backup.config);
      setTitle(backup.title);
      setActiveTab(backup.activeTab);
      setActiveLayer(backup.activeLayer);
      setActiveEdgeSlot(backup.activeEdgeSlot);
      setToolPanelModeUi(backup.toolPanelModeUi);
      setExpandedSections(backup.expandedSections);
      setActiveTool(backup.activeTool);
      setSelectedCenterItemId(backup.selectedCenterItemId);
      placeUndoStackRef.current = backup.placeUndoStack;
      placeRedoStackRef.current = backup.placeRedoStack;
      setSaveStatus(backup.saveStatus);
      setHasUnsavedChanges(backup.hasUnsavedChanges);
      setPlaceHistoryVersion((v) => v + 1);
    }
  }, []);

  // Put the workspace into the state a step expects.
  const applyTutorialSetup = useCallback((step) => {
    const s = step?.setup || {};
    if (s.tab) setActiveTab(s.tab);
    setToolPanelModeUi(s.mode || 'design');
    setPanelOpen(true);
    if (s.expand) {
      setExpandedSections(Object.fromEntries(
        TUTORIAL_SECTION_KEYS.map((key) => [key, s.expand !== 'none' && s.expand.includes(key)])
      ));
    }
    if (s.edgeSlot) setActiveEdgeSlot(s.edgeSlot);
    if (s.patch) setConfig((prev) => s.patch(prev, INITIAL_CONFIG));
    if (s.tool === 'strawberry') {
      setActiveTool((prev) => (
        prev && typeof prev === 'object' && String(prev.type || '').startsWith('center-strawberry')
          ? prev
          : { type: 'center-strawberry-default', rotationY: 0, rotationX: 0, rotationZ: 0 }
      ));
    } else {
      setActiveTool(null);
    }
    if (!s.keepSelection) setSelectedCenterItemId(null);
    if (s.camera === 'reset') cakeSceneRef.current?.resetCamera?.();
    if (s.scrollTop) {
      setTimeout(() => {
        document.querySelector('[data-tutorial="toolpanel"] [data-radix-scroll-area-viewport]')?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 50);
    }
  }, []);

  const handleStartTutorial = useCallback(() => {
    // 1. Back up the user's design + UI state
    preTutorialStateRef.current = {
      config: structuredClone(config),
      title,
      activeTab,
      activeLayer,
      activeEdgeSlot,
      toolPanelModeUi,
      expandedSections: { ...expandedSections },
      activeTool,
      selectedCenterItemId,
      placeUndoStack: [...placeUndoStackRef.current],
      placeRedoStack: [...placeRedoStackRef.current],
      saveStatus,
      hasUnsavedChanges,
    };

    // 2. Fresh default cake for the tutorial; clean history
    placeUndoStackRef.current = [];
    placeRedoStackRef.current = [];
    setPlaceHistoryVersion((v) => v + 1);
    setConfig(structuredClone(INITIAL_CONFIG));
    setActiveLayer(0);

    // 3. First step
    setTutorialStepIndex(0);
    setTutorialStepDone(false);
    setTutorialEvents({});
    applyTutorialSetup(TUTORIAL_STEPS[0]);

    // 4. No unsaved-changes noise while in the tutorial
    setSaveStatus('saved');
    setHasUnsavedChanges(false);
    setTutorialOpen(true);
  }, [
    config, title, activeTab, activeLayer, activeEdgeSlot, toolPanelModeUi, expandedSections,
    activeTool, selectedCenterItemId, saveStatus, hasUnsavedChanges, applyTutorialSetup,
  ]);
  tutorialStartRef.current = handleStartTutorial;

  const handleTutorialStepChange = useCallback((nextIndex) => {
    const next = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, nextIndex));
    setTutorialStepIndex(next);
    setTutorialStepDone(false);
    setTutorialEvents({});
    applyTutorialSetup(TUTORIAL_STEPS[next]);
  }, [applyTutorialSetup]);

  const finishTutorial = useCallback(() => {
    setTutorialOpen(false);
    setTutorialStepDone(false);
    setTutorialEvents({});
    restorePreTutorialState();
    try {
      localStorage.setItem(TUTORIAL_DONE_KEY, 'true');
    } catch (e) { }
  }, [restorePreTutorialState]);

  // First-time users start the tutorial automatically (or via ?tutorial=true).
  // Returning users, and anyone opening a saved design, can replay it from the header button.
  useEffect(() => {
    if (tutorialOpen || hasAutoStartedTutorialRef.current) return undefined;
    const forced = searchParams.get('tutorial') === 'true';
    let seen = false;
    try {
      seen = localStorage.getItem(TUTORIAL_DONE_KEY) === 'true';
    } catch (e) { }
    if (!forced && (seen || searchParams.get('designId'))) return undefined;
    const timer = setTimeout(() => {
      if (hasAutoStartedTutorialRef.current) return;
      hasAutoStartedTutorialRef.current = true;
      tutorialStartRef.current?.();
    }, forced ? 0 : 900);
    return () => clearTimeout(timer);
  }, [searchParams, tutorialOpen]);

  // Completion by state or workspace event
  useEffect(() => {
    if (!tutorialStep || tutorialStep.kind !== 'try' || tutorialStepDone) return;
    const done = tutorialStep.done || {};
    const ctx = { config, activeTool, selectedCenterItemId, activeTab, activeEdgeSlot };
    if ((done.when && done.when(ctx)) || (done.event && tutorialEvents[done.event])) {
      setTutorialStepDone(true);
    }
  }, [tutorialStep, tutorialStepDone, tutorialEvents, config, activeTool, selectedCenterItemId, activeTab, activeEdgeSlot]);

  // Lock + interaction watcher for 'try' steps. Everything interactive is blocked except the
  // step's `allow` selectors (and the tutorial card). Clicks / gestures / keys on allowed
  // regions are what complete click-, touch- and gesture-type steps.
  useEffect(() => {
    if (!tutorialStep || tutorialStep.kind !== 'try') return undefined;
    const allow = tutorialStep.allow || [];
    const block = tutorialStep.block || [];
    const done = tutorialStep.done || {};
    const inAny = (el, selectors) => selectors.some((sel) => el.closest(sel));
    const markDone = () => setTutorialStepDone(true);
    let clicks = 0;

    const guard = (e) => {
      const el = e.target;
      if (!(el instanceof Element)) return;
      if (el.closest('[data-tutorial-card="true"]')) return;

      const blocked = block.length > 0 && inAny(el, block);
      if (!blocked && inAny(el, allow)) {
        if (e.type === 'click' && done.click && el.closest(done.click)) {
          clicks += 1;
          if (clicks >= (done.count || 1)) markDone();
        }
        if ((e.type === 'pointerdown' || e.type === 'click') && done.touch && el.closest(done.touch)) markDone();
        return;
      }
      if (blocked || el.closest(TUTORIAL_LOCKABLE)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Camera gestures on the 3D canvas
    const pointers = new Map();
    let gestureMode = 'rotate';
    const onDown = (e) => {
      if (!(e.target instanceof Element) || !e.target.closest(TUTORIAL_CANVAS_SELECTOR)) return;
      pointers.set(e.pointerId, { x0: e.clientX, y0: e.clientY, moved: false });
      gestureMode = (e.button === 2 || e.ctrlKey || e.shiftKey || e.metaKey) ? 'pan' : 'rotate';
    };
    const onMove = (e) => {
      const p = pointers.get(e.pointerId);
      if (!p || p.moved) return;
      if (Math.hypot(e.clientX - p.x0, e.clientY - p.y0) < 14) return;
      p.moved = true;
      if (pointers.size >= 2) {
        if (done.gesture === 'zoom' || done.gesture === 'pan') markDone();
      } else if (done.gesture === gestureMode) {
        markDone();
      }
    };
    const onUp = (e) => pointers.delete(e.pointerId);
    const onWheel = (e) => {
      if (done.gesture === 'zoom' && e.target instanceof Element && e.target.closest(TUTORIAL_CANVAS_SELECTOR)) markDone();
    };
    const onKey = (e) => {
      if (!done.keys || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest('input, textarea')) return;
      if (done.keys.includes(String(e.key).toLowerCase())) markDone();
    };

    window.addEventListener('click', guard, true);
    window.addEventListener('pointerdown', guard, true);
    if (done.gesture) {
      window.addEventListener('pointerdown', onDown, true);
      window.addEventListener('pointermove', onMove, true);
      window.addEventListener('pointerup', onUp, true);
      window.addEventListener('pointercancel', onUp, true);
      window.addEventListener('wheel', onWheel, { capture: true, passive: true });
    }
    if (done.keys) window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('click', guard, true);
      window.removeEventListener('pointerdown', guard, true);
      window.removeEventListener('pointerdown', onDown, true);
      window.removeEventListener('pointermove', onMove, true);
      window.removeEventListener('pointerup', onUp, true);
      window.removeEventListener('pointercancel', onUp, true);
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('keydown', onKey, true);
    };
  }, [tutorialStep]);

  const handleModeUiChange = useCallback((next) => {
    if (aiChatSession?.thinking && next === 'design') {
      return;
    }
    setToolPanelModeUi(next);
  }, [aiChatSession?.thinking]);

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
      } else {
        setOrderComplete(false);
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
      // Completely new design or restored guest draft
      isLoadingRef.current = true;
      setDesignId(null);

      let draft = null;
      if (account) {
        try {
          const raw = localStorage.getItem('cakenmake_draft_design');
          if (raw) draft = JSON.parse(raw);
        } catch (e) { }
      }

      if (account && draft?.config) {
        setConfig(draft.config);
        setTitle(draft.name || 'Unnamed 1');
      } else {
        setConfig(INITIAL_CONFIG);
      }

      setOrderComplete(false);
      setSelectedCenterItemId(null);
      setActiveTool(null);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      placeUndoStackRef.current = [];
      placeRedoStackRef.current = [];

      let isMounted = true;
      const initNewDesign = async () => {
        let defaultTitle = draft?.name || 'Unnamed 1';
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
            if (!draft?.name) {
              defaultTitle = `Unnamed ${num}`;
            }

            if (!isMounted) return;

            const savedDesign = await designApi.createDesign({
              name: defaultTitle,
              config: draft?.config || INITIAL_CONFIG,
              isPublic: false,
            });

            try {
              localStorage.removeItem('cakenmake_draft_design');
            } catch (e) { }

            // Capture was cached during exit if creation completed after unmount.
            void saveThumbnail(savedDesign._id);
            if (!isMounted) return;

            setDesignId(savedDesign._id);
            setTitle(savedDesign.name || defaultTitle);
            setSaveStatus('saved');
            setHasUnsavedChanges(false);
            navigate(`/designer?designId=${savedDesign._id}`, { replace: true });
            setTimeout(() => saveThumbnail(savedDesign._id), 600);
            if (draft?.action === 'order') {
              setBakeryOpen(true);
            }
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
    if (tutorialOpen || !account) return null;

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
  }, [account, config, title, designId, navigate, quote, tutorialOpen]);

  // Auto-save effect with 600ms debounce (only for logged-in accounts)
  useEffect(() => {
    if (!account || orderComplete || !hasUnsavedChanges || tutorialOpen) return;

    const saveTimer = setTimeout(async () => {
      const snapshot = captureThumbnail();
      const id = await saveDesign({ skipThumbnail: true });
      if (id) await saveThumbnail(id, snapshot);
    }, 600); // Fast auto-save after 600ms of inactivity

    return () => clearTimeout(saveTimer);
  }, [account, hasUnsavedChanges, saveDesign, saveThumbnail, captureThumbnail, orderComplete, tutorialOpen]);

  // Mark as having unsaved changes when config or title changes (only for logged-in accounts)
  useEffect(() => {
    if (!account || orderComplete || tutorialOpen) return;
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
  }, [account, config, title, orderComplete, tutorialOpen]);

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
      if (!account || tutorialOpen) return;
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
          designApi.updateDesign(targetId, designData).catch(() => { });

        } else {
          designApi.createDesign(designData).then(saved => {
            if (snapshot) return designApi.uploadImage(saved._id, snapshot);
          }).catch(() => { });
        }
      }
    };

    window.addEventListener('pagehide', handleExitFlush);

    return () => {
      window.removeEventListener('pagehide', handleExitFlush);
      handleExitFlush();
    };
  }, [account?._id, account?.id, captureThumbnail]);

  const handlePaymentComplete = useCallback(async (selectedDate, fulfillmentDetails) => {
    // Reset blueprint captures so this submission always photographs the current design
    blueprintViewsRef.current = null;
    blueprintTiersRef.current = null;
    submittedBlueprintRef.current = null;

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

    // Tier "DETAILS:" pages: photograph the cake as it is built up (plain
    // sponge, filling slices, finish, surface, side, edges, center). Same
    // rule as above -- taken once, before any await. A failure here only
    // costs those pages, never the order.
    if (!blueprintTiersRef.current && cakeSceneRef.current) {
      try {
        const plan = buildBlueprintTierPlan(config);
        const stages = plan.stages.map(({ key, config: stageConfig, slice, anchors, zoom, diffConfig, tilt, azimuth, fit }) => {
          const legacy = adaptConfigToLegacy(stageConfig);
          return { key, anchors, zoom, diffConfig: diffConfig ? adaptConfigToLegacy(diffConfig) : undefined, tilt, azimuth, fit, config: slice ? { ...legacy, __slice: slice, __fillingOnTop: true } : legacy };
        });
        const shots = cakeSceneRef.current.captureBlueprintStages(stages);
        blueprintTiersRef.current = shots ? { groups: plan.groups, images: shots.images, anchors: shots.anchors, swatches: shots.swatches, fillColors: shots.fillColors } : { groups: [], images: {}, anchors: {}, swatches: {}, fillColors: {} };
      } catch (err) {
        console.warn('Failed to capture blueprint tier stages:', err);
        blueprintTiersRef.current = { groups: [], images: {}, anchors: {}, swatches: {}, fillColors: {} };
      }
    }

    // Internal artifact for future bakery handoff. Never expose a customer URL.
    if (!submittedBlueprintRef.current) {
      const submittedConfig = structuredClone(config);
      const submittedName = title;
      const submittedQuote = quotedConfig === config && quote ? structuredClone(quote) : null;
      const snapshot = {
        config: submittedConfig, designName: submittedName, views: blueprintViewsRef.current, tiers: blueprintTiersRef.current, quote: submittedQuote, pdf: null,
        submissionId: crypto.randomUUID(),
        deliveryDate: `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`,
        customerName: account?.displayName || 'Guest',
        fulfillment: fulfillmentDetails || null,
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
      snapshot.pdf = buildBlueprintPdfBlob({ views: snapshot.views, details: snapshot.details, tiers: snapshot.tiers });
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
    snapshot.platformId = result.platformId;

    const savedId = await saveDesign({ sentToBakery: true });
    if (savedId) await saveThumbnail(savedId);
    setOrderComplete(true);

    const convos = await chatApi.listConversations();
    let convoId = convos.conversations?.find(
      (conversation) => conversation.platform?.id === snapshot.platformId,
    )?.id || null;
    if (!convoId) {
      const created = await chatApi.createConversation(snapshot.platformId);
      convoId = created?.conversation?.id;
    }
    if (!convoId) throw new Error('Your order was submitted, but the bakery chat could not be opened. Please try again.');
    activeOrderConvoIdRef.current = convoId;
    snapshot.convoId = convoId;

    const totalPesos = snapshot.quote ? snapshot.quote.totalMinor / 100 : 0;
    const downpayment = Math.ceil(totalPesos / 2);
    const remaining = totalPesos - downpayment;
    const formattedDate = selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Scheduled Date';
    const fulfillment = snapshot.fulfillment || fulfillmentDetails;
    const fulfillmentLines = fulfillment ? [
      `• Fulfillment: ${fulfillment.type === 'delivery' ? 'Courier Delivery (Client-Booked)' : 'Store Pickup (AH Tinaps Bakeshop)'}`,
      `• Date: ${formattedDate}${fulfillment.timeWindow ? ` (${fulfillment.type === 'delivery' ? 'Dispatch' : 'Pickup'}: ${fulfillment.timeWindow})` : ''}`,
      fulfillment.type === 'delivery' && fulfillment.address ? `• Destination: ${fulfillment.address}${fulfillment.landmarks ? ` (Landmark: ${fulfillment.landmarks})` : ''}` : null,
      fulfillment.notes ? `• Notes: ${fulfillment.notes}` : null,
    ].filter(Boolean).join('\n') : `• Reservation Date: ${formattedDate}`;

    try {
      await chatApi.sendMessage(convoId, {
        clientMessageId: `order_${snapshot.submissionId}`,
        text: `🎂 Cake Order Submitted!\n• Design: "${snapshot.designName}"\n${fulfillmentLines}\n• Down Payment (50%): ₱${downpayment} (Paid - Simulated checkout)\n• Remaining Balance (50%): ₱${remaining} (Due 48h before event to begin baking)\n\nSimulated down payment completed. You can coordinate pickup or delivery arrangements and cake specifications directly here with the bakery!`,
      });
    } catch (err) {
      console.warn('Failed to send automated initial chat message:', err);
    }
    try {
      await chatApi.sendOrderAcknowledgement(convoId, snapshot.submissionId);
    } catch (err) {
      console.warn('Failed to send order acknowledgement:', err);
    }
  }, [account, config, title, quote, quotedConfig, saveDesign, saveThumbnail]);

  const handleOrderComplete = useCallback(async (selectedDate) => {
    setOrderComplete(true);
    setBakeryOpen(false);

    const targetConvoId = activeOrderConvoIdRef.current || submittedBlueprintRef.current?.convoId;
    if (targetConvoId) {
      navigate(`/chats?conversation=${encodeURIComponent(targetConvoId)}`);
    } else {
      navigate('/chats');
    }
  }, [navigate]);

  const handleSaveDesign = async () => {
    if (tutorialOpen) return;
    if (!account) {
      try {
        localStorage.setItem('cakenmake_draft_design', JSON.stringify({
          name: title,
          config,
          lastEdited: new Date().toISOString(),
          action: 'save',
        }));
      } catch (e) { }
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
    if (tutorialOpen) return;
    if (!account) {
      try {
        localStorage.setItem('cakenmake_draft_design', JSON.stringify({
          name: title,
          config,
          lastEdited: new Date().toISOString(),
          action: 'order',
        }));
      } catch (e) { }
      setGuestAuthAction('order');
      setGuestAuthModalOpen(true);
      return;
    }
    setBakeryOpen(true);
  };

  const handleGuestLogin = () => {
    if (tutorialOpen) return;
    try {
      localStorage.setItem('cakenmake_draft_design', JSON.stringify({
        name: title,
        config,
        lastEdited: new Date().toISOString(),
        action: 'save',
      }));
    } catch (e) { }
    setGuestAuthAction('general');
    setGuestAuthModalOpen(true);
  };

  const handleGuestAuthSuccess = async (authenticatedUser) => {
    // When the user logs in, transfer their design from the guest designer to /designer where it will be saved to their account in db
    navigate('/designer', { replace: true });
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
    if (tutorialOpen) {
      setTutorialEvents((prev) => ({ ...prev, place: true }));
      setActiveTool(null);
    }
    setPlaceItems(prevItems => {
      if (item?.type && typeof item.type === 'string' && item.type.startsWith('center-')) {
        const designId = item.type.split('-')[1];
        const limit = getCenterItemLimit(designId, config?.structure);
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
  }, [setPlaceItems, setActiveTool, config?.structure, tutorialOpen]);

  const handleDeleteSelectedCenterItem = useCallback(() => {
    if (!selectedCenterItemId) return;
    setPlaceItems((items) => items.filter((item) => item.id !== selectedCenterItemId));
    setSelectedCenterItemId(null);
  }, [selectedCenterItemId, setPlaceItems]);

  const handleCenterItemSelect = useCallback((id) => {
    setSelectedCenterItemId(id);
    if (!id) return;

    setActiveTab('center');

    setConfig((prev) => {
      const items = prev.place?.items || [];
      const item = items.find((it) => it.id === id);
      if (!item) return prev;

      const isLetter = typeof item.type === 'string' && (item.type.startsWith('center-letter') || item.type.startsWith('letter-'));
      const isVariation = item.source === 'variation' || item.source?.startsWith('variation') || (typeof item.id === 'string' && item.id.startsWith('center-var-'));

      let nextMode = 'decorations';
      if (isVariation) {
        nextMode = 'variations';
      } else if (isLetter) {
        nextMode = 'text';
      }

      const currentCenter = prev.center || {};
      if (currentCenter.mode === nextMode) return prev;

      return {
        ...prev,
        center: {
          ...currentCenter,
          mode: nextMode,
          ...(nextMode === 'text' ? { textCategory: 'buttercream' } : {}),
        },
      };
    });
  }, []);

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
            data-tutorial-home="true"
            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20 hover:bg-primary/90 transition-colors cursor-pointer shrink-0 ${tutorialOpen ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
              }`}
            title="Back to home"
          >
            <Home className="w-4 h-4 text-primary-foreground" />
          </Link>
          <Input
            ref={titleRef}
            value={title}
            readOnly={orderComplete || tutorialOpen}
            disabled={orderComplete || tutorialOpen}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
            className="font-display text-base sm:text-xl font-bold leading-tight tracking-tight border-none shadow-none bg-transparent p-0 h-auto w-[120px] sm:w-[180px] max-w-[180px] focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-muted/50 rounded-md px-1 -ml-1 truncate disabled:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          />

          {/* Save status indicator - only for logged in users and when order not complete */}
          {account && !orderComplete && (
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
          {/* Tutorial Tour button */}
          {!orderComplete && (
            <Button
              onClick={handleStartTutorial}
              disabled={aiChatSession?.thinking || tutorialOpen}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 rounded-xl font-semibold text-muted-foreground hover:text-foreground hover:border-primary/50"
              title="Interactive Designer Tutorial"
              aria-label="Interactive Designer Tutorial"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">Tutorial</span>
            </Button>
          )}

          {/* Log in button - only for guest users */}
          {!account && !orderComplete && (
            <Button
              onClick={handleGuestLogin}
              disabled={aiChatSession?.thinking || tutorialOpen}
              variant="outline"
              size="sm"
              className="flex items-center gap-1.5 rounded-xl font-semibold text-primary border-primary/30 hover:bg-primary/10"
              title="Log in to your account"
            >
              <LogIn className="w-4 h-4" />
              <span>Log in</span>
            </Button>
          )}

          {/* Save Design button - only when not sent to bakery */}
          {!orderComplete && (
            <Button
              onClick={handleSaveDesign}
              disabled={saveStatus === 'saving' || aiChatSession?.thinking || tutorialOpen}
              className="flex items-center gap-2 rounded-xl font-semibold"
              size="sm"
              variant="outline"
              title={aiChatSession?.thinking ? 'AI is currently editing the cake' : undefined}
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
              disabled={aiChatSession?.thinking}
              data-tutorial="send-bakery"
              className="flex items-center gap-2 rounded-xl font-semibold"
              size="sm"
              title={aiChatSession?.thinking ? 'AI is currently editing the cake' : undefined}
            >
              <Send className="w-4 h-4" />
              <span className="inline sm:hidden">Send</span>
              <span className="hidden sm:inline">Send Bakery</span>
            </Button>
          )}
        </div>
      </header>

      {/* Main content - split in 2 on mobile (top: 3D render, bottom: toolpanel), side-by-side on desktop */}
      <div ref={mainAreaRef} className="flex-1 flex flex-col md:flex-row relative overflow-hidden min-h-0">
        {/* 3D View - Top screen on mobile, left workspace on desktop */}
        <motion.div
          ref={cakeContainerRef}
          data-tutorial="cake-canvas"
          className="flex-1 min-h-0 relative h-1/2 md:h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          <CakeScene
            ref={cakeSceneRef}
            cakeConfig={adaptConfigToLegacy(config)}
            activeTool={orderComplete || isBreakdownOpen || aiChatSession?.thinking ? null : activeTool}
            disabled={isBreakdownOpen || aiChatSession?.thinking}
            readOnly={orderComplete}
            onPlace={handlePlace}
            onSelectTool={setActiveTool}
            onPlacementBlocked={handlePlacementBlocked}
            selectedCenterItemId={selectedCenterItemId}
            onCenterItemSelect={handleCenterItemSelect}
            onDeleteCenterItem={handleDeleteSelectedCenterItem}
            onPlacedItemsChange={setPlaceItems}
            lockCameraAngle={tutorialLockCamera}
          />

          <Button
            type="button"
            data-tutorial="reset-view"
            variant="outline"
            size="sm"
            disabled={isBreakdownOpen || tutorialLockCamera}
            onClick={() => cakeSceneRef.current?.resetCamera()}
            title="Reset camera perspective"
            aria-label="Reset camera perspective"
            className={`absolute top-4 right-4 z-10 gap-2 rounded-xl border-border/70 bg-card/90 px-3 shadow-sm backdrop-blur-sm hover:bg-card ${tutorialLockCamera ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
              }`}
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset view</span>
          </Button>

          {/* Pricing panel */}
          <div data-tutorial="price-breakdown" className="absolute top-4 left-4 z-10">
            <PricingPanel quote={quote} loading={quoteLoading} error={quoteError} onOpenChange={setIsBreakdownOpen} />
          </div>

          {/* Placement Mode Active Floating Indicator Banner (Hidden in mobile view) */}
          <AnimatePresence>
            {Boolean(activeTool) && !orderComplete && !isBreakdownOpen && (
              <motion.div
                ref={placementBannerRef}
                key="placement-mode-floating-indicator"
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={placementBannerStyle}
                className="hidden md:block absolute z-20 pointer-events-auto"
              >
                <div className="flex items-center gap-2 sm:gap-2.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-2xl bg-card/95 border border-primary/30 shadow-xl backdrop-blur-md text-foreground max-w-full box-border">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                  <div className="flex flex-col min-w-0 flex-1">
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
                    className="ml-1 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
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

        {/* ToolPanel - Bottom screen on mobile (active without button), right panel on desktop */}
        {!orderComplete && (
          <div className={`flex-1 md:flex-initial h-1/2 md:h-full min-h-0 w-full md:w-[280px] lg:w-[320px] xl:w-[340px] md:max-w-[40vw] p-2 sm:p-3 shrink-0 ${isBreakdownOpen ? 'pointer-events-none opacity-50 select-none' : ''}`}>
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
              onCenterItemSelect={handleCenterItemSelect}
              onDeleteSelectedCenterItem={handleDeleteSelectedCenterItem}
              onCenterTextColorModeChange={handleCenterTextColorModeChange}
              tab={activeTab}
              onTabChange={setActiveTab}
              activeLayer={activeLayer}
              onActiveLayerChange={setActiveLayer}
              activeEdgeSlot={activeEdgeSlot}
              onActiveEdgeSlotChange={setActiveEdgeSlot}
              modeUi={toolPanelModeUi}
              onModeUiChange={handleModeUiChange}
              expandedSections={expandedSections}
              onExpandedSectionsChange={setExpandedSections}
            />
          </div>
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
        onClose={() => {
          setGuestAuthModalOpen(false);
          setGuestAuthInitialEmail('');
          setGuestAuthInitialExpiresAt(null);
          if (!account) {
            try {
              localStorage.removeItem('cakenmake_draft_design');
            } catch (e) { }
          }
        }}
        actionType={guestAuthAction}
        onSuccess={handleGuestAuthSuccess}
        initialEmail={guestAuthInitialEmail}
        initialExpiresAt={guestAuthInitialExpiresAt}
      />

      <DesignerTutorial
        isOpen={tutorialOpen}
        currentStepIndex={tutorialStepIndex}
        isStepDone={tutorialStepDone}
        onStepChange={handleTutorialStepChange}
        onComplete={finishTutorial}
        onSkip={finishTutorial}
      />
    </div>
  );
}