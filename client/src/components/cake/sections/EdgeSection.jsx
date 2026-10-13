import React, { useState } from 'react';
import { X } from 'lucide-react';
import {
  BEADED_TRIM_VARIATIONS_DELUXE,
  BORDER_PIPING_VARIATIONS_DELUXE,
  DOLLOPS_VARIATIONS_DELUXE,
  WHIPPED_CREAM_VARIATIONS,
  FRUIT_CONFECTION_RIM_OPTIONS,
} from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';

const EMPTY_SLOT = () => ({
  decorations: { setId: null, colorId: 'vanilla' },
  piping: { tip: null, colorId: 'vanilla' },
});

const EMPTY_MIDDLE_SLOT = () => ({
  piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red' },
});

// NOTE: Top/Bottom/Both stay a single whole-cake setting (not per-tier) —
// see SurfaceSection's caveat. Middle/All below are new, tier-COUNT-aware
// (2 tiers unlocks them) but are equally whole-cake, unrelated to Tier
// Design's per-tier Individual mode.
export default function EdgeSection({
  edge,
  onChange,
  onActiveSlotChange,
  sugarColor,
  onSugarColorChange,
  layerCount,
  structure,
}) {
  // Middle/All only make sense once there's an actual seam between two
  // tiers to place a ring at — on a 1-tier cake there's nothing physically
  // "middle" about, so the toggle row stays exactly Top/Bottom/Both, the
  // way it's always worked.
  const tiers = layerCount ?? structure?.layers ?? 1;
  const hasMiddle = tiers >= 2;

  const activeSlot = Object.prototype.hasOwnProperty.call(edge, 'activeSlot')
    ? edge.activeSlot
    : (edge.mode === 'both' ? 'both' : null);
  const mode = edge.mode; // 'topBottomSeparate' | 'both'

  const effectiveActiveSlot = activeSlot;

  const ensureSlotsMigrated = (baseEdge) => {
    const nextEdge = { ...baseEdge };
    if (baseEdge.mode === 'both' && baseEdge.both) {
      if (!baseEdge.top?.piping?.tip && !baseEdge.top?.decorations?.setId) {
        nextEdge.top = structuredClone(baseEdge.both);
        nextEdge.topEnabled = Boolean(baseEdge.both.piping?.tip || baseEdge.both.decorations?.setId);
      }
      if (!baseEdge.bottom?.piping?.tip && !baseEdge.bottom?.decorations?.setId) {
        nextEdge.bottom = structuredClone(baseEdge.both);
        nextEdge.bottomEnabled = Boolean(baseEdge.both.piping?.tip || baseEdge.both.decorations?.setId);
      }
    }
    return nextEdge;
  };

  const switchToTop = () => {
    const nextSlot = activeSlot === 'top' ? null : 'top';
    const nextEdge = { ...ensureSlotsMigrated(edge), mode: 'topBottomSeparate', activeSlot: nextSlot };
    onChange(nextEdge);
    onActiveSlotChange?.(nextSlot);
  };

  const switchToMiddle = () => {
    const nextSlot = activeSlot === 'middle' ? null : 'middle';
    const nextEdge = { ...ensureSlotsMigrated(edge), mode: 'topBottomSeparate', activeSlot: nextSlot };
    onChange(nextEdge);
    onActiveSlotChange?.(nextSlot);
  };

  const switchToBottom = () => {
    const nextSlot = activeSlot === 'bottom' ? null : 'bottom';
    const nextEdge = { ...ensureSlotsMigrated(edge), mode: 'topBottomSeparate', activeSlot: nextSlot };
    onChange(nextEdge);
    onActiveSlotChange?.(nextSlot);
  };

  // Both (1 tier) and All (2 tiers) are the exact same underlying data —
  // edge.mode: 'both' has always meant "render edge.both at Top AND
  // Bottom" (see CakeScene.jsx), which is still correct for All; the two
  // buttons are never shown at the same time (hasMiddle picks exactly
  // one), so there's no ambiguity in reusing 'both' as the mode value for
  // both labels. All's extra behavior — also filling the Middle seam —
  // is layered on separately below (updateBorderPipingSlot's mirroring,
  // and ToolPanel.jsx's onSugarColorChange mirroring the color), not by
  // inventing a second mode string.
  const isMiddleActive = hasMiddle && effectiveActiveSlot === 'middle';
  const isAllActive = hasMiddle && mode === 'both';
  const hasSelectedSlot = Boolean(effectiveActiveSlot && ['top', 'middle', 'bottom'].includes(effectiveActiveSlot));

  const currentSlotKey = mode === 'both' ? 'both' : (isMiddleActive ? 'middle' : (effectiveActiveSlot || 'top'));
  const currentSlot = isMiddleActive
    ? (edge.middle || EMPTY_MIDDLE_SLOT())
    : (edge[currentSlotKey]?.piping?.tip || edge[currentSlotKey]?.decorations?.setId
        ? edge[currentSlotKey]
        : ((mode === 'both' || !edge[currentSlotKey]?.piping?.tip) && edge.both?.piping?.tip
            ? edge.both
            : (edge[currentSlotKey] || EMPTY_SLOT())));

  const updateSlot = (changes) => {
    let nextEdge = ensureSlotsMigrated({ ...edge });
    if (nextEdge.mode === 'both') {
      nextEdge.mode = 'topBottomSeparate';
      nextEdge.activeSlot = effectiveActiveSlot || 'top';
    }
    const targetKey = nextEdge.mode === 'both' ? 'both' : (isMiddleActive ? 'middle' : (effectiveActiveSlot || 'top'));
    const targetSlot = nextEdge[targetKey] || currentSlot;
    nextEdge[targetKey] = { ...targetSlot, ...changes };
    onChange(nextEdge);
  };

  // While Both mode is active, Border Piping choices also mirror to the
  // Middle seam. Color is mirrored separately through Sugar Color's context.
  const updateBorderPipingSlot = (changes) => {
    let nextEdge = ensureSlotsMigrated({ ...edge });
    if (nextEdge.mode === 'both') {
      nextEdge.mode = 'topBottomSeparate';
      nextEdge.activeSlot = effectiveActiveSlot || 'top';
    }
    const targetKey = nextEdge.mode === 'both' ? 'both' : (isMiddleActive ? 'middle' : (effectiveActiveSlot || 'top'));
    const targetSlot = nextEdge[targetKey] || currentSlot;
    const nextSlot = { ...targetSlot, ...changes };
    if (isAllActive && changes.piping) {
      onChange({
        ...nextEdge,
        [targetKey]: nextSlot,
        middle: {
          ...(nextEdge.middle || EMPTY_MIDDLE_SLOT()),
          piping: { ...(nextEdge.middle?.piping || EMPTY_MIDDLE_SLOT().piping), tip: nextSlot.piping?.tip },
        },
      });
      return;
    }
    onChange({ ...nextEdge, [targetKey]: nextSlot });
  };

  const updateSecondaryColor = (colorId, secondaryMode = 'colorOverride') => {
    let nextEdge = ensureSlotsMigrated({ ...edge });
    if (nextEdge.mode === 'both') {
      nextEdge.mode = 'topBottomSeparate';
      nextEdge.activeSlot = effectiveActiveSlot || 'top';
    }
    const targetKey = nextEdge.mode === 'both' ? 'both' : (isMiddleActive ? 'middle' : (effectiveActiveSlot || 'top'));
    const targetSlot = nextEdge[targetKey] || currentSlot;
    onChange({
      ...nextEdge,
      [targetKey]: {
        ...targetSlot,
        piping: {
          ...targetSlot.piping,
          secondaryColorId: colorId,
          secondaryColorMode: secondaryMode,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className={`grid ${hasMiddle ? 'grid-cols-3' : 'grid-cols-2'} gap-1 bg-muted/40 rounded-xl p-1`}>
          <button
            type="button"
            onClick={switchToTop}
            className={`py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              (mode === 'topBottomSeparate' ? activeSlot === 'top' : effectiveActiveSlot === 'top')
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top
          </button>

          {hasMiddle && (
            <button
              type="button"
              onClick={switchToMiddle}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                isMiddleActive
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Middle
            </button>
          )}

          <button
            type="button"
            onClick={switchToBottom}
            className={`py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              (mode === 'topBottomSeparate' ? activeSlot === 'bottom' : effectiveActiveSlot === 'bottom')
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Bottom
          </button>

        </div>
      </div>

      {hasSelectedSlot && (isMiddleActive ? (
        <div className="space-y-4">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-foreground block mb-2">Border Piping</span>
            <VariantRow
              variants={BORDER_PIPING_VARIATIONS_DELUXE}
              currentSlot={currentSlot}
              updateSlot={updateSlot}
              sugarColor={sugarColor}
              onSugarColorChange={onSugarColorChange}
              onSecondaryColorChange={updateSecondaryColor}
            />

            <VariantRow
              label="Beaded Trim"
              variants={BEADED_TRIM_VARIATIONS_DELUXE}
              currentSlot={currentSlot}
              updateSlot={updateSlot}
              excludePatternColors
              sugarColor={sugarColor}
              onSugarColorChange={onSugarColorChange}
              onSecondaryColorChange={updateSecondaryColor}
            />

            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">Dollops</span>
              <VariantRow
                variants={DOLLOPS_VARIATIONS_DELUXE}
                currentSlot={currentSlot}
                updateSlot={updateSlot}
                sugarColor={sugarColor}
                onSugarColorChange={onSugarColorChange}
                onSecondaryColorChange={updateSecondaryColor}
              />
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">Whipped Cream Rosettes</span>
              <VariantRow
                variants={WHIPPED_CREAM_VARIATIONS}
                currentSlot={currentSlot}
                updateSlot={updateSlot}
                sugarColor={sugarColor}
                onSugarColorChange={onSugarColorChange}
                onSecondaryColorChange={updateSecondaryColor}
              />
            </div>

            <VariantRow
              label="Edible Delicates"
              variants={FRUIT_CONFECTION_RIM_OPTIONS}
              currentSlot={currentSlot}
              updateSlot={updateSlot}
              showSugarColor={false}
              sugarColor={sugarColor}
              onSugarColorChange={onSugarColorChange}
              onSecondaryColorChange={updateSecondaryColor}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground block mb-2">Border Piping</span>
              <VariantRow
                variants={BORDER_PIPING_VARIATIONS_DELUXE}
                currentSlot={currentSlot}
                updateSlot={updateBorderPipingSlot}
                sugarColor={sugarColor}
                onSugarColorChange={onSugarColorChange}
                onSecondaryColorChange={updateSecondaryColor}
              />
            </div>

            <VariantRow
              label="Beaded Trim"
              variants={BEADED_TRIM_VARIATIONS_DELUXE}
              currentSlot={currentSlot}
              updateSlot={updateSlot}
              excludePatternColors
              sugarColor={sugarColor}
              onSugarColorChange={onSugarColorChange}
              onSecondaryColorChange={updateSecondaryColor}
            />

            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">Dollops</span>
              <VariantRow
                variants={DOLLOPS_VARIATIONS_DELUXE}
                currentSlot={currentSlot}
                updateSlot={updateSlot}
                sugarColor={sugarColor}
                onSugarColorChange={onSugarColorChange}
                onSecondaryColorChange={updateSecondaryColor}
              />
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">Whipped Cream Rosettes</span>
              <VariantRow
                variants={WHIPPED_CREAM_VARIATIONS}
                currentSlot={currentSlot}
                updateSlot={updateSlot}
                sugarColor={sugarColor}
                onSugarColorChange={onSugarColorChange}
                onSecondaryColorChange={updateSecondaryColor}
              />
            </div>

            <div>
              <span className="text-xs font-semibold text-foreground block mb-2">Edible Delicates</span>
              <VariantRow
                variants={FRUIT_CONFECTION_RIM_OPTIONS}
                currentSlot={currentSlot}
                updateSlot={updateSlot}
                showSugarColor={false}
                sugarColor={sugarColor}
                onSugarColorChange={onSugarColorChange}
                onSecondaryColorChange={updateSecondaryColor}
              />
            </div>
          </div>
        </div>
      ))}

    </div>
  );
}

// Shared by every Deluxe grouped-variant row (Border Piping, Beaded Trim,
// Dollops, Whipped Cream Rosettes, Edible Delicates) — same numbered circular-button
// treatment Classic's own rows use, just parameterized so these rows
// don't each repeat the same JSX block by hand.
//
// Sugar Color renders contextually once a design in that row is active —
// not after the whole grid, and not once at the bottom of the page. For
// Alternating designs, the same picker is reused for both color slots via
// the 1st Color / 2nd Color toggle below.
//
// The color block is inserted after the LAST button of the active
// design's own row (every ROW_SIZE-th button), not immediately after
// the active button itself — these rows visually wrap into fixed groups
// of six (1-6, 7-12, 13-18, ...), and breaking mid-row (e.g. right after
// button 5) would split that group apart instead of leaving it intact
// and only pushing the ROWS AFTER it down.
const ROW_SIZE = 6;

function VariantRow({ label, variants, currentSlot, updateSlot, showSugarColor = true, excludePatternColors = false, sugarColor, onSugarColorChange, onSecondaryColorChange }) {
  const [activeColorSlot, setActiveColorSlot] = useState('primary');
  const activeId = currentSlot.piping?.tip;
  const activeIndex = variants.findIndex((v) => v.id === activeId);
  let colorBlockInserted = false;
  return (
    <div>
      {label && <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>}
      <div className="flex flex-wrap gap-2">
        {variants.map((variant, i) => {
          const active = i === activeIndex;
          const isRowBoundary = (i + 1) % ROW_SIZE === 0 || i === variants.length - 1;
          const showColorHere = showSugarColor && activeIndex !== -1 && !colorBlockInserted && i >= activeIndex && isRowBoundary;
          if (showColorHere) colorBlockInserted = true;
          return (
            <React.Fragment key={variant.id}>
              <button
                type="button"
                onClick={() =>
                  updateSlot({
                    decorations: { ...currentSlot.decorations, setId: null },
                    piping: { ...currentSlot.piping, tip: active ? null : variant.id },
                  })
                }
                title={active ? `Remove ${variant.label}` : variant.label}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                }`}
              >
                {/* The onClick above clears the tip when this variant is
                    already active, so the selected circle swaps its number
                    for an X — the shared "click to remove this" affordance
                    (same as Center's armed tools and Glaze's toggle). */}
                {active ? <X className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> : i + 1}
              </button>
              {showColorHere && (
                <div className="w-full basis-full pt-2">
                  {typeof activeId === 'string' && activeId.includes('Alt') && (
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button
                        type="button"
                        onClick={() => setActiveColorSlot('primary')}
                        className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
                          activeColorSlot === 'primary'
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <span className="block text-xs font-semibold">1st Color</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveColorSlot('secondary')}
                        className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
                          activeColorSlot === 'secondary'
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        <span className="block text-xs font-semibold">2nd Color</span>
                      </button>
                    </div>
                  )}
                  <SugarColorSection
                    sugarColor={activeColorSlot === 'primary'
                      ? sugarColor
                      : {
                          mode: currentSlot.piping?.secondaryColorMode || 'colorOverride',
                          colorId: currentSlot.piping?.secondaryColorId || 'red',
                        }}
                    onChange={activeColorSlot === 'primary'
                      ? onSugarColorChange
                      : (nextSugarColor) => onSecondaryColorChange(
                          nextSugarColor.colorId || 'red',
                          nextSugarColor.mode || 'colorOverride',
                        )}
                    showDefaultColorPicker
                    excludePatternColors={excludePatternColors}
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
