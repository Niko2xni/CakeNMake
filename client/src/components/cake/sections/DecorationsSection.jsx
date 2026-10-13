import React, { useState } from 'react';
import { FLAVORS, FLAVOR_ORDER } from '@/lib/cakeFlavors';
import { SIZE_OPTIONS_CUSTOM } from '@/lib/cakeConfig';
import OptionButtonContent from '../OptionButtonContent';

// Decoration set definitions
const DECORATION_SETS = {
  topBorder: [
    { id: 'shell', label: 'Shell Border', emoji: '🐚' },
    { id: 'pearl', label: 'Pearl Border', emoji: '⚪' },
    { id: 'star', label: 'Star Border', emoji: '⭐' },
    { id: 'swag', label: 'Swag Curtain', emoji: '🎀' },
    { id: 'ruffle', label: 'Vertical Ruffles', emoji: '〰️' },
    { id: 'basket', label: 'Basket Weave', emoji: '🧺' },
    { id: 'ribbon', label: 'Ribbon Border', emoji: '🎀' },
  ],
  sideBorder: [
    { id: 'shell', label: 'Shell Border', emoji: '🐚' },
    { id: 'pearl', label: 'Pearl Border', emoji: '⚪' },
    { id: 'star', label: 'Star Border', emoji: '⭐' },
    { id: 'swag', label: 'Swag Curtain', emoji: '🎀' },
    { id: 'ruffle', label: 'Vertical Ruffles', emoji: '〰️' },
    { id: 'basket', label: 'Basket Weave', emoji: '🧺' },
    { id: 'ribbon', label: 'Ribbon Border', emoji: '🎀' },
  ],
  bottomBorder: [
    { id: 'shell', label: 'Shell Border', emoji: '🐚' },
    { id: 'pearl', label: 'Pearl Border', emoji: '⚪' },
    { id: 'rope', label: 'Rope Border', emoji: '🪢' },
    { id: 'ribbon', label: 'Ribbon Border', emoji: '🎀' },
  ],
  topCenter: [
    { id: 'fruitRing', label: 'Fruit Ring', emoji: '🍓' },
    { id: 'roseRing', label: 'Rose Ring', emoji: '🌹' },
    { id: 'chocolateRing', label: 'Chocolate Ring', emoji: '🍫' },
    { id: 'birthdayRing', label: 'Birthday Ring', emoji: '🎂' },
    { id: 'flowerArrangement', label: 'Flower Arrangement', emoji: '💐' },
    { id: 'minimal', label: 'Minimal Arrangement', emoji: '✨' },
  ],
  sideDecorations: [
    { id: 'chocolateDrip', label: 'Chocolate Drip', emoji: '🍫' },
    { id: 'caramelDrip', label: 'Caramel Drip', emoji: '🍯' },
    { id: 'whiteChocolateDrip', label: 'White Chocolate Drip', emoji: '🤍' },
    { id: 'goldLeaf', label: 'Gold Leaf', emoji: '✨' },
    { id: 'chocolateBars', label: 'Chocolate Bars', emoji: '🍫' },
    { id: 'cookieDecor', label: 'Cookie Decorations', emoji: '🍪' },
  ],
};

const TOPPER_OPTIONS = [
  { id: 'birthday', label: 'Birthday Topper', emoji: '🎂' },
  { id: 'wedding', label: 'Wedding Topper', emoji: '💒' },
  { id: 'custom', label: 'Custom Text', emoji: '✏️' },
  { id: 'none', label: 'No Topper', emoji: '❌' },
];

export default function DecorationsSection({ decorations, onChange }) {
  const [expandedCategory, setExpandedCategory] = useState('topBorder');

  const updateCategory = (category, updates) => {
    onChange({
      ...decorations,
      [category]: { ...decorations[category], ...updates }
    });
  };

  const updateTopper = (topper) => {
    onChange({ ...decorations, cakeTopper: topper });
  };

  const categories = [
    { id: 'topBorder', label: 'Top Border' },
    { id: 'sideBorder', label: 'Side Border' },
    { id: 'bottomBorder', label: 'Bottom Border' },
    { id: 'topCenter', label: 'Top Center' },
    { id: 'sideDecorations', label: 'Side Decorations' },
    { id: 'cakeTopper', label: 'Cake Topper' },
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
      {expandedCategory === 'topBorder' && (
        <DecorationCategory
          sets={DECORATION_SETS.topBorder}
          config={decorations.topBorder}
          onChange={(updates) => updateCategory('topBorder', updates)}
        />
      )}

      {/* Side Border */}
      {expandedCategory === 'sideBorder' && (
        <DecorationCategory
          sets={DECORATION_SETS.sideBorder}
          config={decorations.sideBorder}
          onChange={(updates) => updateCategory('sideBorder', updates)}
        />
      )}

      {/* Bottom Border */}
      {expandedCategory === 'bottomBorder' && (
        <DecorationCategory
          sets={DECORATION_SETS.bottomBorder}
          config={decorations.bottomBorder}
          onChange={(updates) => updateCategory('bottomBorder', updates)}
        />
      )}

      {/* Top Center */}
      {expandedCategory === 'topCenter' && (
        <DecorationCategory
          sets={DECORATION_SETS.topCenter}
          config={decorations.topCenter}
          onChange={(updates) => updateCategory('topCenter', updates)}
        />
      )}

      {/* Side Decorations */}
      {expandedCategory === 'sideDecorations' && (
        <DecorationCategory
          sets={DECORATION_SETS.sideDecorations}
          config={decorations.sideDecorations}
          onChange={(updates) => updateCategory('sideDecorations', updates)}
        />
      )}

      {/* Cake Topper */}
      {expandedCategory === 'cakeTopper' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {TOPPER_OPTIONS.map((option) => {
              const active = decorations.cakeTopper === option.id;
              return (
                <button
                  key={option.id}
                  onClick={() => updateTopper(option.id)}
                  className={`relative flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-xs font-semibold">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DecorationCategory({ sets, config, onChange }) {
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
        <span className="text-xs text-muted-foreground mb-2 block">Decoration Set</span>
        <div className="grid grid-cols-2 gap-2">
          {sets.map((set) => {
            const active = config.set === set.id;
            return (
              <button
                key={set.id}
                onClick={() => updateSet(set.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
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
