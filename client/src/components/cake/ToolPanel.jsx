import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Palette, Sparkles, RotateCcw, Layers, Building2, ChevronDown, ChevronUp, Eye, EyeOff, Bot, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULT_CONFIG, pruneItemsCollidingWithEdgeDelicates, getTopTierRadiusFromConfig } from '@/lib/cakeConfig';
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
  activeTool,
  onSelectTool,
  onPlaceChange,
  onPlaceUndo,
  onPlaceRedo,
  canPlaceUndo,
  canPlaceRedo,
  quote,
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
  onDragHandlePointerDown,
  hideScrollbar = false,
}) {
  const [internalModeUi, setInternalModeUi] = useState('design'); // 'design' | 'ai'
  const modeUi = controlledModeUi !== undefined ? controlledModeUi : internalModeUi;
  const setModeUi = (val) => {
    const next = typeof val === 'function' ? val(modeUi) : val;
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

  const isIndividual = config.structure?.layerDesign === 'individual' && config.structure?.layers > 1;

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
    const maxLayer = (config.structure?.layers || 1) - 1;
    if (activeLayer > maxLayer) {
      setActiveLayer(0);
    }
  }, [config.structure?.layers, activeLayer]);

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
  const showLayerStrip = isIndividual && ['fundamentals', 'side', 'center', 'edge'].includes(tab);

  const toggleInteriorPreview = () => {
    onChange({ ...config, interiorPreview: !config.interiorPreview });
  };

  const handleTierDesignToggle = (newLayerDesign) => {
    const targetDesign = newLayerDesign || (config.structure?.layerDesign === 'individual' ? 'uniform' : 'individual');
    const syncedConfig = syncTierDesignOnToggle(config, targetDesign, activeLayer);
    onChange(syncedConfig);
  };

  const handleStructureChange = (newStructure, newRealSize) => {
    const tierCountChanged = newStructure.layers !== config.structure?.layers;
    if (!tierCountChanged) {
      onChange({ ...config, structure: newStructure, realSize: newRealSize });
      return;
    }

    const centerItems = (config.place?.items || []).filter(
      (item) => !(typeof item.type === 'string' && item.type.startsWith('center-'))
    );
    const legacyPlacedItems = (config.placedItems || []).filter(
      (item) => !(typeof item.type === 'string' && item.type.startsWith('center-'))
    );

    const baseConfig = {
      ...config,
      structure: newStructure,
      realSize: newRealSize,
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

  return (
    <div className="cn-designer-tool-panel relative flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden select-none">
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
      <div className="px-4 pt-4 pb-3 flex items-center gap-2">
        <button
          onClick={() => setModeUi('design')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            modeUi === 'design'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Cake className="w-4 h-4" />
          Design
        </button>
        <button
          onClick={() => {
            onSelectTool?.(null);
            setModeUi('ai');
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
            modeUi === 'ai'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Bot className="w-4 h-4" />
          AI
        </button>
        {/* Interior Preview toggle — this control didn't exist before;
            toggleInteriorPreview was defined in the previous ToolPanel but
            never actually wired to anything clickable. */}
        <Button
          variant="ghost"
          size="icon"
          className={`rounded-full shrink-0 h-9 w-9 ${
            config.interiorPreview ? 'text-amber-600' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={toggleInteriorPreview}
          title={config.interiorPreview ? 'Turn off Interior Preview' : 'Turn on Interior Preview'}
        >
          {config.interiorPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-9 w-9"
          onClick={() => setShowResetConfirm(true)}
          title="Reset Cake Design"
          aria-label="Reset Cake Design"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
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
          className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${
            config.interiorPreview
              ? 'blur-[3px] opacity-30 pointer-events-none select-none'
              : ''
          }`}
          aria-hidden={config.interiorPreview}
        >
          {modeUi === 'ai' ? (
            <div className="flex-1 p-4 min-h-0 flex flex-col">
              <AIChatPanel config={config} onChange={onChange} quote={quote} />
            </div>
          ) : (
            <>
{/* Tab switcher — balanced 2x2 layout for the four remaining sections */}
              <div className="grid grid-cols-2 gap-2 px-4 py-2 bg-muted/30">
                {TABS.map(({ id, label, icon: Icon, zIndex }) => (
                  <button
                    key={id}
                    onClick={() => {
                      onSelectTool?.(null);
                      setTab(id);
                    }}
                    style={{ zIndex }}
                    className={`relative flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      tab === id
                        ? 'bg-card shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Scrollable content with drag-to-scroll */}
              <ScrollArea
                className="flex-1"
                hideScrollbar={hideScrollbar}
                onPointerDown={handlePointerDownScroll}
                onClickCapture={handleClickCapture}
              >
            <motion.div
              className="p-4 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {config.structure?.layers > 1 && tab !== 'center' && tab !== 'edge' && (
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
                      layers={config.structure.layers}
                      activeLayer={activeLayer}
                      onLayerChange={setActiveLayer}
                    />
                  )}
                </>
              )}

              {tab === 'fundamentals' && (
                <>
                  {/* 1. Cake Structure */}
                  <div ref={registerSectionRef('structure')} className="scroll-mt-4">
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
                    <CollapsibleContent className="mt-3">
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
                  <div ref={registerSectionRef('sponge')} className="scroll-mt-4">
                  <Collapsible
                    open={expandedSections.sponge}
                    onOpenChange={() => toggleSection('sponge')}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-primary/60" />
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
                    <CollapsibleContent className="mt-3">
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
                  <div ref={registerSectionRef('filling')} className="scroll-mt-4">
                  <Collapsible
                    open={expandedSections.filling}
                    onOpenChange={() => toggleSection('filling')}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary/60" />
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
                    <CollapsibleContent className="mt-3">
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
                  <div ref={registerSectionRef('exteriorFinish')} className="scroll-mt-4">
                  <Collapsible
                    open={expandedSections.exteriorFinish}
                    onOpenChange={() => toggleSection('exteriorFinish')}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary/60" />
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
                    <CollapsibleContent className="mt-3">
                      <ExteriorFinishSection
                        exterior={config.exteriorFinish || DEFAULT_CONFIG.exteriorFinish}
                        structure={config.structure || DEFAULT_CONFIG.structure}
                        activeLayer={activeLayer}
                        sugarColor={exteriorSugarColor}
                        onSugarColorChange={(newSugarColor) => updateContextSugarColor('exterior', newSugarColor)}
                        onChange={(newExteriorFinish) => {
                          const newStyle = newExteriorFinish?.style;
                          const newLayerStyles = newExteriorFinish?.layerStyles || [];
                          const isFrostedOrTextured = newStyle === 'fullyFrosted' || newStyle === 'texturedButtercream' || newLayerStyles.some(s => s === 'fullyFrosted' || s === 'texturedButtercream');

                          let nextConfig = {
                            ...config,
                            exteriorFinish: newExteriorFinish,
                          };

                          const currentTip = config.filling?.piping?.tip;
                          const hasMashedPiping = currentTip === 'mashedCircles' || currentTip === 'mashedSwirls' || Boolean(currentTip);

                          if (isFrostedOrTextured && hasMashedPiping) {
                            nextConfig.filling = {
                              ...config.filling,
                              piping: {
                                ...config.filling?.piping,
                                tip: null,
                              },
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
                  <div ref={registerSectionRef('surfaceTreatment')} className="scroll-mt-4">
                  <Collapsible
                    open={expandedSections.surfaceTreatment}
                    onOpenChange={() => toggleSection('surfaceTreatment')}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary/60" />
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
                    <CollapsibleContent className="mt-3">
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
                          onChange={(newSurfaceTreatment) => {
                            onChange({
                              ...config,
                              surfaceTreatment: newSurfaceTreatment
                            });
                          }}
                        />
                        {((isIndividual
                          ? (config.surfaceTreatment?.layerTreatments?.[activeLayer]?.mode || config.surfaceTreatment?.mode)
                          : config.surfaceTreatment?.mode) === 'glaze') && renderSugarColor('surface')}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                  </div>
                </>
              )}

              {tab === 'center' && (
                <>
                  <CenterSection
                    center={config.center || DEFAULT_CONFIG.center}
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

              {tab === 'edge' && (() => {
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
                    sugarColor={config.sugarColorOverrides?.[edgeContext] || DEFAULT_CONFIG.sugarColor}
                    onSugarColorChange={(newSugarColor) => {
                      const nextOverrides = { ...(config.sugarColorOverrides || {}), [edgeContext]: newSugarColor };
                      // "All" (2-tier cakes) reuses this same edgeBoth
                      // context for Top+Bottom's color, exactly as Both
                      // always has — but All also fills the Middle seam
                      // (see EdgeSection.jsx), so mirror the same color
                      // choice into edgeMiddle too, keeping it visually in
                      // sync without the person having to set it twice.
                      // Harmless no-op on a 1-tier cake, or whenever Top or
                      // Bottom (not Both) is the one being edited — Middle
                      // only ever renders once edge.middle.piping.tip is
                      // set, which only Middle's own tab or All's tip
                      // mirroring ever does.
                      if (edgeContext === 'edgeBoth') nextOverrides.edgeMiddle = newSugarColor;
                      onChange({ ...config, sugarColorOverrides: nextOverrides });
                    }}
                  />
                );
              })()}

              {tab === 'side' && (
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

          {/* Footer hint & bottom drag handle */}
          <div
            onPointerDown={onDragHandlePointerDown}
            className={`px-5 py-3 border-t border-border/50 bg-muted/30 select-none ${
              onDragHandlePointerDown ? 'cursor-grab active:cursor-grabbing touch-none' : ''
            }`}
          >
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
              aria-modal="true"
              aria-label="Confirm Reset Design"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading text-base font-bold text-foreground">Reset Cake Design?</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Are you sure you want to reset your cake design? All custom selections, piping, decorations, and colors will be reverted to default.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}