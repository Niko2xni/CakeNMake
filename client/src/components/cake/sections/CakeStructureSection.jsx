import React from 'react';
import { SIZE_OPTIONS, LAYER_OPTIONS } from '@/lib/cakeConfig';

export default function CakeStructureSection({ structure, realSize, onChange }) {
  // 2 Tiers isn't offered on 6×4 ('small') — see the filtered
  // availableLayerOptions below. If someone already has 2 Tiers set and
  // switches size to 6×4, force it back down to 1 Tier right here rather
  // than leaving an invalid size+tier combo on the config that the Cake
  // Tiers row itself no longer even shows a button for. layerDesign reset
  // to 'uniform' mirrors updateLayers' own reset below for the same
  // "just went to 1 tier" case.
  const updateSize = (size) => {
    const selectedOption = SIZE_OPTIONS.find(opt => opt.id === size);
    const forcedLayers = size === 'small' && structure.layers === 2 ? 1 : structure.layers;
    const forcedLayerDesign = forcedLayers === 1 ? 'uniform' : structure.layerDesign;
    onChange(
      { ...structure, size, layers: forcedLayers, layerDesign: forcedLayerDesign },
      selectedOption ? selectedOption.dimensions : realSize
    );
  };

  const updateLayers = (layers) => {
    // Reset to uniform if switching to 1 layer
    const newLayerDesign = layers === 1 ? 'uniform' : structure.layerDesign;
    onChange({ ...structure, layers, layerDesign: newLayerDesign }, realSize);
  };

  const availableLayerOptions = structure.size === 'small'
    ? LAYER_OPTIONS.filter((option) => option.id === 1)
    : LAYER_OPTIONS;

  return (
    <div className="space-y-4">
      {/* Cake Size */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Cake Size</span>
        <div className="grid grid-cols-2 gap-2">
          {SIZE_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => updateSize(option.id)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                structure.size === option.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cake Layers */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Cake Tiers</span>
        <div className={`grid gap-2 ${availableLayerOptions.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {availableLayerOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => updateLayers(option.id)}
              className={`py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                structure.layers === option.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}