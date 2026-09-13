import React from 'react';
import { FLAVORS, FROSTING_FILLING_FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { FILLING_LAYER_OPTIONS, FILLING_PIPING_DESIGNS } from '@/lib/cakeConfig';
import SetPicker from '../SetPicker';
import SugarColorSection from './SugarColorSection';

const DEFAULT_PIPING = { tip: null, colorId: 'vanilla' };

export default function FillingSection({ filling, structure, exteriorFinish, interiorPreview, activeLayer, onChange, sugarColor, onSugarColorChange }) {
  const isIndividual = structure.layerDesign === 'individual' && structure.layers > 1;
  const piping = filling.piping || DEFAULT_PIPING;

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

  const updatePiping = (changes) => {
    onChange({ ...filling, piping: { ...piping, ...changes } });
  };

  return (
    <div className="space-y-4">
      {/* Filling Layers Selection - includes "None" option. Same card
          styling as Filling Flavor below (rounded-xl, border-2, p-3,
          shadow-lg + scale on the active box) instead of the old thin
          pill buttons — purely a visual match, the None/1/2/3 selection
          logic in updateLayers is unchanged. */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Filling Layers</span>
        <div className="grid grid-cols-4 gap-2">
          {/* None option */}
          <button
            onClick={() => updateLayers(0)}
            className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-xs font-semibold transition-all duration-200 border-2 ${
              !filling.enabled
                ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
            }`}
          >
            None
          </button>
          {/* Layer options */}
          {FILLING_LAYER_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => updateLayers(option.id)}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-xs font-semibold transition-all duration-200 border-2 ${
                filling.enabled && filling.layers === option.id
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
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
              Shown BEFORE Filling Flavor below: every design here is
              piped in the Filling Flavor's own color rather than an
              independently-chosen one (real buttercream piped from the
              filling would naturally match it), so picking the design
              first makes clear up front that flavor below sets the color
              — no separate Piping Color to pick, so that prop is dropped
              here entirely (see fillingPipingColor in configAdapter.js,
              which now resolves the same way for every tip state,
              including None — previously None alone fell back to an
              independent, UI-unreachable colorId stuck on vanilla).
              numberFromNone: None reads as "1", Mashed Circles as "2",
              Mashed Swirls as "3" — opted in just for this picker (see
              SetPicker's docstring for why it's not the shared default).
              No longer disabled based on Exterior Finish style — always
              clickable regardless of Naked/Fully Frosted/Textured
              Buttercream. */}
          <SetPicker
            label="Piping Design"
            sets={FILLING_PIPING_DESIGNS}
            activeSetId={piping.tip}
            onSelectSet={(tip) => updatePiping({ tip })}
            numberFromNone
            showColorPicker={false}
            shape="box"
          />
          {(piping.tip === 'mashedCircles' || piping.tip === 'mashedSwirls') && (
            <p className="text-[10px] text-muted-foreground -mt-2">
              Piped in your Filling Flavor's own color — {isIndividual ? `Layer ${activeLayer + 1}'s` : 'the'} flavor below sets the color, no separate pick needed.
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