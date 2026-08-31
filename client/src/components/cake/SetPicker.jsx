import React from 'react';
import { SUGAR_COLORS } from '@/lib/cakeConfig';

/**
 * Universal Set-Picker — shared by Center Decorations, Edge Decorations/
 * Piping, Side Piping, and Filling Piping. See CAKE_SETS_REWORK_SPEC.md §5.
 * (Formerly also used for Surface Full/Partial Coverage and Side
 * Decorations — both retired: Surface folded into Fundamentals' Sugar
 * Color, Side Decorations became seven standalone treatments under
 * side.mode. See cakeConfig.js's nav-structure comment.)
 *
 * Row 1: circular buttons, one per available Set, numbered (v1 — icons can
 * be swapped in later per-set without changing this component, see `icon`).
 * Row 2: appears once a Set is chosen — the color palette, defaults to
 * Vanilla the moment a Set is first picked.
 *
 * Picking "None" clears the Set (and by extension hides the color row) —
 * this is the shared "genuine delete" affordance used by Center/Edge's
 * mutually-exclusive modes as well as ordinary optional Sets.
 *
 * `showColorPicker` (default true) lets a picker suppress its own color
 * row — for cases like Side's Checkered Pattern, where a second, smaller
 * SetPicker picks the pattern variant but the color for it is already
 * owned by the outer picker. Two pickers both bound to the same colorId
 * is a duplicate-control bug (the same shape as the old SetsPanel +
 * SetPicker double-wiring on Tuxedo/Whipped Skirt), not a valid use case.
 *
 * `numberFromNone` (default false, opt-in per instance) makes None itself
 * "1" and numbers the sets after it starting from "2", instead of None
 * getting a "—" and the sets numbering from "1". Off by default so
 * Center/Edge/Side's existing numbering doesn't shift for every picker
 * just because one picker (Filling's Piping Design) wanted None counted.
 */
export default function SetPicker({
  sets,
  activeSetId,
  onSelectSet,
  colorId,
  onSelectColor,
  disabled = false,
  label,
  colorLabel = 'Color',
  showColorPicker = true,
  numberFromNone = false,
  showNoneButton = true,
}) {
  const showColors = !!activeSetId && showColorPicker;

  return (
    <div className="space-y-3">
      {label && (
        <span className="text-xs text-muted-foreground block">{label}</span>
      )}

      <div className={`flex flex-wrap gap-2 ${disabled ? 'opacity-40' : ''}`}>
        {showNoneButton && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectSet(null)}
            title="None"
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
              disabled ? 'cursor-not-allowed' : ''
            } ${
              !activeSetId
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
            }`}
          >
            {numberFromNone ? 1 : '—'}
          </button>
        )}
        {sets.map((set, i) => {
          const active = activeSetId === set.id;
          return (
            <button
              key={set.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectSet(set.id)}
              title={set.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                disabled ? 'cursor-not-allowed' : ''
              } ${
                active
                  ? 'bg-primary text-primary-foreground border-primary shadow-md'
                  : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
              }`}
            >
              {set.icon ?? i + (numberFromNone ? 2 : 1)}
            </button>
          );
        })}
      </div>

      {sets.find((s) => s.id === activeSetId) && (
        <p className="text-[10px] text-muted-foreground -mt-1">
          {sets.find((s) => s.id === activeSetId).label}
        </p>
      )}

      {showColors && (
        <div>
          <span className="text-[10px] text-muted-foreground mb-1.5 block">{colorLabel}</span>
          <div className={`flex flex-wrap gap-2 ${disabled ? 'opacity-40' : ''}`}>
            {SUGAR_COLORS.map((c) => {
              const active = (colorId || 'vanilla') === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelectColor(c.id)}
                  title={c.label + (c.implemented ? '' : ' (preview only — 3D material not built yet)')}
                  className={`w-8 h-8 rounded-full border-2 transition-all duration-150 ${
                    disabled ? 'cursor-not-allowed' : ''
                  } ${
                    active ? 'border-primary shadow-md scale-110' : 'border-black/10 hover:border-primary/40'
                  }`}
                  style={{ background: c.swatchCss || c.hex }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}