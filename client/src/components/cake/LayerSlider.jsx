import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tier dimensions per size and layer count — shown as a hint below the controls
const TIER_DIMS = {
  '6x4':           { 1: '6"×4"' },
  '8x6':           { 1: '8"×6"', 2: '8"×6" + 6"×4"' },
  '10x8':         { 1: '10"×8"', 2: '10"×8" + 8"×6"' },
  '12x10':         { 1: '12"×10"', 2: '12"×10" + 10"×8"' },
  // Legacy aliases
  '6x6':           { 1: '6"×4"' },
  '8x8':           { 1: '8"×6"', 2: '8"×6" + 6"×4"' },
  '10x10':         { 1: '10"×8"', 2: '10"×8" + 8"×6"' },
  '12x12':         { 1: '12"×10"', 2: '12"×10" + 10"×8"' },
  miniBento:     { 1: '3.5"×2"' },
  standardBento: { 1: '4"×2"' },
  largeBento:    { 1: '5"×3"' },
  big:             { 1: '8"×6"', 2: '8"×6" + 6"×4"' },
  small:           { 1: '6"×4"' },
};

export default function LayerSlider({ layers, onChange, cakeSize = '8x6', onSizeChange }) {
  const isSingleTierOnly = cakeSize === '6x4' || cakeSize === '6x6' || cakeSize === 'small' || cakeSize === 'miniBento' || cakeSize === 'standardBento' || cakeSize === 'largeBento';
  const handleSizeChange = (key) => {
    onSizeChange?.(key);
    const isTargetSingleTier = key === '6x4' || key === '6x6' || key === 'small' || key === 'miniBento' || key === 'standardBento' || key === 'largeBento';
    if (isTargetSingleTier && layers === 2) {
      onChange(1);
    }
  };

  return (
    <div className="space-y-4">
      {/* Size picker */}
      <div>
        <p className="text-sm font-heading font-semibold text-foreground/70 mb-2">Cake Size</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { key: '6x4',   label: '6×4', dims: '6"×4"' },
            { key: '8x6',   label: '8×6', dims: '8"×6"' },
            { key: '10x8',  label: '10×8', dims: '10"×8"' },
            { key: '12x10', label: '12×10', dims: '12"×10"' },
          ].map(({ key, label, dims }) => (
            <button
              key={key}
              onClick={() => handleSizeChange(key)}
              className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl border-2 text-xs font-semibold transition-all duration-200 ${
                cakeSize === key || (key === '8x6' && cakeSize === '8x8') || (key === '6x4' && cakeSize === '6x6') || (key === '10x8' && cakeSize === '10x10') || (key === '12x10' && cakeSize === '12x12')
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              <span className="text-sm font-bold">{label}</span>
              <span className="text-[10px] font-normal opacity-70 mt-0.5">{dims} base</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer count */}
      <div>
        <p className="text-sm font-heading font-semibold text-foreground/70 mb-2">Cake Layers</p>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            onClick={() => onChange(Math.max(1, layers - 1))}
            disabled={layers <= 1}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <div className="flex-1 flex items-center justify-center gap-1.5">
            {[1, 2].map((n) => {
              const disabledTier = n === 2 && isSingleTierOnly;
              return (
                <button
                  key={n}
                  onClick={() => !disabledTier && onChange(n)}
                  disabled={disabledTier}
                  className={`
                    h-8 rounded-lg transition-all duration-300 font-heading font-bold text-sm
                    ${disabledTier ? 'opacity-30 cursor-not-allowed bg-muted text-muted-foreground' : (
                      n <= layers
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground'
                    )}
                  `}
                  style={{ width: `${18 + (6 - n) * 4}px` }}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            onClick={() => onChange(Math.min(2, layers + 1))}
            disabled={layers >= 2 || isSingleTierOnly}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-1.5">
          {TIER_DIMS[cakeSize]?.[layers] || `${layers} ${layers === 1 ? 'layer' : 'layers'}`}
        </p>
      </div>
    </div>
  );
}
