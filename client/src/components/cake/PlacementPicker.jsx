import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Trash2, Pipette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import OptionButtonContent from './OptionButtonContent';

const PLACEABLE_ITEMS = [
  { key: 'cherry', emoji: '🍒', label: 'Cherry' },
  { key: 'strawberry', emoji: '🍓', label: 'Strawberry' },
  { key: 'candle', emoji: '🕯️', label: 'Candle' },
  { key: 'chocolateChip', emoji: '🍫', label: 'Choc Chip' },
  { key: 'rosette', emoji: '🌹', label: 'Rosette' },
];

const PIPING_PATTERNS = [
  { key: 'shell', emoji: '🌀', label: 'Shell' },
  { key: 'star', emoji: '⭐', label: 'Star' },
  { key: 'round', emoji: '⭕', label: 'Round' },
  { key: 'leaf', emoji: '🍃', label: 'Leaf' },
  { key: 'zigzag', emoji: '〰️', label: 'Zigzag' },
];

const PIPING_FLAVORS = [
  { key: 'mango', label: 'Mango', color: '#FFAB00' },
  { key: 'ube', label: 'Ube', color: '#8E5EA2' },
  { key: 'chocolate', label: 'Chocolate', color: '#5C3317' },
  { key: 'mocha', label: 'Mocha', color: '#A4775A' },
  { key: 'cheese', label: 'Cheese', color: '#FFD54F' },
];

function isPipingTool(tool) {
  return tool && typeof tool === 'object' && tool.type === 'piping';
}

export default function PlacementPicker({ activeTool, onSelectTool, onClearAll, placedCount, pipingCount = 0 }) {
  const [pipePattern, setPipePattern] = useState(null);
  const [pipeFlavor, setPipeFlavor] = useState(null);

  const pipingActive = isPipingTool(activeTool);

  // Sync piping tool whenever pattern or flavor changes
  useEffect(() => {
    if (pipePattern && pipeFlavor) {
      onSelectTool({ type: 'piping', flavor: pipeFlavor, pattern: pipePattern });
    } else if (!pipePattern && !pipeFlavor && pipingActive) {
      onSelectTool(null);
    }
  }, [pipePattern, pipeFlavor]);

  const handleItemClick = (key) => {
    setPipePattern(null);
    setPipeFlavor(null);
    onSelectTool(activeTool === key ? null : key);
  };

  const handlePatternClick = (key) => {
    setPipePattern(prev => prev === key ? null : key);
  };

  const handleFlavorClick = (key) => {
    setPipeFlavor(prev => prev === key ? null : key);
  };

  const handleClearAll = () => {
    setPipePattern(null);
    setPipeFlavor(null);
    onClearAll();
  };

  return (
    <div className="space-y-5">
      {/* Items section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-heading font-semibold text-foreground/70">Place Items on Cake</p>
          {(placedCount > 0 || pipingCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-destructive hover:text-destructive gap-1"
              onClick={handleClearAll}
            >
              <Trash2 className="w-3 h-3" />
              Clear all
            </Button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {PLACEABLE_ITEMS.map(({ key, emoji, label }) => (
            <button
              key={key}
              onClick={() => handleItemClick(key)}
              title={label}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium transition-all duration-200 border-2',
                activeTool === key
                  ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20 scale-105'
                  : 'bg-muted border-transparent hover:border-primary/30 text-foreground/60 hover:text-foreground'
              )}
            >
              <OptionButtonContent selected={activeTool === key} canDeselect label={label}>
                <span className="text-xl">{emoji}</span>
                <span className="text-[10px] leading-none">{label}</span>
              </OptionButtonContent>
            </button>
          ))}
        </div>

        <div className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-300',
          !pipingActive && activeTool
            ? 'bg-primary/10 text-primary border border-primary/20'
            : 'bg-muted text-muted-foreground'
        )}>
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          {!pipingActive && activeTool
            ? `Click anywhere on the cake to place a ${PLACEABLE_ITEMS.find(i => i.key === activeTool)?.label}`
            : `Select an item above, then click on the cake`
          }
        </div>

        {!pipingActive && placedCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {placedCount} item{placedCount !== 1 ? 's' : ''} placed
          </p>
        )}
      </div>

      <Separator />

      {/* Piping section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Pipette className="w-4 h-4 text-primary/60" />
          <span className="text-xs font-heading font-semibold text-foreground/50 uppercase tracking-wide">Piping</span>
        </div>

        {/* Pattern selection */}
        <p className="text-[11px] text-muted-foreground mb-1.5">Pattern</p>
        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {PIPING_PATTERNS.map(({ key, emoji, label }) => (
            <button
              key={key}
              onClick={() => handlePatternClick(key)}
              title={label}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium transition-all duration-200 border-2',
                pipePattern === key
                  ? 'bg-accent text-accent-foreground border-accent shadow-md scale-105'
                  : 'bg-muted border-transparent hover:border-accent/40 text-foreground/60 hover:text-foreground'
              )}
            >
              <OptionButtonContent selected={pipePattern === key} canDeselect label={label}>
                <span className="text-lg">{emoji}</span>
                <span className="text-[10px] leading-none">{label}</span>
              </OptionButtonContent>
            </button>
          ))}
        </div>

        {/* Flavor selection */}
        <p className="text-[11px] text-muted-foreground mb-1.5">Flavor</p>
        <div className="grid grid-cols-5 gap-1.5">
          {PIPING_FLAVORS.map(({ key, label, color }) => (
            <button
              key={key}
              onClick={() => handleFlavorClick(key)}
              title={label}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 rounded-xl p-2 text-xs font-medium transition-all duration-200 border-2',
                pipeFlavor === key
                  ? 'border-foreground shadow-md scale-105 bg-card'
                  : 'bg-muted border-transparent hover:border-foreground/30 text-foreground/60 hover:text-foreground'
              )}
            >
              <OptionButtonContent
                selected={pipeFlavor === key}
                canDeselect
                label={label}
                iconClassName="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
              >
                <div
                  className="w-5 h-5 rounded-full border border-border/50 shadow-inner"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] leading-none">{label}</span>
              </OptionButtonContent>
            </button>
          ))}
        </div>

        {/* Piping active indicator */}
        <div className={cn(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition-all duration-300 mt-3',
          pipingActive
            ? 'bg-accent/10 text-accent border border-accent/20'
            : 'bg-muted text-muted-foreground'
        )}>
          <Pipette className="w-3.5 h-3.5 shrink-0" />
          {pipingActive
            ? <>Click on the cake to pipe <span className="font-semibold">{activeTool.pattern}</span> in <span className="font-semibold">{activeTool.flavor}</span></>
            : 'Select a pattern and flavor above, then click on the cake'
          }
        </div>

        {pipingActive && pipingCount > 0 && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            {pipingCount} piping decoration{pipingCount !== 1 ? 's' : ''} placed
          </p>
        )}
      </div>
    </div>
  );
}