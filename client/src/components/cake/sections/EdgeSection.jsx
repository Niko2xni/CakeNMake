import React, { useState } from 'react';
import {
  SHELL_VARIATIONS,
  BRACELET_BEADS_VARIATIONS,
  DOLLOPS_VARIATIONS,
  ROPE_TWIST_VARIATIONS,
  STANDALONE_EDGE_PIPING_OPTIONS,
  PIPING_TIPS,
} from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';

const EMPTY_SLOT = () => ({
  decorations: { setId: null, colorId: 'vanilla' },
  piping: { tip: null, colorId: 'vanilla' },
});

export default function EdgeSection({
  edge,
  onChange,
  layerCount = 1,
  onActiveSlotChange,
  sugarColor,
  onSugarColorChange,
}) {
  const [activeSlot, setActiveSlot] = useState(
    edge.mode === 'topBottomSeparate' ? 'top' : 'both'
  );

  const mode = edge.mode; // 'topBottomSeparate' | 'both'

  const switchToBoth = () => {
    onChange({ ...edge, mode: 'both', top: EMPTY_SLOT(), bottom: EMPTY_SLOT() });
    setActiveSlot('both');
    onActiveSlotChange?.('both');
  };

  const switchToTopOnly = () => {
    if (mode !== 'topBottomSeparate') {
      onChange({ ...edge, mode: 'topBottomSeparate', both: EMPTY_SLOT() });
    }
    setActiveSlot('top');
    onActiveSlotChange?.('top');
  };

  const switchToBottomOnly = () => {
    if (mode !== 'topBottomSeparate') {
      onChange({ ...edge, mode: 'topBottomSeparate', both: EMPTY_SLOT() });
    }
    setActiveSlot('bottom');
    onActiveSlotChange?.('bottom');
  };

  const currentSlotKey = mode === 'both' ? 'both' : activeSlot;
  const currentSlot = edge[currentSlotKey] || EMPTY_SLOT();

  const updateSlot = (changes) => {
    onChange({ ...edge, [currentSlotKey]: { ...currentSlot, ...changes } });
  };

  const updateMiddle = (changes) => {
    onChange({
      ...edge,
      middle: {
        ...edge.middle,
        piping: {
          ...(edge.middle?.piping || { tip: null, colorId: 'vanilla' }),
          ...changes,
        },
      },
    });
  };

  const activeTipOrSet = currentSlot.piping?.tip || currentSlot.decorations?.setId;

  const multiVariantGroups = [
    {
      id: 'shell',
      label: 'Shell Border',
      variants: SHELL_VARIATIONS,
    },
    {
      id: 'braceletBeads',
      label: 'Bracelet Beads',
      variants: BRACELET_BEADS_VARIATIONS,
    },
    {
      id: 'ropeTwist',
      label: 'Rope Twist',
      variants: ROPE_TWIST_VARIATIONS,
    },
    {
      id: 'dollops',
      label: 'Dollops',
      variants: DOLLOPS_VARIATIONS,
    },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Unified 3-Way Rim Placement Control ─── */}
      <div className="bg-card/50 rounded-2xl p-2.5 border border-border/50 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-semibold text-foreground/85 tracking-tight">Rim Placement</span>
          <span className="text-[11px] font-medium text-muted-foreground/80">
            {mode === 'both' ? 'Both rims' : activeSlot === 'top' ? 'Top rim only' : 'Bottom rim only'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1 bg-muted/40 rounded-xl p-1 border border-border/30">
          <button
            type="button"
            onClick={switchToBoth}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center ${
              mode === 'both'
                ? 'bg-card shadow-sm text-foreground font-bold border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Both</span>
          </button>
          <button
            type="button"
            onClick={switchToTopOnly}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center ${
              mode === 'topBottomSeparate' && activeSlot === 'top'
                ? 'bg-card shadow-sm text-foreground font-bold border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Top</span>
          </button>
          <button
            type="button"
            onClick={switchToBottomOnly}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all duration-150 flex items-center justify-center ${
              mode === 'topBottomSeparate' && activeSlot === 'bottom'
                ? 'bg-card shadow-sm text-foreground font-bold border border-border/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span>Bottom</span>
          </button>
        </div>
      </div>

      {/* ─── Edge Design Gallery ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-xs font-heading font-semibold text-foreground/80 uppercase tracking-wide">
            Edge Design
          </span>
          {activeTipOrSet && (
            <button
              type="button"
              onClick={() =>
                updateSlot({
                  decorations: { ...currentSlot.decorations, setId: null },
                  piping: { ...currentSlot.piping, tip: null },
                })
              }
              className="text-[11px] text-muted-foreground hover:text-destructive font-medium transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* 1. Standalone Piping Options (Bead, Rope, Petal, Drop Flower) */}
          {STANDALONE_EDGE_PIPING_OPTIONS.map((option, index) => {
            const active = activeTipOrSet === option.id;
            const isLastOdd =
              index === STANDALONE_EDGE_PIPING_OPTIONS.length - 1 &&
              STANDALONE_EDGE_PIPING_OPTIONS.length % 2 !== 0;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  if (active) {
                    updateSlot({
                      decorations: { ...currentSlot.decorations, setId: null },
                      piping: { ...currentSlot.piping, tip: null },
                    });
                  } else {
                    updateSlot({
                      decorations: { ...currentSlot.decorations, setId: null },
                      piping: { ...currentSlot.piping, tip: option.id },
                    });
                  }
                }}
                title={option.label}
                className={`group rounded-xl border px-3 py-2.5 flex items-center justify-between text-left transition-all duration-150 min-h-[42px] ${
                  isLastOdd ? 'col-span-2' : ''
                } ${
                  active
                    ? 'bg-primary/10 border-primary text-primary shadow-sm font-semibold'
                    : 'bg-card/70 border-border/60 text-foreground/85 hover:border-primary/40 hover:bg-card hover:text-foreground shadow-xs'
                }`}
              >
                <span className="text-xs font-semibold truncate">{option.label}</span>
                <span
                  className={`w-2 h-2 rounded-full transition-all shrink-0 ml-1.5 ${
                    active ? 'bg-primary ring-2 ring-primary/30' : 'bg-transparent'
                  }`}
                />
              </button>
            );
          })}

          {/* 2. Grouped Multi-Variant Designs (Shell Border, Bracelet Beads, Rope Twist, Dollops) */}
          {multiVariantGroups.map((group) => {
            const groupActive = group.variants.some((v) => v.id === activeTipOrSet);
            return (
              <div
                key={group.id}
                className={`col-span-2 rounded-xl border p-2.5 px-3 flex items-center justify-between text-left transition-all duration-150 min-h-[44px] ${
                  groupActive
                    ? 'bg-primary/5 border-primary shadow-sm ring-1 ring-primary/25'
                    : 'bg-card/70 border-border/60 hover:border-primary/40 hover:bg-card shadow-xs'
                }`}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 cursor-pointer flex-1 mr-2 text-left"
                  onClick={() => {
                    const defaultVariant = group.variants[0];
                    updateSlot({
                      decorations: { ...currentSlot.decorations, setId: null },
                      piping: { ...currentSlot.piping, tip: defaultVariant.id },
                    });
                  }}
                >
                  <span
                    className={`text-xs font-semibold truncate transition-colors ${
                      groupActive ? 'text-primary font-bold' : 'text-foreground/85 hover:text-foreground'
                    }`}
                  >
                    {group.label}
                  </span>
                  {groupActive && (
                    <span className="w-2 h-2 rounded-full bg-primary ring-2 ring-primary/30 shrink-0" />
                  )}
                </button>

                <div className="flex gap-1 shrink-0">
                  {group.variants.map((variant, i) => {
                    const variantActive = activeTipOrSet === variant.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateSlot({
                            decorations: { ...currentSlot.decorations, setId: null },
                            piping: { ...currentSlot.piping, tip: variant.id },
                          });
                        }}
                        title={variant.label}
                        className={`w-7 h-7 flex items-center justify-center text-xs font-semibold rounded-lg border transition-all ${
                          variantActive
                            ? 'bg-primary text-primary-foreground border-primary shadow-xs font-bold'
                            : 'bg-muted/60 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Layer 1 Middle Edge (Multi-Tier Cakes) ─── */}
      {layerCount >= 2 && (
        <div className="pt-2 space-y-3 border-t border-border/50">
          <div>
            <span className="text-xs font-semibold text-foreground block">
              Layer 1 Middle Edge
            </span>
            <span className="text-[11px] text-muted-foreground block">
              Piping ring along the exposed edge of Layer 1.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PIPING_TIPS.map((tip) => {
              const active = edge.middle?.piping?.tip === tip.id;
              return (
                <button
                  key={tip.id}
                  type="button"
                  onClick={() => updateMiddle({ tip: active ? null : tip.id })}
                  title={tip.label}
                  className={`p-2 rounded-lg text-left border text-xs font-semibold truncate transition-all duration-150 ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card/70 border-border/60 text-muted-foreground hover:text-foreground hover:bg-card'
                  }`}
                >
                  {tip.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Sugar Color Palette Section ─── */}
      {mode && (
        <SugarColorSection
          sugarColor={sugarColor}
          onChange={onSugarColorChange}
          showDefaultColorPicker
        />
      )}
    </div>
  );
}