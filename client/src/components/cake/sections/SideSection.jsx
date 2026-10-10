import React, { useState } from 'react';
import { Droplet } from 'lucide-react';
import {
  SIDE_TREATMENTS,
  CHECKERED_PATTERN_SETS,
  TRIANGLE_PATTERN_SETS,
  CHEVRON_PATTERN_SETS,
  SCATTER_PEARLS_SETS,
  PIPING_SCROLLS_SETS,
  SUNSHINE_PLAY_SETS,
  VICTORIAN_LAMBETH_SETS,
  isPetitsFourStructure,
} from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';
import { flatTreatment } from '@/lib/treatmentConfig';

export default function SideSection({ side, structure, activeLayer = 0, onChange, sugarColor, onSugarColorChange }) {
  const [activeChevronColorSlot, setActiveChevronColorSlot] = useState('primary');
  const isPetitsFour = isPetitsFourStructure(structure);
  const isIndividual = structure?.layerDesign === 'individual' && (structure?.layers > 1 || isPetitsFour);
  const tierCount = isPetitsFour ? 4 : (structure?.layers || 2);
  const tierLabel = (label) => (isIndividual ? (isPetitsFour ? `Variation ${activeLayer + 1} ${label}` : `Tier ${activeLayer + 1} ${label}`) : label);
  const activeSide = isIndividual ? (side.layerTreatments?.[activeLayer] || side) : side;

  const updateSide = (nextSide) => {
    nextSide = flatTreatment(nextSide);
    if (!isIndividual) {
      const layersCount = Math.max(tierCount, 2);
      const layerTreatments = Array.from(
        { length: layersCount },
        () => ({ ...nextSide })
      );
      onChange({ ...nextSide, layerTreatments });
      return;
    }

    const layerTreatments = Array.from(
      { length: Math.max(tierCount, side.layerTreatments?.length || 0) },
      (_, index) => flatTreatment(side.layerTreatments?.[index] || side),
    );
    layerTreatments[activeLayer] = nextSide;
    onChange({ ...side, layerTreatments });
  };

  const selectTreatment = (key) => updateSide({ ...activeSide, mode: key });

  const selectCheckeredVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'checkeredPattern', checkeredPattern: { ...activeSide.checkeredPattern, setId } });

  const selectTriangleVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'trianglePattern', trianglePattern: { ...activeSide.trianglePattern, setId } });

  const selectChevronVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'chevronPattern', chevronPattern: { ...activeSide.chevronPattern, setId } });

  const selectScatterPearlsVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'scatterPearls', scatterPearls: { ...activeSide.scatterPearls, setId } });

  const selectPipingScrollsVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'pipingScrolls', pipingScrolls: { ...activeSide.pipingScrolls, setId } });

  const selectSunshinePlayVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'sunshinePlay', sunshinePlay: { ...activeSide.sunshinePlay, setId } });

  const selectVictorianLambethVariant = (setId) =>
    updateSide({ ...activeSide, mode: 'victorianLambeth', victorianLambeth: { ...activeSide.victorianLambeth, setId } });

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
              const currentSetId = activeSide[multiVariant.stateKey]?.setId;
              return (
                <React.Fragment key={t.id}>
                  <OptionRow label={tierLabel(t.label)}>
                    {multiVariant.sets.map((variant, i) => (
                      <Circle
                        key={variant.id}
                        active={activeSide.mode === t.id && (currentSetId === variant.id || (!currentSetId && i === 0))}
                        onClick={() => multiVariant.select(variant.id)}
                        title={variant.label}
                      >
                        {i + 1}
                      </Circle>
                    ))}
                  </OptionRow>
                  {activeSide.mode === t.id && currentSetId && (
                    t.id === 'chevronPattern' && currentSetId === 'multiColor' ? (
                      <AssortedColorSection />
                    ) : t.id === 'sunshinePlay' && (currentSetId === 'assortedStarBurst' || currentSetId === 'assortedStarryRainbow') ? (
                      <AssortedColorSection />
                    ) : t.id === 'chevronPattern' && currentSetId === 'twoTone' ? (
                      <ChevronTwoToneColorSection
                        activeSlot={activeChevronColorSlot}
                        onSlotChange={setActiveChevronColorSlot}
                        sugarColor={activeChevronColorSlot === 'primary'
                          ? sugarColor
                          : {
                              mode: activeSide.chevronPattern?.secondaryColorMode || 'colorOverride',
                              colorId: activeSide.chevronPattern?.secondaryColorId || 'red',
                            }}
                        onChange={activeChevronColorSlot === 'primary'
                          ? onSugarColorChange
                          : (nextSugarColor) => updateSide({
                              ...activeSide,
                              chevronPattern: {
                                ...activeSide.chevronPattern,
                                secondaryColorId: nextSugarColor.colorId || 'red',
                                secondaryColorMode: nextSugarColor.mode || 'colorOverride',
                              },
                            })}
                      />
                    ) : (
                      <SugarColorSection
                        sugarColor={sugarColor}
                        onChange={onSugarColorChange}
                        showDefaultColorPicker
                        // Pick Color stays disabled (silently — Sugar
                        // Color no longer renders an explanatory paragraph
                        // for this, so Match Flavor's own content shows
                        // normally instead of a warning) only for Sunshine
                        // Play's Assorted Star Burst, whose colors are still
                        // hard-coded rather than threaded through.
                        colorOverrideDisabled={
                          t.id === 'sunshinePlay' && currentSetId === 'assortedStarBurst'
                        }
                      />
                    )
                  )}
                </React.Fragment>
              );
            }


function AssortedColorSection() {
  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
          <Droplet className="w-3.5 h-3.5 text-primary/60" />
          Assorted Color
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed="true"
            className="flex flex-col items-center gap-1.5 rounded-xl p-3 text-left border-2 bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]"
          >
            <span
              className="w-8 h-8 rounded-full border-2 border-black/10"
              style={{ background: 'linear-gradient(90deg, #D6293E 0 25%, #2C3E5C 25% 50%, #C9A24B 50% 75%, #2D7A45 75% 100%)' }}
            />
            <span className="text-xs font-semibold">Plains</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronTwoToneColorSection({ activeSlot, onSlotChange, sugarColor, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSlotChange('primary')}
          className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
            activeSlot === 'primary'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
          }`}
        >
          <span className="block text-xs font-semibold">1st Color</span>
        </button>
        <button
          type="button"
          onClick={() => onSlotChange('secondary')}
          className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${
            activeSlot === 'secondary'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
          }`}
        >
          <span className="block text-xs font-semibold">2nd Color</span>
        </button>
      </div>
      <SugarColorSection
        sugarColor={sugarColor}
        onChange={onChange}
        showDefaultColorPicker
      />
    </div>
  );
}
            return (
              <React.Fragment key={t.id}>
                <OptionRow label={tierLabel(t.label)}>
                  <Circle active={activeSide.mode === t.id} onClick={() => selectTreatment(t.id)} title={t.label}>
                    1
                  </Circle>
                </OptionRow>
                {activeSide.mode === t.id && (
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
