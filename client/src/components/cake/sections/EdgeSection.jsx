import React, { useState } from 'react';
import { EDGE_PIPING_OPTIONS, PIPING_TIPS } from '@/lib/cakeConfig';
import SetPicker from '../SetPicker';
import SugarColorSection from './SugarColorSection';

const EMPTY_SLOT = () => ({
  decorations: { setId: null, colorId: 'vanilla' },
  piping: { tip: null, colorId: 'vanilla' },
});

// NOTE: single whole-cake setting for now, not per-tier — see
// SurfaceSection's caveat. Top/Bottom/Both is a separate axis of variation
// from per-tier Individual mode and is unaffected by it either way.
export default function EdgeSection({ edge, onChange, layerCount = 1, onActiveSlotChange, sugarColor, onSugarColorChange }) {
  // Which of Top/Bottom is being VIEWED when in separate mode — local UI
  // state only, not part of the shared config (Top/Bottom aren't "tiers").
  const [activeSlot, setActiveSlot] = useState(edge.mode === 'topBottomSeparate' ? 'top' : 'both');

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

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">
          Both, or Top/Bottom separately — picking one clears the other.
        </span>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            onClick={switchToSeparate}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'topBottomSeparate' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top / Bottom
          </button>
          <button
            onClick={switchToBoth}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'both' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
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
              onClick={() => {
                setActiveSlot(slot);
                onActiveSlotChange?.(slot);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-150 ${
                activeSlot === slot ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {slot} Edge
            </button>
          ))}
        </div>
      )}

      <SetPicker
        label="Piping"
        sets={EDGE_PIPING_OPTIONS}
        activeSetId={currentSlot.piping?.tip || currentSlot.decorations?.setId}
        onSelectSet={(tip) => updateSlot({
          decorations: { ...currentSlot.decorations, setId: null },
          piping: { ...currentSlot.piping, tip },
        })}
        showColorPicker={false}
      />

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

          <SetPicker
            label="Piping"
            sets={PIPING_TIPS}
            activeSetId={edge.middle?.piping?.tip}
            onSelectSet={(tip) => updateMiddle({ tip })}
            showColorPicker={false}
          />
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