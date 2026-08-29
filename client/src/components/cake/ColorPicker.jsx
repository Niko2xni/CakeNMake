import React from 'react';
import { cn } from '@/lib/utils';

export default function ColorPicker({ colors, selected, onSelect, label }) {
  return (
    <div>
      <p className="text-sm font-heading font-semibold text-foreground/70 mb-2">{label}</p>
      {selected === null && (
        <p className="text-xs text-muted-foreground mb-2 italic">Select a flavor...</p>
      )}
      <div className="flex flex-wrap gap-2">
        {Object.entries(colors).map(([name, hex]) => (
          <button
            key={name}
            onClick={() => onSelect(name)}
            className={cn(
              "w-9 h-9 rounded-full transition-all duration-200 border-2 hover:scale-110",
              selected === name
                ? "border-primary ring-2 ring-primary/30 scale-110"
                : "border-transparent hover:border-primary/40"
            )}
            style={{ backgroundColor: hex }}
            title={name.charAt(0).toUpperCase() + name.slice(1)}
          />
        ))}
      </div>
    </div>
  );
}