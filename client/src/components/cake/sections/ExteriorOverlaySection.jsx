import React from 'react';
import { FLAVORS, FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { SIZE_OPTIONS_CUSTOM } from '@/lib/cakeConfig';

// Exterior overlay definitions - effects placed ON TOP of the finish
const EXTERIOR_OVERLAYS = [
  { id: 'chocolateDrip', label: 'Chocolate Drip', emoji: '🍫' },
  { id: 'caramelDrip', label: 'Caramel Drip', emoji: '🍯' },
  { id: 'strawberryDrip', label: 'Strawberry Drip', emoji: '🍓' },
  { id: 'whiteChocolateDrip', label: 'White Chocolate Drip', emoji: '🤍' },
  { id: 'goldLeaf', label: 'Gold Leaf', emoji: '✨' },
  { id: 'none', label: 'No Overlay', emoji: '❌' },
];

export default function ExteriorOverlaySection({ overlay, onChange }) {
  const updateOverlay = (overlayId) => {
    onChange({ ...overlay, set: overlayId === 'none' ? null : overlayId });
  };

  const updateFlavor = (flavor) => {
    onChange({ ...overlay, flavor });
  };

  const updateSize = (size) => {
    onChange({ ...overlay, size });
  };

  const activeSet = overlay.set || null;

  return (
    <div className="space-y-4">
      {/* Overlay Selection */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Exterior Overlay</span>
        <div className="grid grid-cols-2 gap-2">
          {EXTERIOR_OVERLAYS.map((overlayOption) => {
            const active = activeSet === overlayOption.id;
            return (
              <button
                key={overlayOption.id}
                onClick={() => updateOverlay(overlayOption.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                }`}
              >
                <span className="text-2xl">{overlayOption.emoji}</span>
                <span className="text-xs font-semibold">{overlayOption.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customization - only shown when an overlay is selected */}
      {activeSet && activeSet !== 'none' && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Flavor */}
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Flavor</span>
            <div className="grid grid-cols-2 gap-2">
              {FLAVOR_ORDER.map((flavorId) => {
                const flavor = FLAVORS[flavorId];
                const active = overlay.flavor === flavorId;
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
                    overlay.size === option.id
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
          <p className="font-semibold">Overlay Effects</p>
          <p className="mt-0.5">
            Overlays are placed on top of the exterior finish. They do not replace the finish.
          </p>
        </div>
      </div>
    </div>
  );
}
