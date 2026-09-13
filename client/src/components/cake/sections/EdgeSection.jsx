import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  BORDER_PIPING_SOLID_VARIATIONS,
  BRACELET_BEADS_VARIATIONS,
  FRUIT_CONFECTION_RIM_OPTIONS,
  DOLLOPS_SOLID_VARIATIONS,
  DOLLOPS_SOLID_CHERRY_VARIATIONS,
  WHIPPED_CREAM_SOLID_VARIATIONS,
  WHIPPED_CREAM_CHERRY_VARIATIONS,
  PIPING_TIPS,
  SUGAR_COLORS,
} from '@/lib/cakeConfig';
import SugarColorSection from './SugarColorSection';

const EMPTY_SLOT = () => ({
  decorations: { setId: null, colorId: 'vanilla' },
  piping: { tip: null, colorId: 'vanilla', secondaryColorId: 'red' },
});

const DOLLOP_ROW_DEFINITIONS = [
  {
    label: 'Solid',
    options: [
      ...DOLLOPS_SOLID_VARIATIONS.map((option) => ({ ...option })),
      ...DOLLOPS_SOLID_CHERRY_VARIATIONS.map((option) => ({ ...option, badge: '🍒' })),
    ],
  },
];

const DOLLOP_SECTIONS = [
  { title: 'Star Dollop', prefix: 'starDollop' },
  { title: 'Round Tip Dollop', prefix: 'roundDollop' },
  { title: 'Kiss-shaped Dollop', prefix: 'kissDollop' },
].map((section) => ({
  ...section,
  rows: DOLLOP_ROW_DEFINITIONS
    .map((row) => ({
      ...row,
      options: row.options.filter(({ id }) => id.startsWith(section.prefix)),
    }))
    .filter((row) => row.options.length > 0),
}));

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

  const mode = edge.mode || 'both'; // 'topBottomSeparate' | 'both'

  useEffect(() => {
    if (edge.mode === 'both') {
      setActiveSlot('both');
    } else if (activeSlot === 'both') {
      setActiveSlot('top');
    }
  }, [edge.mode]);

  const currentPlacement = mode === 'both' ? 'both' : activeSlot;

  const handlePlacementChange = (targetPlacement) => {
    if (targetPlacement === 'both') {
      if (mode === 'both') return;
      const currentActiveDesign = (activeSlot === 'bottom' ? edge.bottom : edge.top) || EMPTY_SLOT();
      const inheritedDesign = edge.both?.piping?.tip
        ? edge.both
        : (currentActiveDesign.piping?.tip ? { ...currentActiveDesign } : (edge.both || EMPTY_SLOT()));

      onChange({
        ...edge,
        mode: 'both',
        both: inheritedDesign,
      });
      setActiveSlot('both');
      onActiveSlotChange?.('both');
    } else {
      if (mode === 'topBottomSeparate' && activeSlot === targetPlacement) return;

      let newTop = edge.top || EMPTY_SLOT();
      let newBottom = edge.bottom || EMPTY_SLOT();

      if (mode === 'both' && edge.both?.piping?.tip) {
        if (!newTop.piping?.tip) newTop = { ...edge.both };
        if (!newBottom.piping?.tip) newBottom = { ...edge.both };
      }

      onChange({
        ...edge,
        mode: 'topBottomSeparate',
        top: newTop,
        bottom: newBottom,
      });
      setActiveSlot(targetPlacement);
      onActiveSlotChange?.(targetPlacement);
    }
  };

  const currentSlotKey = mode === 'both' ? 'both' : activeSlot;
  const currentSlot = edge[currentSlotKey] || EMPTY_SLOT();

  const isAlternating = typeof currentSlot.piping?.tip === 'string' && currentSlot.piping.tip.includes('Alt');
  const overrideColors = SUGAR_COLORS.filter((c) => !c.isFlavorMirror);
  const ALT_COLORS_PER_PAGE = 6;
  const [altColorPage, setAltColorPage] = useState(0);
  const altPageCount = Math.ceil(overrideColors.length / ALT_COLORS_PER_PAGE);
  const visibleAltColors = overrideColors.slice(
    altColorPage * ALT_COLORS_PER_PAGE,
    (altColorPage + 1) * ALT_COLORS_PER_PAGE
  );

  const activeSecondaryColorId = currentSlot.piping?.secondaryColorId || 'red';
  const activeSecondaryColor =
    overrideColors.find((c) => c.id === activeSecondaryColorId) ||
    SUGAR_COLORS.find((c) => c.id === activeSecondaryColorId) ||
    overrideColors[0];

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
      {/* Edge Placement */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
          Placement
        </span>
        <div className="grid grid-cols-3 gap-1 bg-muted/40 rounded-xl p-1">
          {[
            { id: 'top', label: 'Top Edge', hasDot: mode === 'topBottomSeparate' && !!edge.top?.piping?.tip },
            { id: 'bottom', label: 'Bottom Edge', hasDot: mode === 'topBottomSeparate' && !!edge.bottom?.piping?.tip },
            { id: 'both', label: 'Both', hasDot: mode === 'both' && !!edge.both?.piping?.tip },
          ].map((tab) => {
            const isSelected = currentPlacement === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handlePlacementChange(tab.id)}
                className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? 'bg-card shadow-sm text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="truncate">{tab.label}</span>
                {tab.hasDot && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

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
            <div>
              <span className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Solid
              </span>
              <div className="flex flex-wrap gap-2">
                {BORDER_PIPING_SOLID_VARIATIONS.map((variant, i) => {
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

          {/* Fruit & Confections Rim — direct non-piping borders */}
          <div>
            <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
              Fruit & Confections Rim
            </span>
            <div>
              <span className="text-[11px] font-medium text-muted-foreground mb-1 block">
                Designs
              </span>
              <div className="flex flex-wrap gap-2">
                {FRUIT_CONFECTION_RIM_OPTIONS.map((variant, i) => {
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

          {/* Whipped Cream Rosettes — solid & cherry variants */}
          <div>
            <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
              Whipped Cream
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                ...WHIPPED_CREAM_SOLID_VARIATIONS,
                ...WHIPPED_CREAM_CHERRY_VARIATIONS,
              ].map((variant, i) => {
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

          {DOLLOP_SECTIONS.map((section) => (
            <div key={section.prefix}>
              <span className="text-xs font-semibold text-foreground/80 mb-1.5 block">
                {section.title}
              </span>
              <div className="space-y-3">
                {section.rows.map((row) => (
                  <div key={row.label}>
                    <span className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      {row.label}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {row.options.map((variant, i) => {
                        const active =
                          (currentSlot.piping?.tip || currentSlot.decorations?.setId) === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            onClick={() =>
                              updateSlot({
                                decorations: { ...currentSlot.decorations, setId: null },
                                piping: {
                                  ...currentSlot.piping,
                                  tip: active ? null : variant.id,
                                  ...(row.alternating
                                    ? { secondaryColorId: currentSlot.piping?.secondaryColorId || 'red' }
                                    : {}),
                                },
                              })
                            }
                            title={variant.label}
                            className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all duration-150 relative ${
                              active
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-muted border-transparent text-muted-foreground hover:border-primary/30'
                            }`}
                          >
                            <span>{i + 1}</span>
                            {row.alternating && (
                              <span
                                className="absolute bottom-1 w-1.5 h-1.5 rounded-full border border-black/20"
                                style={{ backgroundColor: activeSecondaryColor?.hex || '#D6293E' }}
                              />
                            )}
                            {(variant.badge || row.badge) && (
                              <span className="absolute -top-1 -right-1 text-[10px] leading-none pointer-events-none">
                                {variant.badge || row.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
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
        <div className="space-y-4 pt-2 border-t border-border/50">
          <div className="space-y-1">
            {isAlternating && (
              <span className="text-xs font-semibold text-foreground/80 block">
                Primary Color (Color 1)
              </span>
            )}
            <SugarColorSection
              sugarColor={sugarColor}
              onChange={onSugarColorChange}
              showDefaultColorPicker
            />
          </div>

          {isAlternating && (
            <div className="pt-3 border-t border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Alternating Color (Color 2)</span>
                <span className="text-[10px] text-muted-foreground">
                  {altColorPage + 1} / {altPageCount} · {Math.max(0, overrideColors.length - ((altColorPage + 1) * ALT_COLORS_PER_PAGE))} more
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {visibleAltColors.map((c) => {
                  const isActive = activeSecondaryColorId === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() =>
                        updateSlot({
                          piping: { ...currentSlot.piping, secondaryColorId: c.id },
                        })
                      }
                      title={`${c.label}${c.price ? ` (+₱${c.price})` : ''}`}
                      className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-left transition-all duration-200 border-2 ${
                        isActive
                          ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                          : 'bg-muted border-transparent hover:border-primary/30 text-foreground hover:bg-muted/80'
                      }`}
                    >
                      <span
                        className="w-8 h-8 rounded-full border-2 border-black/10"
                        style={{ background: c.swatchCss || c.hex }}
                      />
                      <span className="text-xs font-semibold">{c.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setAltColorPage((page) => Math.max(0, page - 1))}
                  disabled={altColorPage === 0}
                  aria-label="Previous Alternating colors"
                  className="w-8 h-8 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80"
                >
                  <ChevronLeft className="w-4 h-4 mx-auto" />
                </button>
                <div className="flex gap-1.5" aria-label={`Alternating color page ${altColorPage + 1} of ${altPageCount}`}>
                  {Array.from({ length: altPageCount }).map((_, page) => (
                    <span
                      key={page}
                      className={`w-1.5 h-1.5 rounded-full ${page === altColorPage ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setAltColorPage((page) => Math.min(altPageCount - 1, page + 1))}
                  disabled={altColorPage === altPageCount - 1}
                  aria-label="Next Alternating colors"
                  className="w-8 h-8 rounded-full bg-muted text-muted-foreground disabled:opacity-30 hover:bg-muted/80"
                >
                  <ChevronRight className="w-4 h-4 mx-auto" />
                </button>
              </div>
              {activeSecondaryColor && (
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  {activeSecondaryColor.label}{activeSecondaryColor.price ? ` — +₱${activeSecondaryColor.price}` : ''}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
