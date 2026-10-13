import React from 'react';
import OptionButtonContent from '../OptionButtonContent';

// Collection set definitions - complete coordinated cake styles
const COLLECTION_SETS = [
  {
    id: 'elegant',
    label: 'Elegant Collection',
    emoji: '👑',
    description: 'Smooth exterior with swag curtains and pearl borders',
    applies: {
      exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
      borders: {
        side: { set: 'swag', flavor: 'vanilla', size: 'medium' },
        bottom: { set: 'pearl', flavor: 'vanilla', size: 'medium' },
        top: { set: 'pearl', flavor: 'vanilla', size: 'medium' },
      },
    },
  },
  {
    id: 'birthday',
    label: 'Birthday Collection',
    emoji: '🎂',
    description: 'Star borders, rainbow sprinkles, chocolate drip, and birthday topper',
    applies: {
      exteriorFinish: { style: 'fullyFrosted', flavor: 'strawberry' },
      borders: {
        side: { set: 'star', flavor: 'chocolate', size: 'medium' },
      },
      topDecorations: { set: 'birthdayRing', flavor: 'vanilla', size: 'medium' },
      exteriorOverlay: { set: 'chocolateDrip', flavor: 'chocolate', size: 'medium' },
      cakeTopper: { set: 'birthday' },
    },
  },
  {
    id: 'wedding',
    label: 'Wedding Collection',
    emoji: '💒',
    description: 'White exterior, pearl borders, white roses, and gold details',
    applies: {
      exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
      borders: {
        side: { set: 'pearl', flavor: 'vanilla', size: 'medium' },
        bottom: { set: 'pearl', flavor: 'vanilla', size: 'medium' },
      },
      topDecorations: { set: 'roseRing', flavor: 'vanilla', size: 'medium' },
      sideDecorations: { set: 'goldLeaf', flavor: 'vanilla', size: 'medium' },
      cakeTopper: { set: 'wedding' },
    },
  },
  {
    id: 'chocolateLover',
    label: 'Chocolate Lover',
    emoji: '🍫',
    description: 'Rich chocolate everything with chocolate bars and drip',
    applies: {
      exteriorFinish: { style: 'fullyFrosted', flavor: 'chocolate' },
      sponge: { flavor: 'chocolate' },
      filling: { enabled: true, flavor: 'chocolate' },
      borders: {
        side: { set: 'basket', flavor: 'chocolate', size: 'medium' },
      },
      exteriorOverlay: { set: 'chocolateDrip', flavor: 'chocolate', size: 'medium' },
      sideDecorations: { set: 'chocolateBars', flavor: 'chocolate', size: 'medium' },
    },
  },
  {
    id: 'fruitFresh',
    label: 'Fruit Fresh',
    emoji: '🍓',
    description: 'Light vanilla with fresh fruit ring and minimal accents',
    applies: {
      exteriorFinish: { style: 'fullyFrosted', flavor: 'vanilla' },
      topDecorations: { set: 'fruitRing', flavor: 'vanilla', size: 'medium' },
      borders: {
        side: { set: 'shell', flavor: 'vanilla', size: 'small' },
      },
    },
  },
];

export default function CollectionSection({ collection, onChange }) {
  const selectCollection = (collectionId) => {
    // If clicking the same collection, deselect it
    if (collection === collectionId) {
      onChange(null);
      return;
    }

    const selectedCollection = COLLECTION_SETS.find(c => c.id === collectionId);
    if (selectedCollection) {
      // Apply the collection's configuration
      onChange({
        collectionId,
        applies: selectedCollection.applies
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 bg-muted/50 border border-border">
        <div className="text-muted-foreground text-[10px] leading-tight">
          <p className="font-semibold">Quick Start</p>
          <p className="mt-0.5">Select a collection to apply a complete coordinated style. You can still customize individual components afterward.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {COLLECTION_SETS.map((col) => {
          const active = collection === col.id;
          return (
            <button
              key={col.id}
              onClick={() => selectCollection(col.id)}
              className={`relative flex flex-col items-start gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
              }`}
            >
              <OptionButtonContent selected={active} canDeselect label={`${col.label}. ${col.description}`}>
                <span className="text-2xl">{col.emoji}</span>
                <span className="text-xs font-semibold leading-tight">{col.label}</span>
                <span className={`text-[10px] leading-tight ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                  {col.description}
                </span>
              </OptionButtonContent>
            </button>
          );
        })}
      </div>

      {collection && (
        <button
          onClick={() => onChange(null)}
          className="w-full py-2 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          Clear Collection
        </button>
      )}
    </div>
  );
}
