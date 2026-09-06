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

export default function SideSection({ side, onChange, sugarColor, onSugarColorChange }) {
  const mode = side.mode || null;

  const selectTreatment = (key) => onChange({ ...side, mode: key });
  const clearTreatment = () => onChange({ ...side, mode: null });

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
        <div className="text-center mb-3">
          <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
            Side Treatment
          </span>
        </div>

        <NoneButton active={!mode} onClick={clearTreatment} />

        <div className="space-y-4 mt-4">
          {SIDE_TREATMENTS.map((t) => {
            const multiVariant = MULTI_VARIANT_MAP[t.id];
            if (multiVariant) {
              const currentSetId = side[multiVariant.stateKey]?.setId;
              return (
                <React.Fragment key={t.id}>
                  <OptionRow label={t.label}>
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
                      colorOverrideDisabled={
                        (t.id === 'chevronPattern' && currentSetId === 'multiColor') ||
                        (t.id === 'sunshinePlay' && currentSetId === 'rainbowArc')
                      }
                      colorOverrideDisabledReason={
                        (t.id === 'sunshinePlay' && currentSetId === 'rainbowArc')
                          ? 'Rainbow Arc uses its own fixed rainbow palette — Color Override has no effect on it.'
                          : (t.id === 'chevronPattern' && currentSetId === 'multiColor')
                          ? 'Multi-Color uses its own fixed palette per row — Color Override has no effect on it.'
                          : ''
                      }
                    />
                  )}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={t.id}>
                <OptionRow label={t.label}>
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

function NoneButton({ active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
      }`}
    >
      None
    </button>
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