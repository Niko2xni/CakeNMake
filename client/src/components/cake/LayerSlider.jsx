import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Tier dimensions per size and layer count — shown as a hint below the controls
const TIER_DIMS = {
  big:   { 1: '8"×5"', 2: '8"×5" + 6"×4"' },
  small: { 1: '6"×5"', 2: '6"×5" + 5"×4"' },
};

export default function LayerSlider({ layers, onChange, cakeSize = 'big', onSizeChange }) {
  return (
    <div className="space-y-4">
      {/* Size picker */}
      <div>
        <p className="text-sm font-heading font-semibold text-foreground/70 mb-2">Cake Size</p>
        <div className="flex gap-2">
          {[
            { key: 'big',   label: '8×5', dims: '8"×5"' },
            { key: 'small', label: '6×5', dims: '6"×5"' },
          ].map(({ key, label, dims }) => (
            <button
              key={key}
              onClick={() => onSizeChange?.(key)}
              className={`flex-1 flex flex-col items-center py-2.5 px-3 rounded-xl border-2 text-xs font-semibold transition-all duration-200 ${
                cakeSize === key
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
            {[1, 2].map((n) => (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`
                  h-8 rounded-lg transition-all duration-300 font-heading font-bold text-sm
                  ${n <= layers
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground'}
                `}
                style={{ width: `${18 + (6 - n) * 4}px` }}
              >
                {n}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 shrink-0"
            onClick={() => onChange(Math.min(2, layers + 1))}
            disabled={layers >= 2}
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