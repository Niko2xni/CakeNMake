import React from 'react';
import { Link, Unlink } from 'lucide-react';
import { isPetitsFourStructure } from '@/lib/cakeConfig';

export default function TierDesignControl({ structure, onChange, onToggle }) {
  const toggleTierDesign = () => {
    const nextDesign = structure.layerDesign === 'individual' ? 'uniform' : 'individual';
    if (onToggle) {
      onToggle(nextDesign);
      return;
    }
    onChange?.({
      ...structure,
      layerDesign: nextDesign,
    });
  };

  const isPetitsFour = isPetitsFourStructure(structure);

  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
          {isPetitsFour ? 'Variation Design' : 'Tier Design'}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {isPetitsFour
            ? (structure.layerDesign === 'uniform' ? 'All 4 pieces share the same style' : 'Each piece has its own style')
            : (structure.layerDesign === 'uniform' ? 'All tiers share the same style' : 'Each tier has its own style')
          }
        </p>
      </div>
      <button
        type="button"
        onClick={toggleTierDesign}
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
  );
}

