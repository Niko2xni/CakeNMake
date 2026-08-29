import React from 'react';
import { Slider } from '@/components/ui/slider';
import { CENTER_DECORATION_SETS, CENTER_DECORATION_VARIATIONS } from '@/lib/cakeConfig';
import SetPicker from '../SetPicker';
import SugarColorSection from './SugarColorSection';
import { PREMADE_DOODLES } from '../sets/premadeDoodles';
import { Grid, Circle, Dot, Moon, Sparkles, SlidersHorizontal, Crown, Layers } from 'lucide-react';

const SPACING_PRESETS = [
  { id: 'tight', label: 'Tight', value: 0.18 },
  { id: 'normal', label: 'Normal', value: 0.28 },
  { id: 'wide', label: 'Wide', value: 0.42 },
];

const FONTS = [
  { id: 'script', label: 'Script' },
  { id: 'handwritten', label: 'Handwritten' },
];

const TEXT_SLOT_CONFIGS = [
  { id: 'top', label: 'Top Line', maxLength: 18, placeholder: 'Happy 25th' },
  { id: 'middle', label: 'Middle Line', maxLength: 24, placeholder: 'Birthday' },
  { id: 'bottom', label: 'Bottom Line', maxLength: 18, placeholder: 'Sophia!' },
];

const VARIATION_ICONS = {
  fullFill: Grid,
  outerRing: Circle,
  single: Dot,
  crescent: Moon,
  cluster: Sparkles,
  diagonal: SlidersHorizontal,
};

// NOTE: single whole-top setting for now, not per-tier — see SurfaceSection
// for the same caveat. Center's "reset on layer count change" rule (spec §2)
// implies per-tier awareness eventually; not wired into this pass.
export default function CenterSection({ center, onChange, activeTool, onSelectTool, sugarColor, onSugarColorChange }) {
  const mode = center.mode; // 'decorations' | 'text' | 'doodles' | null

  // Mutually exclusive — genuine delete, not disable-preserve (spec §4b).
  // Switching tabs clears the other mode's stored value immediately.
  const switchToDecorations = () => {
    onSelectTool?.(null);
    onChange({ ...center, mode: 'decorations' });
  };

  const switchToText = () => {
    onSelectTool?.(null);
    onChange({ ...center, mode: 'text' });
  };

  // Doodle colorId is now a fixed placeholder, not a user choice — Sugar
  // Color drives the actual rendered color instead (see addPremadeDoodle
  // in CakeScene.jsx). Kept in the config/tool-id string purely because
  // the click-to-place tool-id format ('doodle-{shape}-{color}') and the
  // placedItems parsing that reads it back apart still expect three
  // dash-separated parts — changing that shared format is out of scope
  // here, so the color segment stays present but inert.
  const DOODLE_COLOR_PLACEHOLDER = 'red';

  const switchToDoodles = () => {
    const config = center.doodleConfig || { shapeId: 'heart', colorId: DOODLE_COLOR_PLACEHOLDER };
    onSelectTool?.(`doodle-${config.shapeId}-${config.colorId}`);
    onChange({ ...center, mode: 'doodles', doodleConfig: config });
  };

  const selectDecorationSet = (setId) => {
    onChange({
      ...center,
      decorations: {
        ...center.decorations,
        setId,
        variation: center.decorations?.variation || 'outerRing',
      },
    });
  };

  const selectVariation = (variation) => {
    onChange({
      ...center,
      decorations: {
        ...center.decorations,
        variation,
      },
    });
  };

  const updateTextSlot = (slot, value) => {
    const config = TEXT_SLOT_CONFIGS.find((c) => c.id === slot);
    const maxLen = config ? config.maxLength : 24;
    const currentText = center.text || {};
    onChange({
      ...center,
      text: {
        ...currentText,
        [slot]: value.slice(0, maxLen),
      },
    });
  };

  const updateText = (value) => {
    updateTextSlot("middle", value);
  };

  const updateSpacing = (spacing) => {
    onChange({ ...center, text: { ...center.text, spacing } });
  };

  const updateFont = (font) => {
    onChange({ ...center, text: { ...center.text, font } });
  };

  const updateDoodleShape = (shapeId) => {
    const config = { ...center.doodleConfig, shapeId, colorId: DOODLE_COLOR_PLACEHOLDER };
    onSelectTool?.(`doodle-${config.shapeId}-${config.colorId}`);
    onChange({ ...center, doodleConfig: config });
  };

  const activeVariation = center.decorations?.variation || 'outerRing';

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">
          Decorations, Text, or Doodles — picking one clears the others.
        </span>
        <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
          <button
            onClick={switchToDecorations}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'decorations' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Decorations
          </button>
          <button
            onClick={switchToText}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'text' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Text
          </button>
          <button
            onClick={switchToDoodles}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              mode === 'doodles' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Stickers
          </button>
        </div>
      </div>

      {mode === 'decorations' && (
        <div className="space-y-4">
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">1. Choose Decoration Item</span>
            <SetPicker
              sets={CENTER_DECORATION_SETS}
              activeSetId={center.decorations?.setId}
              onSelectSet={selectDecorationSet}
              showColorPicker={false}
            />
          </div>

          {center.decorations?.setId && (
            <div className="space-y-2 pt-1 border-t border-border/40">
              <span className="text-xs font-medium text-foreground block">2. Placement Variation</span>
              <div className="grid grid-cols-2 gap-1.5">
                {CENTER_DECORATION_VARIATIONS.map((v) => {
                  const Icon = VARIATION_ICONS[v.id] || Circle;
                  const isActive = activeVariation === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => selectVariation(v.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{v.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'text' && (
        <div className="space-y-3">
          {TEXT_SLOT_CONFIGS.map((slot) => {
            const val = center.text?.[slot.id] !== undefined
              ? (center.text[slot.id] || '')
              : (slot.id === 'middle' ? (center.text?.value || '') : '');
            return (
              <div key={slot.id}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-foreground">{slot.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {val.length}/{slot.maxLength}
                  </span>
                </div>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => updateTextSlot(slot.id, e.target.value)}
                  maxLength={slot.maxLength}
                  placeholder={slot.placeholder}
                  className="w-full px-3 py-1.5 rounded-xl bg-muted text-sm text-foreground placeholder:text-muted-foreground border-2 border-transparent focus:border-primary/40 outline-none"
                />
              </div>
            );
          })}

          <div className="pt-1">
            <span className="text-xs text-muted-foreground mb-1.5 block">Font</span>
            <div className="flex gap-1">
              {FONTS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => updateFont(f.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    (center.text?.font || 'script') === f.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs text-muted-foreground">Line Spacing</span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {Math.round(((center.text?.spacing ?? 0.28) / 0.28) * 100)}%
              </span>
            </div>
            <div className="flex gap-1 mb-2">
              {SPACING_PRESETS.map((p) => {
                const currentSpacing = center.text?.spacing ?? 0.28;
                const isSelected = Math.abs(currentSpacing - p.value) < 0.03;
                return (
                  <button
                    key={p.id}
                    onClick={() => updateSpacing(p.value)}
                    className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="px-1 py-1">
              <Slider
                value={[center.text?.spacing ?? 0.28]}
                onValueChange={([val]) => updateSpacing(val)}
                min={0.15}
                max={0.50}
                step={0.01}
                className="w-full cursor-pointer"
              />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Laid flat on the top surface for now — stick/candle-mounted text
            is a future addition, not yet built.
          </p>
        </div>
      )}

      {mode === 'doodles' && (
        <div className="space-y-4">
          <div>
            <span className="text-xs text-muted-foreground mb-2 block">Sticker Shape</span>
            <div className="flex gap-1">
              {PREMADE_DOODLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => updateDoodleShape(s.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    (center.doodleConfig?.shapeId || 'heart') === s.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Click anywhere on the top of the cake to place your chosen sticker!
          </p>
        </div>
      )}

      {!mode && (
        <p className="text-xs text-muted-foreground">Pick Decorations or Text above to get started.</p>
      )}

      {mode && mode !== 'decorations' && (
        <SugarColorSection
          sugarColor={sugarColor}
          onChange={onSugarColorChange}
          showDefaultColorPicker
        />
      )}
    </div>
  );
}