import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { SUGAR_COLOR_MODES, SUGAR_COLORS } from '@/lib/cakeConfig';

// Sugar Color answers "what does the coating look like" — independent of
// exteriorFinish.style ("is there a coating at all") and .flavor ("what
// does it taste like"). The picker is rendered contextually after an
// eligible color-producing choice rather than as its own section.
//
// Only Default and Color Override live here now — Glaze and Textured
// Buttercream were split out into their own Surface Treatment section
// (see SurfaceTreatmentSection.jsx) once they turned out to answer a
// coating TECHNIQUE question rather than a color one.
//
// `mode` is exclusive, same pattern as center.mode/edge.mode. Because it's
// a separate field from exteriorFinish.style, Color Override can be
// combined freely with either Naked or Fully Frosted underneath.
//
export default function SugarColorSection({
  sugarColor,
  exteriorFinish,
  onChange,
  children,
  showDefaultColorPicker = false,
  colorOverrideDisabled = false,
  colorOverrideDisabledReason = 'Color Override has no effect on this pattern.',
}) {
  const [colorPage, setColorPage] = useState(0);
  const mode = sugarColor.mode || 'default';

  const updateMode = (nextMode) => {
    // Switching to a mode that doesn't use a color leaves colorId as-is
    // rather than clearing it — same "preserve, don't delete" approach as
    // Filling's piping — so coming back to Color Override later restores
    // the last choice instead of resetting to nothing.
    onChange({ ...sugarColor, mode: nextMode });
  };

  const updateColor = (colorId) => onChange({ ...sugarColor, colorId });

  const usesColor = mode === 'colorOverride';
  const activeColor = SUGAR_COLORS.find((c) => c.id === sugarColor.colorId);

  // Color Override's own palette excludes the six flavor-mirror colors —
  // picking "Color Override → Vanilla" would just reproduce what Default
  // mode already gives for free from Exterior Finish's flavor, so keeping
  // them here was pure redundant clutter. activeColor above still checks
  // the full SUGAR_COLORS list (not this filtered one), so if a config
  // saved before this change has one of those six stored as colorId, its
  // swatch/label still resolves correctly — it just won't reappear in the
  // grid if the person clears and re-picks.
  const overrideColors = SUGAR_COLORS.filter((c) => !c.isFlavorMirror);
  const defaultColors = SUGAR_COLORS.filter((c) => c.isFlavorMirror);
  const COLORS_PER_PAGE = 6;
  const pageCount = Math.ceil(overrideColors.length / COLORS_PER_PAGE);
  const visibleColors = overrideColors.slice(
    colorPage * COLORS_PER_PAGE,
    (colorPage + 1) * COLORS_PER_PAGE,
  );

  // Default has nothing to pick — it just uses whatever Fundamentals'
  // Exterior Finish flavor naturally looks like. SUGAR_COLORS' first six
  // entries are exactly the flavor-mirror colors (same id as the flavor,
  // same hex CakeScene resolves for it), so this reads straight off the
  // shared palette rather than needing a second color source.
  const flavorId = exteriorFinish?.flavor || 'vanilla';
  const flavorColor = SUGAR_COLORS.find((c) => c.id === flavorId);

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Sugar Color</span>
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

      {mode === 'default' && showDefaultColorPicker && (
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Flavor Color</span>
          <div className="grid grid-cols-2 gap-2">
            {defaultColors.map((c) => {
              const isActive = (sugarColor.colorId || 'vanilla') === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateColor(c.id)}
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

      {mode === 'default' && !showDefaultColorPicker && (children || flavorColor) && (
        children || (
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Flavor</span>
          <div className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-full border-2 border-black/10 shrink-0"
              style={{ background: flavorColor.swatchCss || flavorColor.hex }}
            />
            <p className="text-[10px] text-muted-foreground">
              From Frosting Flavor — {flavorColor.label}. Switch to Color Override to choose a different color.
            </p>
          </div>
        </div>
        )
      )}

      {/* Color Override uses the same labeled card treatment as Flavor, with
          pagination keeping the larger palette compact. */}
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
              const isActive = sugarColor.colorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => updateColor(c.id)}
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
          {activeColor && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {activeColor.label}{activeColor.price ? ` — +₱${activeColor.price}` : ''}
            </p>
          )}
        </div>
      )}

      {/* mode can still be 'colorOverride' in storage even when disabled here
          (e.g. the person picked Color Override, then switched to a variant
          like Multi-Color that doesn't support it) — same "disable, don't
          delete" approach as pipingHidden in FillingSection.jsx, so their
          choice is restored automatically if they switch to a variant that
          supports it again, instead of silently resetting to Default. */}
      {usesColor && colorOverrideDisabled && (
        <p className="text-xs text-muted-foreground/80 -mt-2 flex items-start gap-1">
          <span aria-hidden="true">⚠</span>
          <span>{colorOverrideDisabledReason} Your previous selection is kept — switch to a pattern that supports it to use it again.</span>
        </p>
      )}
    </div>
  );
}