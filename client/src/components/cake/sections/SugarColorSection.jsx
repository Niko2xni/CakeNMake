import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Droplet } from 'lucide-react';
import { SUGAR_COLOR_MODES, SUGAR_COLORS } from '@/lib/cakeConfig';

// Sugar Color answers "what does the coating look like" — independent of
// exteriorFinish.style ("is there a coating at all") and .flavor ("what
// does it taste like"). The picker is rendered contextually after an
// eligible color-producing choice rather than as its own section.
//
// Only Match Flavor and Pick Color live here now (ids stay 'default'/
// 'colorOverride' internally, see SUGAR_COLOR_MODES in cakeConfig.js) —
// Glaze and Textured Buttercream were split out into their own Surface
// Treatment section (see SurfaceTreatmentSection.jsx) once they turned
// out to answer a coating TECHNIQUE question rather than a color one.
//
// `mode` is exclusive, same pattern as center.mode/edge.mode. Because it's
// a separate field from exteriorFinish.style, Pick Color can be combined
// freely with either Naked or Fully Frosted underneath.
//
// Pick Color's page index, remembered across separate SugarColorSection
// instances (Checkered Pattern → Triangle Pattern, Filling → Exterior
// Finish, etc.) rather than reset to page 1 every time a new one mounts —
// each treatment's Pick Color is its own component instance (conditionally
// rendered based on which mode/pattern is selected), so plain useState(0)
// would forget the page the moment you switched away. A module-level
// variable survives across those mounts/unmounts for the life of the app
// session, which a plain useState can't. Clamped on each mount (see
// colorPage's useState initializer below) since different contexts can
// have different page counts — e.g. Glaze's excludePatternColors palette
// has fewer pages than the full 18-color one Filling/Triangle use.
let lastColorPage = 0;

export default function SugarColorSection({
  sugarColor,
  exteriorFinish,
  onChange,
  children,
  showDefaultColorPicker = false,
  colorOverrideDisabled = false,
  // Glaze's coat is thin/poured, not a full buttercream build, so the six
  // Pattern/multi-tone colors (Marble/Ombré/Rainbow Swirl/Gold Shimmer/
  // Watercolor Pastel Mix/Red-White Gradient — all tagged `isPattern` in
  // cakeConfig.js) don't apply there the way they do on a frosted or
  // piped surface. Filling/Exterior Finish leave this false and keep
  // seeing all 18 override colors; only the Surface Treatment/Glaze call
  // in ToolPanel.jsx's renderSugarColor sets it, dropping the grid to the
  // 12 flat colors from the Plain accents + Designer palette groups.
  excludePatternColors = false,
}) {
  const mode = sugarColor.mode || 'default';

  const updateMode = (nextMode) => {
    // Switching to a mode that doesn't use a color leaves colorId as-is
    // rather than clearing it — same "preserve, don't delete" approach as
    // Filling's piping — so coming back to Pick Color later restores
    // the last choice instead of resetting to nothing.
    onChange({ ...sugarColor, mode: nextMode });
  };

  const updateColor = (colorId) => onChange({ ...sugarColor, colorId });

  // When Pick Color is disabled, treat the section as if it were in
  // Match Flavor mode for rendering purposes too — not just for which
  // pill lights up (see the `active` derivation below). Without this,
  // a `mode` of 'colorOverride' preserved from before disabling (see the
  // "disable, don't delete" comment further down) meant NEITHER the
  // Match Flavor content (gated on mode === 'default') NOR the Pick
  // Color content (gated on !colorOverrideDisabled) would render —
  // just an empty gap under the mode buttons. Falling back to 'default'
  // here restores real Match Flavor content whenever Pick Color is
  // unavailable, regardless of what mode was last stored.
  const effectiveMode = colorOverrideDisabled ? 'default' : mode;
  const usesColor = effectiveMode === 'colorOverride';

  // Pick Color's own palette excludes the six flavor-mirror colors —
  // picking "Pick Color → Vanilla" would just reproduce what Match
  // Flavor mode already gives for free from Exterior Finish's flavor, so
  // keeping them here was pure redundant clutter. When excludePatternColors
  // is set, the six Pattern/multi-tone colors are dropped too, leaving
  // just the 12 flat colors (Plain accents + Designer palette).
  const overrideColors = SUGAR_COLORS.filter((c) =>
    !c.isFlavorMirror && !(excludePatternColors && c.isPattern)
  );
  const defaultColors = SUGAR_COLORS.filter((c) => c.isFlavorMirror);
  const COLORS_PER_PAGE = 6;
  const pageCount = Math.ceil(overrideColors.length / COLORS_PER_PAGE);

  // Lazy initializer (the function form) runs once, at mount, so a fresh
  // instance picks up wherever the last one left off — clamped into this
  // instance's own valid range in case it has fewer pages than whatever
  // context was last open.
  const [colorPage, setColorPageState] = useState(() =>
    Math.max(0, Math.min(lastColorPage, pageCount - 1))
  );
  const setColorPage = (updater) => {
    setColorPageState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      lastColorPage = next;
      return next;
    });
  };

  const visibleColors = overrideColors.slice(
    colorPage * COLORS_PER_PAGE,
    (colorPage + 1) * COLORS_PER_PAGE,
  );

  // Match Flavor has nothing to pick — it just uses whatever Fundamentals'
  // Exterior Finish flavor naturally looks like. SUGAR_COLORS' first six
  // entries are exactly the flavor-mirror colors (same id as the flavor,
  // same hex CakeScene resolves for it), so this reads straight off the
  // shared palette rather than needing a second color source.
  const flavorId = exteriorFinish?.flavor || 'vanilla';
  const flavorColor = SUGAR_COLORS.find((c) => c.id === flavorId);

  return (
    <div className="space-y-4">
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
            const isColorOverride = m.id === 'colorOverride';
            const disabledHere = isColorOverride && colorOverrideDisabled;
            // When Pick Color is disabled, Match Flavor shows as active in
            // its place, regardless of what `mode` is actually storing —
            // it can still be 'colorOverride' underneath from a previous,
            // still-supported variant (see the "disable, don't delete"
            // comment further down), which is exactly why we DON'T touch
            // mode itself here. Without this, returning to a variant like
            // Multi-Color after picking a color elsewhere left neither
            // pill looking selected: Pick Color still "active" in data but
            // rendered disabled, Match Flavor not active since mode wasn't
            // really 'default'. This is purely which pill lights up —
            // switching back to a variant that supports Pick Color again
            // instantly shows the preserved choice, unchanged.
            const active = colorOverrideDisabled ? m.id === 'default' : mode === m.id;
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

      {effectiveMode === 'default' && showDefaultColorPicker && (
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

      {effectiveMode === 'default' && !showDefaultColorPicker && (children || flavorColor) && (
        children || (
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Flavor</span>
          <div className="flex items-center gap-2">
            <span
              className="w-9 h-9 rounded-full border-2 border-black/10 shrink-0"
              style={{ background: flavorColor.swatchCss || flavorColor.hex }}
            />
            <p className="text-[10px] text-muted-foreground">
              From Frosting Flavor — {flavorColor.label}. Switch to Pick Color to choose a different color.
            </p>
          </div>
        </div>
        )
      )}

      {/* Pick Color uses the same labeled card treatment as Flavor, with
          pagination keeping the larger palette compact. usesColor is
          already false whenever colorOverrideDisabled is set (see
          effectiveMode above), so no separate !colorOverrideDisabled
          check is needed here. */}
      {usesColor && (
        <div>
          <div className="mb-2">
            <span className="text-xs text-muted-foreground">Colors</span>
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
              aria-label="Previous colors"
              className="w-8 h-8 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80"
            >
              <ChevronLeft className="w-4 h-4 mx-auto" />
            </button>
            <div className="flex gap-1.5" aria-label={`Pick Color page ${colorPage + 1} of ${pageCount}`}>
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
              aria-label="Next colors"
              className="w-8 h-8 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80"
            >
              <ChevronRight className="w-4 h-4 mx-auto" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
