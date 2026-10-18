import React from 'react';
import {
  RotateCw,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MousePointer2,
  Link,
  Unlink,
  Trash2,
  X,
} from 'lucide-react';
import OptionButtonContent from '../OptionButtonContent';
import {
  CENTER_PLACEABLE_DESIGNS,
  CENTER_VARIATIONS,
  getCenterVariations,
  BUTTERCREAM_LETTERS,
  BUTTERCREAM_LETTERS_UPPER,
  BUTTERCREAM_LETTERS_LOWER,
  SUGAR_COLORS,
  getCenterItemLimit,
  getCenterItemCount,
  isCenterItemAtLimit,
  isPetitsFourStructure,
} from '@/lib/cakeConfig';
import DecorationPreview from './DecorationPreview';
import SugarColorSection from './SugarColorSection';

// A letter's toolId is 'center-letter{CHAR}-default' -- same format as any
// other Center design, just distinguished by the 'letter' designId prefix
// so Decorations' and Buttercream Text's own "placed"/"Clear All" counts
// can each filter to their own items despite sharing one placedItems
// bucket and one collision system.
function isLetterToolType(type) {
  return typeof type === 'string' && type.startsWith('center-letter');
}

// Shared by Decorations and Buttercream Text -- both arm a 'center-'
// tool the same way (see armDecorationTool/armLetterTool below) and so
// both get the exact same preview + spin/tilt controls for free. Kept as
// one component instead of duplicated JSX so the two tabs can't drift out
// of sync with each other.
function ArmedItemControls({
  armedDesign,
  previewColor,
  previewColorId,
  armedRotation,
  armedTilt,
  armedRoll,
  setArmedRotation,
  setArmedTilt,
  setArmedRoll,
  onCancel,
  onDelete,
  canDelete = false,
  isControlsInteractionStep = false,
  onControlsInteraction,
}) {
  if (!armedDesign) return null;

  const handleSetRotation = (val) => {
    onControlsInteraction?.();
    setArmedRotation(val);
  };
  const handleSetTilt = (val) => {
    onControlsInteraction?.();
    setArmedTilt(val);
  };
  const handleSetRoll = (val) => {
    onControlsInteraction?.();
    setArmedRoll(val);
  };

  return (
    <div data-tutorial="center-item-controls" className="flex flex-col md:flex-col gap-2.5">
      {/* On mobile: row layout (side-by-side). On desktop: stacked (md:flex-col) */}
      <div className="flex flex-row md:flex-col gap-2.5 items-stretch">
        {/* Left on mobile (Preview + Cancel/Delete) / Top on desktop */}
        <div className="w-[42%] md:w-full flex flex-col justify-between shrink-0">
          <div className="flex-1 min-h-[120px] md:min-h-0 flex items-center justify-center">
            <DecorationPreview
              designId={armedDesign.designId}
              orientation={armedDesign.orientation}
              color={previewColor}
              colorId={previewColorId}
              rotationY={(armedRotation * Math.PI) / 180}
              rotationX={(armedTilt * Math.PI) / 180}
              rotationZ={(armedRoll * Math.PI) / 180}
              className="w-full h-full min-h-[120px] md:h-32 rounded-xl bg-muted/40 overflow-hidden"
            />
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isControlsInteractionStep}
              title="Cancel selection"
              className={`flex-1 h-8 px-2 rounded-lg border border-border/80 bg-muted/60 hover:bg-muted text-xs font-semibold text-foreground flex items-center justify-center gap-1 transition-colors ${
                isControlsInteractionStep ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={!canDelete || isControlsInteractionStep}
              title={canDelete ? "Delete item" : "No placed item to delete"}
              className={`flex-1 h-8 px-2 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 text-xs font-semibold text-destructive disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1 transition-colors ${
                isControlsInteractionStep ? 'pointer-events-none' : ''
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* Right on mobile (Rotate and Tilts control box) / Bottom on desktop */}
        <div className="w-[58%] md:w-full rounded-xl bg-muted/60 px-2.5 sm:px-3 py-2 sm:py-2.5 space-y-2 sm:space-y-3 flex flex-col justify-center">
          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Rotate</span>
              <span className="text-[11px] sm:text-xs font-semibold text-foreground">{Math.round(armedRotation)}°</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSetRotation(armedRotation - 15)}
                disabled={!armedDesign}
                title="Rotate left 15°"
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full border border-transparent bg-muted text-foreground hover:border-primary hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
              >
                <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={armedRotation}
                onChange={(e) => handleSetRotation(Number(e.target.value))}
                disabled={!armedDesign}
                className="flex-1 accent-primary disabled:opacity-40 h-1.5"
                aria-label="Rotation angle"
              />
              <button
                type="button"
                onClick={() => handleSetRotation(armedRotation + 15)}
                disabled={!armedDesign}
                title="Rotate right 15°"
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full border border-transparent bg-muted text-foreground hover:border-primary hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
              >
                <RotateCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Left to Right</span>
              <span className="text-[11px] sm:text-xs font-semibold text-foreground">{Math.round(armedRoll)}°</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSetRoll(armedRoll - 15)}
                disabled={!armedDesign}
                title="Tilt left 15°"
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full border border-transparent bg-muted text-foreground hover:border-primary hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
              >
                <ChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={armedRoll}
                onChange={(e) => handleSetRoll(Number(e.target.value))}
                disabled={!armedDesign}
                className="flex-1 accent-primary disabled:opacity-40 h-1.5"
                aria-label="Left/right tilt angle"
              />
              <button
                type="button"
                onClick={() => handleSetRoll(armedRoll + 15)}
                disabled={!armedDesign}
                title="Tilt right 15°"
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full border border-transparent bg-muted text-foreground hover:border-primary hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
              >
                <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-medium">Up to Down</span>
              <span className="text-[11px] sm:text-xs font-semibold text-foreground">{Math.round(armedTilt)}°</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => handleSetTilt(armedTilt - 15)}
                disabled={!armedDesign}
                title="Tilt down 15°"
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full border border-transparent bg-muted text-foreground hover:border-primary hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
              >
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
              <input
                type="range"
                min={0}
                max={360}
                step={1}
                value={armedTilt}
                onChange={(e) => handleSetTilt(Number(e.target.value))}
                disabled={!armedDesign}
                className="flex-1 accent-primary disabled:opacity-40 h-1.5"
                aria-label="Tilt angle"
              />
              <button
                type="button"
                onClick={() => handleSetTilt(armedTilt + 15)}
                disabled={!armedDesign}
                title="Tilt up 15°"
                className="w-6 h-6 sm:w-7 sm:h-7 shrink-0 rounded-full border border-transparent bg-muted text-foreground hover:border-primary hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
              >
                <ChevronUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LetterButton({ letter, isArmed, isArmedTool = false, disabled = false, onSelect, onContextMenu }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(letter.toolId)}
      onContextMenu={onContextMenu}
      title={isArmedTool ? `Remove ${letter.label}` : letter.label}
      className={`aspect-square rounded-lg text-sm font-bold transition-all duration-150 border-2 ${disabled
          ? 'opacity-40 cursor-not-allowed bg-muted border-transparent text-muted-foreground'
          : isArmed
            ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.05]'
            : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
        }`}
    >
      {/* armLetterTool deselects the armed tool when its own letter is
          clicked again, so an ARMED letter swaps its glyph for an X. A
          letter merely highlighted because its placed item is selected on
          the cake still re-arms on click (nothing to deselect), so it
          keeps showing the glyph. */}
      {isArmedTool ? <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : letter.label}
    </button>
  );
}

// Sugar Color renders contextually once a letter design is active in that
// group — not before the whole grid, and not if no design is selected.
// The color block is inserted after the LAST button of the active letter's
// own row (every LETTER_ROW_SIZE-th button), appearing directly below the row.
const LETTER_ROW_SIZE = 6;

function LetterGroup({
  label,
  letters,
  activeLetterToolId,
  armedToolId = null,
  disabled = false,
  onSelect,
  onContextMenu,
  textColorMode,
  onToggleTextColorMode,
  sugarColor,
  onSugarColorChange,
}) {
  const activeIndex = letters.findIndex((l) => l.toolId === activeLetterToolId);
  let colorBlockInserted = false;

  return (
    <div>
      <span className="text-xs font-semibold text-muted-foreground mb-1.5 block">{label}</span>
      <div className="grid grid-cols-6 gap-1.5">
        {letters.map((letter, i) => {
          const isArmed = activeLetterToolId === letter.toolId;
          const isRowBoundary = (i + 1) % LETTER_ROW_SIZE === 0 || i === letters.length - 1;
          const showColorHere = activeIndex !== -1 && !colorBlockInserted && i >= activeIndex && isRowBoundary;
          if (showColorHere) colorBlockInserted = true;

          return (
            <React.Fragment key={letter.toolId}>
              <LetterButton
                letter={letter}
                isArmed={isArmed}
                isArmedTool={armedToolId === letter.toolId}
                disabled={disabled}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
              />
              {showColorHere && (
                <div className="col-span-6 col-span-full w-full pt-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Text Color</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">
                        {textColorMode === 'uniform' ? 'All text share the same color' : 'Each text has its own color'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleTextColorMode}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold border-2 transition-all duration-200 ${textColorMode === 'individual'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                        }`}
                    >
                      {textColorMode === 'individual'
                        ? <><Unlink className="w-3 h-3" /> Individual</>
                        : <><Link className="w-3 h-3" /> Uniform</>}
                    </button>
                  </div>
                  <SugarColorSection
                    sugarColor={sugarColor}
                    onChange={onSugarColorChange}
                    showDefaultColorPicker
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// NOTE: single whole-top setting for now, not per-tier — see SurfaceSection
// for the same caveat. Center's "reset on layer count change" rule (spec §2)
// implies per-tier awareness eventually; not wired into this pass.
export default function CenterSection({
  center,
  structure,
  onChange,
  activeTool,
  onSelectTool,
  placedItems = [],
  onPlacedItemsChange,
  sugarColor,
  onSugarColorChange,
  selectedItemId,
  onItemSelect,
  onDeleteSelectedItem,
  onTextColorModeChange,
  isStrawberryPickStep = false,
  isControlsInteractionStep = false,
  onControlsInteraction,
}) {
  const mode = center.mode || 'decorations';
  const selectionMode = activeTool ? 'placement' : 'selection';
  const textColorMode = center.text?.colorMode || 'uniform';

  // Click-to-arm: activeTool holds pending item and rotation.
  const armedCenterType = activeTool
    ? typeof activeTool === 'string'
      ? (activeTool.startsWith('center-') ? activeTool : null)
      : (activeTool.type?.startsWith('center-') ? activeTool.type : null)
    : null;
  const armedDesign = armedCenterType
    ? (CENTER_PLACEABLE_DESIGNS.find((d) => d.toolId === armedCenterType)
      || BUTTERCREAM_LETTERS.find((d) => d.toolId === armedCenterType))
    : null;
  const armedRotation = (activeTool && typeof activeTool === 'object') ? (activeTool.rotationY || 0) : 0;
  const armedTilt = (activeTool && typeof activeTool === 'object') ? (activeTool.rotationX || 0) : 0;
  const armedRoll = (activeTool && typeof activeTool === 'object') ? (activeTool.rotationZ || 0) : 0; // left/right lean, degrees (+ = leans right)

  // Mutually exclusive tabs -- switching changes which editor shows
  const switchToDecorations = () => {
    onItemSelect?.(null);
    onChange({ ...center, mode: 'decorations' });
  };

  const switchToText = () => {
    onItemSelect?.(null);
    onChange({ ...center, mode: 'text', textCategory: 'buttercream' });
  };

  const switchToVariations = () => {
    onItemSelect?.(null);
    onSelectTool?.(null);
    onChange({ ...center, mode: 'variations' });
  };

  // Auto-disarm if the currently armed design has reached its maximum limit
  React.useEffect(() => {
    if (armedDesign?.designId && isCenterItemAtLimit(placedItems, armedDesign.designId, structure)) {
      onSelectTool?.(null);
    }
  }, [placedItems, armedDesign?.designId, onSelectTool, structure]);

  const armDecorationTool = (toolId) => {
    onItemSelect?.(null);
    const design = CENTER_PLACEABLE_DESIGNS.find((d) => d.toolId === toolId);
    if (design && isCenterItemAtLimit(placedItems, design.designId, structure)) {
      return;
    }
    const isSameArmed = armedCenterType === toolId;
    if (isSameArmed) {
      onSelectTool?.(null);
      return;
    }
    onSelectTool?.({ type: toolId, rotationY: 0, rotationX: 0, rotationZ: 0 });
    onChange({ ...center, mode: 'decorations' });
  };

  const armLetterTool = (toolId) => {
    onItemSelect?.(null);
    const isSameArmed = armedCenterType === toolId;
    if (isSameArmed) {
      onSelectTool?.(null);
      return;
    }
    onSelectTool?.({ type: toolId, rotationY: 0, rotationX: 0, rotationZ: 0 });
    onChange({ ...center, mode: 'text', textCategory: 'buttercream' });
  };

  // Right-click deselect: cancels selection
  const deselectArmedTool = (e) => {
    e.preventDefault();
    onItemSelect?.(null);
    onSelectTool?.(null);
  };

  // Decorations, Buttercream Text, and Variations share one placedItems bucket (all
  // are 'center-' tagged, all go through the same collision system in
  // CakeScene.jsx) but get their own separate "N placed / Clear All" here
  // -- clearing a typed word on the Buttercream Text tab shouldn't also
  // wipe out a chocolate bear placed on the Decorations tab, or vice
  // versa, even though under the hood they're neighbors in the same array
  // and DO collide with each other on the cake.
  const placedDecorationItems = placedItems.filter(
    (item) => item.type && item.type.startsWith('center-') && !isLetterToolType(item.type) && item.source !== 'variation'
  );
  const placedLetterItems = placedItems.filter((item) => isLetterToolType(item.type));
  const placedVariationItems = placedItems.filter((item) => item.source === 'variation');

  const selectedCenterItem = placedItems.find((item) => item.id === selectedItemId) || null;
  const isSelectedDecoration = Boolean(selectedCenterItem && !isLetterToolType(selectedCenterItem.type));
  const isSelectedLetter = Boolean(selectedCenterItem && isLetterToolType(selectedCenterItem.type));

  const activeLetterToolId = (selectionMode === 'selection' && isSelectedLetter)
    ? selectedCenterItem?.type
    : (armedCenterType && isLetterToolType(armedCenterType) ? armedCenterType : null);

  const selectedDecorationDesign = isSelectedDecoration
    ? CENTER_PLACEABLE_DESIGNS.find((d) => d.toolId === selectedCenterItem.type)
    : null;
  const selectedLetterDesign = isSelectedLetter
    ? BUTTERCREAM_LETTERS.find((letter) => letter.toolId === selectedCenterItem.type)
    : null;

  const selectedItemRotation = selectedCenterItem ? ((selectedCenterItem.rotation || 0) * 180) / Math.PI : 0;
  const selectedItemTilt = selectedCenterItem ? ((selectedCenterItem.tiltX || 0) * 180) / Math.PI : 0;
  const selectedItemRoll = selectedCenterItem ? ((selectedCenterItem.tiltZ || 0) * 180) / Math.PI : 0;

  // Automatically switch tab if an item on the cake is selected
  React.useEffect(() => {
    if (selectedCenterItem) {
      if (isLetterToolType(selectedCenterItem.type) && mode !== 'text') {
        onChange({ ...center, mode: 'text', textCategory: 'buttercream' });
      } else if (
        !isLetterToolType(selectedCenterItem.type) &&
        !selectedCenterItem.source?.startsWith('variation') &&
        mode !== 'decorations' &&
        mode !== 'variations'
      ) {
        onChange({ ...center, mode: 'decorations' });
      }
    }
  }, [selectedCenterItem, mode]);

  const clearVariationItems = () => {
    onItemSelect?.(null);
    onPlacedItemsChange?.((currentItems) =>
      currentItems.filter((item) => item.source !== 'variation')
    );
    onChange({
      ...center,
      variations: {},
    });
  };

  const handleSelectVariation = (decoration, variantId) => {
    onItemSelect?.(null);
    onSelectTool?.(null);

    const hasItems = placedItems.some(
      (item) => item.source === 'variation' && item.variationType === decoration.id
    );
    const currentSetId = hasItems
      ? (center.variations?.[decoration.id]?.setId || center.variations?.[decoration.id] || null)
      : null;

    if (currentSetId === variantId) {
      // Toggle off / deselect
      onChange({
        ...center,
        variations: {},
      });
      onPlacedItemsChange?.((currentItems) =>
        currentItems.filter((item) => item.source !== 'variation')
      );
      return;
    }

    const variant = decoration.sets.find((s) => s.id === variantId);
    if (!variant) return;

    const newItems = variant.placements.map((p, idx) => ({
      id: `center-var-${decoration.id}-${Date.now()}-${idx}`,
      type: p.type || p.toolId || decoration.toolId,
      x: p.x,
      z: p.z,
      rotation: p.rotation || 0,
      tiltX: p.tiltX || 0,
      tiltZ: p.tiltZ || 0,
      source: 'variation',
      variationType: decoration.id,
      variationId: variant.id,
    }));

    onChange({
      ...center,
      mode: 'variations',
      variations: { [decoration.id]: variantId },
    });

    onPlacedItemsChange?.((currentItems) => {
      const withoutExisting = currentItems.filter((item) => item.source !== 'variation');
      return [...withoutExisting, ...newItems];
    });
  };

  const updateSelectedItemPose = (changes) => {
    if (!selectedCenterItem) return;
    onPlacedItemsChange?.((currentItems) => currentItems.map((item) => (
      item.id === selectedCenterItem.id ? { ...item, ...changes } : item
    )));
  };

  // Full 0-360deg range, not stepped -- the sliders below drive these
  // directly with whatever value the person drags to.
  const setArmedRotation = (degrees) => {
    if (selectionMode === 'selection' && selectedCenterItem) {
      const normalized = ((degrees % 360) + 360) % 360;
      updateSelectedItemPose({ rotation: (normalized * Math.PI) / 180 });
      return;
    }
    if (!armedCenterType) return;
    const normalized = ((degrees % 360) + 360) % 360;
    onSelectTool?.({ type: armedCenterType, rotationY: normalized, rotationX: armedTilt, rotationZ: armedRoll });
  };

  const setArmedTilt = (degrees) => {
    if (selectionMode === 'selection' && selectedCenterItem) {
      const normalized = ((degrees % 360) + 360) % 360;
      updateSelectedItemPose({ tiltX: (normalized * Math.PI) / 180 });
      return;
    }
    if (!armedCenterType) return;
    const normalized = ((degrees % 360) + 360) % 360;
    onSelectTool?.({ type: armedCenterType, rotationY: armedRotation, rotationX: normalized, rotationZ: armedRoll });
  };

  const setArmedRoll = (degrees) => {
    if (selectionMode === 'selection' && selectedCenterItem) {
      const normalized = ((degrees % 360) + 360) % 360;
      updateSelectedItemPose({ tiltZ: (normalized * Math.PI) / 180 });
      return;
    }
    if (!armedCenterType) return;
    const normalized = ((degrees % 360) + 360) % 360;
    onSelectTool?.({ type: armedCenterType, rotationY: armedRotation, rotationX: armedTilt, rotationZ: normalized });
  };

  // Decoration controls
  const decorControlsDesign = selectionMode === 'selection' && isSelectedDecoration
    ? selectedDecorationDesign
    : armedDesign;
  const decorControlsRotation = selectionMode === 'selection' && isSelectedDecoration
    ? selectedItemRotation
    : armedRotation;
  const decorControlsTilt = selectionMode === 'selection' && isSelectedDecoration
    ? selectedItemTilt
    : armedTilt;
  const decorControlsRoll = selectionMode === 'selection' && isSelectedDecoration
    ? selectedItemRoll
    : armedRoll;

  const matchingPlacedDecor = placedDecorationItems.filter((item) => {
    if (selectionMode === 'selection' && isSelectedDecoration) {
      return item.id === selectedItemId;
    }
    return item.type === armedCenterType || (armedDesign && item.type?.startsWith(`center-${armedDesign.designId}-`));
  });
  const canDeleteDecor = Boolean(selectedItemId && isSelectedDecoration);

  // Text controls
  const resolveSugarColorFromItem = (item) => {
    if (!item) return null;
    if (item.sugarColor && item.sugarColor.colorId) return item.sugarColor;
    const cid = item.colorId || 'vanilla';
    const isFlavor = ['vanilla', 'chocolate', 'strawberry', 'cheese', 'ube', 'mocha'].includes(cid);
    return { mode: isFlavor ? 'default' : 'colorOverride', colorId: cid };
  };

  const selectedItemSugarColor = resolveSugarColorFromItem(selectedCenterItem);
  const activeTextSugarColor = (textColorMode === 'individual' && isSelectedLetter && selectedItemSugarColor)
    ? selectedItemSugarColor
    : (sugarColor?.colorId ? sugarColor : { mode: 'default', colorId: 'vanilla' });
  const previewSugarColor = SUGAR_COLORS.find((color) => color.id === activeTextSugarColor?.colorId)
    || SUGAR_COLORS.find((color) => color.id === sugarColor?.colorId)
    || SUGAR_COLORS[0];
  const previewColor = previewSugarColor?.hex || SUGAR_COLORS[0].hex;
  const previewColorId = previewSugarColor?.id || 'vanilla';
  const textControlsDesign = selectionMode === 'selection' && isSelectedLetter
    ? selectedLetterDesign
    : armedDesign;
  const textControlsRotation = selectionMode === 'selection' && isSelectedLetter
    ? selectedItemRotation
    : armedRotation;
  const textControlsTilt = selectionMode === 'selection' && isSelectedLetter
    ? selectedItemTilt
    : armedTilt;
  const textControlsRoll = selectionMode === 'selection' && isSelectedLetter
    ? selectedItemRoll
    : armedRoll;

  const matchingPlacedLetters = placedLetterItems.filter((item) => {
    if (selectionMode === 'selection' && isSelectedLetter) {
      return item.id === selectedItemId;
    }
    return item.type === armedCenterType;
  });
  const canDeleteText = Boolean(selectedItemId && isSelectedLetter);

  const handleCancel = () => {
    onItemSelect?.(null);
    onSelectTool?.(null);
  };

  const handleDelete = () => {
    if (selectedItemId) {
      onDeleteSelectedItem?.();
      onSelectTool?.(null);
      onItemSelect?.(null);
    }
  };

  const clearDecorationItems = () => {
    onItemSelect?.(null);
    onPlacedItemsChange?.((currentItems) => currentItems.filter((item) => !(item.type && item.type.startsWith('center-') && !isLetterToolType(item.type))));
  };

  const clearLetterItems = () => {
    onItemSelect?.(null);
    onPlacedItemsChange?.((currentItems) => currentItems.filter((item) => !isLetterToolType(item.type)));
  };

  const setTextColorMode = (nextMode) => {
    if (onTextColorModeChange) {
      onTextColorModeChange(nextMode);
      return;
    }
    onChange({
      ...center,
      text: { ...(center.text || {}), colorMode: nextMode },
    });
  };

  const handleTextSugarColorChange = (nextSugarColor) => {
    const targetColorId = nextSugarColor.colorId || 'vanilla';
    const isFlavor = ['vanilla', 'chocolate', 'strawberry', 'cheese', 'ube', 'mocha'].includes(targetColorId);
    const normalizedSugarColor = {
      mode: nextSugarColor.mode || (isFlavor ? 'default' : 'colorOverride'),
      colorId: targetColorId,
    };

    onSugarColorChange?.(normalizedSugarColor);

    if (textColorMode === 'individual') {
      if (selectedCenterItem && isSelectedLetter) {
        onPlacedItemsChange?.((currentItems) => currentItems.map((item) => (
          item.id === selectedCenterItem.id
            ? { ...item, colorId: targetColorId, sugarColor: normalizedSugarColor }
            : item
        )));
      }
    } else {
      // In uniform mode, ensure all placed letters mirror the updated uniform color
      onPlacedItemsChange?.((currentItems) => currentItems.map((item) => (
        isLetterToolType(item.type)
          ? { ...item, colorId: targetColorId, sugarColor: normalizedSugarColor }
          : item
      )));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            type="button"
            disabled={isStrawberryPickStep || isControlsInteractionStep}
            onClick={switchToDecorations}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              (isStrawberryPickStep || isControlsInteractionStep)
                ? 'opacity-40 cursor-not-allowed bg-transparent text-muted-foreground'
                : mode === 'decorations'
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Decorations
          </button>
          <button
            type="button"
            disabled={isStrawberryPickStep || isControlsInteractionStep}
            onClick={switchToText}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              (isStrawberryPickStep || isControlsInteractionStep)
                ? 'opacity-40 cursor-not-allowed bg-transparent text-muted-foreground'
                : mode === 'text'
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Text
          </button>
          <button
            type="button"
            disabled={isStrawberryPickStep || isControlsInteractionStep}
            onClick={switchToVariations}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              (isStrawberryPickStep || isControlsInteractionStep)
                ? 'opacity-40 cursor-not-allowed bg-transparent text-muted-foreground'
                : mode === 'variations'
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Variations
          </button>
        </div>
      </div>

      {mode === 'decorations' && (
        <div className="space-y-4">
          {selectionMode === 'selection' && selectedItemId && isSelectedDecoration && (
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs text-primary">
              <MousePointer2 className="w-3.5 h-3.5 shrink-0" />
              <span>Decoration selected on cake</span>
            </div>
          )}

          <ArmedItemControls
            armedDesign={decorControlsDesign}
            previewColor={previewColor}
            previewColorId={previewColorId}
            armedRotation={decorControlsRotation}
            armedTilt={decorControlsTilt}
            armedRoll={decorControlsRoll}
            setArmedRotation={setArmedRotation}
            setArmedTilt={setArmedTilt}
            setArmedRoll={setArmedRoll}
            onCancel={handleCancel}
            onDelete={handleDelete}
            canDelete={canDeleteDecor}
            isControlsInteractionStep={isControlsInteractionStep}
            onControlsInteraction={onControlsInteraction}
          />

          {placedDecorationItems.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {placedDecorationItems.length} placed
              </span>
              <button
                type="button"
                disabled={isStrawberryPickStep || isControlsInteractionStep}
                onClick={clearDecorationItems}
                className={`text-xs font-semibold text-destructive hover:underline ${
                  (isStrawberryPickStep || isControlsInteractionStep) ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
                }`}
              >
                Clear All
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {CENTER_PLACEABLE_DESIGNS.map((design) => {
              const isArmed = armedCenterType === design.toolId;
              const limit = getCenterItemLimit(design.designId, structure);
              const count = getCenterItemCount(placedItems, design.designId);
              const isMaxReached = limit !== null && count >= limit;
              const isStrawberry = design.designId === 'strawberry';
              const isDisabled = isStrawberryPickStep ? !isStrawberry : (isControlsInteractionStep ? true : isMaxReached);

              return (
                <button
                  key={design.toolId}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => armDecorationTool(design.toolId)}
                  onContextMenu={deselectArmedTool}
                  data-tutorial={isStrawberry ? 'center-strawberry' : undefined}
                  title={
                    isDisabled
                      ? (isStrawberryPickStep || isControlsInteractionStep)
                        ? `${design.label} (Locked during tutorial step)`
                        : `${design.label} (Max limit reached: ${limit})`
                      : isArmed
                        ? `Remove ${design.label}`
                        : design.label
                  }
                  className={`flex flex-col items-center justify-between gap-1.5 rounded-xl p-3 text-center transition-all duration-200 border-2 ${isDisabled
                      ? 'opacity-40 cursor-not-allowed bg-muted/40 border-dashed border-border/60 text-muted-foreground'
                      : isArmed
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                    }`}
                >
                  {/* armDecorationTool disarms the armed design when its own
                      card is clicked again — selected card swaps its label
                      for an X ("click to remove"), like the letter grid. */}
                  {isArmed ? (
                    /* flex-1 grows to fill the space above the count badge
                       (or the whole card when there's no badge), so the X
                       sits dead-center instead of hugging the top edge
                       where the label normally starts. */
                    <span className="flex flex-1 items-center justify-center">
                      <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="text-xs font-semibold">{design.label}</span>
                  )}
                  {limit !== null && (
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${isMaxReached
                          ? 'bg-destructive/15 text-destructive font-semibold'
                          : isArmed
                            ? 'bg-primary-foreground/20 text-primary-foreground'
                            : 'bg-background/80 text-muted-foreground'
                        }`}
                    >
                      {count} / {limit}{isMaxReached ? ' • Max' : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'text' && (
        <div className="space-y-4">
          {selectionMode === 'selection' && selectedItemId && isSelectedLetter && (
            <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-xs text-primary">
              <MousePointer2 className="w-3.5 h-3.5 shrink-0" />
              <span>Text selected on cake</span>
            </div>
          )}

          <ArmedItemControls
            armedDesign={textControlsDesign}
            previewColor={previewColor}
            previewColorId={previewColorId}
            armedRotation={textControlsRotation}
            armedTilt={textControlsTilt}
            armedRoll={textControlsRoll}
            setArmedRotation={setArmedRotation}
            setArmedTilt={setArmedTilt}
            setArmedRoll={setArmedRoll}
            onCancel={handleCancel}
            onDelete={handleDelete}
            canDelete={canDeleteText}
            isControlsInteractionStep={isControlsInteractionStep}
            onControlsInteraction={onControlsInteraction}
          />

          {placedLetterItems.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {placedLetterItems.length}/50 placed{placedLetterItems.length >= 50 ? ' max' : ''}
              </span>
              <button
                type="button"
                onClick={clearLetterItems}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Clear All
              </button>
            </div>
          )}

          <div className="space-y-3">
            <LetterGroup
              label="Uppercase"
              letters={BUTTERCREAM_LETTERS_UPPER}
              activeLetterToolId={activeLetterToolId}
              armedToolId={armedCenterType}
              disabled={isCenterItemAtLimit(placedItems, 'letterUpperA')}
              onSelect={armLetterTool}
              onContextMenu={deselectArmedTool}
              textColorMode={textColorMode}
              onToggleTextColorMode={() => setTextColorMode(textColorMode === 'individual' ? 'uniform' : 'individual')}
              sugarColor={activeTextSugarColor}
              onSugarColorChange={handleTextSugarColorChange}
            />
            <LetterGroup
              label="Lowercase"
              letters={BUTTERCREAM_LETTERS_LOWER}
              activeLetterToolId={activeLetterToolId}
              armedToolId={armedCenterType}
              disabled={isCenterItemAtLimit(placedItems, 'letterLowerA')}
              onSelect={armLetterTool}
              onContextMenu={deselectArmedTool}
              textColorMode={textColorMode}
              onToggleTextColorMode={() => setTextColorMode(textColorMode === 'individual' ? 'uniform' : 'individual')}
              sugarColor={activeTextSugarColor}
              onSugarColorChange={handleTextSugarColorChange}
            />
          </div>
        </div>
      )}

      {mode === 'variations' && (
        <div className="space-y-4">
          {placedVariationItems.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {placedVariationItems.length} placed
              </span>
              <button
                type="button"
                onClick={clearVariationItems}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Clear All
              </button>
            </div>
          )}

          <div className="space-y-4">
            {getCenterVariations(structure).map((decoration) => {
              const currentSetId = (
                placedItems.some(
                  (item) => item.source === 'variation' && item.variationType === decoration.id
                )
                  ? (center.variations?.[decoration.id]?.setId || center.variations?.[decoration.id] || null)
                  : null
              );

              return (
                <OptionRow key={decoration.id} label={decoration.label}>
                  {decoration.sets.map((variant, i) => {
                    const isActive = currentSetId === variant.id;
                    return (
                      <Circle
                        key={variant.id}
                        active={isActive}
                        canDeselect
                        onClick={() => handleSelectVariation(decoration, variant.id)}
                        title={isActive ? `Remove ${variant.label}` : variant.label}
                      >
                        {i + 1}
                      </Circle>
                    );
                  })}
                </OptionRow>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

function OptionRow({ label, children }) {
  return (
    <div>
      <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Circle({ active, canDeselect = false, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${active
          ? 'bg-primary text-primary-foreground border-primary shadow-md'
          : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
        }`}
    >
      <OptionButtonContent selected={active} canDeselect={canDeselect} label={title}>
        {children}
      </OptionButtonContent>
    </button>
  );
}