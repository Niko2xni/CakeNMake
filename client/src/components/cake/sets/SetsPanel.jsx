import React from 'react';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';


const SETS = [
  {
    category: 'Skirts',
    items: [
      {
        key: 'whippedSkirt',
        emoji: '🍦',
        label: 'Whipped Skirt',
        preview: 'Fluffy swag skirt wrapping each layer',
        glossy: false,
      },
    ],
  },
  {
    category: 'Themed Designs',
    items: [
      {
        key: 'tuxedo',
        emoji: '🎩',
        label: 'Tuxedo',
        preview: 'Bow tie, lapels & buttons on the cake top',
        glossy: true,
        glossyNote: 'Bow tie has a slightly glossy satin finish',
      },
    ],
  },
];


export default function SetsPanel({ config, onChange, activeLayer = 0 }) {
  const isIndividual = config.designMode === 'individual' && config.layers > 1;


  const getActiveSet = () => {
    if (isIndividual) {
      return (config.activeSetLayers || [null, null, null])[activeLayer] || null;
    }
    return config.activeSet || null;
  };


  const toggle = (key) => {
    if (isIndividual) {
      const layers = [...(config.activeSetLayers || [null, null, null])];
      layers[activeLayer] = layers[activeLayer] === key ? null : key;
      onChange({ ...config, activeSetLayers: layers });
    } else {
      onChange({ ...config, activeSet: config.activeSet === key ? null : key });
    }
  };


  const activeSet = getActiveSet();


  return (
    <div className="space-y-5">
      {isIndividual && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
          <span className="text-xs font-semibold text-primary">Layer {activeLayer + 1}</span>
          <span className="text-[10px] text-muted-foreground">— sets apply to this layer only</span>
        </div>
      )}


      {SETS.map(({ category, items }) => (
        <div key={category}>
          <p className="text-xs font-heading font-semibold text-foreground/50 uppercase tracking-wide mb-2">
            {category}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {items.map(({ key, emoji, label, preview, glossy, glossyNote }) => {
              const active = activeSet === key;


              const otherLayerBadges = isIndividual
                ? (config.activeSetLayers || []).reduce((acc, s, idx) => {
                  if (s === key && idx !== activeLayer) acc.push(idx + 1);
                  return acc;
                }, [])
                : [];


              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <button
                    onClick={() => toggle(key)}
                    className={cn(
                      'flex flex-col items-start gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 w-full',
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                    )}
                  >
                    <span className="text-2xl">{emoji}</span>
                    <span className="text-xs font-semibold leading-tight">{label}</span>
                    <span className={cn('text-[10px] leading-tight', active ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                      {preview}
                    </span>
                    {otherLayerBadges.length > 0 && (
                      <span className="text-[9px] text-muted-foreground mt-0.5">
                        Also on layer{otherLayerBadges.length > 1 ? 's' : ''} {otherLayerBadges.join(', ')}
                      </span>
                    )}
                  </button>


                  {glossy && active && (
                    <div className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 bg-amber-50 border border-amber-200">
                      <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] font-semibold text-amber-700 leading-tight">Glossy Element</p>
                        <p className="text-[10px] text-amber-600 leading-tight mt-0.5">{glossyNote}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
