import React from 'react';
import {
  SIDE_TREATMENTS,
  CHECKERED_PATTERN_SETS,
  TRIANGLE_PATTERN_SETS,
  CHEVRON_PATTERN_SETS,
  SCATTER_PEARLS_SETS,
  PIPING_SCROLLS_SETS,
  SUNSHINE_PLAY_SETS,
  VICTORIAN_LAMBETH_SETS,
} from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';

export default function SideSection({ side, structure, activeLayer = 0, onChange, sugarColor, onSugarColorChange }) {
  const mode = side.mode || null;
  const isIndividual = structure?.layerDesign === 'individual' && structure?.layers > 1;
  const tierLabel = (label) => (isIndividual ? `Tier ${activeLayer + 1} ${label}` : label);

  const selectTreatment = (key) => onChange({ ...side, mode: key });

  const selectCheckeredVariant = (setId) =>
    onChange({ ...side, mode: 'checkeredPattern', checkeredPattern: { ...side.checkeredPattern, setId } });

  const selectTriangleVariant = (setId) =>
    onChange({ ...side, mode: 'trianglePattern', trianglePattern: { ...side.trianglePattern, setId } });

  const selectChevronVariant = (setId) =>
    onChange({ ...side, mode: 'chevronPattern', chevronPattern: { ...side.chevronPattern, setId } });

  const selectScatterPearlsVariant = (setId) =>
    onChange({ ...side, mode: 'scatterPearls', scatterPearls: { ...side.scatterPearls, setId } });

  const selectPipingScrollsVariant = (setId) =>
    onChange({ ...side, mode: 'pipingScrolls', pipingScrolls: { ...side.pipingScrolls, setId } });

  const selectSunshinePlayVariant = (setId) =>
    onChange({ ...side, mode: 'sunshinePlay', sunshinePlay: { ...side.sunshinePlay, setId } });

  const selectVictorianLambethVariant = (setId) =>
    onChange({ ...side, mode: 'victorianLambeth', victorianLambeth: { ...side.victorianLambeth, setId } });

  const MULTI_VARIANT_MAP = {
    checkeredPattern: { sets: CHECKERED_PATTERN_SETS, select: selectCheckeredVariant, stateKey: 'checkeredPattern' },
    trianglePattern: { sets: TRIANGLE_PATTERN_SETS, select: selectTriangleVariant, stateKey: 'trianglePattern' },
    chevronPattern: { sets: CHEVRON_PATTERN_SETS, select: selectChevronVariant, stateKey: 'chevronPattern' },
    scatterPearls: { sets: SCATTER_PEARLS_SETS, select: selectScatterPearlsVariant, stateKey: 'scatterPearls' },
    pipingScrolls: { sets: PIPING_SCROLLS_SETS, select: selectPipingScrollsVariant, stateKey: 'pipingScrolls' },
    sunshinePlay: { sets: SUNSHINE_PLAY_SETS, select: selectSunshinePlayVariant, stateKey: 'sunshinePlay' },
    victorianLambeth: { sets: VICTORIAN_LAMBETH_SETS, select: selectVictorianLambethVariant, stateKey: 'victorianLambeth' },
  };

  return (
    <div className="space-y-6">
      {/* Side Treatment */}
      <div>
        <div className="space-y-4">
          {SIDE_TREATMENTS.map((t) => {
            const multiVariant = MULTI_VARIANT_MAP[t.id];
            if (multiVariant) {
              const currentSetId = side[multiVariant.stateKey]?.setId;
              return (
                <React.Fragment key={t.id}>
                  <OptionRow label={tierLabel(t.label)}>
                    {multiVariant.sets.map((variant, i) => (
                      <Circle
                        key={variant.id}
                        active={mode === t.id && (currentSetId === variant.id || (!currentSetId && i === 0))}
                        onClick={() => multiVariant.select(variant.id)}
                        title={variant.label}
                      >
                        {i + 1}
                      </Circle>
                    ))}
                  </OptionRow>
                  {mode === t.id && currentSetId && (
                    <SugarColorSection
                      sugarColor={sugarColor}
                      onChange={onSugarColorChange}
                      showDefaultColorPicker
                      // Pick Color stays disabled (silently — Sugar
                      // Color no longer renders an explanatory paragraph
                      // for this, so Match Flavor's own content shows
                      // normally instead of a warning) only for the sets
                      // whose colors are still hard-coded rather than
                      // threaded through: Chevron's Multi-Color, and
                      // Sunshine Play's Assorted Star Burst. Assorted
                      // Starry Rainbow and plain Rainbow Arc both thread
                      // colorHex/colorId through fully now (see
                      // sunshinePlayHelpers.js), so neither is disabled
                      // here anymore — only Assorted Star Burst's fixed
                      // ASSORTED_STAR_COLORS palette still is.
                      colorOverrideDisabled={
                        (t.id === 'chevronPattern' && currentSetId === 'multiColor') ||
                        (t.id === 'sunshinePlay' && currentSetId === 'assortedStarBurst')
                      }
                    />
                  )}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={t.id}>
                <OptionRow label={tierLabel(t.label)}>
                  <Circle active={mode === t.id} onClick={() => selectTreatment(t.id)} title={t.label}>
                    1
                  </Circle>
                </OptionRow>
                {mode === t.id && (
                  <SugarColorSection
                    sugarColor={sugarColor}
                    onChange={onSugarColorChange}
                    showDefaultColorPicker
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// Name above its circle(s) — matches the sketch's "label, then a row of
// circles beneath it" shape, whether that row has one circle or several.
function OptionRow({ label, children }) {
  return (
    <div>
      <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Circle({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-md'
          : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
      }`}
    >
      {children}
    </button>
  );
}
