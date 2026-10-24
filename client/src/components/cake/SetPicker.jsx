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
 *
 * `shape` (default 'circle', opt-in per instance) is a purely visual
 * switch — the None/Set selection logic above is identical either way.
 * 'circle' is the original small round numbered-button row Center/Edge/
 * Side rely on. 'box' renders the same options as the larger rounded-xl
 * bordered cards Filling Flavor/Sponge Flavor/Exterior Finish's flavor
 * grids use (grid-cols-2, shadow+scale on the active card), including
 * the same badge-above-label layout — a small circle sits above the
 * label the same way Filling Flavor's color swatch does, just filled
 * with the set's `icon`/number instead of a flavor color, since a Piping
 * Design has no color of its own. Used by Filling's Piping Design picker
 * only, so it isn't a separate component to keep in sync with this one.
 */
export default function SetPicker({
  sets,
  activeSetId,
  onSelectSet,
  colorId,
  onSelectColor,
  disabled = false,
  disabledItemIds = [],
  isItemDisabled,
  label,
  colorLabel = 'Color',
  showColorPicker = true,
  numberFromNone = false,
  showNoneButton = true,
  shape = 'circle',
  noneIcon = null,
  renderIcon = null,
}) {
  const showColors = !!activeSetId && showColorPicker;
  const isBox = shape === 'box';
  const resolvedNoneIcon = noneIcon ?? (renderIcon ? renderIcon('none', null) : null);

  return (
    <div className="space-y-3">
      {label && (
        <span className="text-xs text-muted-foreground block">{label}</span>
      )}

      <div className={isBox
        ? `grid grid-cols-2 gap-2 ${disabled ? 'opacity-40' : ''}`
        : `flex flex-wrap gap-2 ${disabled ? 'opacity-40' : ''}`
      }>
        {showNoneButton && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onSelectSet(null)}
            title="None"
            className={isBox
              ? `flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition-all duration-200 border-2 ${
                  disabled ? 'cursor-not-allowed opacity-40' : ''
                } ${
                  !activeSetId
                    ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                    : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                }`
              : `w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                  disabled ? 'cursor-not-allowed opacity-40' : ''
                } ${
                  !activeSetId
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                }`
            }
          >
            {isBox ? (
              <>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden ${resolvedNoneIcon ? 'p-0 border-0' : 'border-2 border-current/20 bg-current/5'}`}>
                  {resolvedNoneIcon ?? (numberFromNone ? 1 : '—')}
                </span>
                <span className="text-center leading-tight">None</span>
              </>
            ) : (
              resolvedNoneIcon ?? (numberFromNone ? 1 : '—')
            )}
          </button>
        )}
        {sets.map((set, i) => {
          const active = activeSetId === set.id;
          const itemDisabled = disabled || (disabledItemIds && disabledItemIds.includes(set.id)) || (isItemDisabled && isItemDisabled(set.id)) || Boolean(set.disabled);
          const itemIcon = set.icon ?? (renderIcon ? renderIcon(set.id, set, i) : null);
          return (
            <button
              key={set.id}
              type="button"
              disabled={itemDisabled}
              onClick={() => onSelectSet(set.id)}
              title={itemDisabled ? `${set.label} (Not available for frosted/textured finish)` : set.label}
              className={isBox
                ? `flex flex-col items-center gap-1.5 rounded-xl p-3 text-xs font-semibold transition-all duration-200 border-2 ${
                    itemDisabled
                      ? 'opacity-40 cursor-not-allowed bg-muted/40 border-transparent text-muted-foreground hover:border-transparent'
                      : active
                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                        : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                  }`
                : `w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 ${
                    itemDisabled
                      ? 'opacity-40 cursor-not-allowed bg-muted/40 border-transparent text-muted-foreground hover:border-transparent'
                      : active
                        ? 'bg-primary text-primary-foreground border-primary shadow-md'
                        : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                  }`
              }
            >
              {isBox ? (
                <>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold overflow-hidden ${itemIcon ? 'p-0 border-0' : 'border-2 border-current/20 bg-current/5'}`}>
                    {itemIcon ?? i + (numberFromNone ? 2 : 1)}
                  </span>
                  <span className="text-center leading-tight">{set.label}</span>
                </>
              ) : (
                itemIcon ?? i + (numberFromNone ? 2 : 1)
              )}
            </button>
          );
        })}
      </div>

      {!isBox && sets.find((s) => s.id === activeSetId) && (
        <p className="text-[10px] text-muted-foreground -mt-1">
          {sets.find((s) => s.id === activeSetId).label}
        </p>
      )}

      {showColors && (
        <div>
          <span className="text-[10px] text-muted-foreground mb-1.5 block">{colorLabel}</span>
          <div className={`flex flex-wrap gap-2 ${disabled ? 'opacity-40' : ''}`}>
            {SUGAR_COLORS.filter(c => !c.isPattern).map((c) => {
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
