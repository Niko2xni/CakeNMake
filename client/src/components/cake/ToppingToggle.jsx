import React from 'react';
import { cn } from '@/lib/utils';

const TOPPING_INFO = {
  cherry: { emoji: '🍒', label: 'Cherries' },
  sprinkles: { emoji: '🎉', label: 'Sprinkles' },
  candles: { emoji: '🕯️', label: 'Candles' },
  strawberries: { emoji: '🍓', label: 'Strawberries' },
  chocolateChips: { emoji: '🍫', label: 'Chocolate Chips' },
  rosettes: { emoji: '🌹', label: 'Rosettes' },
};

export default function ToppingToggle({ toppings, onToggle }) {
  return (
    <div>
      <p className="text-sm font-heading font-semibold text-foreground/70 mb-2">Toppings & Decorations</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(TOPPING_INFO).map(([key, { emoji, label }]) => {
          const active = toppings.includes(key);
          return (
            <button
              key={key}
              onClick={() => onToggle(key)}
              className={cn(
                "flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]"
                  : "bg-muted hover:bg-muted/80 text-foreground/70 hover:text-foreground"
              )}
            >
              <span className="text-lg">{emoji}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}