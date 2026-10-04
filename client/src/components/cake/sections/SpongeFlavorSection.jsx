import React from 'react';
import { FLAVORS, FLAVOR_ORDER } from '@/lib/cakeFlavors';

export default function SpongeFlavorSection({ sponge, structure, activeLayer, onChange }) {
  const isIndividual = structure.layerDesign === 'individual' && structure.layers > 1;

  const updateFlavor = (flavor) => {
    if (isIndividual) {
      const newLayerFlavors = [...(sponge.layerFlavors || Array(structure.layers).fill('vanilla'))];
      newLayerFlavors[activeLayer] = flavor;
      onChange({ ...sponge, layerFlavors: newLayerFlavors });
    } else {
      onChange({
        ...sponge,
        flavor,
        layerFlavors: Array(structure?.layers || 2).fill(flavor),
      });
    }
  };

  const getActiveFlavor = () => {
    if (isIndividual) {
      return (sponge.layerFlavors || [])[activeLayer] || 'vanilla';
    }
    return sponge.flavor || 'vanilla';
  };

  return (
    <div className="space-y-4">
      {/* Flavor Selection */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">
          {isIndividual ? `Tier ${activeLayer + 1} Flavor` : 'Sponge Flavor'}
        </span>
        <div className="grid grid-cols-2 gap-2">
          {FLAVOR_ORDER.map((flavorId) => {
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
    </div>
  );
}
