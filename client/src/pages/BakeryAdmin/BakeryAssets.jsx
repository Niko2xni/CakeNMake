import React, { useState } from 'react';
import { Boxes, Plus, Trash2, Image as ImageIcon } from 'lucide-react';
import CustomScrollbar from '@/components/shared/CustomScrollbar';

const CATEGORIES = ['Decorations', 'Frosting Styles', 'Toppings'];

const seedAssets = [
  { id: 1, name: 'Candy Flowers', category: 'Decorations', url: null },
  { id: 2, name: 'Fresh Strawberries', category: 'Decorations', url: null },
  { id: 3, name: 'Mango Slices', category: 'Decorations', url: null },
  { id: 4, name: 'Whipped Cream Swirl', category: 'Frosting Styles', url: null },
  { id: 5, name: 'Smooth Buttercream', category: 'Frosting Styles', url: null },
  { id: 6, name: 'Chocolate Chips', category: 'Toppings', url: null },
  { id: 7, name: 'Rainbow Sprinkles', category: 'Toppings', url: null },
];

export default function BakeryAssets() {
  const [assets, setAssets] = useState(seedAssets);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...CATEGORIES];

  const filtered = activeCategory === 'All'
    ? assets
    : assets.filter((a) => a.category === activeCategory);

  function removeAsset(id) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div className="h-full rounded-2xl border border-pink-100 shadow-xl bg-white flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-pink-100 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Asset Library</h1>
          <p className="text-sm text-gray-500">Bakery-specific decoration and frosting assets</p>
        </div>
        <button
          className="flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Upload Asset
        </button>
      </header>

      <div className="flex-shrink-0 flex gap-1 px-4 pt-3 pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat
                ? 'bg-pink-500 text-white border-pink-500'
                : 'border-pink-100 text-gray-600 hover:bg-pink-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <CustomScrollbar className="flex-1" contentClassName="p-4">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No assets in this category.</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {filtered.map((asset) => (
              <div key={asset.id} className="rounded-xl border border-pink-100 overflow-hidden">
                <div className="w-full aspect-square bg-pink-50 flex items-center justify-center">
                  {asset.url ? (
                    <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-pink-200" />
                  )}
                </div>
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{asset.name}</p>
                    <p className="text-[10px] text-gray-400">{asset.category}</p>
                  </div>
                  <button
                    onClick={() => removeAsset(asset.id)}
                    aria-label="Remove asset"
                    className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CustomScrollbar>
    </div>
  );
}