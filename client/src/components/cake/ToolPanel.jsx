import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, Palette, Sparkles, RotateCcw, Layers, Building2, Wand2, ChevronDown, ChevronUp, Eye, EyeOff, Bot, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import CakeStructureSection from './sections/CakeStructureSection';
import SpongeFlavorSection from './sections/SpongeFlavorSection';
import FillingSection from './sections/FillingSection';
import ExteriorFinishSection from './sections/ExteriorFinishSection';
import SugarColorSection from './sections/SugarColorSection';
import SurfaceTreatmentSection from './sections/SurfaceTreatmentSection';
import CenterSection from './sections/CenterSection';
import EdgeSection from './sections/EdgeSection';
import SideSection from './sections/SideSection';
import PlaceSection from './sections/PlaceSection';
import LayerTabStrip from './sections/LayerTabStrip';
import AIChatPanel from './AIChatPanel';

// Nav rework — see CAKE_SETS_REWORK_SPEC.md §2. Two rows of three
// (Option 1, approved) rather than one cramped row of six.
const TABS = [
  { id: 'fundamentals', label: 'Fundamentals', icon: Building2 },
  { id: 'center', label: 'Center', icon: Cake },
  { id: 'edge', label: 'Edge', icon: Layers },
  { id: 'side', label: 'Side', icon: Sparkles },
  { id: 'place', label: 'Place', icon: Wand2 },
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
}) {
  const [modeUi, setModeUi] = useState('design'); // 'design' | 'ai'
  const [tab, setTab] = useState('fundamentals');
  const [activeLayer, setActiveLayer] = useState(0);
  const [activeEdgeSlot, setActiveEdgeSlot] = useState('top');

  const [expandedSections, setExpandedSections] = useState({
    structure: true,
    sponge: true,
    filling: true,
    exteriorFinish: true,
    surfaceTreatment: true,
  });

  const isIndividual = config.structure?.layerDesign === 'individual' && config.structure?.layers > 1;
  const activeExteriorStyle = isIndividual
    ? (config.exteriorFinish?.layerStyles || [])[activeLayer]
    : config.exteriorFinish?.style;

  // Sponge Flavor AND Filling both stay locked shut until Exterior
  // Finish's style is 'naked' — falls back to 'naked' (DEFAULT_CONFIG's
  // own default) when nothing's been chosen yet, so both sections start
  // open on a fresh cake rather than locked before the person has
  // touched anything. Both sections share this same gate (rather than
  // each getting its own flag) since the rule — and its Exterior Finish
  // dependency — is identical for the two of them.
  const effectiveExteriorStyle = activeExteriorStyle || 'naked';
  const nakedGatedLocked = effectiveExteriorStyle !== 'naked';
  const NAKED_GATED_SECTIONS = ['sponge', 'filling'];

  const toggleSection = (section) => {
    // Sponge Flavor and Filling can't be toggled open (or closed, but
    // they're already closed) while locked — Naked is the only Exterior
    // Finish style that unlocks them, see nakedGatedLocked above.
    if (NAKED_GATED_SECTIONS.includes(section) && nakedGatedLocked) return;
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // If Exterior Finish moves off Naked while Sponge Flavor and/or
  // Filling happen to be open, force them closed rather than leaving
  // stale expanded state that toggleSection's guard above would then
  // refuse to ever open again from.
  useEffect(() => {
    if (nakedGatedLocked) {
      setExpandedSections(prev => (
        (prev.sponge || prev.filling)
          ? { ...prev, sponge: false, filling: false }
          : prev
      ));
    }
  }, [nakedGatedLocked]);

  // The shared layer strip (extracted from what used to be duplicated
  // inline markup in Sponge/Filling/Exterior Finish) only actually
  // affects something on the Fundamentals tab right now — Surface/Center/
  // Edge/Side aren't wired to per-tier indirection yet (flagged as a known
  // gap, see CAKE_SETS_REWORK_SPEC.md §11), so it's hidden on those tabs
  // rather than showing a control that wouldn't do anything there.
  const showLayerStrip = isIndividual && tab === 'fundamentals';

  const toggleInteriorPreview = () => {
    onChange({ ...config, interiorPreview: !config.interiorPreview });
  };

  // Surface Treatment (Glaze) has no flavor of its own to derive a Default
  // color from — unlike Filling/Exterior Finish, which DO have their own
  // flavor and so show a read-only "From Frosting Flavor" swatch here.
  // Glaze is in the same position as Center/Edge/Side (no flavor of their
  // own either), so its Default mode gets the same pickable Flavor Color
  // grid those three use (showDefaultColorPicker) instead of quietly
  // inheriting Exterior Finish's flavor.
  const renderSugarColor = (context) => (
    <SugarColorSection
      sugarColor={config.sugarColorOverrides?.[context] || DEFAULT_CONFIG.sugarColor}
      onChange={(newSugarColor) => onChange({
        ...config,
        sugarColorOverrides: {
          ...(config.sugarColorOverrides || {}),
          [context]: newSugarColor,
        },
      })}
      showDefaultColorPicker
    />
  );
  const fillingSugarColor = config.sugarColorOverrides?.[isIndividual ? `filling-${activeLayer}` : 'filling'] || DEFAULT_CONFIG.sugarColor;
  const exteriorSugarColor = config.sugarColorOverrides?.[isIndividual ? `exterior-${activeLayer}` : 'exterior'] || DEFAULT_CONFIG.sugarColor;

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
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
          onClick={onReset}
          title="Reset"
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
              <AIChatPanel />
            </div>
          ) : (
            <>
              {/* Tab switcher — two rows of three */}
              <div className="grid grid-cols-3 gap-1 px-4 py-2 bg-muted/30">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => {
                      if (id !== 'place') {
                        onSelectTool?.(null);
                      }
                      setTab(id);
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
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

              {/* Shared layer strip — rendered ONCE here, not duplicated inside
                  every section that needs it (see LayerTabStrip.jsx) */}
              {showLayerStrip && (
                <div className="px-4 pt-3">
                  <LayerTabStrip
                    layers={config.structure.layers}
                    activeLayer={activeLayer}
                    onLayerChange={setActiveLayer}
                  />
                </div>
              )}

              {/* Scrollable content */}
              <ScrollArea className="flex-1">
            <motion.div
              className="p-4 space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {tab === 'fundamentals' && (
                <>
                  {/* 1. Cake Structure */}
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
                        onChange={(newStructure, newRealSize) => {
                          onChange({
                            ...config,
                            structure: newStructure,
                            realSize: newRealSize
                          });
                        }}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator className="opacity-50" />

                  {/* 2. Sponge Flavor — locked shut (and locked from
                      opening) until Exterior Finish's style is Naked, see
                      nakedGatedLocked above. Trigger is a real disabled
                      <button>, not just a styling change, so it can't be
                      opened via keyboard/click while locked either. */}
                  <Collapsible
                    open={expandedSections.sponge && !nakedGatedLocked}
                    onOpenChange={() => toggleSection('sponge')}
                  >
                    <CollapsibleTrigger
                      disabled={nakedGatedLocked}
                      className={`flex items-center justify-between w-full ${
                        nakedGatedLocked ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-primary/60" />
                        <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                          Sponge Flavor
                        </span>
                      </div>
                      {nakedGatedLocked ? (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : expandedSections.sponge ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    {nakedGatedLocked && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Set Exterior Finish to Naked to unlock Sponge Flavor.
                      </p>
                    )}
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
                        }}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator className="opacity-50" />

                  {/* 3. Filling — locked shut (and locked from opening)
                      until Exterior Finish's style is Naked, same
                      nakedGatedLocked gate as Sponge Flavor above. */}
                  <Collapsible
                    open={expandedSections.filling && !nakedGatedLocked}
                    onOpenChange={() => toggleSection('filling')}
                  >
                    <CollapsibleTrigger
                      disabled={nakedGatedLocked}
                      className={`flex items-center justify-between w-full ${
                        nakedGatedLocked ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary/60" />
                        <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                          Filling
                        </span>
                      </div>
                      {nakedGatedLocked ? (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      ) : expandedSections.filling ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </CollapsibleTrigger>
                    {nakedGatedLocked && (
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Set Exterior Finish to Naked to unlock Filling.
                      </p>
                    )}
                    <CollapsibleContent className="mt-3">
                      <FillingSection
                        filling={config.filling || DEFAULT_CONFIG.filling}
                        structure={config.structure || DEFAULT_CONFIG.structure}
                        exteriorFinish={config.exteriorFinish || DEFAULT_CONFIG.exteriorFinish}
                        interiorPreview={config.interiorPreview}
                        activeLayer={activeLayer}
                        sugarColor={fillingSugarColor}
                        onSugarColorChange={(newSugarColor) => onChange({
                          ...config,
                          sugarColorOverrides: {
                            ...(config.sugarColorOverrides || {}),
                            [isIndividual ? `filling-${activeLayer}` : 'filling']: newSugarColor,
                          },
                        })}
                        onChange={(newFilling) => {
                          onChange({
                            ...config,
                            filling: newFilling
                          });
                        }}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator className="opacity-50" />

                  {/* 4. Exterior Finish */}
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
                        onSugarColorChange={(newSugarColor) => onChange({
                          ...config,
                          sugarColorOverrides: {
                            ...(config.sugarColorOverrides || {}),
                            [isIndividual ? `exterior-${activeLayer}` : 'exterior']: newSugarColor,
                          },
                        })}
                        onChange={(newExteriorFinish) => {
                          onChange({
                            ...config,
                            exteriorFinish: newExteriorFinish
                          });
                        }}
                      />
                    </CollapsibleContent>
                  </Collapsible>

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
                      <SurfaceTreatmentSection
                        surfaceTreatment={config.surfaceTreatment || DEFAULT_CONFIG.surfaceTreatment}
                        onChange={(newSurfaceTreatment) => {
                          onChange({
                            ...config,
                            surfaceTreatment: newSurfaceTreatment
                          });
                        }}
                      />
                      {config.surfaceTreatment?.mode === 'glaze' && renderSugarColor('surface')}
                    </CollapsibleContent>
                  </Collapsible>
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
                    sugarColor={config.sugarColorOverrides?.center || DEFAULT_CONFIG.sugarColor}
                    onSugarColorChange={(newSugarColor) => onChange({
                      ...config,
                      sugarColorOverrides: { ...(config.sugarColorOverrides || {}), center: newSugarColor },
                    })}
                  />
                </>
              )}

              {tab === 'edge' && (
                <>
                  <EdgeSection
                    edge={config.edge || DEFAULT_CONFIG.edge}
                    onChange={(newEdge) => onChange({ ...config, edge: newEdge })}
                    layerCount={config.structure?.layers || 1}
                    onActiveSlotChange={setActiveEdgeSlot}
                    sugarColor={config.sugarColorOverrides?.[config.edge?.mode === 'both' ? 'edgeBoth' : `edge${activeEdgeSlot[0].toUpperCase()}${activeEdgeSlot.slice(1)}`] || DEFAULT_CONFIG.sugarColor}
                    onSugarColorChange={(newSugarColor) => {
                      const context = config.edge?.mode === 'both' ? 'edgeBoth' : `edge${activeEdgeSlot[0].toUpperCase()}${activeEdgeSlot.slice(1)}`;
                      onChange({ ...config, sugarColorOverrides: { ...(config.sugarColorOverrides || {}), [context]: newSugarColor } });
                    }}
                  />
                </>
              )}

              {tab === 'side' && (
                <>
                  <SideSection
                    side={config.side || DEFAULT_CONFIG.side}
                    onChange={(newSide) => onChange({ ...config, side: newSide })}
                    sugarColor={config.sugarColorOverrides?.side || DEFAULT_CONFIG.sugarColor}
                    onSugarColorChange={(newSugarColor) => onChange({
                      ...config,
                      sugarColorOverrides: { ...(config.sugarColorOverrides || {}), side: newSugarColor },
                    })}
                  />
                </>
              )}

              {tab === 'place' && (
                <PlaceSection
                  place={config.place || DEFAULT_CONFIG.place}
                  onChange={(newPlace) => {
                    if (onPlaceChange) {
                      onPlaceChange(newPlace.items);
                    } else {
                      onChange({ ...config, place: newPlace });
                    }
                  }}
                  onUndo={onPlaceUndo}
                  onRedo={onPlaceRedo}
                  canUndo={canPlaceUndo}
                  canRedo={canPlaceRedo}
                  activeTool={activeTool}
                  onSelectTool={onSelectTool}
                  topRadius={config.structure?.size === 'small' ? 3 : 4}
                />
              )}
            </motion.div>
          </ScrollArea>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-border/50 bg-muted/30">
            <p className="text-[11px] text-muted-foreground text-center">
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
    </div>
  );
}