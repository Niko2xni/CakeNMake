import React, { useState } from 'react';
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

// NOTE: single whole-cake setting for now, not per-tier — see
// SurfaceSection's caveat. Top/Bottom/Both is a separate axis of variation
// from per-tier Individual mode and is unaffected by it either way.
export default function EdgeSection({
  edge,
  structure,
  activeLayer = 0,
  onChange,
  onActiveSlotChange,
  sugarColor,
  onSugarColorChange,
}) {
  const isIndividual = structure?.layerDesign === 'individual' && structure?.layers > 1;
  const tierLabel = (label) => (isIndividual ? `Tier ${activeLayer + 1} ${label}` : label);
  const activeSlot = edge.activeSlot || (edge.mode === 'both' ? 'both' : 'top');
  const mode = edge.mode; // 'topBottomSeparate' | 'both'

  const switchToTop = () => {
    onChange({ ...edge, mode: 'topBottomSeparate', activeSlot: 'top' });
    onActiveSlotChange?.('top');
  };

  const switchToBottom = () => {
    onChange({ ...edge, mode: 'topBottomSeparate', activeSlot: 'bottom' });
    onActiveSlotChange?.('bottom');
  };

  const switchToBoth = () => {
    onChange({ ...edge, mode: 'both', activeSlot: 'both' });
    onActiveSlotChange?.('both');
  };

  const currentSlotKey = mode === 'both' ? 'both' : activeSlot;
  const currentSlot = edge[currentSlotKey] || EMPTY_SLOT();

  const updateSlot = (changes) => {
    onChange({ ...edge, [currentSlotKey]: { ...currentSlot, ...changes } });
  };

  const updateSecondaryColor = (colorId, mode = 'colorOverride') => {
    onChange({
      ...edge,
      [currentSlotKey]: {
        ...currentSlot,
        piping: {
          ...currentSlot.piping,
          secondaryColorId: colorId,
          secondaryColorMode: mode,
        },
      },
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            type="button"
            onClick={switchToTop}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'topBottomSeparate' && activeSlot === 'top'
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top
          </button>
          <button
            type="button"
            onClick={switchToBottom}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'topBottomSeparate' && activeSlot === 'bottom'
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Bottom
          </button>
          <button
            type="button"
            onClick={switchToBoth}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'both'
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-foreground block mb-2">{tierLabel('Border Piping')}</span>
            <VariantRow
              variants={BORDER_PIPING_VARIATIONS_DELUXE}
              currentSlot={currentSlot}
              updateSlot={updateSlot}
              sugarColor={sugarColor}
              onSugarColorChange={onSugarColorChange}
              onSecondaryColorChange={updateSecondaryColor}
            />
          </div>

          <VariantRow
            label={tierLabel('Beaded Trim')}
            variants={BEADED_TRIM_VARIATIONS_DELUXE}
            currentSlot={currentSlot}
            updateSlot={updateSlot}
            sugarColor={sugarColor}
            onSugarColorChange={onSugarColorChange}
            onSecondaryColorChange={updateSecondaryColor}
          />

          <div>
            <span className="text-xs font-semibold text-foreground block mb-2">{tierLabel('Dollops')}</span>
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
            <span className="text-xs font-semibold text-foreground block mb-2">{tierLabel('Whipped Cream Rosettes')}</span>
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
            <span className="text-xs font-semibold text-foreground block mb-2">{tierLabel('Edible Delicates')}</span>
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

function VariantRow({ label, variants, currentSlot, updateSlot, showSugarColor = true, sugarColor, onSugarColorChange, onSecondaryColorChange }) {
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
                title={variant.label}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                }`}
              >
                {i + 1}
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
