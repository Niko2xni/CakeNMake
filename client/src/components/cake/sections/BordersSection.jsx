import React, { useState } from 'react';
import { FLAVORS, FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { SIZE_OPTIONS_CUSTOM } from '@/lib/cakeConfig';
import OptionButtonContent from '../OptionButtonContent';

// Border set definitions
const BORDER_SETS = {
  top: [
    { id: 'shell', label: 'Shell Border', emoji: '🐚' },
    { id: 'pearl', label: 'Pearl Border', emoji: '⚪' },
    { id: 'star', label: 'Star Border', emoji: '⭐' },
    { id: 'swag', label: 'Swag Curtain', emoji: '🎀' },
    { id: 'ruffle', label: 'Vertical Ruffles', emoji: '〰️' },
    { id: 'basket', label: 'Basket Weave', emoji: '🧺' },
    { id: 'ribbon', label: 'Ribbon Border', emoji: '🎀' },
  ],
  side: [
    { id: 'shell', label: 'Shell Border', emoji: '🐚' },
    { id: 'pearl', label: 'Pearl Border', emoji: '⚪' },
    { id: 'star', label: 'Star Border', emoji: '⭐' },
    { id: 'swag', label: 'Swag Curtain', emoji: '🎀' },
    { id: 'ruffle', label: 'Vertical Ruffles', emoji: '〰️' },
    { id: 'basket', label: 'Basket Weave', emoji: '🧺' },
    { id: 'ribbon', label: 'Ribbon Border', emoji: '🎀' },
  ],
  bottom: [
    { id: 'shell', label: 'Shell Border', emoji: '🐚' },
    { id: 'pearl', label: 'Pearl Border', emoji: '⚪' },
    { id: 'rope', label: 'Rope Border', emoji: '🪢' },
    { id: 'ribbon', label: 'Ribbon Border', emoji: '🎀' },
  ],
};

export default function BordersSection({ borders, onChange }) {
  const [expandedCategory, setExpandedCategory] = useState('top');

  const updateCategory = (category, updates) => {
    onChange({
      ...borders,
      [category]: { ...borders[category], ...updates }
    });
  };

  const categories = [
    { id: 'top', label: 'Top Border' },
    { id: 'side', label: 'Side Border' },
    { id: 'bottom', label: 'Bottom Border' },
  ];

  return (
    <div className="space-y-4">
      {/* Category Tabs */}
      <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setExpandedCategory(category.id)}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-150 ${
              expandedCategory === category.id
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* Top Border */}
      {expandedCategory === 'top' && (
        <BorderCategory
          sets={BORDER_SETS.top}
          config={borders.top}
          onChange={(updates) => updateCategory('top', updates)}
        />
      )}

      {/* Side Border */}
      {expandedCategory === 'side' && (
        <BorderCategory
          sets={BORDER_SETS.side}
          config={borders.side}
          onChange={(updates) => updateCategory('side', updates)}
        />
      )}

      {/* Bottom Border */}
      {expandedCategory === 'bottom' && (
        <BorderCategory
          sets={BORDER_SETS.bottom}
          config={borders.bottom}
          onChange={(updates) => updateCategory('bottom', updates)}
        />
      )}

      {/* Info notice */}
      <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 bg-muted/50 border border-border">
        <div className="text-muted-foreground text-[10px] leading-tight">
          <p className="font-semibold">Borders</p>
          <p className="mt-0.5">
            Borders decorate edges and sit on top of the frosting. They never replace the finish.
          </p>
        </div>
      </div>
    </div>
  );
}

function BorderCategory({ sets, config, onChange }) {
  const updateSet = (setId) => {
    onChange({ set: setId === config.set ? null : setId });
  };

  const updateFlavor = (flavor) => {
    onChange({ flavor });
  };

  const updateSize = (size) => {
    onChange({ size });
  };

  const activeSet = sets.find(s => s.id === config.set);

  return (
    <div className="space-y-3">
      {/* Set Selection */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Border Style</span>
        <div className="grid grid-cols-2 gap-2">
          {sets.map((set) => {
            const active = config.set === set.id;
            return (
              <button
                key={set.id}
                onClick={() => updateSet(set.id)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                }`}
              >
                <OptionButtonContent selected={active} canDeselect label={set.label}>
                  <span className="text-2xl">{set.emoji}</span>
                  <span className="text-xs font-semibold">{set.label}</span>
                </OptionButtonContent>
              </button>
            );
          })}
        </div>
      </div>

      {/* Customization - only shown when a set is selected */}
      {activeSet && (
        <div className="space-y-3 pt-2 border-t border-border/50">
          {/* Flavor */}
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Flavor</span>
            <div className="grid grid-cols-2 gap-2">
              {FLAVOR_ORDER.map((flavorId) => {
                const flavor = FLAVORS[flavorId];
                const active = config.flavor === flavorId;
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
                    config.size === option.id
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
    </div>
  );
}
