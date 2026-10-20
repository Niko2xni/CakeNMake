import React, { useState } from 'react';
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
  isBentoStructure,
} from '@/lib/cakeConfig';
import OptionButtonContent from '../OptionButtonContent';
import SugarColorSection from './SugarColorSection';
import { flatTreatment } from '@/lib/treatmentConfig';
import SideDesignIcon from './SideDesignIcons';

export default function SideSection({ side, structure, activeLayer = 0, onChange, sugarColor, onSugarColorChange }) {
  const [activeChevronColorSlot, setActiveChevronColorSlot] = useState('primary');
  const isPetitsFour = isPetitsFourStructure(structure);
  const isBento = isBentoStructure(structure);
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

  const selectTreatment = (key) =>
    updateSide({ ...activeSide, mode: activeSide.mode === key ? null : key });

  const selectVariant = (mode, stateKey, setId, defaultSetId) => {
    const currentSetId = activeSide[stateKey]?.setId;
    const isSelected = activeSide.mode === mode &&
      (currentSetId === setId || (!currentSetId && defaultSetId === setId));

    updateSide({
      ...activeSide,
      mode: isSelected ? null : mode,
      [stateKey]: { ...activeSide[stateKey], setId },
    });
  };

  const selectCheckeredVariant = (setId) =>
    selectVariant('checkeredPattern', 'checkeredPattern', setId, CHECKERED_PATTERN_SETS[0]?.id);

  const selectTriangleVariant = (setId) =>
    selectVariant('trianglePattern', 'trianglePattern', setId, TRIANGLE_PATTERN_SETS[0]?.id);

  const selectChevronVariant = (setId) =>
    selectVariant('chevronPattern', 'chevronPattern', setId, CHEVRON_PATTERN_SETS[0]?.id);

  const selectScatterPearlsVariant = (setId) =>
    selectVariant('scatterPearls', 'scatterPearls', setId, SCATTER_PEARLS_SETS[0]?.id);

  const selectPipingScrollsVariant = (setId) =>
    selectVariant('pipingScrolls', 'pipingScrolls', setId, PIPING_SCROLLS_SETS[0]?.id);

  const selectSunshinePlayVariant = (setId) =>
    selectVariant('sunshinePlay', 'sunshinePlay', setId, SUNSHINE_PLAY_SETS[0]?.id);

  const selectVictorianLambethVariant = (setId) =>
    selectVariant('victorianLambeth', 'victorianLambeth', setId, VICTORIAN_LAMBETH_SETS[0]?.id);

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
    <div className="space-y-6" data-tutorial="side-options">
      {/* Side Treatment */}
      <div>
        <div className="space-y-4">
          {SIDE_TREATMENTS.map((t) => {
            const multiVariant = MULTI_VARIANT_MAP[t.id];
            if (multiVariant) {
              const currentSetId = activeSide[multiVariant.stateKey]?.setId;
              return (
                <React.Fragment key={t.id}>
                  <OptionRow
                    label={tierLabel(isBento && t.bentoLabel ? t.bentoLabel : t.label)}
                    data-tutorial={t.id === 'checkeredPattern' ? 'side-checkered-row' : undefined}
                  >
                    {multiVariant.sets.map((variant, i) => (
                      <Circle
                        key={variant.id}
                        data-tutorial={t.id === 'checkeredPattern' ? `side-checkered-item-${i + 1}` : undefined}
                        data-side-checkered={t.id === 'checkeredPattern' ? 'true' : undefined}
                        active={activeSide.mode === t.id && (currentSetId === variant.id || (!currentSetId && i === 0))}
                        canDeselect
                        onClick={() => multiVariant.select(variant.id)}
                        title={
                          activeSide.mode === t.id && (currentSetId === variant.id || (!currentSetId && i === 0))
                            ? `Remove ${isBento && variant.bentoLabel ? variant.bentoLabel : variant.label}`
                            : isBento && variant.bentoLabel ? variant.bentoLabel : variant.label
                        }
                      >
                        <SideDesignIcon treatmentId={t.id} variantId={variant.id} index={i} />
                      </Circle>
                    ))}
                  </OptionRow>
                  {activeSide.mode === t.id && currentSetId && (
                    t.id === 'chevronPattern' && (currentSetId === 'twoTone' || currentSetId === 'threeTone') ? (
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
                      />
                    )
                  )}
                </React.Fragment>
              );
            }

            return (
              <React.Fragment key={t.id}>
                <OptionRow label={tierLabel(t.label)}>
                  <Circle
                    active={activeSide.mode === t.id}
                    canDeselect
                    onClick={() => selectTreatment(t.id)}
                    title={activeSide.mode === t.id ? `Remove ${t.label}` : t.label}
                  >
                    <SideDesignIcon treatmentId={t.id} variantId="default" index={0} />
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

function ChevronTwoToneColorSection({ activeSlot, onSlotChange, sugarColor, onChange }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSlotChange('primary')}
          className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${activeSlot === 'primary'
              ? 'bg-primary text-primary-foreground border-primary shadow-md'
              : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
            }`}
        >
          <span className="block text-xs font-semibold">1st Color</span>
        </button>
        <button
          type="button"
          onClick={() => onSlotChange('secondary')}
          className={`py-2 px-3 rounded-lg text-left transition-all duration-150 border-2 ${activeSlot === 'secondary'
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

// Name above its circle(s) — matches the sketch's "label, then a row of
// circles beneath it" shape, whether that row has one circle or several.
function OptionRow({ label, children, ...rest }) {
  return (
    <div {...rest}>
      <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Circle({ active, canDeselect = false, onClick, title, children, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      {...rest}
      className={`relative w-9 h-9 rounded-full p-0 flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${active
          ? 'bg-primary text-primary-foreground border-primary shadow-md'
          : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
        }`}
    >
      <OptionButtonContent selected={active} canDeselect={canDeselect} label={title}>
        {children}
      </OptionButtonContent>
    </button>
  );
}