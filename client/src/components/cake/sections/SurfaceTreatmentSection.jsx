import React from 'react';
import { X } from 'lucide-react';
import { SURFACE_TREATMENT_MODES, GLAZE_PATTERNS, PETIT_FOURS_GLAZE_PATTERNS, getSurfaceTreatmentPattern, isPetitsFourStructure } from '@/lib/cakeConfig';
import { flatTreatment } from '@/lib/treatmentConfig';
import SurfaceDesignIcon from './SurfaceDesignIcons';

// Surface Treatment — Glaze. An overlay layer, independent of both Sugar
// Color (a color choice) and Exterior Finish's `style` (the base coat
// itself) — see cakeConfig.js's comment on `exteriorFinish` for why
// Textured Buttercream ended up over there instead of staying here: it
// turned out to be an alternate base coat, the same question Naked/Fully
// Frosted already answer, not an overlay technique. Glaze genuinely is the
// latter — it can go over any of the three Exterior Finish styles (Naked
// + Glaze, Fully Frosted + Glaze, Textured Buttercream + Glaze are all
// valid combinations), which is exactly why it stayed independent instead
// of moving with Textured Buttercream.
//
// Rendered as a single toggle rather than SugarColorSection's multi-button
// grid, since there's only one real MODE today (Glaze itself). SURFACE_
// TREATMENT_MODES is still a list (not a plain boolean) because this
// "genre" of combinable overlays is expected to grow — when a second one
// lands, this goes back to a small grid rather than the data model needing
// to change. Glaze's own SHAPE, though, does already have six real
// variants — see the Pattern picker below, which uses the same list-of-
// variants shape ExteriorFinishSection's Buttercream Texture picker uses
// for Ridged Comb/Ribbon Wrap.
export default function SurfaceTreatmentSection({ surfaceTreatment, onChange, isIndividual = false, activeLayer = 0, structure = null }) {
  const isPetitsFour = isPetitsFourStructure(structure);
  const sectionLabel = isIndividual
    ? (isPetitsFour ? `Variation ${activeLayer + 1} Drip` : `Tier ${activeLayer + 1} Drip`)
    : 'Surface Treatment';
  const activeTreatment = flatTreatment(isIndividual
    ? (surfaceTreatment.layerTreatments?.[activeLayer] || surfaceTreatment)
    : surfaceTreatment);
  const mode = activeTreatment.mode || null;
  const glaze = SURFACE_TREATMENT_MODES.find((m) => m.id === 'glaze');
  const active = mode === 'glaze';
  const minSlots = isPetitsFour ? 4 : 2;
  const patternSet = isPetitsFour ? 'petitsFour' : 'standard';
  const otherPatternSet = isPetitsFour ? 'standard' : 'petitsFour';
  const patternOptions = isPetitsFour ? PETIT_FOURS_GLAZE_PATTERNS : GLAZE_PATTERNS;
  const resolvedPattern = getSurfaceTreatmentPattern(activeTreatment, structure);
  // The scene falls back to a default pattern when the stored one doesn't belong
  // to this format's list (e.g. Petit Fours reading a standard-cake pattern id
  // such as 'longGaps'). Mirror that here so the default button shows as
  // selected instead of every button looking unselected.
  const selectedPattern = patternOptions.some((o) => o.id === resolvedPattern)
    ? resolvedPattern
    : patternOptions[0]?.id;

  const toggleGlaze = () => {
    const nextTreatment = { ...activeTreatment, mode: active ? null : 'glaze' };
    onChange(isIndividual
      ? {
          ...surfaceTreatment,
          layerTreatments: Object.assign(
            Array.from({ length: Math.max(minSlots, surfaceTreatment.layerTreatments?.length || 0) }, (_, index) => (
              flatTreatment(surfaceTreatment.layerTreatments?.[index] || { mode: null, pattern: 'longGaps' })
            )),
            { [activeLayer]: nextTreatment },
          ),
        }
      : {
          ...nextTreatment,
          layerTreatments: Array.from({ length: minSlots }, () => ({ ...nextTreatment })),
        });
  };

  const updatePattern = (pattern) => {
    const otherPatterns = isPetitsFour ? GLAZE_PATTERNS : PETIT_FOURS_GLAZE_PATTERNS;
    const patternsByFormat = { ...(activeTreatment.patternsByFormat || {}) };
    if (!patternsByFormat[otherPatternSet] && otherPatterns.some(({ id }) => id === activeTreatment.pattern)) {
      patternsByFormat[otherPatternSet] = activeTreatment.pattern;
    }
    patternsByFormat[patternSet] = pattern;
    const nextTreatment = { ...activeTreatment, pattern, patternsByFormat };
    onChange(isIndividual
      ? {
          ...surfaceTreatment,
          layerTreatments: Object.assign(
            Array.from({ length: Math.max(minSlots, surfaceTreatment.layerTreatments?.length || 0) }, (_, index) => (
              flatTreatment(surfaceTreatment.layerTreatments?.[index] || { mode: null, pattern: 'longGaps' })
            )),
            { [activeLayer]: nextTreatment },
          ),
        }
      : {
          ...nextTreatment,
          layerTreatments: Array.from({ length: minSlots }, () => ({ ...nextTreatment })),
        });
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">{sectionLabel}</span>
        <button
          type="button"
          data-tutorial="surface-treatment-toggle"
          data-glaze-toggle="true"
          onClick={toggleGlaze}
          title={active ? `Turn off ${glaze.label}` : undefined}
          aria-label={active ? `Turn off ${glaze.label}` : undefined}
          className={`w-full py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
            active
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
          }`}
        >
          {/* toggleGlaze clears the mode when Glaze is already active, so the
              selected button swaps its label for an X — the shared "click to
              remove this" affordance (same as Center's armed tools and
              Edge's active design circles). Mandatory radio-style options
              that can't be deselected keep their labels instead. */}
          {active ? (
            <X className="mx-auto block h-5 w-5" strokeWidth={3} aria-hidden="true" />
          ) : (
            <span className="block text-xs font-semibold">{glaze.label}</span>
          )}
          {!glaze.implemented && (
            <span className={`block text-[10px] ${active ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
              Coming soon
            </span>
          )}
        </button>
      </div>

      {/* Pattern — how far the poured coat reaches down and how that reach
          varies around the cake (buildGlazeGeometry's `carve` option in
          CakeScene.jsx). Shown before Color, same ordering FillingSection
          uses for Piping Design before Piping Color: pick the shape first,
          then what it's colored. */}
      {active && (
        <div>
          <span className="text-xs text-muted-foreground mb-2 block">Pattern</span>
          {/* Secondary tier: smaller grid-of-chips (same style as Sugar
              Color's Match Flavor/Pick Color buttons and Exterior Finish's
              Buttercream Texture — grid-cols-2, py-2/px-3/rounded-lg)
              rather than a full-width px-4/py-3/rounded-xl row per option.
              This only exists once Glaze is already toggled on above, so it
              needs to read as a nested sub-choice, not another top-level
              option list at the same visual weight as the Glaze toggle. */}
          <div className="grid grid-cols-2 gap-2">
            {patternOptions.map((pattern) => {
              const isActive = selectedPattern === pattern.id;
              return (
                <button
                  key={pattern.id}
                  type="button"
                  onClick={() => updatePattern(pattern.id)}
                  title={pattern.label}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl p-2.5 text-center transition-all duration-200 border-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                      : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30 hover:bg-muted/80'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full p-0.5 border flex items-center justify-center flex-shrink-0 ${
                    isActive
                      ? 'border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground'
                      : 'border-border/60 bg-background/50 text-foreground'
                  }`}>
                    <SurfaceDesignIcon patternId={pattern.id} className="w-full h-full" />
                  </div>
                  <span className="block text-xs font-semibold leading-tight line-clamp-2">
                    {pattern.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}