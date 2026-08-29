import React, { useState } from 'react';
import { FLAVORS, FLAVOR_ORDER } from '@/lib/cakeFlavors';

const TOPPER_OPTIONS = [
  { id: 'birthday', label: 'Happy Birthday', emoji: '🎂', description: 'Classic birthday celebration' },
  { id: 'numbers', label: 'Numbers', emoji: '🔢', description: 'Age numbers' },
  { id: 'acrylicName', label: 'Acrylic Name', emoji: '✏️', description: 'Custom name on acrylic' },
  { id: 'customText', label: 'Custom Text', emoji: '📝', description: 'Any custom message' },
  { id: 'none', label: 'No Topper', emoji: '❌', description: 'No cake topper' },
];

export default function CakeTopperSection({ topper, onChange }) {
  const [customText, setCustomText] = useState(topper.customText || '');

  const updateTopper = (topperId) => {
    onChange({ ...topper, set: topperId === 'none' ? null : topperId });
  };

  const updateCustomText = (text) => {
    setCustomText(text);
    onChange({ ...topper, customText: text });
  };

  const updateFlavor = (flavor) => {
    onChange({ ...topper, flavor });
  };

  const activeSet = topper.set || null;

  return (
    <div className="space-y-4">
      {/* Topper Selection */}
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">Cake Topper</span>
        <div className="space-y-2">
          {TOPPER_OPTIONS.map((option) => {
            const active = activeSet === option.id;
            return (
              <button
                key={option.id}
                onClick={() => updateTopper(option.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all duration-200 border-2 ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <div>
                    <span className="text-xs font-semibold block">{option.label}</span>
                    <span className={`text-[10px] mt-0.5 block ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {option.description}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Text Input - only shown for custom text topper */}
      {activeSet === 'customText' && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground mb-2 block">Custom Message</span>
          <input
            type="text"
            value={customText}
            onChange={(e) => updateCustomText(e.target.value)}
            placeholder="Enter your message..."
            className="w-full px-3 py-2 rounded-lg text-xs border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={50}
          />
          <p className="text-[10px] text-muted-foreground mt-1">{customText.length}/50 characters</p>
        </div>
      )}

      {/* Flavor - shown for toppers that support it */}
      {activeSet && activeSet !== 'none' && activeSet !== 'customText' && (
        <div className="pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground mb-2 block">Topper Color</span>
          <div className="grid grid-cols-2 gap-2">
            {FLAVOR_ORDER.map((flavorId) => {
              const flavor = FLAVORS[flavorId];
              const active = topper.flavor === flavorId;
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
      )}

      {/* Info notice */}
      <div className="flex items-start gap-2 rounded-lg px-2.5 py-2 bg-muted/50 border border-border">
        <div className="text-muted-foreground text-[10px] leading-tight">
          <p className="font-semibold">Cake Topper</p>
          <p className="mt-0.5">
            Toppers are rendered last before manual placement. Supports stick-mounted toppers like real bakery cakes.
          </p>
        </div>
      </div>
    </div>
  );
}
