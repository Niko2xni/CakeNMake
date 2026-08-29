import React from 'react';
import { FLAVORS, FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { SIZE_OPTIONS_CUSTOM } from '@/lib/cakeConfig';

// Top decoration set definitions
const TOP_DECORATION_SETS = [
  { id: 'fruitRing', label: 'Fruit Ring', emoji: '🍓' },
  { id: 'roseRing', label: 'Rose Ring', emoji: '🌹' },
  { id: 'chocolateRing', label: 'Chocolate Ring', emoji: '🍫' },
  { id: 'birthdayRing', label: 'Birthday Ring', emoji: '🎂' },
  { id: 'flowerArrangement', label: 'Flower Arrangement', emoji: '💐' },
  { id: 'minimal', label: 'Minimal Arrangement', emoji: '✨' },
  { id: 'cookies', label: 'Cookies', emoji: '🍪' },
  { id: 'sprinkles', label: 'Sprinkles', emoji: '🎊' },
  { id: 'none', label: 'No Top Decorations', emoji: '❌' },
];

export default function TopDecorationsSection({ topDecorations, onChange }) {
  const updateSet = (setId) => {
    onChange({ ...topDecorations, set: setId === 'none' ? null : setId });
  };

  const updateFlavor = (flavor) => {
    onChange({ ...topDecorations, flavor });
  };

  const updateSize = (size) => {
    onChange({ ...topDecorations, size });
  };

  const activeSet = topDecorations.set || null;

  return (
    <div className="space-y-4">
      {/* Decoration Selection */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Top Decorations</span>
        <div className="grid grid-cols-2 gap-2">
          {TOP_DECORATION_SETS.map((decoration) => {
            const active = activeSet === decoration.id;
            return (
              <button
                key={decoration.id}
                onClick={() => updateSet(decoration.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                }`}
              >
                <span className="text-2xl">{decoration.emoji}</span>
                <span className="text-xs font-semibold">{decoration.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customization - only shown when a decoration is selected */}
      {activeSet && activeSet !== 'none' && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Flavor */}
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Flavor</span>
            <div className="grid grid-cols-2 gap-2">
              {FLAVOR_ORDER.map((flavorId) => {
                const flavor = FLAVORS[flavorId];
                const active = topDecorations.flavor === flavorId;
                return (
                  <button
                    key={flavorId}
                    onClick={() => updateFlavor(flavorId)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-2 text-left transition-all duration-200 border-2 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-black/10"
                      style={{ backgroundColor: flavor.colors.crumbBase }}
                    />
                    <span className="text-[10px] font-semibold">{flavor.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size */}
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Size</span>
            <div className="flex gap-1">
              {SIZE_OPTIONS_CUSTOM.map((option) => (
                <button
                  key={option.id}
                  onClick={() => updateSize(option.id)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150 ${
                    topDecorations.size === option.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Info notice */}
      <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 bg-muted/50 border border-border">
        <div className="text-muted-foreground text-[10px] leading-tight">
          <p className="font-semibold">Top Decorations</p>
          <p className="mt-0.5">
            These decorations attach only to the top of the cake. They are independent from frosting and borders.
          </p>
        </div>
      </div>
    </div>
  );
}
