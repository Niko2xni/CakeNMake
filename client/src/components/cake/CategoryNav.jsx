import React from 'react';

const CATEGORIES = [
  { key: 'structure', label: 'Structure' },
  { key: 'sponge', label: 'Sponge' },
  { key: 'finish', label: 'Finish' },
  { key: 'decorations', label: 'Decorations' },
];

export default function CategoryNav({ category, onSelect }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 bg-muted/30">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={`flex-1 min-w-[70px] py-2 px-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            category === cat.key
              ? 'bg-card shadow text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}