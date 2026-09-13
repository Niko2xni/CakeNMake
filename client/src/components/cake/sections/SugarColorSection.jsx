import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet } from 'lucide-react';
import { SUGAR_COLOR_MODES, SUGAR_COLORS } from '@/lib/cakeConfig';

// Sugar Color answers "what does the coating look like" — independent of
// exteriorFinish.style ("is there a coating at all") and .flavor ("what
// does it taste like"). The picker is rendered contextually after an
// eligible color-producing choice rather than as its own section.
//
// When Color Override is active, the chosen flavor (or flavor color) remains
// selected and visible as the cake's chosen eating flavor, while the appearance
// is tinted according to the selected Color Override.
export default function SugarColorSection({
  sugarColor = {},
  exteriorFinish,
  onChange,
  children,
  showDefaultColorPicker = false,
  colorOverrideDisabled = false,
  colorOverrideDisabledReason = 'Color Override has no effect on this pattern.',
}) {
  const [colorPage, setColorPage] = useState(0);
  const mode = sugarColor.mode || 'default';

  const overrideColors = SUGAR_COLORS.filter((c) => !c.isFlavorMirror);
  const defaultColors = SUGAR_COLORS.filter((c) => c.isFlavorMirror);

  // Active flavor color (for Default mode or underlying flavor base)
  const activeFlavorColorId =
    sugarColor.flavorColorId ||
    (defaultColors.some((c) => c.id === sugarColor.colorId) ? sugarColor.colorId : 'vanilla');

  // Active color override (for Color Override mode)
  const activeOverrideColorId =
    sugarColor.overrideColorId ||
    (!defaultColors.some((c) => c.id === sugarColor.colorId) && sugarColor.colorId ? sugarColor.colorId : 'red');

  const updateMode = (nextMode) => {
    onChange({
      ...sugarColor,
      mode: nextMode,
      flavorColorId: activeFlavorColorId,
      overrideColorId: activeOverrideColorId,
      colorId: nextMode === 'colorOverride' ? activeOverrideColorId : activeFlavorColorId,
    });
  };

  const updateFlavorColor = (flavorColorId) => {
    onChange({
      ...sugarColor,
      flavorColorId,
      colorId: mode === 'colorOverride' ? activeOverrideColorId : flavorColorId,
    });
  };

  const updateOverrideColor = (overrideColorId) => {
    onChange({
      ...sugarColor,
      mode: 'colorOverride',
      overrideColorId,
      colorId: overrideColorId,
      flavorColorId: activeFlavorColorId,
    });
  };

  const usesColor = mode === 'colorOverride';
  const activeOverrideColor = SUGAR_COLORS.find((c) => c.id === activeOverrideColorId);
  const activeFlavorColor = SUGAR_COLORS.find((c) => c.id === activeFlavorColorId);

  const COLORS_PER_PAGE = 6;
  const pageCount = Math.ceil(overrideColors.length / COLORS_PER_PAGE);
  const visibleColors = overrideColors.slice(
    colorPage * COLORS_PER_PAGE,
    (colorPage + 1) * COLORS_PER_PAGE,
  );

  const flavorId = exteriorFinish?.flavor || 'vanilla';
  const flavorColor = SUGAR_COLORS.find((c) => c.id === flavorId);

  return (
    <div className="space-y-4">
      {/* 1. Flavor Color / Flavor Selection — always remains visible and selected */}
      {showDefaultColorPicker && (
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Flavor Color</span>
          <div className="grid grid-cols-2 gap-2">
            {defaultColors.map((c) => {
              const isActive = activeFlavorColorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateFlavorColor(c.id)}
                  title={c.label}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="w-8 h-8 rounded-full border-2 border-black/10" style={{ background: c.hex }} />
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {!showDefaultColorPicker && children && (
        children
      )}

      {!showDefaultColorPicker && !children && flavorColor && (
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Flavor</span>
          <div className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-full border-2 border-black/10 shrink-0"
              style={{ background: flavorColor.swatchCss || flavorColor.hex }}
            />
            <p className="text-[10px] text-muted-foreground">
              From Frosting Flavor — {flavorColor.label}.
            </p>
          </div>
        </div>
      )}

      {/* 2. Sugar Color Mode Switcher */}
      <div>
        {/* Icon + label, same treatment ToolPanel gives its own top-level
            section titles (Cake for Sponge Flavor, Sparkles for Filling,
            Palette for Exterior Finish, etc.) — Sugar Color is rendered
            inline inside those sections rather than as its own Collapsible,
            but it drives the coating color for all of them, so it gets the
            same icon-plus-label treatment to read as an equally important
            choice rather than a plain sub-label. */}
        <span className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Droplet className="w-3.5 h-3.5 text-primary/60" />
          Sugar Color
        </span>
        <div className="grid grid-cols-2 gap-2">
          {SUGAR_COLOR_MODES.map((m) => {
            const active = mode === m.id;
            const isColorOverride = m.id === 'colorOverride';
            const disabledHere = isColorOverride && colorOverrideDisabled;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabledHere}
                onClick={() => !disabledHere && updateMode(m.id)}
                className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
                  disabledHere
                    ? 'opacity-40 cursor-not-allowed bg-muted border-transparent text-muted-foreground'
                    : active
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                }`}
              >
                <span className="block text-xs font-semibold">{m.label}</span>
                {!m.implemented && (
                  <span className={`block text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                    Coming soon
                  </span>
                )}
                {disabledHere && (
                  <span className="block text-[10px] text-muted-foreground/70">
                    Not available
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Color Override Palette (when active) */}
      {usesColor && !colorOverrideDisabled && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Color Override</span>
            <span className="text-[10px] text-muted-foreground">
              {colorPage + 1} / {pageCount} · {Math.max(0, overrideColors.length - ((colorPage + 1) * COLORS_PER_PAGE))} more
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {visibleColors.map((c) => {
              const isActive = activeOverrideColorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateOverrideColor(c.id)}
                  title={`${c.label}${c.price ? ` (+₱${c.price})` : ''}`}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span
                    className="w-8 h-8 rounded-full border-2 border-black/10"
                    style={{ background: c.swatchCss || c.hex }}
                  />
                  <span className="text-xs font-semibold">{c.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => setColorPage((page) => Math.max(0, page - 1))}
              disabled={colorPage === 0}
              aria-label="Previous Color Override colors"
              className="w-8 h-8 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80"
            >
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            <div className="flex gap-1.5" aria-label={`Color Override page ${colorPage + 1} of ${pageCount}`}>
              {Array.from({ length: pageCount }).map((_, page) => (
                <span
                  key={page}
                  className={`w-1.5 h-1.5 rounded-full ${page === colorPage ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setColorPage((page) => Math.min(pageCount - 1, page + 1))}
              disabled={colorPage === pageCount - 1}
              aria-label="Next Color Override colors"
              className="w-8 h-8 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80"
            >
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>
          {activeOverrideColor && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {activeOverrideColor.label}{activeOverrideColor.price ? ` — +₱${activeOverrideColor.price}` : ''}
              {showDefaultColorPicker && activeFlavorColor && (
                <span> (applied over {activeFlavorColor.label} flavor)</span>
              )}
            </p>
          )}
        </div>
      )}

      {usesColor && colorOverrideDisabled && (
        <p className="text-xs text-muted-foreground/80 -mt-2 flex items-start gap-1">
          <span aria-hidden="true">⚠</span>
          <span>{colorOverrideDisabledReason} Your previous selection is kept — switch to a pattern that supports it to use it again.</span>
        </p>
      )}
    </div>
  );
}