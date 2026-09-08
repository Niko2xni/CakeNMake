import React, { useState } from 'react';
import {
  BORDER_PIPING_VARIATIONS,
  BRACELET_BEADS_VARIATIONS,
  DOLLOPS_VARIATIONS,
  STANDALONE_EDGE_PIPING_OPTIONS,
  PIPING_TIPS,
} from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';

const EMPTY_SLOT = () => ({
  decorations: { setId: null, colorId: 'vanilla' },
  piping: { tip: null, colorId: 'vanilla' },
});

// NOTE: single whole-cake setting for now, not per-tier — see
// SurfaceSection's caveat. Top/Bottom/Both is a separate axis of variation
// from per-tier Individual mode and is unaffected by it either way.
export default function EdgeSection({
  edge,
  onChange,
  layerCount = 1,
  onActiveSlotChange,
  sugarColor,
  onSugarColorChange,
}) {
  // Which of Top/Bottom is being VIEWED when in separate mode — local UI
  // state only, not part of the shared config (Top/Bottom aren't "tiers").
  const [activeSlot, setActiveSlot] = useState(
    edge.mode === 'topBottomSeparate' ? 'top' : 'both'
  );

  const mode = edge.mode; // 'topBottomSeparate' | 'both'

  // Mutually exclusive — genuine delete, not disable-preserve (spec §4b).
  // Switching modes clears the other mode's stored values immediately.
  // Note: edge.middle is preserved across mode switches because it is an independent shelf.
  const switchToBoth = () => {
    onChange({ ...edge, mode: 'both', top: EMPTY_SLOT(), bottom: EMPTY_SLOT() });
    setActiveSlot('both');
    onActiveSlotChange?.('both');
  };

  const switchToSeparate = () => {
    onChange({ ...edge, mode: 'topBottomSeparate', both: EMPTY_SLOT() });
    setActiveSlot('top');
    onActiveSlotChange?.('top');
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

  const middleEdgeTips = PIPING_TIPS.filter(
    ({ id }) => !['zigzag', 'wavePiping'].includes(id)
  );

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">
          Both, or Top/Bottom separately — picking one clears the other.
        </span>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            type="button"
            onClick={switchToSeparate}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'topBottomSeparate'
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top / Bottom
          </button>
          <button
            type="button"
            onClick={switchToBoth}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'both'
                ? 'bg-card shadow text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Both
          </button>
        </div>
      </div>

      {mode === 'topBottomSeparate' && (
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          {['top', 'bottom'].map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => {
                setActiveSlot(slot);
                onActiveSlotChange?.(slot);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150 ${
                activeSlot === slot
                  ? 'bg-card shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {slot} Edge
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="text-center mb-2">
          <span className="text-xs font-heading font-semibold text-foreground/70 uppercase tracking-wide">
            Edge Design
          </span>
        </div>

        <div className="space-y-3">
          {/* Border Piping — grouped multi-variant row */}
          <div>
            <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
              Border Piping
            </span>
            <div className="flex flex-wrap gap-2">
              {BORDER_PIPING_VARIATIONS.map((variant, i) => {
                const active =
                  (currentSlot.piping?.tip || currentSlot.decorations?.setId) === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      updateSlot({
                        decorations: { ...currentSlot.decorations, setId: null },
                        piping: { ...currentSlot.piping, tip: active ? null : variant.id },
                      })
                    }
                    title={variant.label}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bracelet Beads — grouped multi-variant row */}
          <div>
            <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
              Bracelet Beads
            </span>
            <div className="flex flex-wrap gap-2">
              {BRACELET_BEADS_VARIATIONS.map((variant, i) => {
                const active =
                  (currentSlot.piping?.tip || currentSlot.decorations?.setId) === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      updateSlot({
                        decorations: { ...currentSlot.decorations, setId: null },
                        piping: { ...currentSlot.piping, tip: active ? null : variant.id },
                      })
                    }
                    title={variant.label}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standalone piping designs (Rope, Petal, Drop Flower) */}
          {STANDALONE_EDGE_PIPING_OPTIONS.map((option) => {
            const active =
              (currentSlot.piping?.tip || currentSlot.decorations?.setId) === option.id;
            return (
              <div key={option.id}>
                <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                  {option.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateSlot({
                        decorations: { ...currentSlot.decorations, setId: null },
                        piping: { ...currentSlot.piping, tip: active ? null : option.id },
                      })
                    }
                    title={option.label}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {option.label.slice(0, 1).toUpperCase()}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Dollops — grouped multi-variant row */}
          <div>
            <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
              Dollops
            </span>
            <div className="flex flex-wrap gap-2">
              {DOLLOPS_VARIATIONS.map((variant, i) => {
                const active =
                  (currentSlot.piping?.tip || currentSlot.decorations?.setId) === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() =>
                      updateSlot({
                        decorations: { ...currentSlot.decorations, setId: null },
                        piping: { ...currentSlot.piping, tip: active ? null : variant.id },
                      })
                    }
                    title={variant.label}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

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

          <div className="space-y-3">
            {middleEdgeTips.map((tip) => {
              const active = edge.middle?.piping?.tip === tip.id;
              return (
                <div key={tip.id}>
                  <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                    {tip.label}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateMiddle({ tip: active ? null : tip.id })}
                      title={tip.label}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-md'
                          : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                      }`}
                    >
                      {tip.label.slice(0, 1).toUpperCase()}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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