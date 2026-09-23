import React from 'react';
import { SURFACE_TREATMENT_MODES, GLAZE_PATTERNS } from '@/lib/cakeConfig';

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
export default function SurfaceTreatmentSection({ surfaceTreatment, onChange, isIndividual = false, activeLayer = 0 }) {
  const sectionLabel = isIndividual ? `Tier ${activeLayer + 1} Glaze` : 'Surface Treatment';
  const activeTreatment = isIndividual
    ? (surfaceTreatment.layerTreatments?.[activeLayer] || surfaceTreatment)
    : surfaceTreatment;
  const mode = activeTreatment.mode || null;
  const glaze = SURFACE_TREATMENT_MODES.find((m) => m.id === 'glaze');
  const active = mode === 'glaze';

  const toggleGlaze = () => {
    const nextTreatment = { ...activeTreatment, mode: active ? null : 'glaze' };
    onChange(isIndividual
      ? {
          ...surfaceTreatment,
          layerTreatments: Object.assign(
            Array.from({ length: Math.max(2, surfaceTreatment.layerTreatments?.length || 0) }, (_, index) => (
              surfaceTreatment.layerTreatments?.[index] || { mode: null, pattern: 'longGaps' }
            )),
            { [activeLayer]: nextTreatment },
          ),
        }
      : nextTreatment);
  };

  const updatePattern = (pattern) => {
    const nextTreatment = { ...activeTreatment, pattern };
    onChange(isIndividual
      ? {
          ...surfaceTreatment,
          layerTreatments: Object.assign(
            Array.from({ length: Math.max(2, surfaceTreatment.layerTreatments?.length || 0) }, (_, index) => (
              surfaceTreatment.layerTreatments?.[index] || { mode: null, pattern: 'longGaps' }
            )),
            { [activeLayer]: nextTreatment },
          ),
        }
      : nextTreatment);
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">{sectionLabel}</span>
        <button
          type="button"
          onClick={toggleGlaze}
          className={`w-full py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
            active
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
          }`}
        >
          <span className="block text-xs font-semibold">{glaze.label}</span>
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
            {GLAZE_PATTERNS.map((pattern) => {
              const isActive = (activeTreatment.pattern || 'longGaps') === pattern.id;
              return (
                <button
                  key={pattern.id}
                  type="button"
                  onClick={() => updatePattern(pattern.id)}
                  className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-md'
                      : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                  }`}
                >
                  <span className="block text-xs font-semibold">{pattern.label}</span>
                  <span className={`block text-[10px] mt-0.5 ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground/70'}`}>
                    {pattern.description}
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
