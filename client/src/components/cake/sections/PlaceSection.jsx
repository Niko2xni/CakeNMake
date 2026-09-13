import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  PLACEABLE_DECORATIONS,
  SUGAR_COLORS,
  getSlotById,
} from '@/lib/cakeConfig';
import {
  Trash2,
  MapPin,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const PIPING_PATTERNS = [
  { id: 'shell', label: 'Shell', emoji: '🌀' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'round', label: 'Round', emoji: '⭕' },
  { id: 'leaf', label: 'Leaf', emoji: '🍃' },
  { id: 'zigzag', label: 'Zigzag', emoji: '〰️' },
];

export default function PlaceSection({
  place = { items: [] },
  onChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  activeTool,
  onSelectTool,
}) {
  const items = Array.isArray(place?.items) ? place.items : [];
  const [selectedPattern, setSelectedPattern] = useState('shell');
  const [selectedColorId, setSelectedColorId] = useState('vanilla');

  const handleItemSelect = (itemDef) => {
    if (activeTool === itemDef.id || (typeof activeTool === 'object' && activeTool?.type === itemDef.id)) {
      onSelectTool?.(null);
      return;
    }

    if (itemDef.id === 'piping') {
      onSelectTool?.({
        type: 'piping',
        pattern: selectedPattern,
        flavor: selectedColorId,
        colorId: selectedColorId,
      });
    } else {
      onSelectTool?.(itemDef.id);
    }
  };

  const handlePatternChange = (patternId) => {
    setSelectedPattern(patternId);
    if (activeTool === 'piping' || (typeof activeTool === 'object' && activeTool?.type === 'piping')) {
      onSelectTool?.({
        type: 'piping',
        pattern: patternId,
        flavor: selectedColorId,
        colorId: selectedColorId,
      });
    }
  };

  const handleColorChange = (colorId) => {
    setSelectedColorId(colorId);
    if (activeTool === 'piping' || (typeof activeTool === 'object' && activeTool?.type === 'piping')) {
      onSelectTool?.({
        type: 'piping',
        pattern: selectedPattern,
        flavor: colorId,
        colorId: colorId,
      });
    }
  };

  const handleClearAll = () => {
    onChange?.({ ...place, items: [] });
  };

  // Freeform items carry their own generated `id` (see handlePlace in
  // DesignerWorkSpace.jsx). Older saved cakes may still have items placed
  // the previous slot-grid way, which only ever had `slotId` -- falling
  // back to that keeps removal working for those without needing a
  // migration pass over existing saved designs.
  const keyFor = (item, idx) => item.id || item.slotId || `item-${idx}`;

  const handleRemoveItem = (key) => {
    const updated = items.filter((it, idx) => keyFor(it, idx) !== key);
    onChange?.({ ...place, items: updated });
  };

  const activeItemKey = typeof activeTool === 'object' ? activeTool?.type : activeTool;
  const activeItemDef = PLACEABLE_DECORATIONS.find(d => d.id === activeItemKey);

  return (
    <div className="space-y-4">
      {/* Overview guide banner */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Place Decorations</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={onUndo}
              disabled={!canUndo}
              title="Undo last placement (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
              onClick={onRedo}
              disabled={!canRedo}
              title="Redo placement (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Select a decoration below, then click anywhere on the cake's top surface to place it. You can place items as close together as they'll physically fit — a spot that's too tight will just decline the drop.
        </p>
      </div>

      {/* Item Catalog Grid */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            1. Select Decoration
          </span>
          {activeItemDef && (
            <Badge variant="outline" className="text-[10px] font-normal border-primary/40 text-primary">
              Armed: {activeItemDef.label}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {PLACEABLE_DECORATIONS.map((dec) => {
            const isSelected = activeItemKey === dec.id;
            const placedCount = items.filter(it => it.type === dec.id).length;

            return (
              <button
                key={dec.id}
                onClick={() => handleItemSelect(dec)}
                className={cn(
                  'relative flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-150',
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                    : 'bg-card border-border hover:border-primary/50 hover:bg-muted/50 text-foreground'
                )}
              >
                <span className="text-2xl mb-1">{dec.emoji}</span>
                <span className="text-xs font-semibold leading-tight">{dec.label}</span>
                <span className={cn(
                  'text-[10px] mt-0.5',
                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                )}>
                  +${dec.price}
                </span>

                {placedCount > 0 && (
                  <span className={cn(
                    'absolute top-1 right-1.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full',
                    isSelected 
                      ? 'bg-white/30 text-white' 
                      : 'bg-primary/15 text-primary'
                  )}>
                    {placedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Piping Options (when piping is active) */}
      {activeItemKey === 'piping' && (
        <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-3">
          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
              Piping Pattern
            </span>
            <div className="grid grid-cols-5 gap-1">
              {PIPING_PATTERNS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handlePatternChange(p.id)}
                  className={cn(
                    'flex flex-col items-center p-1.5 rounded-lg border text-center text-xs transition-all',
                    selectedPattern === p.id
                      ? 'bg-primary text-primary-foreground border-primary font-bold'
                      : 'bg-card border-border/60 hover:border-primary/40 text-foreground'
                  )}
                >
                  <span className="text-sm">{p.emoji}</span>
                  <span className="text-[9px] mt-0.5">{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-muted-foreground block mb-1.5">
              Piping Color
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {SUGAR_COLORS.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleColorChange(c.id)}
                  title={c.label}
                  className={cn(
                    'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shrink-0',
                    selectedColorId === c.id ? 'border-primary ring-2 ring-primary/30 scale-110' : 'border-border/50'
                  )}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Currently Placed Items Summary List */}
      {items.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                2. Placed Items ({items.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear All
              </Button>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
              {items.map((item, idx) => {
                const dec = PLACEABLE_DECORATIONS.find(d => d.id === item.type);
                // Legacy items placed the old slot-grid way still show which
                // ring they landed in; freeform items just show the item name.
                const slot = item.slotId ? getSlotById(item.slotId) : null;
                const label = slot ? `${slot.ringLabel} #${slot.index + 1}` : `On cake`;
                const key = keyFor(item, idx);

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-muted/30 border border-border/50 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{dec?.emoji || '✨'}</span>
                      <span className="font-medium text-foreground">{dec?.label || item.type}</span>
                      <span className="text-muted-foreground text-[10px]">({label})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(key)}
                      className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}