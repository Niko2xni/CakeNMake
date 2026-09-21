import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Cake, Palette, Sparkles, RotateCcw, Layers, Building2, Wand2, ChevronDown, ChevronUp, Eye, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DEFAULT_CONFIG } from '@/lib/cakeConfig';
import { FLAVORS } from '@/lib/cakeFlavors';
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
  const effectiveExteriorStyle = activeExteriorStyle || 'naked';
  const exteriorCoversInterior = effectiveExteriorStyle !== 'naked';

  const setCakeView = (showInterior) => {
    if (Boolean(config.interiorPreview) === showInterior) return;
    onChange({ ...config, interiorPreview: showInterior });
  };

  const toggleSection = (section) => {
    const willOpen = !expandedSections[section];
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));

    if (!willOpen) return;

    if ((section === 'sponge' || section === 'filling') && exteriorCoversInterior) {
      setCakeView(true);
    } else if (section === 'structure' || section === 'exteriorFinish' || section === 'surfaceTreatment') {
      setCakeView(false);
    }
  };

  // The shared layer strip (extracted from what used to be duplicated
  // inline markup in Sponge/Filling/Exterior Finish) only actually
  // affects something on the Fundamentals tab right now — Surface/Center/
  // Edge/Side aren't wired to per-tier indirection yet (flagged as a known
  // gap, see CAKE_SETS_REWORK_SPEC.md §11), so it's hidden on those tabs
  // rather than showing a control that wouldn't do anything there.
  const showLayerStrip = isIndividual && tab === 'fundamentals';

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
  const activeSpongeFlavorId = isIndividual
    ? (config.sponge?.layerFlavors || [])[activeLayer] || 'vanilla'
    : config.sponge?.flavor || 'vanilla';
  const activeFillingFlavorId = isIndividual
    ? (config.filling?.layerFlavors || [])[activeLayer] || 'vanilla'
    : config.filling?.flavor || 'vanilla';
  const spongeSummary = `${FLAVORS[activeSpongeFlavorId]?.name || 'Vanilla'} · inside the cake`;
  const fillingSummary = config.filling?.enabled
    ? `${FLAVORS[activeFillingFlavorId]?.name || 'Vanilla'} · ${config.filling.layers || 1} filling ${(config.filling.layers || 1) === 1 ? 'layer' : 'layers'}`
    : 'No filling selected';

  return (
    <div className="flex flex-col h-full bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
      {/* Mode switcher header */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center gap-2">
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
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-foreground shrink-0 h-11 w-11"
            onClick={onReset}
            title="Reset"
            aria-label="Reset design"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <span id="cake-view-label" className="shrink-0 text-xs font-semibold text-muted-foreground">
            View
          </span>
          <div
            className="grid flex-1 grid-cols-2 overflow-hidden rounded-xl border border-border/60 bg-muted/70"
            role="group"
            aria-labelledby="cake-view-label"
          >
            <button
              type="button"
              aria-pressed={!config.interiorPreview}
              onClick={() => setCakeView(false)}
              className={`min-h-11 px-3 text-sm font-semibold transition-colors duration-200 ${
                !config.interiorPreview
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
              }`}
            >
              Outside
            </button>
            <button
              type="button"
              aria-pressed={Boolean(config.interiorPreview)}
              onClick={() => setCakeView(true)}
              className={`min-h-11 border-l border-border/60 px-3 text-sm font-semibold transition-colors duration-200 ${
                config.interiorPreview
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/70 hover:text-foreground'
              }`}
            >
              Inside
            </button>
          </div>
        </div>
      </div>

      <Separator />

      <div className="relative flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col min-h-0">
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
                      if (id !== 'fundamentals') setCakeView(false);
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
              {config.interiorPreview && (
                <div
                  className="flex items-center gap-2 rounded-lg border border-amber-300/70 bg-amber-50 px-3 py-2 text-amber-950"
                  role="status"
                  aria-live="polite"
                >
                  <Eye className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
                  <p className="text-[11px] leading-snug">
                    <span className="font-semibold">Inside view:</span> exterior hidden for editing.
                  </p>
                </div>
              )}

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

                  {/* 2. Sponge Flavor — remains editable with every exterior
                      finish. Covered cakes switch to the inside view when
                      this section is opened so changes stay visible. */}
                  <Collapsible
                    open={expandedSections.sponge}
                    onOpenChange={() => toggleSection('sponge')}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full min-h-11">
                      <div className="flex items-center gap-2">
                        <Cake className="w-4 h-4 text-primary/60" />
                        <div className="text-left">
                          <span className="block text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                            Sponge Flavor
                          </span>
                          <span className="block mt-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                            {expandedSections.sponge ? 'Flavor and color inside the cake' : spongeSummary}
                          </span>
                        </div>
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
                        onChange={(newSponge) => {
                          onChange({
                            ...config,
                            sponge: newSponge,
                            interiorPreview: exteriorCoversInterior ? true : config.interiorPreview,
                          });
                        }}
                      />
                    </CollapsibleContent>
                  </Collapsible>

                  <Separator className="opacity-50" />

                  {/* 3. Filling — also editable regardless of finish. */}
                  <Collapsible
                    open={expandedSections.filling}
                    onOpenChange={() => toggleSection('filling')}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full min-h-11">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary/60" />
                        <div className="text-left">
                          <span className="block text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                            Filling
                          </span>
                          <span className="block mt-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                            {expandedSections.filling ? 'Filling between the sponge layers' : fillingSummary}
                          </span>
                        </div>
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
                            filling: newFilling,
                            interiorPreview: exteriorCoversInterior ? true : config.interiorPreview,
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
                    <CollapsibleTrigger className="flex items-center justify-between w-full min-h-11">
                      <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-primary/60" />
                        <div className="text-left">
                          <span className="block text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
                            Exterior Finish
                          </span>
                          <span className="block mt-0.5 text-[10px] font-normal normal-case tracking-normal text-muted-foreground">
                            Coating visible on the outside
                          </span>
                        </div>
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
                            exteriorFinish: newExteriorFinish,
                            interiorPreview: false,
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

      </div>
    </div>
  );
}
