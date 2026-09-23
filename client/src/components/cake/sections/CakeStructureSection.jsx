import React from 'react';
import { SIZE_OPTIONS, LAYER_OPTIONS } from '@/lib/cakeConfig';

export default function CakeStructureSection({ structure, realSize, onChange }) {
  const updateSize = (size) => {
    const selectedOption = SIZE_OPTIONS.find(opt => opt.id === size);
    onChange(
      { ...structure, size },
      selectedOption ? selectedOption.dimensions : realSize
    );
  };

  const updateLayers = (layers) => {
    // Reset to uniform if switching to 1 layer
    const newLayerDesign = layers === 1 ? 'uniform' : structure.layerDesign;
    onChange({ ...structure, layers, layerDesign: newLayerDesign }, realSize);
  };

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
        <div className="grid grid-cols-2 gap-2">
          {LAYER_OPTIONS.map((option) => (
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
