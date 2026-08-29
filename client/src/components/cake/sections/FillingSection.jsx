import React from 'react';
import { FLAVORS, FROSTING_FILLING_FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { FILLING_LAYER_OPTIONS, FILLING_PIPING_DESIGNS } from '@/lib/cakeConfig';
import SetPicker from '../SetPicker';
import SugarColorSection from './SugarColorSection';

const DEFAULT_PIPING = { tip: null, colorId: 'vanilla' };

export default function FillingSection({ filling, structure, exteriorFinish, interiorPreview, activeLayer, onChange, sugarColor, onSugarColorChange }) {
  const isIndividual = structure.layerDesign === 'individual' && structure.layers > 1;
  const piping = filling.piping || DEFAULT_PIPING;

  // Full Frosting covers the filling edge entirely, so piping is hidden.
  // Either way, this only ever controls whether the picker below is *disabled*,
  // never whether the person's chosen tip/color gets cleared — see updatePiping.
  const pipingHidden = exteriorFinish?.style === 'fullyFrosted';

  const updateLayers = (layers) => {
    onChange({ 
      ...filling, 
      enabled: layers > 0,  // Enable if layers > 0, disable if 0 (None)
      layers: layers > 0 ? layers : 1  // Keep layers value even when disabled
    });
  };

  const updateFlavor = (flavor) => {
    if (isIndividual) {
      const newLayerFlavors = [...(filling.layerFlavors || Array(structure.layers).fill('vanilla'))];
      newLayerFlavors[activeLayer] = flavor;
      onChange({ ...filling, layerFlavors: newLayerFlavors });
    } else {
      onChange({ ...filling, flavor });
    }
  };

  const getActiveFlavor = () => {
    if (isIndividual) {
      return (filling.layerFlavors || [])[activeLayer] || 'vanilla';
    }
    return filling.flavor || 'vanilla';
  };

  // Clicking always sets the value, even while the picker is visually
  // disabled — but the UI prevents clicks from reaching here while
  // pipingHidden is true, so the stored value only ever changes on purpose.
  const updatePiping = (changes) => {
    onChange({ ...filling, piping: { ...piping, ...changes } });
  };

  return (
    <div className="space-y-4">
      {/* Filling Layers Selection - includes "None" option */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Filling Layers</span>
        <div className="flex gap-1">
          {/* None option */}
          <button
            onClick={() => updateLayers(0)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              !filling.enabled
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            None
          </button>
          {/* Layer options */}
          {FILLING_LAYER_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => updateLayers(option.id)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                filling.enabled && filling.layers === option.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Only show flavor/piping options if filling is enabled */}
      {filling.enabled && (
        <>
          {/* Piping — how the exposed filling edge between layers is
              piped, using Filling's own design vocabulary (not Edge/Side's
              nozzle-tip list — see FILLING_PIPING_DESIGNS in cakeConfig.js).
              Shown BEFORE Filling Flavor below: Mashed Circles/Mashed
              Swirls are piped in the Filling Flavor's own color instead of
              an independently-chosen Piping Color, so picking the design
              first makes clear up front that flavor is about to double as
              color — not just a leftover ordering.
              numberFromNone: None reads as "1", Mashed Circles as "2",
              Mashed Swirls as "3" — opted in just for this picker (see
              SetPicker's docstring for why it's not the shared default).
              Piping Color is suppressed for Mashed Circles AND Mashed
              Swirls specifically: both designs are piped in the Filling
              Flavor's own color (real buttercream piped from the filling
              itself would naturally match it) rather than an
              independently-chosen decorative color — see
              fillingPipingColor/usesFlavorColor in configAdapter.js.
              Disabled (not removed) when Full Frosting hides the filling
              edge, so switching exterior styles to compare looks never
              costs the person their piping choice. */}
          <SetPicker
            label="Piping Design"
            colorLabel="Piping Color"
            sets={FILLING_PIPING_DESIGNS}
            activeSetId={piping.tip}
            onSelectSet={(tip) => updatePiping({ tip })}
            colorId={piping.colorId}
            onSelectColor={(colorId) => updatePiping({ colorId })}
            disabled={pipingHidden}
            numberFromNone
            showColorPicker={piping.tip !== 'mashedCircles' && piping.tip !== 'mashedSwirls'}
          />
          {(piping.tip === 'mashedCircles' || piping.tip === 'mashedSwirls') && !pipingHidden && (
            <p className="text-[10px] text-muted-foreground -mt-2">
              Piped in your Filling Flavor's own color — {isIndividual ? `Layer ${activeLayer + 1}'s` : 'the'} flavor below sets the color, no separate pick needed.
            </p>
          )}
          {pipingHidden && (
            <p className="text-xs text-muted-foreground/80 -mt-2 flex items-start gap-1">
              <span aria-hidden="true">⚠</span>
              <span>Hidden because Full Frosting covers the filling edge. Your selection is kept — switch to Naked, or turn on Interior Preview, to see it again.</span>
            </p>
          )}

          {/* Filling Flavor — the filling's own eating flavor. For most
              Piping Designs this is unrelated to Piping's decorative color
              above; for Mashed Circles/Mashed Swirls specifically, this
              flavor IS the piping's color too (see the note above). */}
          <SugarColorSection
            sugarColor={sugarColor}
            exteriorFinish={exteriorFinish}
            onChange={onSugarColorChange}
          >
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">
              {isIndividual ? `Layer ${activeLayer + 1} Filling Flavor` : 'Filling Flavor'}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {FROSTING_FILLING_FLAVOR_ORDER.map((flavorId) => {
                const flavor = FLAVORS[flavorId];
                const active = getActiveFlavor() === flavorId;
                return (
                  <button
                    key={flavorId}
                    onClick={() => updateFlavor(flavorId)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full border-2 border-black/10"
                      style={{ backgroundColor: flavor.colors.crumbBase }}
                    />
                    <span className="text-xs font-semibold">{flavor.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          </SugarColorSection>
        </>
      )}
    </div>
  );
}