import React from 'react';

/**
 * "Tier 1 | Tier 2" tab strip — which already-existing tier you're
 * currently editing, when Tier Design = Individual. Rendered ONCE in
 * ToolPanel, above whichever section is active, rather than duplicated
 * inside every section that needs per-tier fields (Sponge, Filling,
 * Exterior Finish, and now Center/Edge/Side). See
 * CAKE_SETS_REWORK_SPEC.md — this consolidates markup that used to be
 * copy-pasted identically into three separate section components.
 *
 * Not to be confused with the removed `LayerSlider.jsx`, which handled
 * Cake Size + Cake Layer COUNT (a Fundamentals/Cake Structure concern) —
 * a different thing that happens to also involve the word "layer."
 */
export default function LayerTabStrip({ layers, activeLayer, onLayerChange, isPetitsFour = false }) {
  const getLabel = (i) => {
    if (isPetitsFour) return `Variation ${i + 1}`;
    if (layers === 2) return i === 0 ? 'Bottom Tier' : 'Top Tier';
    return `Tier ${i + 1}`;
  };

  return (
    <div className="flex gap-1 bg-muted/40 rounded-xl p-1">
      {Array.from({ length: layers }).map((_, i) => (
        <button
          key={i}
          onClick={() => onLayerChange(i)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
            activeLayer === i
              ? 'bg-card shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {getLabel(i)}
        </button>
      ))}
    </div>
  );
}
