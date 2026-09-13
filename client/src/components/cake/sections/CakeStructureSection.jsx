import React from 'react';
import { Link, Unlink } from 'lucide-react';
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

  const toggleLayerDesign = () => {
    const next = structure.layerDesign === 'uniform' ? 'individual' : 'uniform';
    onChange({ ...structure, layerDesign: next }, realSize);
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

      {/* Layer Design - only for 2+ layers */}
      {structure.layers > 1 && (
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">Layer Design</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {structure.layerDesign === 'uniform' ? 'All layers share the same style' : 'Each layer has its own style'}
            </p>
          </div>
          <button
            onClick={toggleLayerDesign}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 transition-all duration-200 ${
              structure.layerDesign === 'individual'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
            }`}
          >
            {structure.layerDesign === 'individual'
              ? <><Unlink className="w-3 h-3" /> Individual</>
              : <><Link className="w-3 h-3" /> Uniform</>
            }
          </button>
        </div>
      )}
    </div>
  );
}