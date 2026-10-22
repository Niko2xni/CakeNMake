import React, { useState, useEffect } from 'react';
import { Palette, Download, RefreshCw, X } from 'lucide-react';
import {
  buildSidePatternsCatalogPdf,
  SIDE_CATEGORIES_CONFIG,
} from '@/lib/sidePatternsCatalogPdf';

const COLOR_OPTIONS = [
  { id: 'chocolate', name: 'Chocolate', hex: '#3D2314' },
  { id: 'strawberry', name: 'Strawberry', hex: '#E2526B' },
  { id: 'vanilla', name: 'Vanilla', hex: '#E5C583' },
  { id: 'matcha', name: 'Matcha', hex: '#6B8E23' },
  { id: 'ube', name: 'Ube', hex: '#7B4B94' },
];

export default function SidePatternsGalleryModal({ isOpen, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    let currentUrl = null;
    try {
      const doc = buildSidePatternsCatalogPdf({
        category: selectedCategory,
        color: selectedColor.hex,
        colorName: selectedColor.name,
      });
      const blob = doc.output('blob');
      currentUrl = URL.createObjectURL(blob);
      setPdfUrl(currentUrl);
    } catch (err) {
      console.error('Failed to generate 2D pattern catalog PDF:', err);
    }

    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [isOpen, selectedCategory, selectedColor, version]);

  if (!isOpen) return null;

  const totalVariants = SIDE_CATEGORIES_CONFIG.reduce((acc, c) => acc + c.sets.length, 0);

  function handleDownload() {
    try {
      const doc = buildSidePatternsCatalogPdf({
        category: selectedCategory,
        color: selectedColor.hex,
        colorName: selectedColor.name,
      });
      doc.save(`2d-patterns-${selectedCategory}-${selectedColor.name.toLowerCase()}.pdf`);
    } catch (err) {
      console.error('Failed to download PDF:', err);
    }
  }

  function handleRefresh() {
    setVersion((v) => v + 1);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="2D Pattern Schematics Gallery"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 sm:p-6 flex flex-col items-center justify-center animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-pink-200">
        {/* Top Header Bar */}
        <header className="px-6 py-4 bg-gradient-to-r from-pink-50 via-rose-50 to-white border-b border-pink-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500 text-white flex items-center justify-center shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                2D Patterns Schematic Gallery
                <span className="text-xs px-2 py-0.5 rounded-full bg-pink-100 text-pink-700 font-semibold">
                  {totalVariants} Variants
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Direct live preview of Side and Edge vector schematics in blueprintSchematics.js
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color Selector */}
            <div className="flex items-center gap-1.5 bg-white border border-pink-200 rounded-lg p-1 shadow-sm">
              <span className="text-[11px] font-medium text-gray-500 px-1">Color:</span>
              {COLOR_OPTIONS.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  title={col.name}
                  onClick={() => setSelectedColor(col)}
                  className={`w-5 h-5 rounded-full border transition-transform ${
                    selectedColor.id === col.id ? 'ring-2 ring-pink-500 scale-110' : 'border-gray-200 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.hex }}
                />
              ))}
            </div>

            {/* Refresh / Re-render button */}
            <button
              type="button"
              onClick={handleRefresh}
              title="Regenerate schematics from blueprintSchematics.js code"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-pink-200 hover:bg-pink-50 text-pink-700 text-xs font-semibold shadow-sm transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reload
            </button>

            {/* Download PDF button */}
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download PDF
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Category Tabs Bar */}
        <div className="px-6 py-2.5 bg-gray-50 border-b border-gray-200 flex gap-1.5 overflow-x-auto shrink-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-pink-500 text-white shadow-sm'
                : 'bg-white text-gray-600 hover:bg-pink-100/60 border border-gray-200'
            }`}
          >
            All Categories
          </button>
          {SIDE_CATEGORIES_CONFIG.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-pink-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-pink-100/60 border border-gray-200'
              }`}
            >
              <span className="text-[10px] text-pink-700/70 mr-1 font-semibold">[{cat.section || 'Side'}]</span>
              {cat.label} ({cat.sets.length})
            </button>
          ))}
        </div>

        {/* PDF Preview Content Area */}
        <div className="flex-1 bg-gray-200 p-2 overflow-hidden flex flex-col">
          {pdfUrl ? (
            <iframe
              title="2D Patterns Schematic Catalog"
              src={pdfUrl}
              className="w-full h-full bg-white rounded-xl shadow-inner border border-gray-300"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              Generating schematics...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
