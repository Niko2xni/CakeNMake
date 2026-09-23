import React from 'react';
import { RotateCw, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';
import { CENTER_PLACEABLE_DESIGNS, BUTTERCREAM_LETTERS, BUTTERCREAM_LETTERS_UPPER, BUTTERCREAM_LETTERS_LOWER } from '@/lib/cakeConfig';
import DecorationPreview from './DecorationPreview';
import SugarColorSection from './SugarColorSection';

const FONTS = [
  { id: 'script', label: 'Script' },
  { id: 'handwritten', label: 'Handwritten' },
];

const TEXT_SLOT_CONFIGS = [
  { id: 'top', label: 'Top Line', maxLength: 18, placeholder: 'Happy 25th' },
  { id: 'middle', label: 'Middle Line', maxLength: 24, placeholder: 'Birthday' },
  { id: 'bottom', label: 'Bottom Line', maxLength: 18, placeholder: 'Sophia!' },
];

// A letter's toolId is 'center-letter{CHAR}-default' -- same format as any
// other Center design, just distinguished by the 'letter' designId prefix
// so Decorations' and Buttercream Text's own "placed"/"Clear All" counts
// can each filter to their own items despite sharing one placedItems
// bucket and one collision system.
function isLetterToolType(type) {
  return typeof type === 'string' && type.startsWith('center-letter');
}

// Shared by Decorations and Buttercream Text -- both arm a 'center-'
// tool the same way (see armDecorationTool/armLetterTool below) and so
// both get the exact same preview + spin/tilt controls for free. Kept as
// one component instead of duplicated JSX so the two tabs can't drift out
// of sync with each other.
function ArmedItemControls({ armedDesign, armedRotation, armedTilt, setArmedRotation, setArmedTilt }) {
  if (!armedDesign) return null;
  return (
    <>
      <div>
        <DecorationPreview
          designId={armedDesign.designId}
          orientation={armedDesign.orientation}
          rotationY={(armedRotation * Math.PI) / 180}
          rotationX={(armedTilt * Math.PI) / 180}
        />
      </div>

      <div className="rounded-xl bg-muted/60 px-3 py-2.5 space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Rotation (spin)</span>
            <span className="text-xs font-semibold text-foreground">{Math.round(armedRotation)}°</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setArmedRotation(armedRotation - 15)}
              title="Rotate left 15°"
              className="w-7 h-7 shrink-0 rounded-full bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={armedRotation}
              onChange={(e) => setArmedRotation(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Rotation angle"
            />
            <button
              type="button"
              onClick={() => setArmedRotation(armedRotation + 15)}
              title="Rotate right 15°"
              className="w-7 h-7 shrink-0 rounded-full bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tilt (up/down)</span>
            <span className="text-xs font-semibold text-foreground">{Math.round(armedTilt)}°</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setArmedTilt(armedTilt - 15)}
              title="Tilt down 15°"
              className="w-7 h-7 shrink-0 rounded-full bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <input
              type="range"
              min={0}
              max={360}
              step={1}
              value={armedTilt}
              onChange={(e) => setArmedTilt(Number(e.target.value))}
              className="flex-1 accent-primary"
              aria-label="Tilt angle"
            />
            <button
              type="button"
              onClick={() => setArmedTilt(armedTilt + 15)}
              title="Tilt up 15°"
              className="w-7 h-7 shrink-0 rounded-full bg-muted text-foreground hover:bg-muted/80 flex items-center justify-center"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1 flex-wrap">
          Tip: while a design is selected —
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">→</kbd>
          <span className="text-muted-foreground/70">or</span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">A</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">D</kbd>
          spin,
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">↑</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">↓</kbd>
          <span className="text-muted-foreground/70">or</span>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">W</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-card border border-border/70 font-mono text-[10px]">S</kbd>
          tilt
        </p>
      </div>
    </>
  );
}

// NOTE: single whole-top setting for now, not per-tier — see SurfaceSection
// for the same caveat. Center's "reset on layer count change" rule (spec §2)
// implies per-tier awareness eventually; not wired into this pass.
export default function CenterSection({ center, onChange, activeTool, onSelectTool, placedItems = [], onPlacedItemsChange, sugarColor, onSugarColorChange }) {
  const mode = center.mode; // 'decorations' | 'text' | null
  const textCategory = center.textCategory || 'piping'; // 'piping' | 'buttercream' -- only meaningful when mode === 'text'
  const letterCase = center.letterCase || 'upper'; // 'upper' | 'lower' -- only meaningful when textCategory === 'buttercream'

  // Mutually exclusive tabs -- switching just changes which editor shows
  // and what's armed by default; it doesn't delete the other mode's stored
  // value (center.text survives switching to Decorations and back).
  const switchToDecorations = () => {
    onSelectTool?.(null);
    onChange({ ...center, mode: 'decorations' });
  };

  const switchToText = () => {
    onSelectTool?.(null);
    onChange({ ...center, mode: 'text' });
  };

  const setTextCategory = (category) => {
    onSelectTool?.(null);
    onChange({ ...center, mode: 'text', textCategory: category });
  };

  const setLetterCase = (caseId) => {
    onSelectTool?.(null);
    onChange({ ...center, letterCase: caseId });
  };

  // Click-to-arm: picking a palette item doesn't place anything by
  // itself, it arms activeTool (shared with Place/Doodles) so the next
  // click on the cake surface drops it there -- see CakeScene.jsx's
  // tryPlace/evaluateCenterDrop for the actual boundary + collision
  // enforcement ("exclusive space" is a placement rule, not a separate
  // item list -- Center items live in the same placedItems array as
  // Place-tab/doodle items, tagged with a 'center-' prefixed type).
  // Buttercream Text letters are armed exactly the same way (see
  // armLetterTool below) and use this same activeTool/armedDesign
  // machinery, since a letter is just another 'center-' design as far as
  // CakeScene.jsx's placement/collision code is concerned.
  //
  // activeTool is an object here ({ type, rotationY, rotationX }), not a
  // bare string -- same shape already used elsewhere for rosette/piping
  // tools -- so pending rotation (Sims-style, set before the actual drop)
  // can travel with it. rotationY is yaw (spin left/right, around the
  // vertical axis), rotationX is pitch (tilt up/down, around the
  // horizontal axis) -- two independent axes. Re-arming a design always
  // resets both to 0, same as picking a fresh item off a shelf.
  const armedCenterType = activeTool && typeof activeTool === 'object' && activeTool.type?.startsWith('center-')
    ? activeTool.type
    : null;
  const armedDesign = armedCenterType
    ? (CENTER_PLACEABLE_DESIGNS.find((d) => d.toolId === armedCenterType)
      || BUTTERCREAM_LETTERS.find((d) => d.toolId === armedCenterType))
    : null;
  const armedRotation = armedCenterType ? (activeTool.rotationY || 0) : 0;
  const armedTilt = armedCenterType ? (activeTool.rotationX || 0) : 0;

  const armDecorationTool = (toolId) => {
    const isSameArmed = armedCenterType === toolId;
    onSelectTool?.(isSameArmed ? null : { type: toolId, rotationY: 0, rotationX: 0 });
    onChange({ ...center, mode: 'decorations' });
  };

  const armLetterTool = (toolId) => {
    const isSameArmed = armedCenterType === toolId;
    onSelectTool?.(isSameArmed ? null : { type: toolId, rotationY: 0, rotationX: 0 });
    onChange({ ...center, mode: 'text', textCategory: 'buttercream' });
  };

  // Right-click deselect: only clears the armed tool (activeTool), same as
  // clicking the already-armed button again would -- doesn't touch
  // center.mode, so this never affects the Decorations/Text switcher
  // itself, only whichever design is currently selected.
  const deselectArmedTool = (e) => {
    e.preventDefault();
    if (armedCenterType) onSelectTool?.(null);
  };

  // Full 0-360deg range, not stepped -- the sliders below drive these
  // directly with whatever value the person drags to.
  const setArmedRotation = (degrees) => {
    if (!armedCenterType) return;
    const normalized = ((degrees % 360) + 360) % 360;
    onSelectTool?.({ type: armedCenterType, rotationY: normalized, rotationX: armedTilt });
  };

  const setArmedTilt = (degrees) => {
    if (!armedCenterType) return;
    const normalized = ((degrees % 360) + 360) % 360;
    onSelectTool?.({ type: armedCenterType, rotationY: armedRotation, rotationX: normalized });
  };

  // Decorations and Buttercream Text share one placedItems bucket (both
  // are 'center-' tagged, both go through the same collision system in
  // CakeScene.jsx) but get their own separate "N placed / Clear All" here
  // -- clearing a typed word on the Buttercream Text tab shouldn't also
  // wipe out a chocolate bear placed on the Decorations tab, and vice
  // versa, even though under the hood they're neighbors in the same array
  // and DO collide with each other on the cake.
  const placedDecorationItems = placedItems.filter((item) => item.type && item.type.startsWith('center-') && !isLetterToolType(item.type));
  const placedLetterItems = placedItems.filter((item) => isLetterToolType(item.type));

  const clearDecorationItems = () => {
    onSelectTool?.(null);
    onPlacedItemsChange?.(placedItems.filter((item) => !(item.type && item.type.startsWith('center-') && !isLetterToolType(item.type))));
  };

  const clearLetterItems = () => {
    onSelectTool?.(null);
    onPlacedItemsChange?.(placedItems.filter((item) => !isLetterToolType(item.type)));
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

  const updateFont = (font) => {
    onChange({ ...center, text: { ...center.text, font } });
  };

  return (
    <div className="space-y-4">
      <div>
        <span className="text-xs text-muted-foreground mb-2 block">
          Decorations or Text — picking one clears the other.
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
        </div>
      </div>

      {mode === 'decorations' && (
        <div className="space-y-4">
          <ArmedItemControls
            armedDesign={armedDesign}
            armedRotation={armedRotation}
            armedTilt={armedTilt}
            setArmedRotation={setArmedRotation}
            setArmedTilt={setArmedTilt}
          />

          {placedDecorationItems.length > 0 && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {placedDecorationItems.length} placed
              </span>
              <button
                type="button"
                onClick={clearDecorationItems}
                className="text-xs font-semibold text-destructive hover:underline"
              >
                Clear All
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {CENTER_PLACEABLE_DESIGNS.map((design) => {
              const isArmed = armedCenterType === design.toolId;
              return (
                <button
                  key={design.toolId}
                  type="button"
                  onClick={() => armDecorationTool(design.toolId)}
                  onContextMenu={deselectArmedTool}
                  title={design.label}
                  className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all duration-200 border-2 ${
                    isArmed
                      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                  }`}
                >
                  <span className="text-xs font-semibold">{design.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'text' && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
            <button
              onClick={() => setTextCategory('piping')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                textCategory === 'piping' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Piping Text
            </button>
            <button
              onClick={() => setTextCategory('buttercream')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                textCategory === 'buttercream' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Buttercream Text
            </button>
          </div>

          {textCategory === 'piping' && (
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
            </div>
          )}

          {textCategory === 'buttercream' && (
            <div className="space-y-4">
              <ArmedItemControls
                armedDesign={armedDesign}
                armedRotation={armedRotation}
                armedTilt={armedTilt}
                setArmedRotation={setArmedRotation}
                setArmedTilt={setArmedTilt}
              />

              {placedLetterItems.length > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    {placedLetterItems.length} placed
                  </span>
                  <button
                    type="button"
                    onClick={clearLetterItems}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              )}

              <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
                <button
                  onClick={() => setLetterCase('upper')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    letterCase === 'upper' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Uppercase
                </button>
                <button
                  onClick={() => setLetterCase('lower')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    letterCase === 'lower' ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Lowercase
                </button>
              </div>

              <div className="grid grid-cols-6 gap-1.5">
                {(letterCase === 'upper' ? BUTTERCREAM_LETTERS_UPPER : BUTTERCREAM_LETTERS_LOWER).map((letter) => {
                  const isArmed = armedCenterType === letter.toolId;
                  return (
                    <button
                      key={letter.toolId}
                      type="button"
                      onClick={() => armLetterTool(letter.toolId)}
                      onContextMenu={deselectArmedTool}
                      title={letter.label}
                      className={`aspect-square rounded-lg text-sm font-bold transition-all duration-150 border-2 ${
                        isArmed
                          ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.05]'
                          : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                      }`}
                    >
                      {letter.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!mode && (
        <p className="text-xs text-muted-foreground">Pick Decorations or Text above to get started.</p>
      )}

      {mode === 'text' && textCategory === 'piping' && (
        <SugarColorSection
          sugarColor={sugarColor}
          onChange={onSugarColorChange}
          showDefaultColorPicker
        />
      )}
    </div>
  );
}
