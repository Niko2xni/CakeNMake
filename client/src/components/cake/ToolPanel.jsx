import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Palette, Sparkles, RotateCcw, Layers, Building2, ChevronDown, ChevronUp, Eye, EyeOff, Bot, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULT_CONFIG, getSurfaceTreatmentPattern, pruneItemsCollidingWithEdgeDelicates, getTopTierRadiusFromConfig, isPetitsFourStructure, isBentoStructure, getCakeFormat } from '@/lib/cakeConfig';
import CakeStructureSection from './sections/CakeStructureSection';
import SpongeFlavorSection from './sections/SpongeFlavorSection';
import FillingSection from './sections/FillingSection';
import ExteriorFinishSection from './sections/ExteriorFinishSection';
import SugarColorSection from './sections/SugarColorSection';
import SurfaceTreatmentSection from './sections/SurfaceTreatmentSection';
import CenterSection from './sections/CenterSection';
import EdgeSection from './sections/EdgeSection';
import SideSection from './sections/SideSection';
import LayerTabStrip from './sections/LayerTabStrip';
import TierDesignControl from './sections/TierDesignControl';
import AIChatPanel from './AIChatPanel';
import {
  SpongeFlavorSectionIcon,
  FillingSectionIcon,
  ExteriorFinishSectionIcon,
  SurfaceTreatmentSectionIcon,
} from './sections/FundamentalsSectionIcons';
import { syncTierDesignOnToggle } from '@/lib/tierDesignSync';

// Nav rework — see CAKE_SETS_REWORK_SPEC.md §2. Two rows of three
// (Option 1, approved) rather than one cramped row of six.
const TABS = [
  { id: 'fundamentals', label: 'Fundamentals', icon: Building2, zIndex: 10 },
  { id: 'side', label: 'Side', icon: Sparkles, zIndex: 20 },
  { id: 'center', label: 'Center', icon: Cake, zIndex: 30 },
  { id: 'edge', label: 'Edge', icon: Layers, zIndex: 40 },
];

export default function ToolPanel({
  config,
  onChange,
  onReset,
  templateOriginalConfig,
  onResetToTemplate,
  activeTool,
  onSelectTool,
  onPlaceChange,
  onPlaceUndo,
  onPlaceRedo,
  canPlaceUndo,
  canPlaceRedo,
  quote,
  aiChatSession,
  selectedCenterItemId,
  onCenterItemSelect,
  onDeleteSelectedCenterItem,
  onCenterTextColorModeChange,
  tab: controlledTab,
  onTabChange,
  activeLayer: controlledActiveLayer,
  onActiveLayerChange,
  activeEdgeSlot: controlledActiveEdgeSlot,
  onActiveEdgeSlotChange,
  modeUi: controlledModeUi,
  onModeUiChange,
  expandedSections: controlledExpandedSections,
  onExpandedSectionsChange,
  onClose,
}) {
  const [internalAiThinking, setInternalAiThinking] = useState(false);
  const isAiBusy = Boolean(aiChatSession?.thinking || internalAiThinking);

  const [internalModeUi, setInternalModeUi] = useState('design'); // 'design' | 'ai'
  const modeUi = controlledModeUi !== undefined ? controlledModeUi : internalModeUi;
  const setModeUi = (val) => {
    const next = typeof val === 'function' ? val(modeUi) : val;
    if (isAiBusy && next === 'design') {
      return;
    }
    setInternalModeUi(next);
    onModeUiChange?.(next);
  };

  const [internalTab, setInternalTab] = useState('fundamentals');
  const tab = controlledTab !== undefined ? controlledTab : internalTab;
  const setTab = (val) => {
    const next = typeof val === 'function' ? val(tab) : val;
    setInternalTab(next);
    onTabChange?.(next);
  };

  const [internalActiveLayer, setInternalActiveLayer] = useState(0);
  const activeLayer = controlledActiveLayer !== undefined ? controlledActiveLayer : internalActiveLayer;
  const setActiveLayer = (val) => {
    const next = typeof val === 'function' ? val(activeLayer) : val;
    setInternalActiveLayer(next);
    onActiveLayerChange?.(next);
  };

  const [internalActiveEdgeSlot, setInternalActiveEdgeSlot] = useState('top');
  const activeEdgeSlot = controlledActiveEdgeSlot !== undefined ? controlledActiveEdgeSlot : internalActiveEdgeSlot;
  const setActiveEdgeSlot = (val) => {
    const next = typeof val === 'function' ? val(activeEdgeSlot) : val;
    setInternalActiveEdgeSlot(next);
    onActiveEdgeSlotChange?.(next);
  };

  const [internalExpandedSections, setInternalExpandedSections] = useState({
    structure: true,
    sponge: true,
    filling: true,
    exteriorFinish: true,
    surfaceTreatment: true,
  });
  const expandedSections = controlledExpandedSections !== undefined ? controlledExpandedSections : internalExpandedSections;
  const setExpandedSections = (val) => {
    const next = typeof val === 'function' ? val(expandedSections) : val;
    setInternalExpandedSections(next);
    onExpandedSectionsChange?.(next);
  };

  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const isPetitsFour = isPetitsFourStructure(config.structure);
  const isBento = isBentoStructure(config.structure);
  const isIndividual = config.structure?.layerDesign === 'individual' && (config.structure?.layers > 1 || isPetitsFour);
  const tabs = isPetitsFour
    ? TABS.filter(({ id }) => id !== 'side' && id !== 'edge' && id !== 'center')
    : isBento
      ? TABS.filter(({ id }) => id !== 'side')
      : TABS;
  const activeTab = isPetitsFour && (tab === 'side' || tab === 'edge' || tab === 'center')
    ? 'fundamentals'
    : isBento && tab === 'side'
      ? 'fundamentals'
      : tab;

  useEffect(() => {
    if (activeTab !== tab) {
      setTab(activeTab);
    }
  }, [activeTab, tab]);

  // Fully Frosted and Textured Buttercream both physically cover the
  // sponge and filling — a change made to either while one of these
  // styles is active has zero visible effect in the 3D preview (you'd
  // have to switch to Naked to actually see it). Sponge Flavor/Filling
  // are no longer locked shut for this (see the removed nakedGatedLocked
  // gate), so instead this drives a small "yes, that was applied" toast
  // — see notifyFrostedChange below — reassuring the person their choice
  // registered even though nothing on the cake visibly moved.
  const activeExteriorStyle = isIndividual
    ? (config.exteriorFinish?.layerStyles || [])[activeLayer]
    : config.exteriorFinish?.style;
  const isFrostedExterior = activeExteriorStyle === 'fullyFrosted' || activeExteriorStyle === 'texturedButtercream';

  // { id, label } | null. `id` (not just presence) as the AnimatePresence
  // key, so firing a second notice while the first is still visible (e.g.
  // quickly changing Sponge Flavor twice) restarts the animation instead
  // of the second change being silently absorbed into the still-showing
  // first toast.
  const [frostedNotice, setFrostedNotice] = useState(null);
  const frostedNoticeTimeoutRef = useRef(null);
  const notifyFrostedChange = (label) => {
    setFrostedNotice({ id: Date.now(), label });
    clearTimeout(frostedNoticeTimeoutRef.current);
    frostedNoticeTimeoutRef.current = setTimeout(() => setFrostedNotice(null), 2400);
  };
  useEffect(() => () => clearTimeout(frostedNoticeTimeoutRef.current), []);

  useEffect(() => {
    const maxLayer = (isPetitsFour ? 4 : (config.structure?.layers || 1)) - 1;
    if (activeLayer > maxLayer) {
      setActiveLayer(0);
    }
  }, [config.structure?.layers, isPetitsFour, activeLayer]);

  // Store and restore side designs when switching between Standard and Bento/Petit Fours
  const savedSideConfigRef = useRef(null);
  const previousFormatRef = useRef(null);

  useEffect(() => {
    const currentFormat = getCakeFormat(config.structure);
    const previousFormat = previousFormatRef.current;

    // Detect format change
    if (previousFormat !== currentFormat) {
      if (currentFormat === 'standard' && previousFormat && previousFormat !== 'standard') {
        // Switching to Standard: restore saved side config
        if (savedSideConfigRef.current) {
          onChange({
            ...config,
            side: savedSideConfigRef.current,
          });
          savedSideConfigRef.current = null;
        }
      } else if (currentFormat !== 'standard' && previousFormat === 'standard') {
        // Switching from Standard to Bento/Petit Fours: save and clear side config
        if (!savedSideConfigRef.current && config.side) {
          savedSideConfigRef.current = config.side;
        }
        onChange({
          ...config,
          side: DEFAULT_CONFIG.side,
        });
      }
      previousFormatRef.current = currentFormat;
    }

    // Bento has no Side designs at all. The transition handling above only runs
    // on a Standard -> Bento switch, so a Side design could still ride along when
    // coming from Petit Fours, from a loaded/saved config, or from any edit made
    // while Bento is active. Whenever Bento is active and a Side design is
    // present, stash it (so it returns on Standard) and reset Side to default.
    if (currentFormat === 'bento') {
      const sideHasDesign = Boolean(config.side?.mode)
        || (config.side?.layerTreatments || []).some((t) => t?.mode);
      if (sideHasDesign) {
        if (!savedSideConfigRef.current) savedSideConfigRef.current = config.side;
        onChange({ ...config, side: DEFAULT_CONFIG.side });
      }
    }
  }, [config.structure?.cakeFormat, config.structure?.format, config.structure?.size, config.structure?.shape, onChange, config.side]);

  // Refs to each collapsible section's own wrapper, keyed by section id —
  // used to scroll a section into view right after IT opens, so expanding
  // one doesn't leave its newly-revealed content sitting below the
  // visible area of the scroll panel with no cue it appeared. Plain DOM
  // refs (not refs into Collapsible itself) so this doesn't depend on
  // whether that wrapped component forwards its ref.
  const sectionRefs = useRef({});
  const registerSectionRef = (key) => (el) => {
    sectionRefs.current[key] = el;
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => {
      const willOpen = !prev[section];
      if (willOpen) {
        // Double rAF: wait for the state update above to actually paint
        // (the newly-expanded CollapsibleContent needs a layout pass
        // before scrollIntoView has real content height to measure)
        // before scrolling — this is what makes the scroll position
        // track the new space the collapse just created, rather than
        // staying put and leaving the freshly opened content partly or
        // fully off-screen below the fold.
        // block: 'start' (not 'nearest') so the landing point is always
        // the section wrapper's own top border, consistently — 'nearest'
        // could settle wherever needed the least scrolling, which meant
        // the section's title text itself could end up sitting flush
        // against the viewport edge instead of the section boundary.
        // Each wrapper also carries a scroll-mt-4 class (see the five
        // registerSectionRef divs below) — scroll-margin-top is what
        // actually reserves the gap 'start' lands at; without it the
        // title sits flush against the very top edge of the scroll area
        // with zero breathing room, not just close to the border.
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            sectionRefs.current[section]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        });
      }
      return { ...prev, [section]: willOpen };
    });
  };

  // The shared layer strip (extracted from what used to be duplicated
  // inline markup in Sponge/Filling/Exterior Finish) only actually
  // affects something on the Fundamentals tab right now — Surface/Center/
  // Edge/Side aren't wired to per-tier indirection yet (flagged as a known
  // gap, see CAKE_SETS_REWORK_SPEC.md §11), so it's hidden on those tabs
  // rather than showing a control that wouldn't do anything there.
  const showLayerStrip = isIndividual && ['fundamentals', 'side', 'center', 'edge'].includes(activeTab);

  const toggleInteriorPreview = () => {
    onChange({ ...config, interiorPreview: !config.interiorPreview });
  };

  const handleTierDesignToggle = (newLayerDesign) => {
    const targetDesign = newLayerDesign || (config.structure?.layerDesign === 'individual' ? 'uniform' : 'individual');
    const syncedConfig = syncTierDesignOnToggle(config, targetDesign, activeLayer);
    onChange(syncedConfig);
  };

  const handleStructureChange = (newStructure, newRealSize) => {
    const currentCakeFormat = getCakeFormat(config.structure);
    const nextCakeFormat = getCakeFormat(newStructure);
    const currentSurfaceFormat = isPetitsFourStructure(config.structure) ? 'petitsFour' : 'standard';
    const nextSurfaceFormat = isPetitsFourStructure(newStructure) ? 'petitsFour' : 'standard';
    let nextConfig = { ...config, structure: newStructure, realSize: newRealSize };
    if (currentSurfaceFormat !== nextSurfaceFormat) {
      const surface = config.surfaceTreatment || DEFAULT_CONFIG.surfaceTreatment;
      const currentIsIndividual = config.structure?.layerDesign === 'individual'
        && ((config.structure?.layers || 1) > 1 || currentSurfaceFormat === 'petitsFour');
      const currentTreatment = currentIsIndividual
        ? (surface.layerTreatments?.[activeLayer] || surface)
        : surface;
      const patternsByFormat = {
        ...(surface.patternsByFormat || {}),
        ...(currentTreatment.patternsByFormat || {}),
        [currentSurfaceFormat]: getSurfaceTreatmentPattern(currentTreatment, config.structure),
      };
      const nextPattern = getSurfaceTreatmentPattern({ patternsByFormat }, newStructure);
      const layerTreatments = Array.isArray(surface.layerTreatments)
        ? surface.layerTreatments.map((treatment, index) => index === activeLayer
          ? { ...treatment, pattern: nextPattern, patternsByFormat: { ...patternsByFormat } }
          : treatment)
        : surface.layerTreatments;
      nextConfig.surfaceTreatment = {
        ...surface,
        pattern: nextPattern,
        patternsByFormat,
        ...(layerTreatments ? { layerTreatments } : {}),
      };
    }

    const tierCountChanged = newStructure.layers !== config.structure?.layers;
    const formatChanged = currentCakeFormat !== nextCakeFormat;
    if (!tierCountChanged && !formatChanged) {
      onChange(nextConfig);
      return;
    }

    if (formatChanged) {
      onSelectTool?.(null);
      onCenterItemSelect?.(null);
    }

    const isCenterItem = (item) => typeof item.type === 'string' && item.type.startsWith('center-');
    const centerItems = nextCakeFormat === 'petitsFour'
      ? []
      : (config.place?.items || []).filter((item) => !isCenterItem(item));
    const legacyPlacedItems = nextCakeFormat === 'petitsFour'
      ? []
      : (config.placedItems || []).filter((item) => !isCenterItem(item));

    const baseConfig = {
      ...nextConfig,
      center: {
        ...(nextConfig.center || {}),
        variations: {},
      },
      place: { ...(config.place || {}), items: centerItems },
      placedItems: legacyPlacedItems,
    };

    const syncedConfig = syncTierDesignOnToggle(
      baseConfig,
      newStructure.layerDesign,
      activeLayer
    );
    onChange(syncedConfig);
  };

  const isDragScrollingRef = useRef(false);
  const startDragYRef = useRef(0);
  const startScrollTopRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const suppressClickRef = useRef(false);

  const handlePointerDownScroll = useCallback((e) => {
    if (e.button !== 0) return;
    if (e.target.closest('input, select, textarea, [role="slider"]')) return;

    const root = e.currentTarget;
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') || root;
    if (!viewport) return;

    isDragScrollingRef.current = true;
    startDragYRef.current = e.clientY;
    startScrollTopRef.current = viewport.scrollTop;
    hasDraggedRef.current = false;

    const onPointerMove = (moveEvent) => {
      if (!isDragScrollingRef.current) return;
      const deltaY = moveEvent.clientY - startDragYRef.current;
      if (Math.abs(deltaY) > 8) {
        hasDraggedRef.current = true;
      }
      viewport.scrollTop = startScrollTopRef.current - deltaY;
    };

    const onPointerUp = () => {
      isDragScrollingRef.current = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);

      if (hasDraggedRef.current) {
        suppressClickRef.current = true;
        setTimeout(() => {
          suppressClickRef.current = false;
        }, 0);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  }, []);

  const handleClickCapture = useCallback((e) => {
    if (!suppressClickRef.current) return;
    suppressClickRef.current = false;
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const updateContextSugarColor = (context, newSugarColor) => {
    const nextOverrides = { ...(config.sugarColorOverrides || {}) };
    if (isIndividual) {
      nextOverrides[`${context}-${activeLayer}`] = newSugarColor;
    } else {
      nextOverrides[context] = newSugarColor;
      for (let i = 0; i < (config.structure?.layers || 2); i++) {
        nextOverrides[`${context}-${i}`] = newSugarColor;
      }
    }
    onChange({
      ...config,
      sugarColorOverrides: nextOverrides,
    });
  };

  // Surface Treatment (Glaze) has no flavor of its own to derive a Match
  // Flavor color from — unlike Filling/Exterior Finish, which DO have
  // their own flavor and so show a read-only "From Frosting Flavor"
  // swatch here. Glaze is in the same position as Center/Edge/Side (no
  // flavor of their own either), so its Match Flavor mode gets the same
  // pickable Flavor Color grid those three use (showDefaultColorPicker)
  // instead of quietly inheriting Exterior Finish's flavor.
  const renderSugarColor = (context) => {
    const colorContext = isIndividual ? `${context}-${activeLayer}` : context;
    const activeColor = (isIndividual
      ? (config.sugarColorOverrides?.[colorContext] || config.sugarColorOverrides?.[context])
      : config.sugarColorOverrides?.[context]) || DEFAULT_CONFIG.sugarColor;

    return (
      <SugarColorSection
        sugarColor={activeColor}
        onChange={(newSugarColor) => updateContextSugarColor(context, newSugarColor)}
        showDefaultColorPicker
        // Glaze ('surface') is a thin poured coat, not a full buttercream
        // build, so the six Pattern/multi-tone colors don't apply the way
        // they do on Filling/Exterior Finish — see excludePatternColors'
        // doc comment in SugarColorSection.jsx. Scoped to just this
        // context rather than passed unconditionally, so if this same
        // helper gets reused for Center/Edge/Side later, they aren't
        // silently opted into the same restriction without being asked.
        excludePatternColors={context === 'surface'}
      />
    );
  };
  const fillingSugarColor = (isIndividual
    ? (config.sugarColorOverrides?.[`filling-${activeLayer}`] || config.sugarColorOverrides?.filling)
    : config.sugarColorOverrides?.filling) || DEFAULT_CONFIG.sugarColor;
  const exteriorSugarColor = (isIndividual
    ? (config.sugarColorOverrides?.[`exterior-${activeLayer}`] || config.sugarColorOverrides?.exterior)
    : config.sugarColorOverrides?.exterior) || DEFAULT_CONFIG.sugarColor;
  const sideSugarColor = (isIndividual
    ? (config.sugarColorOverrides?.[`side-${activeLayer}`] || config.sugarColorOverrides?.side)
    : config.sugarColorOverrides?.side) || DEFAULT_CONFIG.sugarColor;
  const activeSurfaceTreatment = isIndividual
    ? (config.surfaceTreatment?.layerTreatments?.[activeLayer] ?? config.surfaceTreatment ?? DEFAULT_CONFIG.surfaceTreatment)
    : (config.surfaceTreatment || DEFAULT_CONFIG.surfaceTreatment);

  return (
    <div data-tutorial="toolpanel" className="cn-designer-tool-panel relative flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden select-none">
      {/* "Applied — hidden under frosting" confirmation. Sponge Flavor and
          Filling changes have no visible effect once Fully Frosted or
          Textured Buttercream covers them (see isFrostedExterior above),
          so this is the only feedback the person gets that their choice
          actually registered. Anchored to the PANEL's own left edge
          (relative on the root above), not the viewport, so it reads as
          "this panel/these controls" rather than a generic site-wide
          toast. `key={frostedNotice.id}` — not just conditional rendering
          — so firing a second one while the first is still visible (e.g.
          two quick flavor taps) restarts the slide-in instead of being
          silently swallowed by the still-mounted first instance. */}
      <AnimatePresence>
        {frostedNotice && (
          <motion.div
            key={frostedNotice.id}
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="absolute left-0 bottom-5 z-50 flex items-center gap-2 max-w-[210px] rounded-r-full bg-primary py-2 pl-3 pr-4 text-primary-foreground shadow-lg"
          >
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6, repeat: 1 }}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20"
            >
              <Check className="h-3 w-3" />
            </motion.span>
            <div className="leading-tight">
              <p className="text-[11px] font-semibold">{frostedNotice.label}</p>
              <p className="text-[9px] text-primary-foreground/75">Hidden under frosting</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode switcher header */}
      <div className="px-3 pt-2 pb-2 md:px-4 md:pt-4 md:pb-3 flex items-center gap-2">
        <button
          data-tutorial="mode-design"
          onClick={() => {
            if (isAiBusy) return;
            setModeUi('design');
          }}
          disabled={isAiBusy}
          title={isAiBusy ? 'AI is editing the cake. Switching to manual design is locked until it finishes.' : undefined}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${(isAiBusy)
              ? 'opacity-40 cursor-not-allowed bg-muted/40 text-muted-foreground'
              : modeUi === 'design'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
        >
          <Cake className="w-4 h-4" />
          Design
        </button>
        <button
          data-tutorial="mode-ai"
          onClick={() => {
            onSelectTool?.(null);
            setModeUi('ai');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${modeUi === 'ai'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
        >
          <Bot className="w-4 h-4" />
          AI
        </button>
        {/* Interior Preview toggle */}
        <Button
          variant="ghost"
          size="icon"
          data-tutorial="interior-preview"
          disabled={isAiBusy}
          className={`rounded-full shrink-0 h-9 w-9 ${(isAiBusy) ? 'opacity-40 cursor-not-allowed' : ''
            } ${config.interiorPreview ? 'text-amber-600' : 'text-muted-foreground hover:text-foreground'
            }`}
          onClick={toggleInteriorPreview}
          title={
            isAiBusy
              ? 'AI is editing the cake.'
              : config.interiorPreview ? 'Turn off Interior Preview' : 'Turn on Interior Preview'
          }
        >
          {config.interiorPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          data-tutorial="reset-cake"
          disabled={isAiBusy}
          className={`rounded-full text-muted-foreground hover:text-foreground shrink-0 h-9 w-9 ${(isAiBusy) ? 'opacity-40 cursor-not-allowed' : ''
            }`}
          onClick={() => {
            if (isAiBusy) return;
            setShowResetConfirm(true);
          }}
          title={isAiBusy ? 'AI is editing the cake.' : 'Reset Cake Design'}
          aria-label="Reset Cake Design"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-9 w-9 md:hidden"
            onClick={onClose}
            title="Close Tools"
            aria-label="Close Tools"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <Separator />

      {/* Everything below the header becomes view-only once Interior
          Preview is active — the mode switcher, Eye toggle, and Reset
          button above stay live so the person can always get back out.
          The content itself is blurred + non-interactive, with a bigger
          "Interior Preview Mode" badge overlaid on top (rather than the
          small inline banner this replaces). */}
      <div className="relative flex-1 flex flex-col min-h-0">
        <div
          className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${config.interiorPreview
            ? 'blur-[3px] opacity-30 pointer-events-none select-none'
            : ''
            }`}
          aria-hidden={config.interiorPreview}
        >
          {/* Keep the conversation mounted when switching to manual design. */}
          <div className={`flex-1 p-3 md:p-4 min-h-0 flex-col ${modeUi === 'ai' ? 'flex' : 'hidden'}`} aria-hidden={modeUi !== 'ai'}>
            <AIChatPanel
              config={config}
              onChange={onChange}
              quote={quote}
              session={aiChatSession}
              active={modeUi === 'ai'}
              onThinkingChange={setInternalAiThinking}
            />
          </div>
          {modeUi !== 'ai' && (
            <>
              {/* Scrollable content with drag-to-scroll */}
              <ScrollArea
                className="flex-1"
                onPointerDown={handlePointerDownScroll}
                onClickCapture={handleClickCapture}
              >
                {/* Tab switcher — balanced 2x2 layout, scrolls along with content */}
                <div data-tutorial="tabs-surface" className="grid grid-cols-2 gap-2 p-3 sm:px-4 sm:py-2.5 bg-muted/30 border-b border-border/40">
                  {tabs.map(({ id, label, icon: Icon, zIndex }) => (
                    <button
                      key={id}
                      data-tutorial={`tab-${id}`}
                      onClick={() => {
                        onSelectTool?.(null);
                        setTab(id);
                      }}
                      style={{ zIndex }}
                      className={`relative flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${activeTab === id
                          ? 'bg-card shadow text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                <motion.div
                  className="p-4 space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {(config.structure?.layers > 1 || isPetitsFour) && activeTab !== 'center' && activeTab !== 'edge' && (
                    <>
                      <TierDesignControl
                        structure={config.structure}
                        onChange={(newStructure) => {
                          if (newStructure.layerDesign !== config.structure?.layerDesign) {
                            handleTierDesignToggle(newStructure.layerDesign);
                          } else {
                            onChange({ ...config, structure: newStructure });
                          }
                        }}
                        onToggle={handleTierDesignToggle}
                      />
                      {showLayerStrip && (
                        <LayerTabStrip
                          layers={isPetitsFour ? 4 : config.structure.layers}
                          isPetitsFour={isPetitsFour}
                          activeLayer={activeLayer}
                          onLayerChange={setActiveLayer}
                        />
                      )}
                    </>
                  )}

                  {activeTab === 'fundamentals' && (
                    <>
                      {/* 1. Cake Structure */}
                      <div ref={registerSectionRef('structure')} data-tutorial="section-structure" className="scroll-mt-4">
                        <Collapsible
                          open={expandedSections.structure}
                          onOpenChange={() => toggleSection('structure')}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-primary/60" />
                              <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                                Cake Structure
                              </span>
                            </div>
                            {expandedSections.structure ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent data-tutorial="content-structure" className="mt-3">
                            <CakeStructureSection
                              structure={config.structure || DEFAULT_CONFIG.structure}
                              realSize={config.realSize}
                              onChange={handleStructureChange}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      <Separator className="opacity-50" />

                      {/* 2. Sponge Flavor */}
                      <div ref={registerSectionRef('sponge')} data-tutorial="section-sponge" className="scroll-mt-4">
                        <Collapsible
                          open={expandedSections.sponge}
                          onOpenChange={() => toggleSection('sponge')}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <SpongeFlavorSectionIcon className="w-4 h-4 text-primary/70" />
                              <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                                Sponge Flavor
                              </span>
                            </div>
                            {expandedSections.sponge ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent data-tutorial="content-sponge" className="mt-3">
                            <SpongeFlavorSection
                              sponge={config.sponge || DEFAULT_CONFIG.sponge}
                              structure={config.structure || DEFAULT_CONFIG.structure}
                              activeLayer={activeLayer}
                              sugarColor={fillingSugarColor}
                              onSugarColorChange={(newSugarColor) => onChange({
                                ...config,
                                sugarColorOverrides: {
                                  ...(config.sugarColorOverrides || {}),
                                  [isIndividual ? `filling-${activeLayer}` : 'filling']: newSugarColor,
                                },
                              })}
                              onChange={(newSponge) => {
                                onChange({
                                  ...config,
                                  sponge: newSponge
                                });
                                if (isFrostedExterior) notifyFrostedChange('Sponge Flavor updated');
                              }}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      <Separator className="opacity-50" />

                      {/* 3. Filling */}
                      <div ref={registerSectionRef('filling')} data-tutorial="section-filling" className="scroll-mt-4">
                        <Collapsible
                          open={expandedSections.filling}
                          onOpenChange={() => toggleSection('filling')}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <FillingSectionIcon className="w-4 h-4 text-primary/70" />
                              <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                                Filling
                              </span>
                            </div>
                            {expandedSections.filling ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent data-tutorial="content-filling" className="mt-3">
                            <FillingSection
                              filling={config.filling || DEFAULT_CONFIG.filling}
                              structure={config.structure || DEFAULT_CONFIG.structure}
                              exteriorFinish={config.exteriorFinish || DEFAULT_CONFIG.exteriorFinish}
                              interiorPreview={config.interiorPreview}
                              activeLayer={activeLayer}
                              sugarColor={fillingSugarColor}
                              onSugarColorChange={(newSugarColor) => updateContextSugarColor('filling', newSugarColor)}
                              onChange={(newFilling) => {
                                onChange({
                                  ...config,
                                  filling: newFilling
                                });
                                if (isFrostedExterior) notifyFrostedChange('Filling updated');
                              }}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      <Separator className="opacity-50" />

                      {/* 4. Exterior Finish */}
                      <div ref={registerSectionRef('exteriorFinish')} data-tutorial="section-exteriorFinish" className="scroll-mt-4">
                        <Collapsible
                          open={expandedSections.exteriorFinish}
                          onOpenChange={() => toggleSection('exteriorFinish')}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <ExteriorFinishSectionIcon className="w-4 h-4 text-primary/70" />
                              <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                                Exterior Finish
                              </span>
                            </div>
                            {expandedSections.exteriorFinish ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent data-tutorial="content-exteriorFinish" className="mt-3">
                            <ExteriorFinishSection
                              exterior={config.exteriorFinish || DEFAULT_CONFIG.exteriorFinish}
                              structure={config.structure || DEFAULT_CONFIG.structure}
                              activeLayer={activeLayer}
                              sugarColor={exteriorSugarColor}
                              onSugarColorChange={(newSugarColor) => updateContextSugarColor('exterior', newSugarColor)}
                              onChange={(newExteriorFinish) => {
                                const newStyle = newExteriorFinish?.style;
                                const newLayerStyles = newExteriorFinish?.layerStyles || [];

                                let nextConfig = {
                                  ...config,
                                  exteriorFinish: newExteriorFinish,
                                };

                                // Frosted/Textured finishes cover the filling
                                // edge, so a Mashed piping design hidden by the
                                // new finish resets to None (FillingSection's
                                // picker shows None as selected for those finishes
                                // either way — this keeps the STORED config in
                                // sync with that display). In individual design
                                // the reset must reach layerPipings too, since
                                // the picker reads the active tier's entry there
                                // rather than the piping mirror, and only tiers
                                // whose own finish hides piping are reset so
                                // Naked tiers keep their designs. The mirror
                                // follows the active tier, matching the shape
                                // FillingSection's updatePiping writes.
                                const finishHidesPiping = (style) => style === 'fullyFrosted' || style === 'texturedButtercream';
                                const currentFilling = config.filling || DEFAULT_CONFIG.filling;
                                const currentPiping = currentFilling.piping || {};
                                const currentLayerPipings = currentFilling.layerPipings || [];
                                const activeNewStyle = newLayerStyles[activeLayer] ?? newStyle;
                                const resetMirror = finishHidesPiping(activeNewStyle) && Boolean(currentPiping.tip);
                                const resetLayer = currentLayerPipings.map((layerPiping, i) => (
                                  Boolean(layerPiping?.tip) && finishHidesPiping(newLayerStyles[i] ?? newStyle)
                                ));

                                if (resetMirror || resetLayer.some(Boolean)) {
                                  nextConfig.filling = {
                                    ...currentFilling,
                                    piping: resetMirror ? { ...currentPiping, tip: null } : currentPiping,
                                    layerPipings: currentLayerPipings.map((layerPiping, i) => (
                                      resetLayer[i] ? { ...layerPiping, tip: null } : layerPiping
                                    )),
                                  };
                                }

                                onChange(nextConfig);
                              }}
                            />
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      <Separator className="opacity-50" />

                      {/* 6. Surface Treatment — Glaze / Textured Buttercream,
                      split out of Sugar Color (see cakeConfig.js's
                      nav-structure comment): a coating TECHNIQUE, not a
                      color, so it gets its own section rather than living
                      inside Sugar Color's mode picker.
                      The Surface Sugar Color picker is rendered INSIDE this
                      same Collapsible (not after it) so it collapses/expands
                      together with Surface Treatment rather than lingering
                      on screen as its own standalone block when this
                      section is closed. */}
                      <div ref={registerSectionRef('surfaceTreatment')} data-tutorial="section-surfaceTreatment" className="scroll-mt-4">
                        <Collapsible
                          open={expandedSections.surfaceTreatment}
                          onOpenChange={() => toggleSection('surfaceTreatment')}
                        >
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <SurfaceTreatmentSectionIcon className="w-4 h-4 text-primary/70" />
                              <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                                Surface Treatment
                              </span>
                            </div>
                            {expandedSections.surfaceTreatment ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </CollapsibleTrigger>
                          <CollapsibleContent data-tutorial="content-surfaceTreatment" className="mt-3">
                            {/* Wrapped in the same space-y-4 container Filling/
                          Exterior Finish use around their own SugarColorSection
                          sibling — SurfaceTreatmentSection's own space-y-4
                          only spaces ITS internal elements, it doesn't add
                          any gap after itself, so without this wrapper
                          Sugar Color sat flush against Pattern's last row
                          instead of matching the spacing every other
                          section's Sugar Color gets. */}
                            <div className="space-y-4">
                              <SurfaceTreatmentSection
                                surfaceTreatment={config.surfaceTreatment || DEFAULT_CONFIG.surfaceTreatment}
                                isIndividual={isIndividual}
                                activeLayer={activeLayer}
                                structure={config.structure}
                                onChange={(newSurfaceTreatment) => {
                                  onChange({
                                    ...config,
                                    surfaceTreatment: newSurfaceTreatment
                                  });
                                }}
                              />
                              {activeSurfaceTreatment?.mode === 'glaze' && (
                                <div data-tutorial="surface-sugar-color">
                                  {renderSugarColor('surface')}
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>
                    </>
                  )}

                  {activeTab === 'center' && (
                    <>
                      <CenterSection
                        center={config.center || DEFAULT_CONFIG.center}
                        structure={config.structure || DEFAULT_CONFIG.structure}
                        onChange={(newCenter) => onChange({ ...config, center: newCenter })}
                        activeTool={activeTool}
                        onSelectTool={onSelectTool}
                        placedItems={config.place?.items || []}
                        onPlacedItemsChange={onPlaceChange}
                        selectedItemId={selectedCenterItemId}
                        onItemSelect={onCenterItemSelect}
                        onDeleteSelectedItem={onDeleteSelectedCenterItem}
                        onTextColorModeChange={onCenterTextColorModeChange}
                        sugarColor={config.sugarColorOverrides?.center || DEFAULT_CONFIG.sugarColor}
                        onSugarColorChange={(newSugarColor) => onChange({
                          ...config,
                          sugarColorOverrides: { ...(config.sugarColorOverrides || {}), center: newSugarColor },
                        })}
                      />
                    </>
                  )}

                  {activeTab === 'edge' && (() => {
                    const currentSlot = config.edge?.mode === 'both' ? 'both' : (config.edge?.activeSlot || activeEdgeSlot || 'top');
                    const edgeContext = currentSlot === 'both' ? 'edgeBoth' : `edge${currentSlot.charAt(0).toUpperCase()}${currentSlot.slice(1)}`;
                    return (
                      <EdgeSection
                        edge={config.edge || DEFAULT_CONFIG.edge}
                        structure={config.structure || DEFAULT_CONFIG.structure}
                        onChange={(newEdge) => {
                          const topRadius = getTopTierRadiusFromConfig(config);
                          const centerDecorScale = config.center?.scale ?? 1;
                          const exteriorFinishStyle = config.exteriorFinish?.style || 'fullyFrosted';
                          const currentItems = config.place?.items || [];
                          const prunedItems = pruneItemsCollidingWithEdgeDelicates(
                            currentItems,
                            newEdge,
                            topRadius,
                            centerDecorScale,
                            exteriorFinishStyle
                          );
                          onChange({
                            ...config,
                            edge: newEdge,
                            place: {
                              ...(config.place || {}),
                              items: prunedItems,
                            },
                          });
                        }}
                        onActiveSlotChange={setActiveEdgeSlot}
                        sugarColor={config.sugarColorOverrides?.[edgeContext] || (currentSlot !== 'both' ? config.sugarColorOverrides?.edgeBoth : null) || DEFAULT_CONFIG.sugarColor}
                        onSugarColorChange={(newSugarColor) => {
                          const nextOverrides = { ...(config.sugarColorOverrides || {}), [edgeContext]: newSugarColor };
                          if (edgeContext === 'edgeBoth') {
                            nextOverrides.edgeTop = newSugarColor;
                            nextOverrides.edgeBottom = newSugarColor;
                            nextOverrides.edgeMiddle = newSugarColor;
                          }
                          onChange({ ...config, sugarColorOverrides: nextOverrides });
                        }}
                      />
                    );
                  })()}

                  {activeTab === 'side' && (
                    <>
                      <SideSection
                        side={config.side || DEFAULT_CONFIG.side}
                        structure={config.structure || DEFAULT_CONFIG.structure}
                        activeLayer={activeLayer}
                        onChange={(newSide) => onChange({ ...config, side: newSide })}
                        sugarColor={sideSugarColor}
                        onSugarColorChange={(newSugarColor) => updateContextSugarColor('side', newSugarColor)}
                      />
                    </>
                  )}

                </motion.div>
              </ScrollArea>

              {/* Footer hint (Hidden in mobile view to reclaim space) */}
              <div className="hidden md:block px-5 py-3 border-t border-border/50 bg-muted/30 select-none">
                <p className="text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1.5">
                  Drag to rotate • Scroll to zoom
                </p>
              </div>
            </>
          )}
        </div>

        {/* Interior Preview overlay — a bigger, badge-style indicator over
            the blurred/disabled content above (replaces the old small
            inline banner). Purely visual: the content beneath already has
            pointer-events disabled, so this doesn't need to catch clicks. */}
        <AnimatePresence>
          {config.interiorPreview && (
            <motion.div
              key="interior-preview-overlay"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 px-8 text-center pointer-events-none"
            >
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/30">
                <Eye className="w-8 h-8 text-white" />
              </div>
              <span className="text-lg font-heading font-bold text-foreground tracking-tight drop-shadow-[0_1px_12px_rgba(255,255,255,0.9)]">
                Interior Preview Mode
              </span>
              <p className="text-sm font-medium text-foreground/90 max-w-[240px] leading-relaxed drop-shadow-[0_1px_10px_rgba(255,255,255,0.9)]">
                Editing is paused while you look inside the cake. Turn off preview above to keep designing.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reset Confirmation Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={() => setShowResetConfirm(false)}
          >
            <motion.div
              role="dialog"
              data-tutorial="reset-dialog"
              aria-modal="true"
              aria-label="Confirm Reset Design"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-heading text-base font-bold text-foreground">Reset Cake Design?</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {Boolean(templateOriginalConfig)
                        ? "This design originated from a template. You can restore it back to the original template or perform a full blank reset."
                        : "Are you sure you want to reset your cake design? All custom selections, piping, decorations, and colors will be reverted to default."}
                    </p>
                  </div>
                </div>

                {Boolean(templateOriginalConfig) ? (
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="w-full rounded-xl py-2.5 text-xs font-semibold bg-pink-500 hover:bg-pink-600 text-white shadow-sm flex items-center justify-center gap-2"
                      onClick={() => {
                        setShowResetConfirm(false);
                        onResetToTemplate?.();
                      }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset to Template
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="w-full rounded-xl py-2.5 text-xs font-semibold"
                      onClick={() => {
                        setShowResetConfirm(false);
                        onReset?.();
                      }}
                    >
                      Blank Reset
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-tutorial="reset-cancel"
                      className="w-full rounded-xl py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-tutorial="reset-cancel"
                      className="rounded-xl px-4 text-xs font-semibold"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="rounded-xl px-4 text-xs font-semibold"
                      onClick={() => {
                        setShowResetConfirm(false);
                        onReset?.();
                      }}
                    >
                      Reset Design
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}